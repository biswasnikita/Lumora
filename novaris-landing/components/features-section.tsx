"use client";

import React from "react"

import { motion } from "framer-motion";
import { Zap, ShieldCheck, Network } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CONTRACT_EXPLORER_URL } from "@/lib/site-links";

interface FeatureItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const DEFAULT_FEATURES: FeatureItem[] = [
  {
    id: "1",
    icon: <Zap className="w-5 h-5 text-white" />,
    title: "Constant-Time Accounting",
    description:
      "The contract never loops over stakers. Staking, unstaking, and claiming each run in constant time, no matter how large the pool grows.",
  },
  {
    id: "2",
    icon: <ShieldCheck className="w-5 h-5 text-white" />,
    title: "Rate Changes Never Look Back",
    description:
      "Operators can tune the emission rate for the future, yet the accumulator checkpoint ensures already-earned rewards can never be rewritten.",
  },
  {
    id: "3",
    icon: <Network className="w-5 h-5 text-white" />,
    title: "Entirely Onchain, Entirely Auditable",
    description:
      "Every figure — total staked, reward rate, your accrued balance — sits in contract storage. Query it straight from the chain, no API in between.",
  },
  {
    id: "4",
    icon: <Zap className="w-5 h-5 text-white" />,
    title: "High-Precision Math",
    description:
      "Reward calculations are scaled internally so even tiny emission rates never round to zero, across thousands of stakers.",
  },
  {
    id: "5",
    icon: <ShieldCheck className="w-5 h-5 text-white" />,
    title: "Move In and Out Freely",
    description:
      "There are no lock-up windows. Withdraw part or all of your stake anytime, and your pending rewards stay intact.",
  },
  {
    id: "6",
    icon: <Network className="w-5 h-5 text-white" />,
    title: "Running on Stellar Testnet",
    description:
      "This isn't a whitepaper. Novaris is deployed right now, with a real contract address you can query today.",
  },
];

const containerVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

interface FeaturesSectionProps {
  preHeading?: string;
  headline?: string;
  features?: FeatureItem[];
  className?: string;
}

export function FeaturesSection({
  preHeading = "Under the Hood",
  headline = "Engineered for Provable Yield",
  features = DEFAULT_FEATURES,
  className,
}: FeaturesSectionProps) {
  return (
    <section
      id="features"
      className={cn(
        "w-full bg-slate-900 py-24 border-b border-slate-700/30",
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-6 mb-16"
        >
          <div className="flex items-center gap-3 px-4 py-2 border border-slate-700 w-fit">
            <div className="w-2.5 h-2.5 bg-cyan-400" />
            <span className="text-sm font-medium text-slate-400 tracking-wide">
              {preHeading}
            </span>
          </div>
          <h2 className="text-balance text-white text-4xl md:text-5xl lg:text-6xl font-normal leading-[1.1] max-w-[700px] tracking-tight">
            {headline.split(" ").map((word, i) => (
              <motion.span
                key={i}
                initial={{ filter: "blur(10px)", opacity: 0 }}
                whileInView={{ filter: "blur(0px)", opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="inline-block mr-[0.25em]"
              >
                {word}
              </motion.span>
            ))}
          </h2>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-16 auto-rows-fr"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={feature.id}
              variants={itemVariants}
              className={cn(
                "group flex flex-col rounded-2xl border border-slate-800 bg-slate-950/40 p-7 transition-colors hover:border-cyan-500/40",
                idx === 0 && "md:col-span-2",
                idx === 3 && "lg:col-span-1 md:col-span-2"
              )}
            >
              {/* Icon */}
              <div className="mb-6">
                <div className="w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-b from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/20 transform transition-transform group-hover:scale-110 duration-300">
                  {feature.icon}
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-3">
                <h4 className="text-white text-xl font-medium tracking-tight font-sans">
                  {feature.title}
                </h4>
                <p className="text-balance text-slate-400 text-base leading-relaxed font-sans">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            asChild
            size="lg"
            className="bg-white text-slate-900 hover:bg-slate-200 px-8"
          >
            <Link href={CONTRACT_EXPLORER_URL} target="_blank" rel="noopener noreferrer">
              See All Contract Functions
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-slate-600 text-white hover:bg-slate-800 bg-transparent px-8"
          >
            <Link href="#solution">Read the Reward Math</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
