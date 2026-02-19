import { BadgePremium } from "@/components/ui/badge-premium";
import { GlassCard } from "@/components/ui/glass-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { MatchCard } from "@/components/premium/match-card";
import { ProfileCard } from "@/components/premium/profile-card";

export default function UIKitPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <h1 className="text-3xl font-semibold">UI Kit</h1>
      <div className="flex gap-3"><GradientButton>Primary CTA</GradientButton><BadgePremium /></div>
      <GlassCard><p className="font-semibold">GlassCard Component</p></GlassCard>
      <div className="grid gap-6 lg:grid-cols-2">
        <MatchCard name="Ava" lastMessage="Ready for Friday?" online image="/profiles/ava.svg" />
        <ProfileCard name="Mia" age={24} distance="7 km" bio="Museum dates and ramen nights." interests={["Art", "Food", "Books"]} image="/profiles/mia.svg" />
      </div>
    </main>
  );
}
