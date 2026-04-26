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
import { publicSiteLabel } from "@/lib/utils";

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
    subdomain: "",
  });

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

  const handleSubmit = async () => {
    setError(null);
    if (!validateEmail(auth.email)) {
      setError("Ju lutem shënoni një email valid.");
      return;
    }
    if (!validatePassword(auth.password).valid) {
      setError("Fjalë" + "kalimi duhet të ketë së paku 8 karaktere.");
      return;
    }
    if (!form.subdomain) {
      setError("Ju lutem shënoni një subdomain.");
      return;
    }
    if (subdomainAvailable === false) {
      setError("Ky subdomain është i zënë.");
      return;
    }

    setLoading(true);
    try {
      // 1. Sign up user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: auth.email,
        password: auth.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (signUpError) throw signUpError;
      
      if (data.user) {
        // 2. Create business record with placeholders
        const { error: bizError } = await supabase
          .from("businesses")
          .insert({
            owner_id: data.user.id,
            subdomain: form.subdomain,
            name: form.subdomain, // temp placeholder
            industry: 'other', // canonical placeholder — user picks real industry in wizard/profile
            website_builder_completed: false
          });

        if (bizError) throw bizError;
        
        setStep(2); // Go to verification message
      }
    } catch (err: any) {
      setError(err.message || "Regjistrimi dështoi. Ju lutem provoni përsëri.");
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
          <h1 className="text-2xl font-bold text-foreground">Krijo llogarinë tënde</h1>
          <p className="text-muted-foreground mt-1">Hapi {step} nga 2</p>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2 mb-6">
          {[1, 2].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Gabim</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-card border rounded-xl p-6 shadow-sm">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={auth.email}
                    onChange={e => setAuth(a => ({ ...a, email: e.target.value }))}
                    placeholder="email@shembull.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Fjalë{"kalimi"}</Label>
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
                      <p className="text-xs text-muted-foreground capitalize">Siguria: {strength}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="subdomain">Subdomain i website-it</Label>
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <Input
                        id="subdomain"
                        value={form.subdomain}
                        onChange={e => setForm({ subdomain: generateSubdomain(e.target.value) })}
                        placeholder="emri-i-biznesit"
                        required
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">.lokalweb.com</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      {form.subdomain.length >= 3 && (
                        <div className="flex items-center gap-1 text-[10px]">
                          {checkingSubdomain ? (
                            <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="h-2 w-2 animate-spin" /> Duke kontrolluar...</span>
                          ) : subdomainAvailable ? (
                            <span className="text-green-600 flex items-center gap-1"><Check className="h-2 w-2" /> I lirë</span>
                          ) : (
                            <span className="text-red-500 flex items-center gap-1"><XCircle className="h-2 w-2" /> I zënë</span>
                          )}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">Preview: {publicSiteLabel(form.subdomain || "slug-juaj")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={loading || !auth.email || !auth.password || !form.subdomain || subdomainAvailable === false || checkingSubdomain}
                onClick={handleSubmit}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Krijo Llogarinë <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 py-4 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-2">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Kontrollo email-in</h2>
                <p className="text-muted-foreground">
                  Dërguam një link verifikimi në <span className="font-semibold text-foreground">{auth.email}</span>. Ju lutem klikoni linkun për të verifikuar llogarinë.
                </p>
              </div>
              <div className="pt-4 border-t space-y-4">
                <p className="text-sm text-muted-foreground">Nuk e keni pranuar email-in?</p>
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={resendCooldown > 0}
                  className="w-full"
                >
                  {resendCooldown > 0 ? `Ridërgo pas ${resendCooldown}s` : "Ridërgo Email-in e Verifikimit"}
                </Button>
                <Button variant="ghost" onClick={() => router.push("/login")} className="text-xs">
                  Kthehu te login
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
