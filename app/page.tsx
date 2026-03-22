'use client';

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Globe, Calendar, Smartphone, UserPlus, Palette, Rocket, Check, Menu, X, Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { useTheme } from 'next-themes';

const features = [
  { icon: Globe, title: "Your Own Website", description: "A professional website at yourname.lokalweb.com — live the moment you register. No waiting, no developers." },
  { icon: Calendar, title: "Online Bookings", description: "Customers book appointments 24/7. You confirm, cancel, and track everything from your dashboard." },
  { icon: Smartphone, title: "Mobile Ready", description: "Built mobile-first. Your site and dashboard look sharp on every screen, every device." },
];

const industries = [
  { name: "Barbershops", emoji: "✂️" },
  { name: "Restaurants", emoji: "🍽️" },
  { name: "Clinics", emoji: "🏥" },
  { name: "Beauty Salons", emoji: "💅" },
];

const steps = [
  { icon: UserPlus, title: "Register", description: "Sign up and enter your business details in under 2 minutes.", step: "01" },
  { icon: Palette, title: "Customize", description: "Choose your colors, upload a logo, add services and business hours.", step: "02" },
  { icon: Rocket, title: "Go Live", description: "Your website is instantly live with online booking built in.", step: "03" },
];

const planFeatures = [
  "Custom subdomain website",
  "Online booking system",
  "Business hours management",
  "Photo gallery",
  "Google Maps integration",
  "Social media links",
  "Mobile responsive design",
  "Customer notifications",
];

const stats = [
  { value: "2min", label: "Setup time" },
  { value: "24/7", label: "Bookings" },
  { value: "100%", label: "No-code" },
  { value: "€20", label: "Per month" },
];

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  };

  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="text-primary-foreground font-black text-xs tracking-tight">LW</span>
            </div>
            <span className="font-bold text-base tracking-tight">LokalWeb</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/login")} className="text-muted-foreground hover:text-foreground">
              Log In
            </Button>
            <Button size="sm" onClick={() => router.push("/register")} className="shadow-md shadow-primary/20">
              Get Started <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
          </div>

          {/* Mobile nav toggle */}
          <div className="flex md:hidden items-center gap-2">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="h-9 w-9 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl px-6 py-4 flex flex-col gap-3"
          >
            <Button variant="ghost" className="justify-start" onClick={() => { router.push("/login"); setMobileMenuOpen(false); }}>Log In</Button>
            <Button onClick={() => { router.push("/register"); setMobileMenuOpen(false); }}>Get Started <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </motion.div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-16 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-violet-500/8 rounded-full blur-[100px]" />
        </div>

        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 max-w-4xl w-full text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] mb-6"
          >
            Your Business,
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-400 to-violet-500 bg-clip-text text-transparent">
              Online in Minutes.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
          >
            LokalWeb gives every small business in Kosovo a professional website and
            online booking system — no code, no technical knowledge, no waiting.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Button
              size="lg"
              onClick={() => router.push("/register")}
              className="w-full sm:w-auto px-8 text-base font-semibold shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-shadow"
            >
              Start for Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push("/demo")}
              className="w-full sm:w-auto px-8 text-base border-border/60 hover:bg-secondary/50"
            >
              See Demo
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 grid grid-cols-4 gap-px rounded-2xl overflow-hidden border border-border/40 bg-border/20 max-w-lg mx-auto"
          >
            {stats.map((s) => (
              <div key={s.label} className="bg-background/80 backdrop-blur-sm px-4 py-4 text-center">
                <div className="text-xl font-black text-foreground">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
        >
          <span className="text-xs text-muted-foreground/50 tracking-widest uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            className="w-px h-8 bg-gradient-to-b from-muted-foreground/40 to-transparent"
          />
        </motion.div>
      </section>

      {/* ── INDUSTRIES ── */}
      <section className="py-16 px-6 border-y border-border/40 bg-secondary/20">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs text-muted-foreground/60 uppercase tracking-widest mb-6 font-medium">Perfect for</p>
          <div className="flex flex-wrap justify-center gap-3">
            {industries.map((ind, i) => (
              <motion.div
                key={ind.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.04 }}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 transition-all cursor-default"
              >
                <span className="text-lg">{ind.emoji}</span>
                <span className="text-sm font-medium text-foreground">{ind.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Up and running in three steps</h2>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6 relative"
          >
            <div className="hidden md:block absolute top-[52px] left-[calc(16.66%+16px)] right-[calc(16.66%+16px)] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            {steps.map((step) => (
              <motion.div
                key={step.title}
                variants={item}
                className="group relative bg-card border border-border/50 rounded-2xl p-8 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="absolute top-6 right-6 text-5xl font-black text-border/30 group-hover:text-primary/10 transition-colors font-mono">
                  {step.step}
                </div>
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6 bg-secondary/20 border-y border-border/40">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">Everything you need to succeed</h2>
            <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
              One platform. All the tools a small business needs to attract customers and manage bookings.
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-5"
          >
            {features.map((feat) => (
              <motion.div
                key={feat.title}
                variants={item}
                whileHover={{ y: -4 }}
                className="group bg-card border border-border/50 rounded-2xl p-7 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  <feat.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-bold mb-2">{feat.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feat.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-24 px-6">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs text-primary font-semibold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Simple, honest pricing</h2>
            <p className="text-muted-foreground text-sm">One plan. Everything included. No surprises.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3 }}
            className="relative bg-card rounded-3xl border-2 border-primary p-8 shadow-2xl shadow-primary/10"
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <div className="px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg shadow-primary/30">
                Business Plan
              </div>
            </div>

            <div className="text-center pt-2 mb-8">
              <div className="flex items-end justify-center gap-1.5">
                <span className="text-6xl font-black tracking-tight">€20</span>
                <span className="text-muted-foreground mb-2.5 text-sm">/month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Everything you need to run your business online</p>
            </div>

            <div className="space-y-3 mb-8">
              {planFeatures.map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground/80">{f}</span>
                </div>
              ))}
            </div>

            <Button
              className="w-full h-12 text-base font-bold shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-shadow"
              onClick={() => router.push("/register")}
            >
              Get Started Today <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">No credit card required to start</p>
          </motion.div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-20 px-6 mx-6 mb-12 rounded-3xl bg-primary relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-black/10 rounded-full blur-2xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative text-center max-w-xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Ready to grow your business?
          </h2>
          <p className="text-white/70 mb-8 text-sm leading-relaxed">
            Join hundreds of Kosovo businesses already using LokalWeb to manage bookings and grow their customer base.
          </p>
          <Button
            size="lg"
            onClick={() => router.push("/register")}
            className="bg-white text-primary hover:bg-white/90 font-bold px-10 shadow-2xl"
          >
            Start for Free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 px-6 border-t border-border/40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-black text-[9px]">LW</span>
            </div>
            <span className="font-bold text-sm">LokalWeb</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 LokalWeb. Made with ❤️ in Kosovo.</p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <button className="hover:text-foreground transition-colors">Privacy</button>
            <button className="hover:text-foreground transition-colors">Terms</button>
            <button className="hover:text-foreground transition-colors">Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
}