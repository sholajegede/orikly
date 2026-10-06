import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { Tracker } from "@/components/Tracker";
import { FULL_CREDITS, creditPriceKobo } from "@convex/lib/constants";
import { naira } from "@/lib/format";

export const metadata: Metadata = { title: "Bulk credits for planners and photographers", description: "Buy credits in bulk and pay less for every celebration you make for a client." };

const BULK = [
  { credits: 60, label: "Side hustle" },
  { credits: 120, label: "Studio", best: true },
  { credits: 240, label: "Agency" },
];

export default function Partners() {
  const single = creditPriceKobo(FULL_CREDITS + 3) * (FULL_CREDITS / (FULL_CREDITS + 3));
  return (
    <>
      <Tracker name="packs_view" />
      <Header />
      <main>
        <section className="page-hero">
          <div className="wrap">
            <h1>Make them for your clients.</h1>
            <p>Planners, photographers, MCs and anyone with a good eye: buy credits in bulk, make celebrations for your clients, and charge what you like. Each one is a designed website and two films.</p>
            <Link href="/login?next=%2Fapp%2Fcredits%3Fcredits%3D120" className="btn gold">Buy bulk credits</Link>
          </div>
        </section>
        <section className="band">
          <div className="wrap">
            <div className="pack-grid">
              {BULK.map((p) => {
                const price = creditPriceKobo(p.credits);
                const each = (price / p.credits) * FULL_CREDITS;
                const made = Math.floor(p.credits / FULL_CREDITS);
                return (
                  <div key={p.credits} className={`pack${p.best ? " best" : ""}`}>
                    <div className="row between"><b>{p.label}</b>{p.best ? <span className="chip gold">Most chosen</span> : null}</div>
                    <div className="each">{naira(each)}</div>
                    <div className="muted small">per celebration · <s>{naira(single)}</s></div>
                    <div>{p.credits} credits for {naira(price)}</div>
                    <div className="okmsg">Enough for {made} celebrations</div>
                    <Link href={`/login?next=${encodeURIComponent(`/app/credits?credits=${p.credits}`)}`} className="btn">Choose {p.credits}</Link>
                  </div>
                );
              })}
            </div>
            <p className="muted" style={{ marginTop: 24, maxWidth: 560 }}>You pay once, by card or bank transfer on a secure page. The credits are added to your account the moment you pay, and they never expire. <Link href="/pricing">See every price</Link>.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
