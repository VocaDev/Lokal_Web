import { Booking, BusinessHours } from "@/lib/types";
import { updateBookingStatus, getBookings } from "@/lib/store";
import type { SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
// Status transitions (existing)
// =============================================================================

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface BookingActionResult {
  success: boolean;
  bookings?: Booking[];
  error?: string;
}

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending:   ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function isTransitionAllowed(
  current: BookingStatus,
  next: BookingStatus
): boolean {
  return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}

export async function changeBookingStatus(
  booking: Booking,
  newStatus: BookingStatus,
  businessId: string
): Promise<BookingActionResult> {
  const currentStatus = booking.status as BookingStatus;

  if (!isTransitionAllowed(currentStatus, newStatus)) {
    return { success: false, error: "Ndryshimi i statusit nuk lejohet." };
  }

  try {
    await updateBookingStatus(booking.id, newStatus);
  } catch (err: any) {
    return { success: false, error: err.message };
  }

  try {
    const freshBookings = await getBookings(businessId);
    return { success: true, bookings: freshBookings };
  } catch {
    return {
      success: true,
      error: "Status updated but could not refresh. Please reload.",
    };
  }
}

export const confirmBooking  = (booking: Booking, businessId: string) =>
  changeBookingStatus(booking, "confirmed", businessId);

export const cancelBooking   = (booking: Booking, businessId: string) =>
  changeBookingStatus(booking, "cancelled", businessId);

export const completeBooking = (booking: Booking, businessId: string) =>
  changeBookingStatus(booking, "completed", businessId);


// =============================================================================
// Slot generation (Phase 4.1)
// =============================================================================
//
// All times in the booking flow are anchored to the business's IANA timezone
// (e.g. 'Europe/Belgrade'). The browser-side picker lets the user pick a day
// chip that represents a business-local calendar day; we compute slot starts
// in business-local wall-clock time and convert to UTC instants for storage.
//
// Why this matters: appointment_at is timestamptz in Postgres, so the same
// instant displays differently in different zones. Mixing getHours() and
// getUTCHours() at the component level (the prior bug) produced ghost
// conflicts and missed conflicts. All math now goes through these helpers.
// =============================================================================

export const DEFAULT_TIMEZONE = "Europe/Belgrade";  // Kosovo (UTC+1 / +2 DST)
export const DEFAULT_SLOT_INTERVAL_MIN = 15;        // grid resolution
export const DEFAULT_RESERVATION_DURATION_MIN = 60; // restaurant default

/** A single booked appointment as returned by get_booked_slots RPC. */
export interface BookedSlot {
  /** UTC instant when the appointment starts. */
  startUtc: Date;
  /** Minutes the appointment occupies. Restaurant reservations default to 60. */
  durationMinutes: number;
}

/** A candidate slot offered to the user. */
export interface AvailableSlot {
  /** Display string in business-local time (e.g. "09:30"). */
  label: string;
  /** UTC instant when the slot starts. */
  startUtc: Date;
  /** True if the slot overlaps an existing booking. */
  isBooked: boolean;
}

// -------- Timezone helpers --------

/**
 * Difference (ms) between this UTC instant and the same wall-clock displayed
 * in `timeZone`. Positive when timeZone is east of UTC.
 *
 * Using formatToParts avoids cross-browser issues with Date.parse on
 * toLocaleString output.
 */
function tzOffsetMs(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(date).reduce<Record<string, string>>(
    (acc, p) => {
      acc[p.type] = p.value;
      return acc;
    },
    {}
  );
  const asIfUtc = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour % 24,
    +parts.minute,
    +parts.second
  );
  return asIfUtc - date.getTime();
}

/**
 * Convert a wall-clock time in `timeZone` to a UTC Date. Handles DST
 * transitions by re-checking the offset of the resulting instant.
 */
export function wallClockToUtc(
  year: number,
  month: number,  // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guessUtc = Date.UTC(year, month - 1, day, hour, minute);
  const offset = tzOffsetMs(new Date(guessUtc), timeZone);
  return new Date(guessUtc - offset);
}

/**
 * Day-of-week (0=Sunday ... 6=Saturday) for a UTC instant in `timeZone`.
 */
export function dayOfWeekInTz(date: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[fmt.format(date)] ?? 0;
}

/**
 * Y/M/D triple representing `date` displayed in `timeZone`. Useful for taking
 * a browser-local Date (from a calendar picker) and reading the calendar day
 * the user actually saw.
 */
export function ymdInTz(date: Date, timeZone: string): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date).reduce<Record<string, string>>(
    (acc, p) => {
      acc[p.type] = p.value;
      return acc;
    },
    {}
  );
  return { y: +parts.year, m: +parts.month, d: +parts.day };
}

