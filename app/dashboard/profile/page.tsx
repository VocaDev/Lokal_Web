'use client'
import { useEffect, useState } from "react";
import { Business, IndustryType } from "@/lib/types";
import { saveBusiness, getCurrentBusiness } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Globe, Building, MapPin, Instagram, Facebook, MessageCircle, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const templates = [
  { id: "classic", name: "Classic Barbershop", industry: "barbershop" },
  { id: "bold", name: "Barbershop Bold", industry: "barbershop" },
  { id: "clinic", name: "Modern Clinic", industry: "clinic" },
  { id: "salon", name: "Elegant Salon", industry: "beauty-salon" },
  { id: "restaurant", name: "Minimal Restaurant", industry: "restaurant" },
];

export default function ProfilePage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [form, setForm] = useState({
    industry: "barbershop" as IndustryType,
    template: "classic",
    phone: "",
    address: "",
    description: "",
    socialLinks: { instagram: "", facebook: "", whatsapp: "" },
  });

  useEffect(() => {
    getCurrentBusiness()
      .then(biz => {
        if (biz) {
          setBusiness(biz);
          setForm({
            industry: biz.industry,
            template: biz.template || "classic",
            phone: biz.phone,
            address: biz.address,
            description: biz.description,
            socialLinks: { ...biz.socialLinks },
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!business) return;
    const updated = { ...business, ...form };
    try {
      await saveBusiness(updated);
      setBusiness(updated);
      toast({ title: "Profile updated" });
    } catch (err) {
      console.error("Failed to save business profile", err);
      toast({ title: "Failed to update profile", variant: "destructive" });
    }
  };

  if (loading || !business) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="pb-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">Business Profile</h1>
      <div className="grid gap-6 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{business.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-primary">{business.subdomain}.lokalweb.com</span>
            </div>
            <div className="pt-2 space-y-4 border-t">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Building className="h-3.5 w-3.5" /> Industry</Label>
                <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v as IndustryType }))}>
                  <SelectTrigger className="capitalize"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barbershop">Barbershop</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                    <SelectItem value="beauty-salon">Beauty Salon</SelectItem>
                    <SelectItem value="custom">Custom (Development)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Palette className="h-3.5 w-3.5" /> Website Template</Label>
                <Select value={form.template} onValueChange={v => setForm(f => ({ ...f, template: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {templates.filter(t => t.industry === form.industry).map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                    {form.industry === 'custom' && (
                      <SelectItem value="bold">Test Template (Custom)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Changes apply immediately to your public website.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Phone</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+383 44 000 000" className="mt-1" />
            </div>
            <div>
              <Label className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> Address</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rr. Agim Ramadani, Prishtina" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Social Media</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="flex items-center gap-2"><Instagram className="h-3.5 w-3.5" /> Instagram</Label>
              <Input value={form.socialLinks.instagram} onChange={e => setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, instagram: e.target.value } }))} placeholder="https://instagram.com/..." className="mt-1" />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Facebook className="h-3.5 w-3.5" /> Facebook</Label>
              <Input value={form.socialLinks.facebook} onChange={e => setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, facebook: e.target.value } }))} placeholder="https://facebook.com/..." className="mt-1" />
            </div>
            <div>
              <Label className="flex items-center gap-2"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Label>
              <Input value={form.socialLinks.whatsapp} onChange={e => setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, whatsapp: e.target.value } }))} placeholder="+383 44 000 000" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} size="lg" className="w-full">Save Changes</Button>
      </div>
    </div>
  );
}
