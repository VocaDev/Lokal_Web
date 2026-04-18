import { describe, it, expect } from 'vitest'
// TODO: zhvendos këtë skemë në src/lib/validations/bookingSchema.ts
import { z } from 'zod'

const bookingSchema = z.object({
  customerName: z.string().min(2, "Emri duhet të ketë së paku 2 karaktere"),
  customerPhone: z.string().min(9, "Numri i telefonit është i pavlefshëm"),
  serviceId: z.string().uuid("serviceId duhet të jetë UUID i vlefshëm"),
  appointmentAt: z.string().datetime("Data e rezervimit është e pavlefshme"),
})

describe("bookingSchema validation", () => {
  it("pranon payload të vlefshëm", () => {
    const validBooking = {
      customerName: "Filan Fisteku",
      customerPhone: "044123456",
      serviceId: "550e8400-e29b-41d4-a716-446655440000",
      appointmentAt: new Date().toISOString()
    };
    const result = bookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
  });

  it("refuzon customerName bosh", () => {
    const result = bookingSchema.safeParse({
      customerName: "",
      customerPhone: "044123456",
      serviceId: "550e8400-e29b-41d4-a716-446655440000",
      appointmentAt: new Date().toISOString()
    });
    expect(result.success).toBe(false);
  });

  it("refuzon customerName me 1 karakter", () => {
    const result = bookingSchema.safeParse({
      customerName: "A",
      customerPhone: "044123456",
      serviceId: "550e8400-e29b-41d4-a716-446655440000",
      appointmentAt: new Date().toISOString()
    });
    expect(result.success).toBe(false);
  });

  it("refuzon customerPhone bosh", () => {
    const result = bookingSchema.safeParse({
      customerName: "Filan Fisteku",
      customerPhone: "",
      serviceId: "550e8400-e29b-41d4-a716-446655440000",
      appointmentAt: new Date().toISOString()
    });
    expect(result.success).toBe(false);
  });

  it("refuzon serviceId jo-UUID", () => {
    const result = bookingSchema.safeParse({
      customerName: "Filan Fisteku",
      customerPhone: "044123456",
      serviceId: "not-a-uuid",
      appointmentAt: new Date().toISOString()
    });
    expect(result.success).toBe(false);
  });

  it("refuzon appointmentAt të pavlefshëm", () => {
    const result = bookingSchema.safeParse({
      customerName: "Filan Fisteku",
      customerPhone: "044123456",
      serviceId: "550e8400-e29b-41d4-a716-446655440000",
      appointmentAt: "sot"
    });
    expect(result.success).toBe(false);
  });

  it("refuzon objekt krejtësisht bosh", () => {
    const result = bookingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("kthen mesazhe gabimi specifike", () => {
    const result = bookingSchema.safeParse({
      customerName: ""
    });
    if (!result.success) {
      expect(result.error.errors.length).toBeGreaterThan(0);
    } else {
      throw new Error("Duhet të dështonte");
    }
  });
});