/** Format a UTC instant as a "HH:MM" string in the business timezone. */
export function formatTimeInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Parse "HH:MM" into [hour, minute]. */
function parseHourMin(s: string): [number, number] {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  return [h || 0, m || 0];
}

// -------- Slot generation --------

/**
 * Generate available slots for `selectedDate` (business-local calendar day),
 * respecting business hours, service duration, and existing bookings.
 *
 * A slot is BOOKED iff its [start, start + serviceDuration) interval overlaps
 * any existing booking's [start, start + duration) interval. The full window
 * is blocked, not just the start.
 *
 * Returns slots whose end is at or before close time.
 */
export function generateAvailableSlots(params: {
  hours: BusinessHours[];
  serviceDurationMinutes: number;
  selectedDate: Date;                  // browser-local Date from the picker
  timeZone?: string;                    // defaults to Europe/Belgrade
  bookedSlots?: BookedSlot[];
  slotIntervalMinutes?: number;         // defaults to 15
  /** "Now" override for testing. */
  now?: Date;
}): AvailableSlot[] {
  const {
    hours,
    serviceDurationMinutes,
    selectedDate,
    timeZone = DEFAULT_TIMEZONE,
    bookedSlots = [],
    slotIntervalMinutes = DEFAULT_SLOT_INTERVAL_MIN,
    now = new Date(),
  } = params;

  if (serviceDurationMinutes <= 0) return [];

  // Read the calendar day the user picked, INTERPRETED in the business zone.
  // Browser-local Y/M/D from the picker is treated as the business-local day,
  // which matches what the day-chip UI displayed.
  const { y, m, d } = ymdInTz(selectedDate, timeZone);
  const dow = dayOfWeekInTz(wallClockToUtc(y, m, d, 12, 0, timeZone), timeZone);

  const todayHours = hours.find((h) => h.dayOfWeek === dow);
  if (!todayHours?.isOpen) return [];

  const [openH, openM] = parseHourMin(todayHours.openTime);
  const [closeH, closeM] = parseHourMin(todayHours.closeTime);

  const dayStartUtc = wallClockToUtc(y, m, d, openH, openM, timeZone).getTime();
  const dayEndUtc = wallClockToUtc(y, m, d, closeH, closeM, timeZone).getTime();
  if (dayEndUtc <= dayStartUtc) return [];

  const intervalMs = slotIntervalMinutes * 60_000;
  const durationMs = serviceDurationMinutes * 60_000;
  const nowMs = now.getTime();

  const slots: AvailableSlot[] = [];
  for (let t = dayStartUtc; t + durationMs <= dayEndUtc; t += intervalMs) {
    const startUtc = new Date(t);
    const slotEnd = t + durationMs;

    // Drop slots whose start is in the past
    if (t < nowMs) continue;

    const overlaps = bookedSlots.some((bs) => {
      const bStart = bs.startUtc.getTime();
      const bEnd = bStart + bs.durationMinutes * 60_000;
      return t < bEnd && slotEnd > bStart;
    });

    slots.push({
      label: formatTimeInTz(startUtc, timeZone),
      startUtc,
      isBooked: overlaps,
    });
  }
  return slots;
}

// -------- RPC client + insert helpers --------

/**
 * Fetch booked slots for a business on a calendar day via the
 * `get_booked_slots` SECURITY DEFINER RPC (migration 011). Public-safe — no
 * customer PII crosses the wire, only timestamps and durations.
 *
 * `dayInBusinessTz` is the local calendar date the user is viewing, as a
 * browser Date. We translate it to a UTC date for the RPC.
 */
export async function fetchBookedSlots(
  supabase: SupabaseClient,
  businessId: string,
  dayInBusinessTz: Date,
  timeZone: string = DEFAULT_TIMEZONE
): Promise<BookedSlot[]> {
  const { y, m, d } = ymdInTz(dayInBusinessTz, timeZone);
  const dayStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const { data, error } = await supabase.rpc("get_booked_slots", {
    p_business_id: businessId,
    p_day: dayStr,
  });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    startUtc: new Date(row.appointment_at as string),
    durationMinutes: (row.duration_minutes as number) ?? DEFAULT_RESERVATION_DURATION_MIN,
  }));
}

/**
 * True iff the Supabase error is a unique-constraint violation. Used by the
 * booking drawers to detect a slot collision that races our pre-insert check
 * (defended at the DB level by migration 008's partial unique index).
 */
export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  return code === "23505";
}
