import path from 'path';
import { BookingRepository } from '../repositories/BookingRepository';
import { FileRepository } from '../repositories/FileRepository';

export class ExportService {
  constructor(
    private bookingRepo: BookingRepository,
    private fileRepo: FileRepository
  ) {}

  async generateReport(businessId: string, businessName: string): Promise<string> {
    try {
      if (!businessId) {
        throw new Error("ID e biznesit mungon");
      }
      if (!businessName || typeof businessName !== 'string') {
        throw new Error("Emri i biznesit nuk është valid");
      }

      const bookings = await this.bookingRepo.getBookingsByBusiness(businessId);

      const totalBookings = bookings.length;
      const confirmed = bookings.filter(b => b.status === 'confirmed').length;
      const pending = bookings.filter(b => b.status === 'pending').length;
      const cancelled = bookings.filter(b => b.status === 'cancelled').length;
      const completed = bookings.filter(b => b.status === 'completed').length;

      let mostPopularService = "N/A";
      if (totalBookings > 0) {
        const serviceCounts: Record<string, number> = {};
        for (const booking of bookings) {
          serviceCounts[booking.service_id] = (serviceCounts[booking.service_id] || 0) + 1;
        }
        
        let maxCount = 0;
        let popularId = "N/A";
        for (const [serviceId, count] of Object.entries(serviceCounts)) {
          if (count > maxCount) {
            maxCount = count;
            popularId = serviceId;
          }
        }
        mostPopularService = popularId;
      }

      const reportContent = `
LOKALWEB — RAPORT I REZERVIMEVE
================================
Biznesi: ${businessName}
ID: ${businessId}
Data e gjenerimit: ${new Date().toLocaleString('sq-AL')}

STATISTIKAT:
- Total rezervime: ${totalBookings}
- Konfirmuara: ${confirmed}
- Në pritje: ${pending}
- Të anuluara: ${cancelled}
- Të përfunduara: ${completed}

Shërbimi më i popullarizuar (ID): ${mostPopularService}
================================
`;

      const filePath = path.join(process.cwd(), 'reports', `raport-${businessId}.txt`);
      this.fileRepo.writeReport(filePath, reportContent);

      return reportContent;
    } catch (error: any) {
      throw error;
    }
  }
}
