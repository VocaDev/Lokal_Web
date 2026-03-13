import { useOutletContext } from "react-router-dom";
import { Business } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, AlertCircle } from "lucide-react";

export default function OverviewPage() {
  const { business } = useOutletContext<{ business: Business }>();
  const today = new Date().toISOString().split("T")[0];
  const todayBookings = business.bookings.filter(b => b.date === today);
  const pending = business.bookings.filter(b => b.status === "pending").length;

  const stats = [
    { label: "Today's Bookings", value: todayBookings.length, icon: Calendar, color: "text-primary" },
    { label: "This Week", value: business.bookings.length, icon: Clock, color: "text-primary" },
    { label: "Pending", value: pending, icon: AlertCircle, color: "text-warning" },
  ];

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
          {business.bookings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {business.bookings.slice(0, 5).map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-foreground text-sm">{b.customerName}</p>
                    <p className="text-xs text-muted-foreground">{b.serviceName} · {b.date} at {b.time}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
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
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || ""}`}>
      {status}
    </span>
  );
}
