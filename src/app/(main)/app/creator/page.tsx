"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { CREATOR_MAX_ACTIVE, MIN_PAYOUT_KOBO } from "@convex/lib/constants";
import { Header } from "@/components/Header";
import { cleanError, naira, shortDate } from "@/lib/format";

export default function CreatorStudio() {
  const mine = useQuery(api.creators.mine);
  return (
    <>
      <Header />
      <main className="wrap" style={{ padding: "28px 16px 64px" }}>
        {mine === undefined ? <p className="muted">Loading…</p> : mine === null ? <Apply /> : mine.creator.status === "approved" ? <Studio /> : <Waiting status={mine.creator.status} />}
      </main>
    </>
  );
}

function Waiting({ status }: { status: string }) {
  const text: Record<string, string> = {
    pending: "We got your application. We read every one and reply on WhatsApp, usually within two days.",
    rejected: "We cannot take your application right now. Thank you for applying.",
    suspended: "Your creator account is paused. Please chat with us on WhatsApp.",
  };
  return (
    <div className="card stack narrow" style={{ margin: "0 auto" }}>
      <h1 className="display" style={{ fontSize: 34 }}>{status === "pending" ? "Application received" : "Creator account"}</h1>
      <p className="muted" style={{ margin: 0 }}>{text[status] ?? ""}</p>
      <div><Link href="/app" className="btn ghost">Back to my celebrations</Link></div>
    </div>
  );
}

