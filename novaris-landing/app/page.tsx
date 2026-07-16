import { Hero } from "@/components/hero";
import { ProblemSection } from "@/components/problem-section";
import { SolutionSection } from "@/components/solution-section";
import { FeaturesSection } from "@/components/features-section";
import { FaqSection } from "@/components/faq-section";
import { CtaSection } from "@/components/cta-section";
import { Footer } from "@/components/footer";

function StatsBand() {
  const stats = [
    { v: "O(1)", k: "Per-action cost" },
    { v: "10¹⁸", k: "Fixed-point precision" },
    { v: "0", k: "Lock-up periods" },
    { v: "100%", k: "Onchain & auditable" },
  ];
  return (
    <section className="w-full border-b border-slate-700/30 bg-slate-950">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-slate-800/40 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.k} className="bg-slate-950 px-6 py-10 text-center">
            <div className="text-3xl font-semibold tracking-tight text-white md:text-4xl">{s.v}</div>
            <div className="mt-2 text-xs uppercase tracking-wider text-slate-500">{s.k}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      {/* Vertical margin lines */}
      <div className="pointer-events-none fixed inset-0 z-50">
        <div className="mx-auto h-full max-w-7xl">
          <div className="relative h-full">
            <div className="absolute left-0 top-0 h-full w-px bg-slate-700/30" />
            <div className="absolute right-0 top-0 h-full w-px bg-slate-700/30" />
          </div>
        </div>
      </div>

      <main>
        <Hero />
        <StatsBand />
        <SolutionSection />
        <FeaturesSection />
        <ProblemSection />
        <FaqSection />
        <CtaSection />
      </main>

      <Footer />
    </>
  );
}
