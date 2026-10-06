"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PACKS, PRICE_KOBO } from "@convex/lib/constants";
import { AppBar } from "@/components/AppBar";
import { cleanError, naira, shortDate } from "@/lib/format";

function Inner() {
  const params = useSearchParams();
  const mine = useQuery(api.packs.mine);
  const billing = useQuery(api.account.billing);
  const bank = useQuery(api.payments.bankDetails);
  const claim = useMutation(api.packs.claim);
  const cfg = useQuery(api.bachs.config);
  const pay = useAction(api.bachs.checkoutPack);
  const [packId, setPackId] = useState(params.get("pack") ?? "pack10");
  const [sender, setSender] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const pack = PACKS.find((p) => p.id === packId) ?? PACKS[1];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await claim({ packId, senderName: sender, reference: reference || undefined });
      setDone(true);
      setSender("");
      setReference("");
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap dash" style={{ maxWidth: 820 }}>
      <div className="stack">
        <div className="row between">
          <h1 className="display" style={{ fontSize: "clamp(40px, 8vw, 64px)", fontWeight: 400 }}>Credits</h1>
          <span className="chip gold">{mine?.credits ?? 0} left</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>One credit publishes one celebration with its website and two videos. Open a celebration and choose "Use a credit" on the last step. Credits never expire.</p>
        <h2 style={{ fontSize: 22, marginTop: 28 }}>Top up</h2>

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
            <p className="muted" style={{ margin: 0 }}>Pay by card or bank transfer. Your credits appear here by themselves once the payment is confirmed.</p>
            {error ? <div className="err">{error}</div> : null}
            <div><button className="btn gold" disabled={busy} onClick={() => { setBusy(true); setError(null); void pay({ packId }).then((url) => { window.location.href = url; }).catch((e) => { setError(cleanError(e)); setBusy(false); }); }}>{busy ? "Opening payment page…" : `Pay ${naira(pack.priceKobo)}`}</button></div>
          </div>
        ) : null}

        {cfg && !cfg.online ? (
        <div className="card stack">
          <h3 style={{ fontSize: 22 }}>Pay {naira(pack.priceKobo)} by bank transfer</h3>
          {bank === undefined ? <p className="muted">Loading…</p> : bank === null ? (
            <p className="err">Payment details are not set up yet. Please chat with us on WhatsApp.</p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              <div className="copy"><span><span className="muted small">Bank</span><br /><b>{bank.bankName}</b></span></div>
              <div className="copy"><span><span className="muted small">Account number</span><br /><b>{bank.accountNumber}</b></span></div>
              <div className="copy"><span><span className="muted small">Account name</span><br /><b>{bank.accountName}</b></span></div>
              <div className="copy"><span><span className="muted small">Amount</span><br /><b>{naira(pack.priceKobo)}</b></span></div>
            </div>
          )}
          <form className="stack" onSubmit={submit}>
            <label className="field"><span>Name on the account you paid from</span><input type="text" required value={sender} onChange={(e) => setSender(e.target.value)} /></label>
            <label className="field"><span>Transfer reference (optional)</span><input type="text" value={reference} onChange={(e) => setReference(e.target.value)} /></label>
            {error ? <div className="err">{error}</div> : null}
            {done ? <div className="okmsg">Thank you. We confirm payments between 8am and 10pm. Your credits appear here as soon as we do.</div> : null}
            <button className="btn" disabled={busy || !sender.trim()}>{busy ? "Sending…" : "I have paid"}</button>
          </form>
        </div>
        ) : null}

        {mine && mine.orders.length ? (
          <div className="card stack" style={{ gap: 8 }}>
            <b>Your orders</b>
            {mine.orders.map((o) => (
              <div key={o._id} className="earn-line"><span>{o.credits} credits · {naira(o.amountKobo)} · {shortDate(o.createdAt)}</span><span className={`chip ${o.status === "confirmed" ? "ok" : o.status === "rejected" ? "bad" : "warn"}`}>{o.status === "claimed" ? "Confirming" : o.status}</span></div>
            ))}
          </div>
        ) : null}
        <div className="card">
          <b>Payment history</b>
          {billing === undefined ? <p className="muted">Loading…</p> : billing.length === 0 ? <p className="muted" style={{ marginBottom: 0 }}>No payments yet.</p> : billing.map((r) => (
            <div key={r.id} className="earn-line"><span>{r.what} <span className="muted small">{shortDate(r.at)}</span></span><span>{r.method === "credit" ? "1 credit" : naira(r.amountKobo)} <span className={`chip ${r.status === "confirmed" ? "ok" : r.status === "claimed" ? "warn" : "bad"}`}>{r.status === "claimed" ? "confirming" : r.status}</span></span></div>
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
      <Suspense fallback={<main className="wrap"><p className="muted">Loading…</p></main>}><Inner /></Suspense>
    </>
  );
}
