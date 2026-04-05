import { describe, it, expect, vi } from 'vitest';
import { ExportService } from '../services/ExportService';
import { BookingRepository, Booking } from '../repositories/BookingRepository';
import { FileRepository } from '../repositories/FileRepository';

describe('ExportService', () => {
  it('TEST 1 — Happy path (valid data, bookings exist)', async () => {
    const mockBookings: any[] = [
      { id: '1', status: 'confirmed', service_id: 'svc-1' },
      { id: '2', status: 'pending', service_id: 'svc-1' },
      { id: '3', status: 'cancelled', service_id: 'svc-2' }
    ];

    const mockBookingRepo = {
      getBookingsByBusiness: vi.fn().mockResolvedValue(mockBookings)
    } as unknown as BookingRepository;

    const mockFileRepo = {
      readConfig: vi.fn(),
      writeReport: vi.fn()
    } as unknown as FileRepository;

    const exportService = new ExportService(mockBookingRepo, mockFileRepo);

    const result = await exportService.generateReport('valid-uuid-here', 'Barbershop Test');

    expect(result).toContain('Total rezervime: 3');
    expect(result).toContain('Konfirmuara: 1');
  });

  it('TEST 2 — Missing businessId', async () => {
    const exportService = new ExportService({} as BookingRepository, {} as FileRepository);
    await expect(exportService.generateReport('', 'Test')).rejects.toThrowError('ID e biznesit mungon');
  });

  it('TEST 3 — Invalid businessName', async () => {
    const exportService = new ExportService({} as BookingRepository, {} as FileRepository);
    await expect(exportService.generateReport('some-id', '')).rejects.toThrowError('Emri i biznesit nuk është valid');
  });

  it('TEST 4 — Repository throws (Supabase error simulation)', async () => {
    const mockBookingRepo = {
      getBookingsByBusiness: vi.fn().mockRejectedValue(new Error('Gabim gjatë leximit të rezervimeve: connection failed'))
    } as unknown as BookingRepository;

    const exportService = new ExportService(mockBookingRepo, {} as FileRepository);
    
    await expect(exportService.generateReport('valid-uuid-here', 'Test')).rejects.toThrowError('Gabim gjatë leximit të rezervimeve: connection failed');
  });
});
