import { Navbar } from '@/components/marketing/navbar';
import { Hero } from '@/components/marketing/hero';
import { Features } from '@/components/marketing/features';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { Pricing } from '@/components/marketing/pricing';
import { CtaBanner } from '@/components/marketing/cta-banner';
import { Footer } from '@/components/marketing/footer';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Pricing />
      <CtaBanner />
      <Footer />
    </main>
  );
}
