"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { COST, CREDIT_STEPS, STARTER_CREDITS, creditPriceKobo } from "@convex/lib/constants";
import { AppBar } from "@/components/AppBar";
import { CreditSlider } from "@/components/CreditSlider";
import { cleanError, naira, shortDate } from "@/lib/format";

function Inner() {
  const params = useSearchParams();
  const mine = useQuery(api.packs.mine);
  const billing = useQuery(api.account.billing);
  const cfg = useQuery(api.bachs.config);
  const pay = useAction(api.bachs.checkoutCredits);
  const asked = Number(params.get("credits"));
  const [credits, setCredits] = useState((CREDIT_STEPS as readonly number[]).includes(asked) ? asked : STARTER_CREDITS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const price = creditPriceKobo(credits);

  return (
    <main className="page slim">
      <div className="stack">
        <div className="row between">
          <h1 className="page-h" style={{ margin: 0 }}>Credits</h1>
          <span className="chip gold">{mine?.credits ?? 0} left</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>Credits pay for what the studio makes. A website is {COST.site}, each film is {COST.film}, a new design is {COST.redesign}. Editing by hand is free. Credits never expire.</p>
        {params.get("paid") ? <div className="okmsg">Payment received. Your credits appear here in a moment.</div> : null}

        <h2 className="sect-h">Top up</h2>
        <div className="card stack" style={{ gap: 16 }}>
          <CreditSlider credits={credits} onChange={setCredits} />
          {error ? <div className="err">{error}</div> : null}
          {cfg?.online ? (
            <div className="row">
              <button className="btn gold" disabled={busy} onClick={() => { setBusy(true); setError(null); void pay({ credits }).then((url) => { window.location.href = url; }).catch((e) => { setError(cleanError(e)); setBusy(false); }); }}>{busy ? "Opening payment page…" : `Pay ${naira(price)}`}</button>
              <span className="muted small">By card or bank transfer, on a secure page.</span>
            </div>
          ) : cfg ? <p className="muted" style={{ margin: 0 }}>We are switching payments on. Come back shortly to top up.</p> : null}
        </div>

        <div className="card">
          <b>History</b>
          {billing === undefined ? <p className="muted">Loading…</p> : billing.length === 0 ? <p className="muted" style={{ marginBottom: 0 }}>Nothing yet.</p> : billing.map((r) => (
            <div key={r.id} className="earn-line">
              <span>{r.method === "credit" ? r.note ?? "Credits used" : r.method === "pack" ? `Bought ${r.what}` : r.method === "comp" ? "Published free" : "Paid"} <span className="muted small">{r.method === "pack" ? "" : `${r.what} · `}{shortDate(r.at)}</span></span>
              <span>{r.method === "credit" ? <span className={`chip ${r.status === "refunded" ? "ok" : ""}`}>{r.status === "refunded" ? "returned" : "used"}</span> : r.method === "comp" ? <span className="chip">gift</span> : naira(r.amountKobo)}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function Credits() {
  return (
    <>
      <AppBar />
      <Suspense fallback={<main className="page"><p className="muted">Loading…</p></main>}><Inner /></Suspense>
    </>
  );
}
