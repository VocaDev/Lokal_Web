'use client'
import { useEffect, useState } from "react";
import { Business } from "@/lib/types";
import { saveBusiness, getCurrentBusiness } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Phone, Globe, Building, MapPin, Instagram, Facebook, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [form, setForm] = useState({
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
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Business Profile</h1>
      <div className="grid gap-6 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{business.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground capitalize">{business.industry.replace("-", " ")}</span>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-primary">{business.subdomain}.lokalweb.com</span>
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

        <Button onClick={handleSave} size="lg">Save Changes</Button>
      </div>
    </div>
  );
}

