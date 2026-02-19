import Image from "next/image";
import { ShieldCheck, MessageCircleHeart, CreditCard, CheckCircle2, Coins, Users } from "lucide-react";
import { FloatingCards } from "@/components/premium/floating-cards";
import { GradientButton } from "@/components/ui/gradient-button";
import { GlassCard } from "@/components/ui/glass-card";
import { Reveal } from "@/components/ui/reveal";
import { HeroAvatarStack } from "@/components/premium/hero-avatar-stack";
import { HomeHeader } from "@/components/layout/home-header";

const featureItems = [
  { title: "Real Profiles First", desc: "Verification filters and active-user ranking for authentic connections.", icon: Users },
  { title: "Fast Match Chat", desc: "Real-time messages with smooth chat flow and premium UX.", icon: MessageCircleHeart },
  { title: "Coin Economy", desc: "Clear spend model: 50 coins/message and 70 coins to unlock full private photos.", icon: Coins },
  { title: "Secure Checkout", desc: "Stripe-powered payments and trusted billing for subscriptions and coin packs.", icon: CreditCard }
];

const testimonials = [
  { name: "Ava, 26", text: "The app feels premium and clean. Matches are more serious here.", photo: "https://randomuser.me/api/portraits/women/21.jpg" },
  { name: "Mia, 24", text: "I like that profiles are verified and chat quality is better.", photo: "https://randomuser.me/api/portraits/women/45.jpg" },
  { name: "Luna, 28", text: "Best design of any dating app I have used. Super smooth on mobile.", photo: "https://randomuser.me/api/portraits/women/67.jpg" }
];

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-background">
      <HomeHeader />

      <section className="relative isolate border-b border-border bg-velora-gradient text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_45%)]" />
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-24 md:pb-16 md:pt-32">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <Reveal>
              <div>
                <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
                  Premium Dating Platform
                </p>
                <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">Find Real People. Build Better Matches.</h1>
                <p className="mt-4 max-w-xl text-sm text-white/90 md:text-base">
                  Velora is built for your dating business model with verified profiles, coin-based engagement, and a premium conversion-first user experience.
                </p>
             
                <div className="mt-6 flex items-center gap-3">
                  <HeroAvatarStack />
                  <p className="text-xs text-white/85">Trusted by active members across US cities</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="space-y-3">
                <FloatingCards />
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                    <div className="inline-flex items-center gap-1 text-xs text-white/80"><Users className="h-3.5 w-3.5" /> Active users</div>
                    <p className="mt-1 text-2xl font-semibold">12,480+</p>
                  </div>
                  <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                    <div className="inline-flex items-center gap-1 text-xs text-white/80"><Coins className="h-3.5 w-3.5" /> Coin activity</div>
                    <p className="mt-1 text-2xl font-semibold">1.9M/mo</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <h2 className="text-3xl font-semibold">How Velora Works</h2>
        </Reveal>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {["Create verified profile", "Swipe and match", "Unlock and chat instantly"].map((item, index) => (
            <Reveal key={item} delay={index * 0.08}>
              <GlassCard className="h-full">
                <p className="text-sm text-foreground/70">Step {index + 1}</p>
                <p className="mt-2 text-xl font-semibold">{item}</p>
                <p className="mt-2 text-sm text-foreground/70">Built for high intent interactions and strong monetization flow.</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <Reveal><h2 className="text-3xl font-semibold">Features</h2></Reveal>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {featureItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={index * 0.07}>
                <div className="rounded-3xl border border-border bg-card p-6 shadow-lg transition hover:shadow-[0_0_25px_rgba(83,58,253,0.35)]">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-3 text-xl font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm text-foreground/70">{item.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <Reveal><h2 className="text-3xl font-semibold">Safety & Trust</h2></Reveal>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {["Verified identities", "Report & block tools", "Fraud-aware monitoring"].map((item) => (
            <GlassCard key={item}>
              <ShieldCheck className="h-5 w-5 text-primary" />
              <p className="mt-3 text-lg font-semibold">{item}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal><h2 className="text-3xl font-semibold">Member Stories</h2></Reveal>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {testimonials.map((entry, index) => (
            <Reveal key={entry.name} delay={index * 0.08}>
              <div className="rounded-3xl border border-border bg-card p-5 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full border border-border">
                    <Image src={entry.photo} alt={entry.name} fill className="object-cover" />
                  </div>
                  <p className="text-sm font-semibold">{entry.name}</p>
                </div>
                <p className="mt-3 text-sm text-foreground/75">{entry.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

     

      <section className="border-t border-border bg-gradient-to-br from-primary via-primary/90 to-[#6e5cff] text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="rounded-3xl border border-white/30 bg-white/10 p-6 backdrop-blur md:p-8">
            <div className="grid gap-6 md:grid-cols-[1.3fr_1fr] md:items-center">
              <div>
                <h2 className="text-3xl font-semibold md:text-4xl">Ready to launch and scale Velora?</h2>
                <p className="mt-2 text-sm text-white/85">Get product updates, growth insights, and release alerts.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <input className="h-11 flex-1 rounded-2xl border border-white/40 bg-white/15 px-4 text-sm placeholder:text-white/75" placeholder="Enter email for launch updates" />
                <GradientButton className="bg-white text-primary shadow-none">Get Launch Access</GradientButton>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-8 md:grid-cols-4">
            <div>
              <p className="text-base font-semibold">Velora</p>
              <p className="mt-2 text-sm text-white/80">Premium dating platform built for real users and strong conversion flows.</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/90">Platform</p>
              <div className="mt-2 space-y-1 text-sm text-white/80">
                <p>Discover</p>
                <p>Explore</p>
                <p>Messages</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/90">Company</p>
              <div className="mt-2 space-y-1 text-sm text-white/80">
                <p>About</p>
                <p>Safety</p>
                <p>Contact</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/90">Legal</p>
              <div className="mt-2 space-y-1 text-sm text-white/80">
                <p>Privacy</p>
                <p>Terms</p>
                <p className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Trusted Platform</p>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-white/25 pt-4 text-xs text-white/70">
            © {new Date().getFullYear()} Velora. All rights reserved.
          </div>
        </div>
      </section>
    </main>
  );
}
