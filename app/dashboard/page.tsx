'use client'
import { useEffect, useState } from "react";
import { Business, Booking, Service } from "@/lib/types";
import { getBookings, getServices, getCurrentBusiness } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, AlertCircle } from "lucide-react";

export default function OverviewPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);

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
        setBookings(bks || []);
        setServices(svcs || []);
      } catch (err) {
        console.error("Failed to load overview data", err);
      }
    })();
  }, [business?.id]);

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        Loading overview...
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-xl border-muted">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold text-foreground">No Business Profile Found</h2>
        <p className="text-muted-foreground max-w-sm mt-2">
          Your account is logged in, but we couldn't find a business record. This usually happens if there was an error during the registration process.
        </p>
        <p className="text-xs text-muted-foreground mt-8">
          Please contact support or try registering again with a different email.
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const todayBookings = (bookings || []).filter(b => b?.appointmentAt?.startsWith(today));
  const pending = (bookings || []).filter(b => b?.status === "pending").length;
  const totalBookings = (bookings || []).length;

  const stats = [
    { label: "Today's Bookings", value: todayBookings.length, icon: Calendar, color: "text-primary" },
    { label: "This Week", value: totalBookings, icon: Clock, color: "text-primary" },
    { label: "Pending", value: pending, icon: AlertCircle, color: "text-warning" },
  ];

  const getServiceName = (serviceId: string | null) =>
    serviceId == null ? 'Reservation' : (services.find(s => s.id === serviceId)?.name || 'Unknown');

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Overview</h1>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {(bookings || []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {(bookings || []).slice(0, 5).map(b => {
                const dt = new Date(b.appointmentAt);
                return (
                  <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-foreground text-sm">{b.customerName}</p>
                      <p className="text-xs text-muted-foreground">{getServiceName(b.serviceId)} · {dt.toLocaleDateString()} at {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    confirmed: "bg-success/10 text-success",
    pending: "bg-warning/10 text-warning",
    cancelled: "bg-destructive/10 text-destructive",
    completed: "bg-primary/10 text-primary",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || ""}`}>
      {status}
    </span>
  );
}
