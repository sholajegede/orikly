"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PACKS, PRICE_KOBO } from "@convex/lib/constants";
import { AppBar } from "@/components/AppBar";
import { cleanError, naira, shortDate } from "@/lib/format";

function Inner() {
  const params = useSearchParams();
  const mine = useQuery(api.packs.mine);
  const billing = useQuery(api.account.billing);
  const cfg = useQuery(api.bachs.config);
  const pay = useAction(api.bachs.checkoutPack);
  const [packId, setPackId] = useState(params.get("pack") ?? "pack10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pack = PACKS.find((p) => p.id === packId) ?? PACKS[1];

  return (
    <main className="page slim">
      <div className="stack">
        <div className="row between">
          <h1 className="page-h" style={{ margin: 0 }}>Credits</h1>
          <span className="chip gold">{mine?.credits ?? 0} left</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>One credit publishes one celebration with its website and two videos. Open a celebration and choose "Use a credit" on the last step. Credits never expire.</p>
        <h2 className="sect-h">Top up</h2>

        <div className="grid">
          {PACKS.map((p) => (
            <button key={p.id} className={`opt${packId === p.id ? " on" : ""}`} onClick={() => setPackId(p.id)}>
              <div className="row between"><b>{p.label}: {p.credits} celebrations</b><span>{naira(p.priceKobo)}</span></div>
              <div className="muted small">{naira(p.priceKobo / p.credits)} each, instead of {naira(PRICE_KOBO)}</div>
            </button>
          ))}
        </div>

        {cfg?.online ? (
          <div className="card stack" style={{ gap: 10 }}>
            <h3 style={{ fontSize: 22 }}>Pay {naira(pack.priceKobo)}</h3>
            <p className="muted" style={{ margin: 0 }}>Pay by card or bank transfer on a secure page. Your credits appear here the moment you pay.</p>
            {error ? <div className="err">{error}</div> : null}
            <div><button className="btn gold" disabled={busy} onClick={() => { setBusy(true); setError(null); void pay({ packId }).then((url) => { window.location.href = url; }).catch((e) => { setError(cleanError(e)); setBusy(false); }); }}>{busy ? "Opening payment page…" : `Pay ${naira(pack.priceKobo)}`}</button></div>
          </div>
        ) : null}

        {cfg && !cfg.online ? (
          <div className="card stack" style={{ gap: 8 }}>
            <h3 style={{ fontSize: 22 }}>Payment opens soon</h3>
            <p className="muted" style={{ margin: 0 }}>We are switching payments on. Come back shortly to top up.</p>
          </div>
        ) : null}

        {mine && mine.orders.length ? (
          <div className="card stack" style={{ gap: 8 }}>
            <b>Your orders</b>
            {mine.orders.map((o) => (
              <div key={o._id} className="earn-line"><span>{o.credits} credits · {naira(o.amountKobo)} · {shortDate(o.createdAt)}</span><span className={`chip ${o.status === "confirmed" ? "ok" : o.status === "rejected" ? "bad" : "warn"}`}>{o.status}</span></div>
            ))}
          </div>
        ) : null}
        <div className="card">
          <b>Payment history</b>
          {billing === undefined ? <p className="muted">Loading…</p> : billing.length === 0 ? <p className="muted" style={{ marginBottom: 0 }}>No payments yet.</p> : billing.map((r) => (
            <div key={r.id} className="earn-line"><span>{r.what} <span className="muted small">{shortDate(r.at)}</span></span><span>{r.method === "credit" ? "1 credit" : naira(r.amountKobo)} <span className={`chip ${r.status === "confirmed" ? "ok" : r.status === "claimed" ? "warn" : "bad"}`}>{r.status}</span></span></div>
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
