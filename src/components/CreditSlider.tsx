"use client";

import { COST, CREDIT_STEPS, FULL_CREDITS, creditPriceKobo } from "@convex/lib/constants";
import { naira } from "@/lib/format";

/** What a number of credits can make, in plain words. */
export function creditsBuy(credits: number): string {
  const full = Math.floor(credits / FULL_CREDITS);
  const left = credits - full * FULL_CREDITS;
  if (full === 0) return credits >= COST.site ? `One website, with ${credits - COST.site} credit${credits - COST.site === 1 ? "" : "s"} over` : "A top-up: a new design, or your films made again";
  const what = full === 1 ? "One celebration with a website and two films" : `${full} celebrations, each with a website and two films`;
  return left ? `${what}, and ${left} credit${left === 1 ? "" : "s"} over` : what;
}

export function CreditSlider({ credits, onChange, dark }: { credits: number; onChange: (credits: number) => void; dark?: boolean }) {
  const at = Math.max(0, (CREDIT_STEPS as readonly number[]).indexOf(credits));
  const price = creditPriceKobo(credits);
  const saved = credits * 100_000 - price;
  return (
    <div className={`cslider ${dark ? "dark" : ""}`}>
      <div className="row between" style={{ alignItems: "flex-end" }}>
        <div><span className="tagline">Credits</span><div className="big">{credits}</div></div>
        <div style={{ textAlign: "right" }}><span className="tagline">You pay</span><div className="big">{naira(price)}</div></div>
      </div>
      <input type="range" min={0} max={CREDIT_STEPS.length - 1} step={1} value={at} aria-label="How many credits" aria-valuetext={`${credits} credits for ${naira(price)}`} onChange={(e) => onChange(CREDIT_STEPS[Number(e.target.value)])} style={{ ["--fill" as string]: `${(at / (CREDIT_STEPS.length - 1)) * 100}%` }} />
      <div className="ticks" aria-hidden="true">{CREDIT_STEPS.map((s) => <button key={s} type="button" tabIndex={-1} className={s === credits ? "on" : ""} onClick={() => onChange(s)}>{s}</button>)}</div>
      <p className="gets"><b>{creditsBuy(credits)}.</b></p>
      <p className="small">{naira(Math.round(price / credits / 100) * 100)} a credit{saved > 0 ? `. You save ${naira(saved)}.` : "."} Credits never expire.</p>
    </div>
  );
}
