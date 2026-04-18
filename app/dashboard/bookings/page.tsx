'use client'
import { useEffect, useState, useCallback } from "react";
import { Business, Booking, Service } from "@/lib/types";
import { getBookings, getServices, getCurrentBusiness } from "@/lib/store";
import { confirmBooking, cancelBooking, completeBooking, BookingStatus } from "@/lib/services/bookingService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, User, Phone, Scissors, Calendar, Clock } from "lucide-react";

type ToastKind = "success" | "error" | "info";
interface Toast { message: string; kind: ToastKind }

function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const show = useCallback((message: string, kind: ToastKind = "info") => {
    setToast({ message, kind });
    setTimeout(() => setToast(null), 3500);
  }, []);
  return { toast, show };
}

const TOAST_COLORS: Record<ToastKind, string> = {
  success: "bg-green-400/15 text-green-400 border-green-400/20",
  error:   "bg-red-400/15 text-red-400 border-red-400/20",
  info:    "bg-blue-400/15 text-blue-400 border-blue-400/20",
};

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-amber-400/10 text-amber-400",
  confirmed: "bg-blue-400/10 text-blue-400",
  completed: "bg-green-400/10 text-green-400",
  cancelled: "bg-red-400/10 text-red-400",
};

export default function BookingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const { toast, show: showToast } = useToast();

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedBooking(null);
  };

  useEffect(() => {
    getCurrentBusiness()
      .then(biz => setBusiness(biz))
      .catch(() => showToast("Nuk u ngarkua biznesi. Rifresko faqen.", "error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!business?.id) return;
    Promise.all([getBookings(business.id), getServices(business.id)])
      .then(([bks, svcs]) => { setBookings(bks); setServices(svcs); })
      .catch(() => showToast("Nuk u ngarkuan të dhënat. Provo përsëri.", "error"));
  }, [business?.id]);

  const getServiceName = (serviceId: string) => services.find(s => s.id === serviceId)?.name || 'Unknown';

  const handleAction = async (
    booking: Booking,
    action: typeof confirmBooking | typeof cancelBooking | typeof completeBooking
  ) => {
    if (!business?.id) return;
    setActionLoading(true);
    const result = await action(booking, business.id);
    setActionLoading(false);

    if (!result.success) {
      showToast(result.error ?? "Ndodhi një gabim.", "error");
      return;
    }
    if (result.bookings) setBookings(result.bookings);
    if (result.error) {
      showToast(result.error, "info");
    } else {
      showToast("Statusi u ndryshua me sukses.", "success");
    }
    closeDrawer();
  };

  const handleExportReport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch('/api/export-report', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Gabim i panjohur');
      showToast('✅ ' + data.message, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gabim i panjohur";
      showToast('❌ ' + message, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading || !business) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-[#8888aa] text-sm">
        Loading bookings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 lg:p-8 text-[#e8e8f0] font-sans">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Rezervimet</h1>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={handleExportReport}
            disabled={exportLoading}
            className="bg-[#1e1e35] border border-[rgba(120,120,255,0.12)] hover:border-[rgba(120,120,255,0.22)] text-[#8888aa] hover:text-[#e8e8f0] rounded-lg px-4 py-2 text-sm transition-all duration-150 disabled:opacity-50"
          >
            {exportLoading ? 'Duke gjeneruar...' : 'Eksporto Raportin (.txt)'}
          </button>
        </div>
      </div>

      <div className="bg-[#151522] border border-[rgba(120,120,255,0.12)] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[rgba(120,120,255,0.12)]">
          <h2 className="text-lg font-semibold">Të gjitha rezervimet</h2>
        </div>
        <div className="overflow-x-auto">
          {bookings.length === 0 ? (
            <div className="p-12 text-center text-[#8888aa]">
              Nuk ka asnjë rezervim.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[rgba(120,120,255,0.12)] bg-[#1e1e35]/30">
                  <th className="py-4 px-6 font-medium text-[#8888aa]">Customer</th>
                  <th className="py-4 px-6 font-medium text-[#8888aa]">Service</th>
                  <th className="py-4 px-6 font-medium text-[#8888aa]">Date & Time</th>
                  <th className="py-4 px-6 font-medium text-[#8888aa]">Status</th>
                  <th className="py-4 px-6 font-medium text-[#8888aa] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(120,120,255,0.08)]">
                {bookings.map(b => {
                  const dt = new Date(b.appointmentAt);
                  return (
                    <tr 
                      key={b.id} 
                      className="hover:bg-[rgba(120,120,255,0.02)] transition-colors cursor-pointer"
                      onClick={() => { setSelectedBooking(b); setDrawerOpen(true) }}
                    >
                      <td className="py-4 px-6">
                        <div className="font-medium text-[#e8e8f0]">{b.customerName}</div>
                        <div className="text-xs text-[#5a5a7a] mt-0.5">{b.customerPhone}</div>
                      </td>
                      <td className="py-4 px-6 text-[#8888aa]">
                        {getServiceName(b.serviceId)}
                      </td>
                      <td className="py-4 px-6 text-[#8888aa]">
                        <div>{dt.toLocaleDateString()}</div>
                        <div className="text-xs text-[#5a5a7a] mt-0.5">
                          {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusColors[b.status as BookingStatus] || ''}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {b.status === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAction(b, confirmBooking) }}
                              className="p-1.5 rounded-lg bg-green-400/10 text-green-400 hover:bg-green-400/20 transition-all duration-150"
                              aria-label="Accept booking"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleAction(b, cancelBooking) }}
                              className="p-1.5 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-all duration-150"
                              aria-label="Decline booking"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="text-right text-[#5a5a7a]">—</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer Panel */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#0f0f1a] border-l border-[rgba(120,120,255,0.15)] z-50 transform transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedBooking && (
          <div className="flex flex-col h-full">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[rgba(120,120,255,0.12)]">
              <h2 className="text-lg font-bold text-[#e8e8f0]">Detajet e Rezervimit</h2>
              <button
                onClick={closeDrawer}
                className="p-2 rounded-lg hover:bg-[#1e1e35] text-[#8888aa] hover:text-[#e8e8f0] transition-all duration-150"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center gap-4 text-[#8888aa]">
                <div className="p-3 rounded-xl bg-[#1e1e35] text-[#4f8ef7]">
                  <User size={20} />
                </div>
                <div>
                  <p className="text-xs text-[#5a5a7a] mb-0.5">Klienti</p>
                  <p className="font-medium text-[#e8e8f0]">{selectedBooking.customerName}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[#8888aa]">
                <div className="p-3 rounded-xl bg-[#1e1e35] text-[#4f8ef7]">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-xs text-[#5a5a7a] mb-0.5">Telefoni</p>
                  <p className="font-medium text-[#e8e8f0]">{selectedBooking.customerPhone}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-[#8888aa]">
                <div className="p-3 rounded-xl bg-[#1e1e35] text-[#8b5cf6]">
                  <Scissors size={20} />
                </div>
                <div>
                  <p className="text-xs text-[#5a5a7a] mb-0.5">Shërbimi</p>
                  <p className="font-medium text-[#e8e8f0]">{getServiceName(selectedBooking.serviceId)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-[#8888aa]">
                  <div className="p-3 rounded-xl bg-[#1e1e35]">
                    <Calendar size={18} className="text-[#8888aa]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#5a5a7a] mb-0.5">Data</p>
                    <p className="font-medium text-[#e8e8f0]">{new Date(selectedBooking.appointmentAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-[#8888aa]">
                  <div className="p-3 rounded-xl bg-[#1e1e35]">
                    <Clock size={18} className="text-[#8888aa]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#5a5a7a] mb-0.5">Ora</p>
                    <p className="font-medium text-[#e8e8f0]">
                      {new Date(selectedBooking.appointmentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[rgba(120,120,255,0.08)]">
                <p className="text-xs text-[#5a5a7a] mb-3">Statusi i rezervimit</p>
                <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${statusColors[selectedBooking.status as BookingStatus] || ''}`}>
                  {selectedBooking.status}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-6 border-t border-[rgba(120,120,255,0.12)] space-y-3 bg-[#0a0a0f]">
              {selectedBooking.status === "pending" && (
                <>
                  <button
                    onClick={() => handleAction(selectedBooking, confirmBooking)}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-lg bg-green-400/15 text-green-400 font-semibold text-sm hover:bg-green-400/25 transition-all duration-150 disabled:opacity-50"
                  >
                    {actionLoading ? "Duke u procesuar..." : "✓ Konfirmo Rezervimin"}
                  </button>
                  <button
                    onClick={() => handleAction(selectedBooking, cancelBooking)}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-lg bg-red-400/10 text-red-400 font-semibold text-sm hover:bg-red-400/20 transition-all duration-150 disabled:opacity-50"
                  >
                    {actionLoading ? "..." : "✗ Refuzo"}
                  </button>
                </>
              )}

              {selectedBooking.status === "confirmed" && (
                <>
                  <button
                    onClick={() => handleAction(selectedBooking, completeBooking)}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold text-sm hover:opacity-90 transition-all duration-150 disabled:opacity-50"
                  >
                    {actionLoading ? "Duke u procesuar..." : "✓ Shëno si Kompletuar"}
                  </button>
                  <button
                    onClick={() => handleAction(selectedBooking, cancelBooking)}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-lg bg-red-400/10 text-red-400 font-semibold text-sm hover:bg-red-400/20 transition-all duration-150 disabled:opacity-50"
                  >
                    {actionLoading ? "..." : "Anulo Rezervimin"}
                  </button>
                </>
              )}

              {(selectedBooking.status === "completed" || selectedBooking.status === "cancelled") && (
                <p className="text-center text-sm text-[#5a5a7a] py-2 bg-[rgba(120,120,255,0.05)] rounded-lg">
                  Ky rezervim është i mbyllur dhe nuk mund të ndryshohet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-lg border text-sm font-medium shadow-lg transition-all duration-300 ${TOAST_COLORS[toast.kind]}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
