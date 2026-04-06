'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { registerBusiness, checkSubdomainAvailability, setCurrentBusiness } from "@/lib/store";
import { IndustryType, SocialLinks } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Instagram,
  Facebook,
  MessageCircle,
  Loader2,
  AlertCircle,
  XCircle,
  Rocket,
  Building2,
} from "lucide-react";
import { validateKosovoPhone, generateSubdomain } from "@/lib/validators";

const templates = [
  { id: "classic", name: "Classic Barbershop", industry: "barbershop", preview: "/classic_barbershop_preview_1774863170934.png" },
  { id: "bold", name: "Barbershop Bold", industry: "barbershop", preview: "/barbershop_bold_preview_1774863117010.png" },
  { id: "clinic", name: "Modern Clinic", industry: "clinic", preview: "/modern_clinic_preview_1774863200431.png" },
  { id: "salon", name: "Elegant Salon", industry: "beauty-salon", preview: "/elegant_salon_preview_modern_restaurant_preview_1774863353896.png" },
  { id: "restaurant", name: "Minimal Restaurant", industry: "restaurant", preview: "/elegant_salon_preview_modern_restaurant_preview_1774863353896.png" },
];

export default function NewBusinessPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    industry: "" as IndustryType,
    template: "classic",
    phone: "",
    description: "",
    address: "",
    logoUrl: "",
    accentColor: "#2563eb",
    socialLinks: { instagram: "", facebook: "", whatsapp: "" } as SocialLinks,
  });

  // Get current user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
    });
  }, []);

  // Debounced subdomain check
  useEffect(() => {
    if (!form.subdomain || form.subdomain.length < 3) {
      setSubdomainAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSubdomain(true);
      const available = await checkSubdomainAvailability(form.subdomain);
      setSubdomainAvailable(available);
      setCheckingSubdomain(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [form.subdomain]);

  const updateSubdomain = (name: string) => {
    const slug = generateSubdomain(name);
    setForm(f => ({ ...f, name, subdomain: slug }));
  };

  const handleStep1Submit = () => {
    setError(null);
    if (!form.name || !form.subdomain || !form.industry) {
      setError("Please fill in all required business details.");
      return;
    }
    if (subdomainAvailable === false) {
      setError("This subdomain is already taken.");
      return;
    }
    if (form.phone && !validateKosovoPhone(form.phone)) {
      setError("Invalid Kosovo phone number format.");
      return;
    }

    // Auto-select first matching template for industry
    const firstMatch = templates.find(t => t.industry === form.industry);
    if (firstMatch) {
      setForm(f => ({ ...f, template: firstMatch.id }));
    }

    setStep(2);
  };

  const handleFinalSubmit = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const newBusinessId = await registerBusiness({ ...form, ownerId: userId });
      setCurrentBusiness(newBusinessId);
      setSuccess(true);
      setStep(4);
    } catch (err: any) {
      setError(err.message || "Failed to register business.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleGoToDashboard = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div className="max-w-lg mx-auto py-6">
      <div className="text-center mb-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-3">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Register New Business</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {success ? "Your new business is ready!" : `Step ${step} of 3`}
        </p>
      </div>

      {/* Step indicator */}
      {!success && (
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-card border rounded-xl p-6 shadow-sm">
        {/* Step 1: Business Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Business Info</h3>
            <div className="space-y-2">
              <Label htmlFor="name">Business Name *</Label>
              <Input id="name" value={form.name} onChange={e => updateSubdomain(e.target.value)} placeholder="e.g. Barber Prishtina" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdomain *</Label>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Input
                    id="subdomain"
                    value={form.subdomain}
                    onChange={e => setForm(f => ({ ...f, subdomain: generateSubdomain(e.target.value) }))}
                    placeholder="barber-prishtina"
                    required
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">.lokalweb.com</span>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  {form.subdomain.length >= 3 && (
                    <div className="flex items-center gap-1 text-[10px]">
                      {checkingSubdomain ? (
                        <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="h-2 w-2 animate-spin" /> Checking...</span>
                      ) : subdomainAvailable ? (
                        <span className="text-green-600 flex items-center gap-1"><Check className="h-2 w-2" /> Available</span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1"><XCircle className="h-2 w-2" /> Already taken</span>
                      )}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">Preview: {form.subdomain || "your-slug"}.lokalweb.com</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Industry *</Label>
              <Select value={form.industry} onValueChange={v => setForm(f => ({ ...f, industry: v as IndustryType }))}>
                <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="barbershop">Barbershop</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="beauty-salon">Beauty Salon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Kosovo)</Label>
              <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+38349123123" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. Rr. Agim Ramadani, Prishtinë" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!form.name || !form.industry || subdomainAvailable === false || checkingSubdomain}
                onClick={handleStep1Submit}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Template & Extras */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block">Choose Your Template</Label>
              <div className="grid grid-cols-1 gap-4">
                {templates.filter(t => t.industry === form.industry).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, template: t.id }))}
                    className={`relative group overflow-hidden rounded-xl border-2 transition-all text-left ${form.template === t.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                      }`}
                  >
                    <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                      <img
                        src={t.preview}
                        alt={t.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4 flex items-center justify-between bg-card text-foreground">
                      <div>
                        <p className="font-bold text-sm">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Responsive Template</p>
                      </div>
                      {form.template === t.id && (
                        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
                {templates.filter(t => t.industry === form.industry).length === 0 && (
                  <div className="p-8 text-center border-2 border-dashed rounded-xl text-muted-foreground">
                    No specific templates for this industry. Default selected.
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="logo">Logo</Label>
                <span className="text-[10px] text-muted-foreground">You can add this later</span>
              </div>
              <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} className="mt-1" />
              {form.logoUrl && (
                <img src={form.logoUrl} alt="Logo preview" className="mt-2 h-16 w-16 object-contain rounded-lg border" />
              )}
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Social Links</Label>
                <span className="text-[10px] text-muted-foreground">You can add this later</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input placeholder="Instagram URL" value={form.socialLinks.instagram} onChange={e => setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, instagram: e.target.value } }))} />
                </div>
                <div className="flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input placeholder="Facebook URL" value={form.socialLinks.facebook} onChange={e => setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, facebook: e.target.value } }))} />
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input placeholder="WhatsApp number" value={form.socialLinks.whatsapp} onChange={e => setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, whatsapp: e.target.value } }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button className="flex-1" onClick={() => setStep(3)}>
                Review Details <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-foreground">Confirm Your Details</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: "Business Name", value: form.name },
                { label: "Subdomain", value: `${form.subdomain}.lokalweb.com`, color: "text-primary font-medium" },
                { label: "Industry", value: form.industry.replace("-", " "), className: "capitalize" },
                { label: "Selected Template", value: templates.find(t => t.id === form.template)?.name || form.template, className: "font-bold text-primary" },
                { label: "Phone", value: form.phone || "—" },
                { label: "Address", value: form.address || "—" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={`font-medium text-foreground ${item.color || ""} ${item.className || ""}`}>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button className="flex-1" size="lg" disabled={loading} onClick={handleFinalSubmit}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                🚀 Launch My Website
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && success && (
          <div className="space-y-6 py-4 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 mb-2">
              <Rocket className="h-8 w-8 text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Business Created!</h2>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">{form.name}</span> is now live at{" "}
                <span className="font-semibold text-primary">{form.subdomain}.lokalweb.com</span>
              </p>
            </div>
            <div className="pt-4 border-t space-y-3">
              <Button className="w-full" size="lg" onClick={handleGoToDashboard}>
                Go to Dashboard
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(`/${form.subdomain}`, "_blank")}
              >
                View Website
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
