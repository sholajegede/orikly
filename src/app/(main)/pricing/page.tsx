import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { Tracker } from "@/components/Tracker";
import { COST, FULL_CREDITS, PRICE_LABEL, STARTER_CREDITS } from "@convex/lib/constants";
import { PricingSlider } from "./PricingClient";

export const metadata: Metadata = { title: "Pricing", description: `Pay for what you make. ${PRICE_LABEL} covers a website and two films, with credits left over.` };

const rows = [
  { what: "A designed website", note: "An art director designs it around your photos and words, then checks its own work twice.", credits: COST.site },
  { what: "A film", note: "Tall for WhatsApp status or wide for a big screen, cut to your song. Most people take both.", credits: COST.film },
  { what: "Open when… letters", note: "Letters for the days ahead, each sealed in its own envelope, on their own page with their own film.", credits: COST.letters },
  { what: "A whole new design", note: "Not feeling it? The studio starts again, and makes your films again to match.", credits: COST.redesign },
  { what: "Your films made again", note: "After you change the website by hand. For each film.", credits: COST.refilm },
  { what: "Editing by hand", note: "Colors, lettering, words, the order of the page. As often as you like.", credits: 0 },
];
const faqs = [
  { q: "What is a credit?", a: "Credits are how you pay for what the studio makes. You buy them once, they sit in your account, and you spend them when you publish a website, make a film or ask for a new design." },
  { q: `What does ${PRICE_LABEL} get me?`, a: `${STARTER_CREDITS} credits. A website and both films use ${FULL_CREDITS}. You keep ${STARTER_CREDITS - FULL_CREDITS}: enough for a set of Open when… letters or a new design, or put them toward the next birthday.` },
  { q: "Do credits expire?", a: "No. Whatever you do not use stays in your account for the next celebration." },
  { q: "Can I buy only the website?", a: `Yes. A website on its own is ${COST.site} credits. You can add the films later.` },
  { q: "What if the studio fails?", a: "Your credits for that run go straight back to your account, by themselves." },
];

export default function Pricing() {
  return (
    <>
      <Tracker name="pricing_view" />
      <Header />
      <main>
        <section className="page-hero">
          <div className="wrap price-top">
            <div>
              <h1>Pay for what you make.</h1>
              <p>{PRICE_LABEL} covers one celebration, website and two films, with credits left over for the next one. Slide for more, and each credit costs less.</p>
            </div>
            <PricingSlider />
          </div>
        </section>

        <section className="bandx">
          <div className="wrap">
            <h2 className="sect-title">What credits buy</h2>
            <div className="cost-rows">
              {rows.map((r) => (
                <div key={r.what}><div><b>{r.what}</b><span>{r.note}</span></div><em>{r.credits ? `${r.credits} credit${r.credits === 1 ? "" : "s"}` : "Free"}</em></div>
              ))}
            </div>
          </div>
        </section>

        <section className="bandx dark">
          <div className="wrap price-top">
            <div>
              <h2 className="sect-title">Planners and photographers</h2>
              <p style={{ fontSize: 19, maxWidth: "30em", opacity: 0.88 }}>Making these for clients? Buy credits in bulk and each one costs up to 30% less. Charge your clients what you like.</p>
              <Link href="/partners" className="btn gold" style={{ marginTop: 18 }}>See bulk prices</Link>
            </div>
            <PricingSlider start={60} cta="Start with these" />
          </div>
        </section>

        <section className="bandx">
          <div className="wrap">
            <h2 className="sect-title">Questions</h2>
            <div className="faq">{faqs.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
