'use client'

import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  Facebook,
  Globe2,
  Instagram,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Trash2,
} from "lucide-react";
import { Business } from "@/lib/types";
import { getCurrentBusiness } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { publicSiteLabel } from "@/lib/utils";

type ProfileForm = {
  name: string;
  phone: string;
  address: string;
  city: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  tiktok: string;
};

const emptyForm: ProfileForm = {
  name: "",
  phone: "",
  address: "",
  city: "",
  instagram: "",
  facebook: "",
  whatsapp: "",
  tiktok: "",
};

const cardClass = "bg-[#151522] border-[rgba(120,120,255,0.12)]";
const inputClass = "mt-1 bg-[#1e1e35] border-[rgba(120,120,255,0.12)]";
const labelClass = "text-xs text-[#8888aa]";

export default function ProfilePage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getCurrentBusiness()
      .then(biz => {
        if (!biz) return;

        setBusiness(biz);
        setBookingEnabled(biz.bookingEnabled !== false);
        setForm({
          name: biz.name || "",
          phone: biz.phone || "",
          address: biz.address || "",
          city: biz.socialLinks?.city || "",
          instagram: biz.socialLinks?.instagram || "",
          facebook: biz.socialLinks?.facebook || "",
          whatsapp: biz.socialLinks?.whatsapp || "",
          tiktok: biz.socialLinks?.tiktok || "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!business) return;

    setSaving(true);
    try {
      const socialLinks = {
        instagram: form.instagram,
        facebook: form.facebook,
        whatsapp: form.whatsapp,
        tiktok: form.tiktok,
        city: form.city,
      };

      const supabase = createClient();
      const { error } = await supabase
        .from("businesses")
        .update({
          name: form.name,
          phone: form.phone,
          address: form.address,
          social_links: socialLinks,
        })
        .eq("id", business.id);

      if (error) throw error;

      setBusiness({
        ...business,
        name: form.name,
        phone: form.phone,
        address: form.address,
        socialLinks,
      });
      toast({ title: "Ndryshimet u ruajtën" });
    } catch (err) {
      console.error("Failed to save business profile", err);
      toast({ title: "Nuk u ruajt profili", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleBookingToggle = async (checked: boolean) => {
    if (!business) return;

    const previous = bookingEnabled;
    setBookingEnabled(checked);
    setSavingBooking(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("businesses")
        .update({ booking_enabled: checked })
        .eq("id", business.id);

      if (error) throw error;

      setBusiness({ ...business, bookingEnabled: checked });
      toast({ title: checked ? "Rezervimet u aktivizuan" : "Rezervimet u çaktivizuan" });
    } catch (err) {
      console.error("Failed to update booking setting", err);
      setBookingEnabled(previous);
      toast({ title: "Nuk u përditësua sistemi i rezervimeve", variant: "destructive" });
    } finally {
      setSavingBooking(false);
    }
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Na kontaktoni në support@lokalweb.com",
      description: "Fshirja e llogarisë kërkon verifikim nga ekipi ynë.",
    });
  };

  if (loading || !business) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-muted-foreground text-sm">
        Duke ngarkuar profilin...
      </div>
    );
  }

  return (
    <div className="pb-12">
      <h1 className="text-2xl font-bold text-foreground mb-6">Profili i Biznesit</h1>

      <div className="grid gap-6 max-w-2xl">
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Biznesi yt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className={labelClass}>Emri i biznesit</Label>
              <Input
                value={form.name}
                onChange={e => updateField("name", e.target.value)}
                placeholder="Emri i biznesit"
                className={inputClass}
              />
            </div>

            <div>
              <Label className={labelClass}>Nën-domeni</Label>
              <div className="mt-1 flex items-center gap-3 rounded-md border border-[rgba(120,120,255,0.12)] bg-[#1e1e35] px-3 py-2 text-sm text-primary">
                <Globe2 className="h-4 w-4 text-muted-foreground" />
                {publicSiteLabel(business.subdomain)}
              </div>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md border border-[rgba(120,120,255,0.12)] bg-[#1e1e35] p-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Sistem rezervimesh
                </Label>
                <p className="text-xs text-muted-foreground">
                  Klientët mund të rezervojnë takim direkt nga faqja jote.
                </p>
              </div>
              <Switch
                checked={bookingEnabled}
                disabled={savingBooking}
                onCheckedChange={handleBookingToggle}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-lg">Kontakti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-[#8888aa] flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                Telefoni
              </Label>
              <Input
                value={form.phone}
                onChange={e => updateField("phone", e.target.value)}
                placeholder="+383 44 000 000"
                className={inputClass}
              />
            </div>

            <div>
              <Label className="text-xs text-[#8888aa] flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Adresa
              </Label>
              <Input
                value={form.address}
                onChange={e => updateField("address", e.target.value)}
                placeholder="Rr. Agim Ramadani"
                className={inputClass}
              />
            </div>

            <div>
              <Label className={labelClass}>Qyteti</Label>
              <Input
                value={form.city}
                onChange={e => updateField("city", e.target.value)}
                placeholder="Prishtinë"
                className={inputClass}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-lg">Rrjetet sociale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-[#8888aa] flex items-center gap-2">
                <Instagram className="h-3.5 w-3.5" />
                Instagram
              </Label>
              <Input
                value={form.instagram}
                onChange={e => updateField("instagram", e.target.value)}
                placeholder="https://instagram.com/..."
                className={inputClass}
              />
            </div>

            <div>
              <Label className="text-xs text-[#8888aa] flex items-center gap-2">
                <Facebook className="h-3.5 w-3.5" />
                Facebook
              </Label>
              <Input
                value={form.facebook}
                onChange={e => updateField("facebook", e.target.value)}
                placeholder="https://facebook.com/..."
                className={inputClass}
              />
            </div>

            <div>
              <Label className="text-xs text-[#8888aa] flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </Label>
              <Input
                value={form.whatsapp}
                onChange={e => updateField("whatsapp", e.target.value)}
                placeholder="+383 44 000 000"
                className={inputClass}
              />
            </div>

            <div>
              <Label className="text-xs text-[#8888aa] flex items-center gap-2">
                <Music2 className="h-3.5 w-3.5" />
                TikTok
              </Label>
              <Input
                value={form.tiktok}
                onChange={e => updateField("tiktok", e.target.value)}
                placeholder="https://tiktok.com/@..."
                className={inputClass}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#151522] border-[rgba(239,68,68,0.3)]">
          <CardHeader>
            <CardTitle className="text-lg text-red-400 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Zona e rrezikshme
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Për fshirjen e llogarisë duhet verifikim nga ekipi i LokalWeb.
            </p>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 hover:text-red-300"
                >
                  Fshij llogarinë
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Konfirmo kërkesën</AlertDialogTitle>
                  <AlertDialogDescription>
                    Fshirja e llogarisë nuk bëhet direkt nga kjo faqe. Pas konfirmimit do të shfaqet kontakti për support.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anulo</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                    onClick={handleDeleteAccount}
                  >
                    Konfirmo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          size="lg"
          disabled={saving}
          className="w-full bg-gradient-to-r from-blue-600 to-violet-500 text-white hover:from-blue-500 hover:to-violet-400"
        >
          {saving ? "Duke ruajtur..." : "Ruaj ndryshimet"}
        </Button>
      </div>
    </div>
  );
}
