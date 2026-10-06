import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Tracker } from "@/components/Tracker";
import { PACKS, PRICE_KOBO } from "@convex/lib/constants";
import { naira } from "@/lib/format";

export const metadata: Metadata = { title: "Packs for planners and photographers", description: "Buy celebrations in bulk and pay less for each one." };

export default function Partners() {
  return (
    <>
      <Tracker name="packs_view" />
      <Header dark />
      <main>
        <section className="page-hero">
          <div className="wrap">
            <h1>More clients. Lower price each.</h1>
            <p>Event planners, photographers and videographers buy celebrations in a pack. Every credit gives one client a website and two videos.</p>
            <Link href="/app/credits" className="btn gold">Buy a pack</Link>
          </div>
        </section>
        <section className="band">
          <div className="wrap">
            <div className="pack-grid">
              {PACKS.map((p) => {
                const each = p.priceKobo / p.credits;
                const save = PRICE_KOBO - each;
                return (
                  <div key={p.id} className={`pack${p.id === "pack10" ? " best" : ""}`}>
                    <div className="row between"><b>{p.label}</b>{p.id === "pack10" ? <span className="chip gold">Most chosen</span> : null}</div>
                    <div className="each">{naira(each)}</div>
                    <div className="muted small">per celebration · <s>{naira(PRICE_KOBO)}</s></div>
                    <div>{p.credits} celebrations for {naira(p.priceKobo)}</div>
                    <div className="okmsg">You save {naira(save * p.credits)}</div>
                    <Link href={`/app/credits?pack=${p.id}`} className="btn">Choose {p.credits}</Link>
                  </div>
                );
              })}
            </div>
            <p className="muted" style={{ marginTop: 24, maxWidth: 560 }}>You pay once by bank transfer. We confirm it and add the credits to your account. Build each client's celebration yourself, then use a credit to publish it. Credits do not expire.</p>
          </div>
        </section>
      </main>
    </>
  );
}
