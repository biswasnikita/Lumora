"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DAPP_URL, CONTRACT_EXPLORER_URL } from "@/lib/site-links";

export function CtaSection() {
  return (
    <section className="relative w-full overflow-hidden bg-slate-950 py-24 md:py-32">
      {/* Cosmic gradient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[150px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900/50 p-10 text-center backdrop-blur-md md:p-16"
        >
          {/* Top hairline accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

          <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border border-slate-700/60 bg-slate-950/40 px-4 py-1.5 text-xs text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Live on Stellar Testnet
          </div>

          <h2 className="text-balance text-4xl font-normal tracking-tight text-white md:text-5xl lg:text-6xl">
            {"Put Your Stake to Work".split(" ").map((word, i) => (
              <motion.span
                key={i}
                initial={{ filter: "blur(10px)", opacity: 0 }}
                whileInView={{ filter: "blur(0px)", opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="mr-[0.25em] inline-block"
              >
                {word}
              </motion.span>
            ))}
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-slate-400 md:text-lg">
            Connect your wallet, deposit Token A, and see your rewards climb in real time — every
            figure provable onchain.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="bg-cyan-400 px-8 text-slate-950 hover:bg-cyan-300">
              <Link href={DAPP_URL}>Launch the App</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-slate-600 bg-transparent px-8 text-white hover:bg-slate-800 hover:text-white"
            >
              <Link href={CONTRACT_EXPLORER_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                View the contract <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
