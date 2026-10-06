"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PRICE_KOBO } from "@convex/lib/constants";
import { cleanError, naira, shortDate, siteUrl } from "@/lib/format";
import { useTrack } from "@/lib/track";
import type { BuilderData } from "./shared";

const wa = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="copy">
      <span><span className="muted small">{label}</span><br /><b>{value}</b></span>
      <button className="btn ghost small" onClick={() => { void navigator.clipboard?.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? "Copied" : "Copy"}</button>
    </div>
  );
}

export function PayStep({ data }: { data: BuilderData }) {
  const { project, assets, wishes, deliverables } = data;
  const track = useTrack();
  const bank = useQuery(api.payments.bankDetails);
  const claim = useMutation(api.projects.claimTransfer);
  const me = useQuery(api.users.me);
  const cfg = useQuery(api.bachs.config);
  const checkout = useAction(api.bachs.checkoutProject);
  const useCredit = useMutation(api.packs.useCredit);
  const setWish = useMutation(api.wishes.setStatus);
  const [sender, setSender] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { track("preview_viewed", { slug: project.slug }); }, [project.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const photos = assets.filter((a) => a.kind === "photo").length;
  const url = siteUrl(project.slug);
  const previewHref = `/app/preview/${project.slug}`;
  const ready = photos >= 3;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await claim({ id: project._id, senderName: sender, reference: reference || undefined });
    } catch (err) {
      setError(cleanError(err));
    } finally {
      setBusy(false);
    }
  }

  const share = `Come and see our celebration page: ${url}`;

  return (
    <div className="stack">
      <div className="card stack" style={{ gap: 10 }}>
        <b>Checklist</b>
        <div className={photos >= 3 ? "okmsg" : "err"}>{photos >= 3 ? "✓" : "✗"} At least 3 photos ({photos} added)</div>
        <div className="okmsg">✓ Names and link set: {project.names}, /{project.slug}</div>
        <div><a className="btn ghost" href={previewHref} target="_blank" rel="noreferrer">Open my website preview</a></div>
        <div className="hint">Only you can see the preview until payment is confirmed.</div>
      </div>

      {project.status === "suspended" ? <div className="card err">This site is suspended. Please contact support.</div> : null}

      {project.status === "draft" && (me?.credits ?? 0) > 0 ? (
        <div className="card stack" style={{ gap: 10 }}>
          <div className="row between"><h3 style={{ fontSize: 22 }}>You have {me?.credits} credit{me?.credits === 1 ? "" : "s"}</h3><span className="chip gold">No payment needed</span></div>
          <p className="muted" style={{ margin: 0 }}>Use one credit to publish this celebration and start its two videos.</p>
          {error ? <div className="err">{error}</div> : null}
          <div><button className="btn gold" disabled={busy || !ready} onClick={() => { setBusy(true); setError(null); void useCredit({ id: project._id }).catch((e) => setError(cleanError(e))).finally(() => setBusy(false)); }}>Use a credit</button></div>
          {!ready ? <div className="hint">Add at least 3 photos first.</div> : null}
        </div>
      ) : null}

      {project.status === "draft" && cfg?.online ? (
        <div className="card stack" style={{ gap: 10 }}>
          <div className="row between"><h3 style={{ fontSize: 22 }}>Pay {naira(PRICE_KOBO)}</h3><span className="chip">One time</span></div>
          <p className="muted" style={{ margin: 0 }}>Pay securely by card or bank transfer. This page updates by itself as soon as the payment is confirmed.</p>
          {error ? <div className="err">{error}</div> : null}
          <div>
            <button className="btn gold" disabled={busy || !ready} onClick={() => { setBusy(true); setError(null); void checkout({ projectId: project._id }).then((url) => { window.location.href = url; }).catch((e) => { setError(cleanError(e)); setBusy(false); }); }}>{busy ? "Opening payment page…" : `Pay ${naira(PRICE_KOBO)}`}</button>
          </div>
          {!ready ? <div className="hint">Add at least 3 photos first.</div> : null}
          {cfg.transfer ? <details><summary className="small muted" style={{ cursor: "pointer" }}>Pay by manual bank transfer instead</summary><div style={{ marginTop: 12 }}><div className="stack">
          <div className="row between"><h3 style={{ fontSize: 22 }}>Pay {naira(PRICE_KOBO)}</h3><span className="chip">One time</span></div>
          <p className="muted" style={{ margin: 0 }}>Pay by bank transfer. After you pay, tell us below and we confirm it, usually within a few hours between 8am and 10pm.</p>
          {bank === undefined ? <p className="muted">Loading…</p> : bank === null ? (
            <p className="err">Payment details are not set up yet. Please chat with us on WhatsApp.</p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              <CopyRow label="Bank" value={bank.bankName} />
              <CopyRow label="Account number" value={bank.accountNumber} />
              <CopyRow label="Account name" value={bank.accountName} />
              <CopyRow label="Amount" value={naira(bank.amountKobo)} />
              <div className="hint">Use "{project.slug}" as the transfer reference if your bank app allows it.</div>
            </div>
          )}
          <form className="stack" onSubmit={submit}>
            <label className="field"><span>Name on the account you paid from</span><input type="text" required value={sender} onChange={(e) => setSender(e.target.value)} /></label>
            <label className="field"><span>Transfer reference (optional)</span><input type="text" value={reference} onChange={(e) => setReference(e.target.value)} /></label>
            {error ? <div className="err">{error}</div> : null}
            <button className="btn" disabled={busy || !ready || !sender.trim()}>{busy ? "Sending…" : "I have paid"}</button>
            {!ready ? <div className="hint">Add at least 3 photos first.</div> : null}
          </form>
        </div></div></details> : null}
        </div>
      ) : null}

      {project.status === "draft" && cfg && !cfg.online ? (
        <div className="card stack">
          <div className="row between"><h3 style={{ fontSize: 22 }}>Pay {naira(PRICE_KOBO)}</h3><span className="chip">One time</span></div>
          <p className="muted" style={{ margin: 0 }}>Pay by bank transfer. After you pay, tell us below and we confirm it, usually within a few hours between 8am and 10pm.</p>
          {bank === undefined ? <p className="muted">Loading…</p> : bank === null ? (
            <p className="err">Payment details are not set up yet. Please chat with us on WhatsApp.</p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              <CopyRow label="Bank" value={bank.bankName} />
              <CopyRow label="Account number" value={bank.accountNumber} />
              <CopyRow label="Account name" value={bank.accountName} />
              <CopyRow label="Amount" value={naira(bank.amountKobo)} />
              <div className="hint">Use "{project.slug}" as the transfer reference if your bank app allows it.</div>
            </div>
          )}
          <form className="stack" onSubmit={submit}>
            <label className="field"><span>Name on the account you paid from</span><input type="text" required value={sender} onChange={(e) => setSender(e.target.value)} /></label>
            <label className="field"><span>Transfer reference (optional)</span><input type="text" value={reference} onChange={(e) => setReference(e.target.value)} /></label>
            {error ? <div className="err">{error}</div> : null}
            <button className="btn" disabled={busy || !ready || !sender.trim()}>{busy ? "Sending…" : "I have paid"}</button>
            {!ready ? <div className="hint">Add at least 3 photos first.</div> : null}
          </form>
        </div>
      ) : null}

      {project.status === "payment_claimed" ? (
        <div className="card stack" style={{ gap: 8 }}>
          <h3 style={{ fontSize: 22 }}>We are confirming your payment</h3>
          <p className="muted" style={{ margin: 0 }}>Thank you. We check payments between 8am and 10pm. Your website goes live as soon as we confirm, and we start your two videos then.</p>
        </div>
      ) : null}

      {project.status === "paid" ? (
        <>
          <div className="card stack" style={{ gap: 12 }}>
            <div className="row between"><h3 style={{ fontSize: 22 }}>Your website is live</h3><span className="chip ok">Live</span></div>
            <CopyRow label="Your link" value={url} />
            <div className="row">
              <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer" onClick={() => track("share_click", { slug: project.slug, props: { channel: "whatsapp" } })}>Share on WhatsApp</a>
              <a className="btn ghost" href={previewHref} target="_blank" rel="noreferrer">Open website</a>
            </div>
          </div>

          <div className="card stack" style={{ gap: 12 }}>
            <h3 style={{ fontSize: 22 }}>Your videos</h3>
            {deliverables.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>We are making your two videos now. They usually take up to 24 hours. They appear here, and we message you when they are ready.</p>
            ) : (
              deliverables.map((d, i) => (
                <div key={i} className="row between card" style={{ padding: 12 }}>
                  <div><b>{d.label}</b><div className="muted small">{d.format}</div></div>
                  {d.url ? <a className="btn small" href={d.url} download target="_blank" rel="noreferrer" onClick={() => track("video_download", { slug: project.slug, props: { label: d.label } })}>Download</a> : null}
                </div>
              ))
            )}
          </div>

          <div className="card stack" style={{ gap: 12 }}>
            <h3 style={{ fontSize: 22 }}>Guest wishes</h3>
            {!project.wishesOn ? <p className="muted" style={{ margin: 0 }}>Wishes are turned off. You can turn them on in the Words step.</p> : wishes.length === 0 ? <p className="muted" style={{ margin: 0 }}>No wishes yet. Share your link and they appear here for you to approve.</p> : wishes.map((w) => (
              <div key={w._id} className="card" style={{ padding: 12 }}>
                <div className="row between"><b>{w.guestName}</b><span className={`chip ${w.status === "approved" ? "ok" : w.status === "hidden" ? "bad" : "warn"}`}>{w.status}</span></div>
                <p style={{ margin: "6px 0" }}>{w.message}</p>
                <div className="row"><span className="muted small grow">{shortDate(w.createdAt)}</span>
                  {w.status !== "approved" ? <button className="btn small" onClick={() => void setWish({ id: w._id, status: "approved" })}>Approve</button> : null}
                  {w.status !== "hidden" ? <button className="btn ghost small" onClick={() => void setWish({ id: w._id, status: "hidden" })}>Hide</button> : null}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {wa ? <a className="btn ghost" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">Need help? Chat with us on WhatsApp</a> : null}
    </div>
  );
}
