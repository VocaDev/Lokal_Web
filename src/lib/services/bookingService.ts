import { Booking } from "@/lib/types";
import { updateBookingStatus, getBookings } from "@/lib/store";

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
  } catch (err: any) {
    return { 
      success: true, 
      error: "Status updated but could not refresh. Please reload." 
    };
  }
}

export const confirmBooking  = (booking: Booking, businessId: string) =>
  changeBookingStatus(booking, "confirmed", businessId);

export const cancelBooking   = (booking: Booking, businessId: string) =>
  changeBookingStatus(booking, "cancelled", businessId);

export const completeBooking = (booking: Booking, businessId: string) =>
  changeBookingStatus(booking, "completed", businessId);
