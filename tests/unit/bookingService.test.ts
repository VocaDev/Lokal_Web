import { describe, it, expect, vi } from "vitest";
import {
  isTransitionAllowed,
  changeBookingStatus,
} from "../../src/lib/services/bookingService";
import { updateBookingStatus, getBookings } from "@/lib/store";

vi.mock("@/lib/store", () => ({
  updateBookingStatus: vi.fn().mockResolvedValue(undefined),
  getBookings: vi.fn().mockResolvedValue([{ id: "1", status: "confirmed" }]),
}));

vi.mock("@/lib/types", () => ({}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    })),
  })),
}));

describe("isTransitionAllowed", () => {
  it("lejon pending → confirmed", () => {
    expect(isTransitionAllowed("pending", "confirmed")).toBe(true);
  });

  it("lejon pending → cancelled", () => {
    expect(isTransitionAllowed("pending", "cancelled")).toBe(true);
  });

  it("lejon confirmed → completed", () => {
    expect(isTransitionAllowed("confirmed", "completed")).toBe(true);
  });

  it("lejon confirmed → cancelled", () => {
    expect(isTransitionAllowed("confirmed", "cancelled")).toBe(true);
  });

  it("bllokon completed → pending", () => {
    expect(isTransitionAllowed("completed", "pending")).toBe(false);
  });

  it("bllokon completed → confirmed", () => {
    expect(isTransitionAllowed("completed", "confirmed")).toBe(false);
  });

  it("bllokon cancelled → pending", () => {
    expect(isTransitionAllowed("cancelled", "pending")).toBe(false);
  });

  it("bllokon cancelled → confirmed", () => {
    expect(isTransitionAllowed("cancelled", "confirmed")).toBe(false);
  });

  it("bllokon completed → cancelled", () => {
    expect(isTransitionAllowed("completed", "cancelled")).toBe(false);
  });
});

describe("changeBookingStatus", () => {
  const dummyBooking = { id: "1", status: "completed" } as any;

  it("kthen success: false kur tranzicioni nuk lejohet", async () => {
    const result = await changeBookingStatus(dummyBooking, "pending", "b1");
    expect(result.success).toBe(false);
    expect(typeof result.error).toBe("string");
  });

  it("kthen success: true kur tranzicioni lejohet", async () => {
    const pendingBooking = { id: "1", status: "pending" } as any;
    const result = await changeBookingStatus(pendingBooking, "confirmed", "b1");
    expect(result.success).toBe(true);
  });

  it("kthen bookings array pas suksesit", async () => {
    const pendingBooking = { id: "1", status: "pending" } as any;
    const result = await changeBookingStatus(pendingBooking, "confirmed", "b1");
    expect(Array.isArray(result.bookings)).toBe(true);
  });

  it("kthen success: false nëse updateBookingStatus hedh gabim", async () => {
    const pendingBooking = { id: "1", status: "pending" } as any;
    vi.mocked(updateBookingStatus).mockRejectedValueOnce(new Error("DB error"));
    const result = await changeBookingStatus(pendingBooking, "confirmed", "b1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("DB error");
  });

  it("kurrë nuk hedh exception — gjithmonë kthen objekt", async () => {
    const pendingBooking = { id: "1", status: "pending" } as any;
    vi.mocked(updateBookingStatus).mockRejectedValueOnce(new Error("Unhandled"));
    const promise = changeBookingStatus(pendingBooking, "confirmed", "b1");
    await expect(promise).resolves.toBeDefined();
  });
});
