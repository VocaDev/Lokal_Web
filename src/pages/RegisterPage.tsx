import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registerBusiness } from "@/lib/store";
import { IndustryType, SocialLinks } from "@/lib/types";
import { ArrowLeft, ArrowRight, Check, Instagram, Facebook, MessageCircle } from "lucide-react";

const accentColors = [
  { name: "Blue", value: "#2563eb" },
  { name: "Emerald", value: "#059669" },
  { name: "Orange", value: "#ea580c" },
  { name: "Purple", value: "#7c3aed" },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    industry: "" as IndustryType,
    phone: "",
    description: "",
    address: "",
    logoUrl: "",
    accentColor: accentColors[0].value,
    socialLinks: { instagram: "", facebook: "", whatsapp: "" } as SocialLinks,
  });

  const handleSubmit = async () => {
    if (!form.name || !form.subdomain || !form.industry) return;
    try {
      const business = await registerBusiness(form);
      navigate('/register/success', { state: { business } });
    } catch (err) {
      console.error("Failed to register business", err);
    }
  };

  const updateSubdomain = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setForm(f => ({ ...f, name, subdomain: slug }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const canProceedStep1 = form.name && form.subdomain && form.industry;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 cursor-pointer" onClick={() => navigate("/")}>
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">LW</span>
            </div>
            <span className="font-bold text-lg text-foreground">LokalWeb</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Register Your Business</h1>
          <p className="text-muted-foreground mt-1">Step {step} of 3</p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Business Name</Label>
                <Input id="name" value={form.name} onChange={e => updateSubdomain(e.target.value)} placeholder="e.g. Barber Prishtina" required />
              </div>
              <div>
                <Label htmlFor="subdomain">Subdomain</Label>
                <div className="flex items-center gap-2">
                  <Input id="subdomain" value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} placeholder="barber-prishtina" required />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">.lokalweb.com</span>
                </div>
              </div>
              <div>
                <Label>Industry</Label>
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
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+383 44 000 000" />
              </div>
              <div>
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Tell customers about your business..." rows={3} />
              </div>
              <Button className="w-full" size="lg" disabled={!canProceedStep1} onClick={() => setStep(2)}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label className="mb-3 block">Accent Color</Label>
                <div className="flex gap-3">
                  {accentColors.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, accentColor: c.value }))}
                      className={`h-12 w-12 rounded-xl border-2 transition-all flex items-center justify-center ${form.accentColor === c.value ? "border-foreground scale-110" : "border-transparent"
                        }`}
                      style={{ backgroundColor: c.value }}
                    >
                      {form.accentColor === c.value && <Check className="h-5 w-5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="logo">Logo</Label>
                <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} className="mt-1" />
                {form.logoUrl && (
                  <img src={form.logoUrl} alt="Logo preview" className="mt-2 h-16 w-16 object-contain rounded-lg border" />
                )}
              </div>
              <div>
                <Label className="mb-3 block">Social Links</Label>
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
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Confirm Your Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Business Name</span>
                  <span className="font-medium text-foreground">{form.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Subdomain</span>
                  <span className="font-medium text-primary">{form.subdomain}.lokalweb.com</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Industry</span>
                  <span className="font-medium text-foreground capitalize">{form.industry.replace("-", " ")}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium text-foreground">{form.phone || "—"}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Accent Color</span>
                  <div className="h-5 w-5 rounded-full" style={{ backgroundColor: form.accentColor }} />
                </div>
                {form.logoUrl && (
                  <div className="flex justify-between py-2 border-b items-center">
                    <span className="text-muted-foreground">Logo</span>
                    <img src={form.logoUrl} alt="Logo" className="h-8 w-8 rounded object-contain" />
                  </div>
                )}
                {form.description && (
                  <div className="py-2 border-b">
                    <span className="text-muted-foreground block mb-1">Description</span>
                    <span className="text-foreground">{form.description}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button className="flex-1" size="lg" onClick={handleSubmit}>
                  🚀 Launch My Website
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
