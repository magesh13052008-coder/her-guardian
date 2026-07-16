import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield, MapPin, Brain, Watch, Users, Bell, Cloud, Siren,
  Target, Heart, Sparkles, Smartphone, Database, Zap, Lock,
  Mail, Phone, ArrowRight, CheckCircle2, Rocket, LogIn,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { useAuth } from "@/hooks/use-auth";

const OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/bfca2727-8215-4509-8de6-8af9d34139e5/id-preview-80db83cf--a25f89ef-e7b1-43a9-b7b3-9831174d1463.lovable.app-1779728644473.png";
const SITE_URL = "https://https-her-guardian-app-com.lovable.app";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Her Guardian 2.0 — AI Personal Safety for Women" },
      { name: "description", content: "AI-powered women safety app with one-tap SOS, live GPS tracking, threat detection, and wearable support. Built in Chennai, India." },
      { property: "og:title", content: "Her Guardian 2.0 — AI Personal Safety for Women" },
      { property: "og:description", content: "One-tap SOS, live GPS, AI threat detection and wearable support — always by her side." },
      { property: "og:url", content: SITE_URL + "/" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:title", content: "Her Guardian 2.0 — AI Personal Safety for Women" },
      { name: "twitter:description", content: "One-tap SOS, live GPS, AI threat detection and wearable support." },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Her Guardian 2.0",
          url: SITE_URL,
          logo: OG_IMAGE,
          description: "AI-powered personal safety ecosystem for women.",
          foundingLocation: { "@type": "Place", name: "Chennai, India" },
          founder: [
            { "@type": "Person", name: "Magesh .T" },
            { "@type": "Person", name: "Mukesh Kumar" },
            { "@type": "Person", name: "Omair Khan" },
          ],
          contactPoint: { "@type": "ContactPoint", email: "mageshsiva1305@gmail.com", contactType: "customer support" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Her Guardian 2.0",
          url: SITE_URL,
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MobileApplication",
          name: "Her Guardian 2.0",
          operatingSystem: "Android, iOS, Web",
          applicationCategory: "LifestyleApplication",
          description: "Personal safety app with SOS alerts, live GPS tracking, AI threat detection, and trusted contact notifications.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
        }),
      },
    ],
  }),
});

const features = [
  { icon: Siren, title: "SOS Alert", desc: "One-press emergency trigger notifies 5 trusted contacts in under 5 seconds." },
  { icon: MapPin, title: "GPS Tracking", desc: "Real-time live location sharing with route monitoring during commutes." },
  { icon: Brain, title: "AI Threat Detection", desc: "Proactive intelligence that detects unsafe situations before they escalate." },
  { icon: Watch, title: "Wearable Support", desc: "Hands-free activation through connected smartwatches and safety bands." },
  { icon: Users, title: "Emergency Contacts", desc: "Manage up to 5 trusted contacts who receive instant alerts and location." },
  { icon: Bell, title: "Real-Time Notifications", desc: "Push notifications with 95% delivery accuracy across all devices." },
  { icon: Cloud, title: "Secure Cloud Storage", desc: "End-to-end encrypted backup of safety logs and emergency history." },
];

const smartGoals = [
  { letter: "S", word: "Specific", text: "Smart women safety app with SOS, live tracking, wearable support, and emergency notifications." },
  { letter: "M", word: "Measurable", text: "Alert 5 contacts within 5 seconds; 100+ test users; 95% notification delivery accuracy." },
  { letter: "A", word: "Achievable", text: "Built with GPS, cloud computing, AI threat detection, and push notifications." },
  { letter: "R", word: "Realistic", text: "Mobile safety apps and wearables are already widely adopted globally." },
  { letter: "T", word: "Timed", text: "Complete working prototype within one academic semester." },
];

const journey = [
  { step: "01", title: "Registration", body: "Install Her Guardian 2.0 and create a secure user profile." },
  { step: "02", title: "Setup", body: "Add 5 trusted contacts, enable GPS, and pair your wearable device." },
  { step: "03", title: "Monitoring", body: "App runs silently in the background with AI threat detection active." },
  { step: "04", title: "Emergency", body: "Press SOS or trigger via wearable — AI confirms the threat instantly." },
  { step: "05", title: "Response", body: "Contacts receive alert + live location; emergency services are notified." },
];

const bmc = [
  { title: "Key Partners", icon: Users, items: ["Mobile Network Providers", "Emergency Services", "Cloud Providers", "Wearable Manufacturers"] },
  { title: "Key Activities", icon: Zap, items: ["App Development", "GPS Monitoring", "Notifications", "Data Security"] },
  { title: "Key Resources", icon: Database, items: ["Tech Stack", "User Data", "Brand Reputation", "Expert Team"] },
  { title: "Value Proposition", icon: Sparkles, items: ["Instant emergency support", "Live GPS tracking", "AI-powered protection", "Wearable integration"] },
  { title: "Customer Relations", icon: Heart, items: ["Direct App Support", "Institutional Partnerships"] },
  { title: "Channels", icon: Smartphone, items: ["Play Store / App Store", "College Campaigns", "Social Media"] },
  { title: "Customer Segments", icon: Target, items: ["Women Students", "Working Professionals", "Parents / Guardians", "Solo Travellers"] },
  { title: "Cost Structure", icon: Lock, items: ["App Development", "Cloud & GPS Services", "Security Infrastructure", "Marketing Campaigns"] },
  { title: "Revenue Streams", icon: Rocket, items: ["Premium Subscriptions", "Wearable Device Sales", "Institutional Partnerships", "Government Safety Grants"] },
];

