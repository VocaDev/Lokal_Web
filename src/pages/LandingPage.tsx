import { motion } from "framer-motion";
import { ArrowRight, Globe, Calendar, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Globe,
    title: "Your Own Website",
    description: "Get a professional website for your business in minutes, no technical skills needed.",
  },
  {
    icon: Calendar,
    title: "Online Bookings",
    description: "Let your customers book appointments online, 24/7. No more missed calls.",
  },
  {
    icon: Smartphone,
    title: "Mobile Ready",
    description: "Your website looks great on every device — phones, tablets, and desktops.",
  },
];

const industries = ["Barbershops", "Restaurants", "Clinics", "Beauty Salons"];

export default function LandingPage() {
  const navigate = useNavigate();

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
          <Button onClick={() => navigate("/register")} size="sm">
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
              🇽🇰 Built for Kosovo businesses
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
              Get your business
              <br />
              <span className="text-primary">online in minutes</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              LokalWeb gives small businesses in Kosovo a professional website with online booking — no coding, no hassle.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => navigate("/register")} className="text-base px-8">
                Register Your Business
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/biz/demo")} className="text-base px-8">
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
            {industries.map((ind) => (
              <span key={ind} className="px-4 py-2 bg-card rounded-full text-sm font-medium text-foreground shadow-sm border">
                {ind}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="container max-w-5xl">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Everything you need to grow
          </h2>
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

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 LokalWeb. Made with ❤️ in Kosovo.
        </div>
      </footer>
    </div>
  );
}
