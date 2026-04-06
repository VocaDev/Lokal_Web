'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { registerBusiness, checkSubdomainAvailability } from "@/lib/store";
import { IndustryType, SocialLinks } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Instagram,
  Facebook,
  MessageCircle,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  XCircle,
  Mail
} from "lucide-react";
import {
  validateKosovoPhone,
  validateEmail,
  validatePassword,
  generateSubdomain,
  PasswordStrength
} from "@/lib/validators";

const templates = [
  // Barbershop
  { id: "bold", name: "Barbershop Bold", industry: "barbershop", preview: "/screenshots/barbershop-bold.png" },
  { id: "minimal", name: "Barbershop Minimal", industry: "barbershop", preview: "/screenshots/barbershop-minimal.png" },
  { id: "modern", name: "Barbershop Modern", industry: "barbershop", preview: "/screenshots/barbershop-modern.png" },
  // Restaurant
  { id: "elegant", name: "Restaurant Elegant", industry: "restaurant", preview: "/screenshots/restaurant-elegant.png" },
  { id: "casual", name: "Restaurant Casual", industry: "restaurant", preview: "/screenshots/restaurant-casual.png" },
  { id: "bistro", name: "Restaurant Bistro", industry: "restaurant", preview: "/screenshots/restaurant-bistro.png" },
  // Clinic
  { id: "clean", name: "Clinic Clean", industry: "clinic", preview: "/screenshots/clinic-clean.png" },
  { id: "modern", name: "Clinic Modern", industry: "clinic", preview: "/screenshots/clinic-modern.png" },
  { id: "premium", name: "Clinic Premium", industry: "clinic", preview: "/screenshots/clinic-premium.png" },
  // Beauty Salon
  { id: "luxury", name: "Beauty Luxury", industry: "beauty-salon", preview: "/screenshots/beauty-salon-luxury.png" },
  { id: "minimal", name: "Beauty Minimal", industry: "beauty-salon", preview: "/screenshots/beauty-salon-minimal.png" },
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [auth, setAuth] = useState({
    email: "",
    password: "",
  });

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

  const [userId, setUserId] = useState<string | null>(null);

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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const updateSubdomain = (name: string) => {
    const slug = generateSubdomain(name);
    setForm(f => ({ ...f, name, subdomain: slug }));
  };

  const handleStep1Submit = async () => {
    setError(null);
    if (!validateEmail(auth.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!validatePassword(auth.password).valid) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!form.name || !form.subdomain || !form.industry) {
      setError("Please fill in all business details.");
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

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: auth.email,
        password: auth.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (signUpError) throw signUpError;
      if (data.user) {
        setUserId(data.user.id);
        
        // Auto-select first matching template for industry
        const firstMatch = templates.find(t => t.industry === form.industry);
        if (firstMatch) {
          setForm(f => ({ ...f, template: firstMatch.id }));
        }
        
        setStep(2);
      }
    } catch (err: any) {
      setError(err.message || "Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      await registerBusiness({ ...form, ownerId: userId });
      setStep(4);
    } catch (err: any) {
      setError(err.message || "Failed to register business.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: auth.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });
      setResendCooldown(60);
    } catch (err) {
      console.error("Resend failed", err);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const { strength } = validatePassword(auth.password);
  const strengthColor = strength === 'strong' ? 'bg-green-500' : strength === 'fair' ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 cursor-pointer" onClick={() => router.push("/")}>
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">LW</span>
            </div>
            <span className="font-bold text-lg text-foreground">LokalWeb</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Register Your Business</h1>
          <p className="text-muted-foreground mt-1">Step {step} of 4</p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-4 pb-4 border-b">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Account Details</h3>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={auth.email}
                    onChange={e => setAuth(a => ({ ...a, email: e.target.value }))}
                    placeholder="email@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={auth.password}
                      onChange={e => setAuth(a => ({ ...a, password: e.target.value }))}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {auth.password && (
                    <div className="space-y-1">
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${strengthColor}`} style={{ width: strength === 'strong' ? '100%' : strength === 'fair' ? '60%' : '30%' }} />
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">Strength: {strength}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Business Info</h3>
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name</Label>
                  <Input id="name" value={form.name} onChange={e => updateSubdomain(e.target.value)} placeholder="e.g. Barber Prishtina" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subdomain">Subdomain</Label>
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
                      <span className="text-xs text-[#5a5a7a]">Preview: {form.subdomain || "your-slug"}.lokalweb.com</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Kosovo)</Label>
                  <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+38349123123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. Rr. Agim Ramadani, Prishtinë" />
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={loading || !auth.email || !auth.password || !form.name || subdomainAvailable === false || checkingSubdomain}
                onClick={handleStep1Submit}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Account & Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

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

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Confirm Your Details</h2>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Email", value: auth.email },
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
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "🚀 Launch My Website"}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 py-4 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Check your email</h2>
                <p className="text-muted-foreground">
                  We sent a verification link to <span className="font-semibold text-foreground">{auth.email}</span>. Please click the link to verify your account.
                </p>
              </div>
              <div className="pt-4 border-t space-y-4">
                <p className="text-sm text-muted-foreground">Didn't receive the email?</p>
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={resendCooldown > 0}
                  className="w-full"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Verification Email"}
                </Button>
                <Button variant="ghost" onClick={() => router.push("/login")} className="text-xs">
                  Back to login
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