const team: { name: string; role: string; id: string; bio?: string }[] = [
  { name: "Magesh .T", role: "Founder & CEO", id: "Chennai, India", bio: "I am not the perfect, but at least I am not fake." },
  { name: "Mukesh Kumar", role: "Full-Stack Developer", id: "253115104075" },
  { name: "Omair Khan", role: "Mobile & UX Designer", id: "253115104075" },
];

const techStack = [
  "React Native", "TypeScript", "Node.js", "Firebase", "Google Maps API",
  "TensorFlow Lite", "AWS Cloud", "WebSockets", "Tailwind CSS", "Twilio SMS",
];

function Index() {
  const { user } = useAuth();
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
        <nav className="glass-strong mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-5 py-3">
          <a href="#hero" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 glow-pink">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold tracking-tight">Her Guardian <span className="text-gradient">2.0</span></span>
          </a>
          <div className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#about" className="hover:text-foreground transition">About</a>
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#goals" className="hover:text-foreground transition">Goals</a>
            <a href="#team" className="hover:text-foreground transition">Team</a>
            <a href="#contact" className="hover:text-foreground transition">Contact</a>
          </div>
          <Link to={user ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-2 text-sm font-medium text-white glow-pink hover:opacity-90 transition">
            <LogIn className="h-4 w-4" /> {user ? "Dashboard" : "Login"}
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <section id="hero" className="relative pt-36 pb-24 px-4">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
          <div className="fade-up">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs mb-6">
              <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              <span className="text-muted-foreground">AI-Powered Personal Safety Ecosystem</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
              Her <span className="text-gradient animate-gradient">Guardian</span> 2.0
            </h1>
            <p className="mt-5 text-lg md:text-xl text-muted-foreground italic">
              Always by her side — everywhere, every time.
            </p>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">
              A smart, technology-driven safety companion integrating real-time GPS, AI threat
              detection, wearable support, and instant SOS — built for women students, professionals,
              and solo travellers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={user ? "/dashboard" : "/login"} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white glow-pink hover:opacity-90 transition">
                {user ? "Open Dashboard" : "Get Started Free"} <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 glass rounded-xl px-6 py-3 text-sm font-semibold hover:bg-white/10 transition">
                Explore Features
              </a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { n: "5s", l: "Alert Time" },
                { n: "95%", l: "Delivery" },
                { n: "100+", l: "Test Users" },
              ].map((s) => (
                <div key={s.l} className="glass rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gradient">{s.n}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative animate-float">
            <div className="absolute -inset-6 bg-gradient-to-br from-pink-500/30 to-purple-600/30 blur-3xl rounded-full" />
            <img
              src={heroImg}
              alt="AI shield protecting women"
              width={1920}
              height={1080}
              className="relative rounded-3xl glass-strong p-2 w-full"
            />
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <Section id="about" kicker="About the project" title="A safety ecosystem reimagined">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glow-card">
            <div className="flex items-center gap-3 mb-3">
              <IconBubble><Target className="h-5 w-5" /></IconBubble>
              <h3 className="text-xl font-semibold">Vision</h3>
            </div>
            <p className="text-muted-foreground">
              A world where every woman feels safe and empowered, always protected by intelligent
              technology — the leading AI-powered personal safety companion for women worldwide.
            </p>
          </Card>
          <Card className="glow-card">
            <div className="flex items-center gap-3 mb-3">
              <IconBubble><Rocket className="h-5 w-5" /></IconBubble>
              <h3 className="text-xl font-semibold">Mission</h3>
            </div>
            <p className="text-muted-foreground">
              Deliver a smart, reliable, and accessible safety ecosystem integrating GPS tracking,
              AI threat detection, SOS alerts, and wearable support — protecting women in every
              environment, at any time.
            </p>
          </Card>
        </div>
      </Section>

      {/* PROBLEM */}
      <Section id="problem" kicker="Problem statement" title="Why Her Guardian exists">
        <Card className="glow-card max-w-4xl mx-auto text-center">
          <p className="text-lg md:text-xl leading-relaxed text-muted-foreground">
            “How can we design a smart, technology-driven personal safety ecosystem for women —
            integrating real-time GPS tracking, AI-based threat detection, wearable support, and
            instant SOS alerts — to ensure rapid emergency response and build confidence among
            women students, working professionals, and solo travellers?”
          </p>
        </Card>
      </Section>

      {/* FEATURES */}
      <Section id="features" kicker="Features" title="Built for real-world safety">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <Card key={f.title} className="glow-card fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <IconBubble><f.icon className="h-5 w-5" /></IconBubble>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* SMART GOALS */}
      <Section id="goals" kicker="SMART framework" title="Goals that drive us">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {smartGoals.map((g) => (
            <Card key={g.letter} className="glow-card text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 text-2xl font-bold text-white glow-pink">
                {g.letter}
              </div>
              <h3 className="mt-4 font-semibold">{g.word}</h3>
              <p className="mt-2 text-xs text-muted-foreground">{g.text}</p>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8 italic">
          OKR Focus: “To provide women with a fast, secure, and intelligent personal safety companion.”
        </p>
      </Section>

      {/* STAKEHOLDER JOURNEY */}
      <Section id="journey" kicker="Stakeholder journey" title="From install to rescue">
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          {journey.map((s, i) => (
            <div key={s.step} className="relative">
              <Card className="glow-card h-full">
                <div className="text-xs font-mono text-pink-400">STEP {s.step}</div>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </Card>
              {i < journey.length - 1 && (
                <ArrowRight className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 h-5 w-5 text-pink-400/60" />
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* BUSINESS MODEL CANVAS */}
      <Section id="bmc" kicker="Business model canvas" title="How Her Guardian operates">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {bmc.map((b) => (
            <Card key={b.title} className="glow-card">
              <div className="flex items-center gap-3 mb-3">
                <IconBubble><b.icon className="h-4 w-4" /></IconBubble>
                <h3 className="font-semibold">{b.title}</h3>
              </div>
              <ul className="space-y-2">
                {b.items.map((it) => (
                  <li key={it} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-pink-400 shrink-0" />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      {/* VALUE PROPOSITION */}
      <Section id="value" kicker="Value proposition" title="What we deliver">
        <Card className="glow-card text-center max-w-4xl mx-auto animate-pulse-glow">
          <Sparkles className="h-8 w-8 text-pink-400 mx-auto mb-4" />
          <p className="text-2xl md:text-3xl font-semibold text-gradient leading-snug">
            A smart personal safety ecosystem providing instant emergency support, live tracking,
            and AI-powered protection for women.
          </p>
        </Card>
      </Section>

      {/* TEAM */}
      <Section id="team" kicker="The team" title="Meet the builders">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {team.map((t) => (
            <Card key={t.name} className="glow-card text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-2xl font-bold text-white glow-pink">
                {t.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <h3 className="mt-4 font-semibold text-lg">{t.name}</h3>
              <p className="text-sm text-pink-400">{t.role}</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{t.id}</p>
              {t.bio && <p className="text-xs text-muted-foreground mt-3 italic">"{t.bio}"</p>}
            </Card>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Headquartered in Chennai, Tamil Nadu, India
        </p>
      </Section>

      {/* TECH STACK */}
      <Section id="tech" kicker="Tech stack" title="Powered by modern tools">
        <div className="flex flex-wrap justify-center gap-3">
          {techStack.map((t, i) => (
            <span
              key={t}
              className="glass rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/10 transition fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {t}
            </span>
          ))}
        </div>
      </Section>

      {/* CONTACT / FOOTER */}
      <footer id="contact" className="px-4 pt-16 pb-10">
        <div className="mx-auto max-w-6xl">
          <Card className="glow-card text-center animate-pulse-glow">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Want to <span className="text-gradient">partner</span> or learn more?
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Reach out — we'd love to collaborate with institutions, NGOs, and safety advocates.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href="mailto:mageshsiva1305@gmail.com" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white glow-pink hover:opacity-90 transition">
                <Mail className="h-4 w-4" /> mageshsiva1305@gmail.com
              </a>
              <a href="tel:+916382988384" className="inline-flex items-center gap-2 glass rounded-xl px-6 py-3 text-sm font-semibold hover:bg-white/10 transition">
                <Phone className="h-4 w-4" /> +91 63829 88384
              </a>
              <a href="https://wa.me/916382988384" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 glass rounded-xl px-6 py-3 text-sm font-semibold hover:bg-white/10 transition">
                <Phone className="h-4 w-4" /> WhatsApp
              </a>
              <span className="inline-flex items-center gap-2 glass rounded-xl px-6 py-3 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-pink-400" /> Chennai, India
              </span>
            </div>
          </Card>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-pink-500 to-purple-600">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span>© 2026 Her Guardian 2.0 — Always by her side.</span>
            </div>
            <div>Built with React · Tailwind CSS · AI</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------- helpers ---------- */

function Section({
  id, kicker, title, children,
}: { id: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-12 fade-up">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs mb-4">
            <span className="text-pink-400 uppercase tracking-widest font-semibold">{kicker}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            {title.split(" ").slice(0, -1).join(" ")}{" "}
            <span className="text-gradient">{title.split(" ").slice(-1)}</span>
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function Card({
  children, className = "", style,
}: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={`glass-strong rounded-2xl p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function IconBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-pink-500/80 to-purple-600/80 text-white glow-pink">
      {children}
    </div>
  );
}
