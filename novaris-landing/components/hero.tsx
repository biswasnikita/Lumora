"use client"

import { Button } from "@/components/ui/button"
import { Orbit, Menu, X, ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { DAPP_URL } from "@/lib/site-links"

function LiveAccumulator() {
  const [value, setValue] = useState(1284.503921)

  useEffect(() => {
    const id = setInterval(() => setValue((v) => v + 0.000217), 60)
    return () => clearInterval(id)
  }, [])

  const [whole, frac] = value.toFixed(6).split(".")

  return (
    <div className="relative rounded-2xl border border-slate-700/60 bg-slate-900/60 p-6 backdrop-blur-md shadow-2xl shadow-cyan-500/10">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-slate-400">Live accrual</span>
        <span className="flex items-center gap-1.5 text-xs text-cyan-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          onchain
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-1 font-mono tabular-nums">
        <span className="text-4xl font-semibold text-white md:text-5xl">{whole}</span>
        <span className="text-2xl text-cyan-400 md:text-3xl">.{frac}</span>
        <span className="ml-2 text-sm text-slate-500">TKB</span>
      </div>
      <p className="mt-1 text-sm text-slate-500">Rewards earned by this position</p>

      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-700/50 pt-5">
        {[
          { k: "Staked", v: "50,000" },
          { k: "APR", v: "~12.4%" },
          { k: "Rate/s", v: "0.0002" },
        ].map((s) => (
          <div key={s.k}>
            <div className="text-lg font-semibold text-white tabular-nums">{s.v}</div>
            <div className="text-[0.68rem] uppercase tracking-wide text-slate-500">{s.k}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Hero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-slate-950">
      {/* Cosmic gradient backdrop */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-20%] h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[400px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 md:px-12">
        {/* Navigation */}
        <nav className="relative z-50 flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-2 text-white">
            <Orbit className="h-5 w-5 text-cyan-400" />
            <span className="font-medium tracking-tight">Novaris</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-slate-300 lg:flex">
            <Link href="#how" className="transition-colors hover:text-white">How it works</Link>
            <Link href="#features" className="transition-colors hover:text-white">Features</Link>
            <Link href="#faq" className="transition-colors hover:text-white">FAQ</Link>
          </div>

          <div className="flex items-center gap-4">
            <Button asChild size="sm" className="hidden bg-cyan-400 text-slate-950 hover:bg-cyan-300 lg:inline-flex">
              <Link href={DAPP_URL}>Launch App</Link>
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white lg:hidden"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="absolute left-0 right-0 top-full bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/40 lg:hidden">
              <div className="flex flex-col gap-4 px-2 py-6">
                <Link href="#how" className="py-2 text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>How it works</Link>
                <Link href="#features" className="py-2 text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Features</Link>
                <Link href="#faq" className="py-2 text-slate-300 hover:text-white" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
                <Link href={DAPP_URL} className="mt-2 border-t border-slate-700/40 py-2 font-medium text-cyan-400" onClick={() => setMobileMenuOpen(false)}>Launch App</Link>
              </div>
            </div>
          )}
        </nav>

        {/* Split hero body */}
        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-2 lg:gap-8">
          {/* Left: copy */}
          <div className="flex flex-col">
            <div className="mb-6 flex w-fit items-center gap-2 rounded-full border border-slate-700/60 bg-slate-900/40 px-4 py-1.5 text-xs text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Live on Stellar Testnet
            </div>

            <h1 className="text-balance text-5xl font-normal leading-[1.05] tracking-tight text-white md:text-6xl">
              {"Yield You Can Watch Accrue".split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ filter: "blur(10px)", opacity: 0 }}
                  animate={{ filter: "blur(0px)", opacity: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="mr-[0.25em] inline-block"
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <p className="mt-6 max-w-lg text-balance text-base leading-relaxed text-slate-400 md:text-lg">
              Novaris is a fully transparent staking protocol on Stellar. Deposit once, and see your
              rewards grow every second — every figure provable onchain, down to the last stroop.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg" className="bg-cyan-400 px-7 text-slate-950 hover:bg-cyan-300">
                <Link href={DAPP_URL}>Launch App</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-slate-600 bg-transparent px-7 text-white hover:bg-slate-800 hover:text-white">
                <Link href="#how" className="flex items-center gap-1.5">
                  See how it works <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: live accumulator card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <LiveAccumulator />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