function Apply() {
  const apply = useMutation(api.creators.apply);
  const [f, setF] = useState({ displayName: "", whatsapp: "", city: "", portfolioUrl: "", experience: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apply({ ...f, portfolioUrl: f.portfolioUrl || undefined });
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack narrow" style={{ margin: "0 auto" }} onSubmit={submit}>
      <h1 className="display" style={{ fontSize: 40 }}>Apply to make videos</h1>
      <p className="muted" style={{ margin: 0 }}>You earn {naira(350_000)} for every video we approve. Tell us about your work.</p>
      <label className="field"><span>Name you work under</span><input type="text" required value={f.displayName} onChange={set("displayName")} /></label>
      <label className="field"><span>WhatsApp number</span><input type="tel" inputMode="tel" required value={f.whatsapp} onChange={set("whatsapp")} placeholder="0801 234 5678" /></label>
      <label className="field"><span>City</span><input type="text" required value={f.city} onChange={set("city")} /></label>
      <label className="field"><span>Link to your work (optional)</span><input type="url" value={f.portfolioUrl} onChange={set("portfolioUrl")} placeholder="Instagram, YouTube or Drive link" /></label>
      <label className="field"><span>What videos do you make, and with what tools?</span><textarea required value={f.experience} onChange={set("experience")} maxLength={600} /></label>
      {error ? <div className="err">{error}</div> : null}
      <div><button className="btn" disabled={busy}>{busy ? "Sending…" : "Send application"}</button></div>
    </form>
  );
}

const TABS = ["Open jobs", "My jobs", "Earnings"] as const;

function Studio() {
  const mine = useQuery(api.creators.mine)!;
  const [tab, setTab] = useState<(typeof TABS)[number]>("Open jobs");
  const c = mine.creator;
  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h1 className="display" style={{ fontSize: 40 }}>Studio</h1>
          <div className="muted small">{c.displayName} · {c.completed} videos approved</div>
        </div>
        <div className="card" style={{ padding: "10px 16px" }}><div className="muted small">Balance</div><b style={{ fontFamily: "var(--display)", fontSize: 28 }}>{naira(c.balanceKobo)}</b></div>
      </div>
      <div className="tabs">{TABS.map((t) => <button key={t} className={`stepbtn ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === "Open jobs" ? <OpenJobs onClaimed={() => setTab("My jobs")} /> : null}
      {tab === "My jobs" ? <MyJobs /> : null}
      {tab === "Earnings" ? <Earnings /> : null}
    </div>
  );
}

function OpenJobs({ onClaimed }: { onClaimed: () => void }) {
  const jobs = useQuery(api.creators.openJobs);
  const claim = useMutation(api.creators.claim);
  const [error, setError] = useState<string | null>(null);
  if (jobs === undefined) return <p className="muted">Loading…</p>;
  if (jobs.length === 0) return <div className="card"><b>No open jobs right now.</b><p className="muted" style={{ marginBottom: 0 }}>New jobs appear when customers pay. Check back soon.</p></div>;
  return (
    <div className="stack">
      {error ? <div className="err">{error}</div> : null}
      <div className="grid three">
        {jobs.map((j) => (
          <div key={j._id} className="card jobcard">
            <div className="row between"><b style={{ textTransform: "capitalize" }}>{j.style}</b><span className="chip gold">{naira(j.payoutKobo)}</span></div>
            <div className="muted small" style={{ textTransform: "capitalize" }}>{j.slot} · {j.occasion}</div>
            <div className="muted small">{j.photos} photos · {j.hasSong ? "song included" : "no song chosen"}</div>
            <div><button className="btn small" onClick={() => { setError(null); void claim({ jobId: j._id }).then(onClaimed).catch((e) => setError(cleanError(e))); }}>Take this job</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MyJobs() {
  const jobs = useQuery(api.creators.myJobs);
  const release = useMutation(api.creators.release);
  if (jobs === undefined) return <p className="muted">Loading…</p>;
  if (jobs.length === 0) return <div className="card"><b>You have no jobs yet.</b><p className="muted" style={{ marginBottom: 0 }}>Take one from Open jobs. You can hold {CREATOR_MAX_ACTIVE} at a time.</p></div>;
  const label: Record<string, string> = { claimed: "In progress", submitted: "With us for review", approved: "Approved" };
  return (
    <div className="stack">
      {jobs.map((j) => (
        <div key={j._id} className="card stack" style={{ gap: 8 }}>
          <div className="row between"><b>{j.names} <span className="muted small" style={{ textTransform: "capitalize" }}>· {j.style} · {j.slot}</span></b><span className={`chip ${j.status === "approved" ? "ok" : j.status === "submitted" ? "warn" : ""}`}>{label[j.status]}</span></div>
          {j.status === "claimed" && j.dueAt ? <div className="muted small">Due {shortDate(j.dueAt)}</div> : null}
          {j.reviewNote ? <div className="err">Changes asked for: {j.reviewNote}</div> : null}
          <div className="row">
            {j.status === "claimed" ? <Link className="btn small" href={`/app/creator/job/${j._id}`}>Open brief and upload</Link> : null}
            {j.status === "claimed" ? <button className="btn ghost small" onClick={() => void release({ jobId: j._id })}>Give it back</button> : null}
            {j.status === "approved" ? <span className="okmsg">Paid into your balance: {naira(j.payoutKobo)}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function Earnings() {
  const mine = useQuery(api.creators.mine)!;
  const ledger = useQuery(api.creators.ledger);
  const saveBank = useMutation(api.creators.saveBank);
  const request = useMutation(api.creators.requestPayout);
  const c = mine.creator;
  const [bank, setBank] = useState({ bankName: c.bankName ?? "", accountNumber: c.accountNumber ?? "", accountName: c.accountName ?? "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<unknown>, ok: string) => { setMsg(null); fn().then(() => setMsg({ ok: true, text: ok })).catch((e) => setMsg({ ok: false, text: cleanError(e) })); };
  const waiting = mine.payouts.find((p) => p.status === "requested");
  return (
    <div className="grid two">
      <div className="card stack">
        <h3 style={{ fontSize: 22 }}>Get paid</h3>
        <p className="muted small" style={{ margin: 0 }}>Payouts start from {naira(MIN_PAYOUT_KOBO)}. We send the money to your account by bank transfer.</p>
        <label className="field"><span>Bank</span><input type="text" value={bank.bankName} onChange={(e) => setBank({ ...bank, bankName: e.target.value })} /></label>
        <label className="field"><span>Account number</span><input type="text" inputMode="numeric" maxLength={10} value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} /></label>
        <label className="field"><span>Account name</span><input type="text" value={bank.accountName} onChange={(e) => setBank({ ...bank, accountName: e.target.value })} /></label>
        <div className="row">
          <button className="btn ghost small" onClick={() => run(() => saveBank(bank), "Bank details saved.")}>Save bank details</button>
          <button className="btn small" disabled={!!waiting || c.balanceKobo < MIN_PAYOUT_KOBO} onClick={() => run(() => request({}), "Payout requested. We pay within two days.")}>Request {naira(c.balanceKobo)}</button>
        </div>
        {waiting ? <div className="okmsg">A payout of {naira(waiting.amountKobo)} is waiting for us to send.</div> : null}
        {msg ? <div className={msg.ok ? "okmsg" : "err"}>{msg.text}</div> : null}
      </div>
      <div className="card">
        <h3 style={{ fontSize: 22, marginBottom: 8 }}>History</h3>
        {ledger === undefined ? <p className="muted">Loading…</p> : ledger.length === 0 ? <p className="muted">Nothing yet. Approved videos show here.</p> : ledger.map((l) => (
          <div key={l._id} className="earn-line"><span>{l.kind === "earning" ? "Video approved" : l.kind === "payout" ? "Payout requested" : "Payout returned"} · {shortDate(l.createdAt)}</span><b style={{ color: l.amountKobo < 0 ? "var(--muted)" : "var(--ok)" }}>{l.amountKobo < 0 ? "-" : "+"}{naira(Math.abs(l.amountKobo))}</b></div>
        ))}
      </div>
    </div>
  );
}
