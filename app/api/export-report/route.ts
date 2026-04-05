import { createClient } from '@/lib/supabase/server';
import { BookingRepository } from '@/lib/academic-module/repositories/BookingRepository';
import { FileRepository } from '@/lib/academic-module/repositories/FileRepository';
import { ExportService } from '@/lib/academic-module/services/ExportService';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Jo i autentikuar' }, { status: 401 });
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('owner_id', session.user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: 'Biznesi nuk u gjet' }, { status: 404 });
    }

    const bookingRepo = new BookingRepository();
    const fileRepo = new FileRepository();
    const exportService = new ExportService(bookingRepo, fileRepo);

    const report = await exportService.generateReport(business.id, business.name);

    return NextResponse.json({ 
      success: true, 
      message: 'Raporti u gjenerua me sukses!', 
      preview: report 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? 'Gabim i panjohur' }, { status: 500 });
  }
}
