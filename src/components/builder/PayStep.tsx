"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { COST, MIN_LETTERS, creditPriceKobo, creditStepFor, STARTER_CREDITS } from "@convex/lib/constants";
import { cleanError, naira, shortDate, siteUrl } from "@/lib/format";
import { useTrack } from "@/lib/track";
import type { BuilderData } from "./shared";
import { Studio } from "./Studio";

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
  const me = useQuery(api.users.me);
  const cfg = useQuery(api.bachs.config);
  const checkout = useAction(api.bachs.checkoutProject);
  const publish = useMutation(api.packs.publish);
  const [films, setFilms] = useState(true);
  const [letters, setLetters] = useState(false);
  const setWall = useMutation(api.projects.update);
  const setWish = useMutation(api.wishes.setStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { track("preview_viewed", { slug: project.slug }); }, [project.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tell the ad platforms about the sale once, the first time this browser sees the celebration live.
  useEffect(() => {
    if (project.status !== "paid") return;
    try {
      const k = `orikly_purchase_${project._id}`;
      if (window.localStorage.getItem(k)) return;
      window.localStorage.setItem(k, "1");
      track("purchase_seen", { slug: project.slug, naira: creditPriceKobo(STARTER_CREDITS) / 100, id: project._id });
    } catch {
      /* ignore */
    }
  }, [project.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const photos = assets.filter((a) => a.kind === "photo").length;
  const url = siteUrl(project.slug);
  const previewHref = `/app/preview/${project.slug}`;
  const ready = photos >= 3;
  const have = me?.credits ?? 0;
  const lettersReady = (project.letters ?? []).filter((l) => l.when.trim() && l.text.trim()).length;
  const withLetters = letters && lettersReady >= MIN_LETTERS;
  const need = COST.site + (films ? COST.film * 2 : 0) + (withLetters ? COST.letters : 0);
  // Someone starting from nothing gets the starter, which leaves credits over. Otherwise, the smallest top-up that covers it.
  const buy = have === 0 && films ? Math.max(STARTER_CREDITS, creditStepFor(need)) : creditStepFor(need - have);

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

      <Studio data={data} />

      {project.status === "suspended" ? <div className="card err">This site is suspended. Please contact support.</div> : null}

      {project.status === "draft" ? (
        <div className="card stack" style={{ gap: 14 }}>
          <div className="row between"><h3 style={{ fontSize: 22 }}>What you are getting</h3><span className="chip gold">You have {have} credit{have === 1 ? "" : "s"}</span></div>
          <div className="cost-rows tight">
            <div><div><b>Your designed website</b><span>Designed around your photos and words, live at your own link.</span></div><em>{COST.site} credits</em></div>
            <label style={{ cursor: "pointer" }}>
              <div className="row" style={{ gap: 12, flexWrap: "nowrap", alignItems: "flex-start" }}>
                <input type="checkbox" checked={films} onChange={(e) => setFilms(e.target.checked)} style={{ width: 22, height: 22, flex: "0 0 auto", marginTop: 2 }} />
                <div><b>Two films</b><span>One tall for WhatsApp status, one wide for a big screen, cut to your song. You can add them later.</span></div>
              </div>
              <em>{COST.film * 2} credits</em>
            </label>
            {lettersReady >= MIN_LETTERS ? (
              <label style={{ cursor: "pointer" }}>
                <div className="row" style={{ gap: 12, flexWrap: "nowrap", alignItems: "flex-start" }}>
                  <input type="checkbox" checked={letters} onChange={(e) => setLetters(e.target.checked)} style={{ width: 22, height: 22, flex: "0 0 auto", marginTop: 2 }} />
                  <div><b>Open when… letters</b><span>Your {lettersReady} letters as sealed envelopes on their own page, with their own film.</span></div>
                </div>
                <em>{COST.letters} credits</em>
              </label>
            ) : null}
            <div className="total"><div><b>Total</b></div><em>{need} credits</em></div>
          </div>
          {error ? <div className="err">{error}</div> : null}
          {have >= need ? (
            <>
              <div><button className="btn gold" disabled={busy || !ready} onClick={() => { setBusy(true); setError(null); void publish({ id: project._id, films, letters: withLetters }).catch((e) => setError(cleanError(e))).finally(() => setBusy(false)); }}>{busy ? "Publishing…" : `Use ${need} credits and go live`}</button></div>
              <div className="hint">You will have {have - need} credit{have - need === 1 ? "" : "s"} left.</div>
            </>
          ) : cfg?.online ? (
            <>
              <div>
                <button className="btn gold" disabled={busy || !ready} onClick={() => { setBusy(true); setError(null); track("checkout_started", { slug: project.slug, naira: creditPriceKobo(buy) / 100 }); void checkout({ projectId: project._id, credits: buy, films, letters: withLetters }).then((url) => { window.location.href = url; }).catch((e) => { setError(cleanError(e)); setBusy(false); }); }}>{busy ? "Opening payment page…" : `Pay ${naira(creditPriceKobo(buy))} and go live`}</button>
              </div>
              <div className="hint">That buys {buy} credits. This celebration uses {need}{have ? ` (you already have ${have})` : ""}, so you keep {have + buy - need}{have + buy - need > 0 ? " for a new design, Open when… letters or your next celebration" : ""}. Pay by card or bank transfer on a secure page. Your website goes live by itself the moment the payment enters. <a href="/pricing" target="_blank" rel="noreferrer">See all prices</a>.</div>
            </>
          ) : null}
          {!ready ? <div className="hint">Add at least 3 photos first.</div> : null}
        </div>
      ) : null}

      {project.status === "draft" && cfg && !cfg.online ? (
        <div className="card stack" style={{ gap: 8 }}>
          <h3 style={{ fontSize: 22 }}>Payment opens soon</h3>
          <p className="muted" style={{ margin: 0 }}>We are switching payments on. Your celebration is saved, so come back shortly and pay here.</p>
        </div>
      ) : null}

      {project.status === "paid" ? (
        <>
          <div className="card stack" style={{ gap: 12 }}>
            <div className="row between"><h3 style={{ fontSize: 22 }}>Your website is live</h3><span className="chip ok">Live</span></div>
            <CopyRow label="Your link" value={url} />
            <label className="row" style={{ cursor: "pointer", alignItems: "flex-start" }}>
              <input type="checkbox" checked={!!project.showOnWall} onChange={(e) => void setWall({ id: project._id, patch: { showOnWall: e.target.checked } })} style={{ width: 22, height: 22, marginTop: 2 }} />
              <span className="grow"><b>Show it on the wall of praise</b><span className="hint" style={{ display: "block" }}>Off by default. When on, your names, cover photo and link appear on orikly.ng for anyone to see. Turn it off any time.</span></span>
            </label>
            <div className="row">
              <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer" onClick={() => track("share_click", { slug: project.slug, props: { channel: "whatsapp" } })}>Share on WhatsApp</a>
              <a className="btn ghost" href={previewHref} target="_blank" rel="noreferrer">Open website</a>
            </div>
          </div>

          <div className="card stack" style={{ gap: 12 }}>
            <h3 style={{ fontSize: 22 }}>Downloads</h3>
            {deliverables.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>Direct your videos above. When they are saved, they appear here to download.</p>
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
