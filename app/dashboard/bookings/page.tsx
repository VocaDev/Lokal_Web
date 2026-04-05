'use client'
import { useEffect, useState } from "react";
import { Business, Booking, Service } from "@/lib/types";
import { getBookings, getServices, getCurrentBusiness } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BookingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    getCurrentBusiness()
      .then(biz => {
        setBusiness(biz);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!business?.id) return;
    (async () => {
      try {
        const [bks, svcs] = await Promise.all([
          getBookings(business.id),
          getServices(business.id),
        ]);
        setBookings(bks);
        setServices(svcs);
      } catch (err) {
        console.error("Failed to load bookings data", err);
      }
    })();
  }, [business?.id]);

  if (loading || !business) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        Loading bookings...
      </div>
    );
  }

  const getServiceName = (serviceId: string) => services.find(s => s.id === serviceId)?.name || 'Unknown';

  const statusStyles: Record<string, string> = {
    confirmed: "bg-success/10 text-success",
    pending: "bg-warning/10 text-warning",
    cancelled: "bg-destructive/10 text-destructive",
    completed: "bg-primary/10 text-primary",
  };

  const handleExportReport = async () => {
    setExportLoading(true);
    setExportMessage(null);
    try {
      const res = await fetch('/api/export-report', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gabim i panjohur');
      setExportMessage('✅ ' + data.message);
    } catch (err: any) {
      setExportMessage('❌ ' + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#e8e8f0]">Rezervimet</h1>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleExportReport}
            disabled={exportLoading}
            className="bg-[#1e1e35] border border-[rgba(120,120,255,0.22)] text-[#8888aa] hover:text-[#e8e8f0] hover:border-[rgba(120,120,255,0.4)] rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50"
          >
            {exportLoading ? 'Duke gjeneruar...' : 'Eksporto Raportin (.txt)'}
          </button>
          {exportMessage && (
            <span className="text-xs text-[#8888aa]">{exportMessage}</span>
          )}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Customer</th>
                  <th className="pb-3 font-medium text-muted-foreground">Service</th>
                  <th className="pb-3 font-medium text-muted-foreground">Date & Time</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => {
                  const dt = new Date(b.appointmentAt);
                  return (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="py-3">
                        <p className="font-medium text-foreground">{b.customerName}</p>
                        <p className="text-xs text-muted-foreground">{b.customerPhone}</p>
                      </td>
                      <td className="py-3 text-foreground">{getServiceName(b.serviceId)}</td>
                      <td className="py-3 text-foreground">{dt.toLocaleDateString()} at {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[b.status]}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
