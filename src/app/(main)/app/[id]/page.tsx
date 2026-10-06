"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AppBar } from "@/components/AppBar";
import { Basics } from "@/components/builder/Basics";
import { Media } from "@/components/builder/Media";
import { Words } from "@/components/builder/Words";
import { Song } from "@/components/builder/Song";
import { Look } from "@/components/builder/Look";
import { Guests } from "@/components/builder/Guests";
import { PayStep } from "@/components/builder/PayStep";
import { useSave } from "@/components/builder/shared";
import { cleanError, siteUrl } from "@/lib/format";

const STEPS = [
  { tab: "Basics", title: "Who and when", why: "Start with the three things every celebration needs. Everything else comes later, one step at a time." },
  { tab: "Photos", title: "Your photos and clips", why: "These become the gallery on your website and the two videos. Add at least 3 photos. More good photos make a better video." },
  { tab: "Words", title: "Your words", why: "Say it your way. Your words go on the website and into your videos. Every box here is optional." },
  { tab: "For guests", title: "For your guests", why: "Optional. Where to come, what to wear and where to send a gift. Skip it if this is not that kind of celebration." },
  { tab: "Song", title: "Your song", why: "The music that plays under your two videos." },
  { tab: "Look", title: "The look", why: "How your website looks to guests." },
  { tab: "Pay", title: "See it, then pay", why: "Open your website the way guests will see it. Pay once and it goes live, then your designer and video director get to work." },
];

function DeleteCelebration({ id, slug }: { id: Id<"projects">; slug: string }) {
  const remove = useMutation(api.projects.remove);
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <details className="danger-zone">
      <summary>Delete this celebration</summary>
      <p className="hint">Removes the website, every photo, video, song and wish for it. This cannot be undone. A payment or credit used on it is not returned.</p>
      <label className="field"><span>Type {slug} to confirm</span><input type="text" value={confirm} autoCapitalize="none" autoComplete="off" onChange={(e) => setConfirm(e.target.value)} /></label>
      {error ? <div className="err">{error}</div> : null}
      <div style={{ marginTop: 10 }}><button type="button" className="btn danger small" disabled={confirm.trim().toLowerCase() !== slug} onClick={() => { setError(null); void remove({ id, confirm }).then(() => router.replace("/app")).catch((e) => setError(cleanError(e))); }}>Delete it</button></div>
    </details>
  );
}

/** Where the website is, always in the same place: the live link, or the private preview before payment. */
function SiteBar({ slug, live, names }: { slug: string; live: boolean; names: string }) {
  const [copied, setCopied] = useState(false);
  const url = siteUrl(slug);
  return (
    <div className="sitebar">
      <div className="url"><small>{live ? "Your website is live" : "Private preview"}</small><b>{live ? url.replace(/^https?:\/\//, "") : "Only you can see it until you pay"}</b></div>
      <div className="row" style={{ gap: 8 }}>
        <a className="btn light small" href={live ? url : `/app/preview/${slug}`} target="_blank" rel="noreferrer">{live ? "Open" : "Preview"}</a>
        {live ? <button className="btn ghost small" onClick={() => { void navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy link"}</button> : null}
        {live ? <a className="btn ghost small" href={`https://wa.me/?text=${encodeURIComponent(`${names}: ${url}`)}`} target="_blank" rel="noreferrer">Share</a> : null}
      </div>
    </div>
  );
}

export default function Builder() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"projects">;
  const data = useQuery(api.projects.get, { id });
  const { save, status, error } = useSave(id);
  const [step, setStep] = useState(0);

  if (data === undefined) {
    return (<><AppBar /><main className="page"><p className="muted">Loading…</p></main></>);
  }
  if (data === null) {
    return (<><AppBar /><main className="page"><p>We could not find this celebration.</p><Link className="btn" href="/app">Back</Link></main></>);
  }

  const { project } = data;
  const live = project.status === "paid";

  return (
    <>
      <AppBar />
      <main className={`page slim ${step === 5 && project.siteDesign?.v === 2 ? "wide" : ""}`}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <Link href="/app" className="muted small">← My celebrations</Link>
          <span className={`chip ${live ? "ok" : project.status === "suspended" ? "bad" : ""}`}>
            {live ? "Live" : project.status === "suspended" ? "Suspended" : "Draft"}
          </span>
        </div>
        <h1 className="page-h">{project.names}</h1>
        <div className="progress" aria-hidden="true"><i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

        <SiteBar slug={project.slug} live={live} names={project.names} />

        <div className="steps" role="tablist">
          {STEPS.map((s, i) => (
            <button key={s.tab} role="tab" aria-selected={i === step} className={`stepbtn ${i === step ? "on" : ""}`} onClick={() => setStep(i)}>{i + 1}. {s.tab}</button>
          ))}
        </div>

        <div className="step-intro">
          <small>Step {step + 1} of {STEPS.length}</small>
          <h2>{STEPS[step].title}</h2>
          <p>{STEPS[step].why}</p>
        </div>

        <div className="card" style={{ marginTop: 8 }}>
          {step === 0 ? <Basics data={data} save={save} /> : null}
          {step === 1 ? <Media data={data} save={save} /> : null}
          {step === 2 ? <Words data={data} save={save} /> : null}
          {step === 3 ? <Guests data={data} save={save} /> : null}
          {step === 4 ? <Song data={data} save={save} /> : null}
          {step === 5 ? <Look data={data} save={save} /> : null}
          {step === 6 ? <PayStep data={data} /> : null}
        </div>

        <div className="savebar">
          <div className="row between">
            <div className="small">
              {status === "saving" ? <span className="muted">Saving…</span> : status === "saved" ? <span className="okmsg">Saved</span> : status === "error" ? <span className="err">{error}</span> : <span className="muted">Changes save automatically</span>}
            </div>
            <div className="row">
              {step > 0 ? <button className="btn ghost small" onClick={() => setStep(step - 1)}>Back</button> : null}
              {step < STEPS.length - 1 ? <button className="btn small" onClick={() => { setStep(step + 1); window.scrollTo({ top: 0 }); }}>Next: {STEPS[step + 1].tab}</button> : null}
            </div>
          </div>
        </div>
        {step === 0 ? <DeleteCelebration id={project._id} slug={project.slug} /> : null}
      </main>
    </>
  );
}
