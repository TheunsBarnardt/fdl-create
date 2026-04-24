import './showcase.css';
import { LandingHero } from './sections/landing-hero';
import { TechMarquee } from './sections/tech-marquee';
import { LiveDemo } from './sections/live-demo';
import { FeatureCards } from './sections/feature-cards';
import { StatsSection } from './sections/stats-section';
import { FinalCTA } from './sections/final-cta';

export const metadata = {
  title: 'Showcase — FDL-Create',
  description: 'The runtime for schema-driven apps. Ship collections live with Claude at your side.',
};

export default function ShowcasePage() {
  return (
    <main className="w-full bg-[#070709] overflow-x-hidden">
      <LandingHero />
      <TechMarquee />
      <LiveDemo />
      <FeatureCards />
      <StatsSection />
      <FinalCTA />
    </main>
  );
}
