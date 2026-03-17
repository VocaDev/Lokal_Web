'use client'

import { motion } from "framer-motion"
import { ArrowRight, Globe, Calendar, Smartphone, UserPlus, Palette, Rocket, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

const features = [
  { icon: Globe, title: "Your Own Website", description: "Get a professional website for your business in minutes, no technical skills needed." },
  { icon: Calendar, title: "Online Bookings", description: "Let your customers book appointments online, 24/7. No more missed calls." },
  { icon: Smartphone, title: "Mobile Ready", description: "Your website looks great on every device — phones, tablets, and desktops." },
];

const industries = ["Barbershops", "Restaurants", "Clinics", "Beauty Salons"];

const steps = [
  { icon: UserPlus, title: "Register", description: "Sign up and enter your business details in under 2 minutes." },
  { icon: Palette, title: "Customize", description: "Choose your colors, upload a logo, add services and business hours." },
  { icon: Rocket, title: "Go Live", description: "Your website is instantly live with online booking built in." },
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

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">LW</span>
            </div>
            <span className="font-bold text-lg text-foreground">LokalWeb</span>
          </div>
          <Button onClick={() => router.push("/register")} size="sm">Get Started</Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
              🇽🇰 Built for Kosovo businesses
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
              Get your business<br /><span className="text-primary">online in minutes</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              LokalWeb gives small businesses in Kosovo a professional website with online booking — no coding, no hassle.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => router.push("/register")} className="text-base px-8">
                Register Your Business <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => router.push("/biz/demo")} className="text-base px-8">
                See Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-12 bg-secondary/50">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground mb-4">Perfect for</p>
          <div className="flex flex-wrap justify-center gap-3">
            {industries.map(ind => (
              <span key={ind} className="px-4 py-2 bg-card rounded-full text-sm font-medium text-foreground shadow-sm border">{ind}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="container max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">How It Works</h2>
          <p className="text-center text-muted-foreground mb-12">Three simple steps to get your business online</p>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-sm font-bold text-primary mb-1">Step {i + 1}</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container max-w-5xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Everything you need to grow</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-card rounded-xl p-6 border shadow-sm"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="container max-w-md">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">Simple Pricing</h2>
          <p className="text-center text-muted-foreground mb-10">One plan with everything included</p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl border-2 border-primary p-8 shadow-lg"
          >
            <div className="text-center mb-6">
              <p className="text-sm font-medium text-primary mb-2">Business Plan</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-extrabold text-foreground">€20</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </div>
            <div className="space-y-3 mb-8">
              {planFeatures.map(f => (
                <div key={f} className="flex items-center gap-3 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
            </div>
            <Button className="w-full" size="lg" onClick={() => router.push("/register")}>
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 LokalWeb. Made with ❤️ in Kosovo.
        </div>
      </footer>
    </div>
  );
}
