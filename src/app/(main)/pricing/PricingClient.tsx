"use client";

import { useState } from "react";
import Link from "next/link";
import { STARTER_CREDITS } from "@convex/lib/constants";
import { CreditSlider } from "@/components/CreditSlider";

export function PricingSlider({ start = STARTER_CREDITS, cta = "Start free" }: { start?: number; cta?: string }) {
  const [credits, setCredits] = useState(start);
  return (
    <div className="stack" style={{ gap: 18 }}>
      <CreditSlider credits={credits} onChange={setCredits} dark />
      <div className="row"><Link href={`/login?next=${encodeURIComponent(`/app/credits?credits=${credits}`)}`} className="btn hot">{cta}</Link><span className="small" style={{ opacity: 0.8 }}>Build first. Pay only when you like what you see.</span></div>
    </div>
  );
}
