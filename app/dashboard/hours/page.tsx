'use client'
import { useEffect, useState } from "react";
import { Business, BusinessHours } from "@/lib/types";
import { getBusinessHours, saveBusinessHours, getCurrentBusiness } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function BusinessHoursPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [hours, setHours] = useState<BusinessHours[]>([]);

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
        const data = await getBusinessHours(business.id);
        setHours(data);
      } catch (err) {
        console.error("Failed to load business hours", err);
      }
    })();
  }, [business?.id]);

  const update = (dayOfWeek: number, field: keyof BusinessHours, value: string | boolean) => {
    setHours(prev => prev.map(h => h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h));
  };

  const handleSave = async () => {
    if (!business?.id) return;
    try {
      await saveBusinessHours(hours);
      toast({ title: "Business hours saved" });
    } catch (err) {
      console.error("Failed to save business hours", err);
      toast({ title: "Failed to save business hours", variant: "destructive" });
    }
  };

  if (loading || !business) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        Loading business hours...
      </div>
    );
  }
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Business Hours</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hours.map(h => (
              <div key={h.dayOfWeek} className="flex items-center gap-4 py-2 border-b last:border-0">
                <span className="w-24 text-sm font-medium text-foreground">{dayNames[h.dayOfWeek]}</span>
                <Switch checked={h.isOpen} onCheckedChange={v => update(h.dayOfWeek, 'isOpen', v)} />
                {h.isOpen ? (
                  <div className="flex items-center gap-2">
                    <Input type="time" value={h.openTime} onChange={e => update(h.dayOfWeek, 'openTime', e.target.value)} className="w-32" />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input type="time" value={h.closeTime} onChange={e => update(h.dayOfWeek, 'closeTime', e.target.value)} className="w-32" />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            ))}
          </div>
          <Button className="mt-6" onClick={handleSave}>Save Hours</Button>
        </CardContent>
      </Card>
    </div>
  );
}

