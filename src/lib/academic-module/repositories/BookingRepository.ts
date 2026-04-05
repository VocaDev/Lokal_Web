import { createClient } from '@/lib/supabase/server';

export interface Booking {
  id: string;
  business_id: string;
  service_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
}

export class BookingRepository {
  async getBookingsByBusiness(businessId: string): Promise<Booking[]> {
    try {
      if (!businessId) {
        throw new Error("ID e biznesit nuk është valid");
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(businessId)) {
        throw new Error("ID e biznesit nuk është valid");
      }

      const supabase = await createClient();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('business_id', businessId);

      if (error) {
        throw new Error("Gabim gjatë leximit të rezervimeve: " + error.message);
      }

      return data as Booking[];
    } catch (error: any) {
      if (
        error.message === "ID e biznesit nuk është valid" ||
        error.message?.startsWith("Gabim gjatë leximit")
      ) {
        throw error;
      }
      throw new Error("Gabim gjatë leximit të rezervimeve: " + error.message);
    }
  }
}
