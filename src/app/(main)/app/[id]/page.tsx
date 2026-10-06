"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Header } from "@/components/Header";
import { Basics } from "@/components/builder/Basics";
import { Media } from "@/components/builder/Media";
import { Words } from "@/components/builder/Words";
import { Song } from "@/components/builder/Song";
import { Style } from "@/components/builder/Style";
import { PayStep } from "@/components/builder/PayStep";
import { useSave } from "@/components/builder/shared";

const STEPS = ["Basics", "Photos and videos", "Words", "Song", "Style", "Preview and pay"];

export default function Builder() {
  const params = useParams<{ id: string }>();
  const id = params.id as Id<"projects">;
  const data = useQuery(api.projects.get, { id });
  const { save, status, error } = useSave(id);
  const [step, setStep] = useState(0);

  if (data === undefined) {
    return (<><Header /><main className="wrap" style={{ padding: 32 }}><p className="muted">Loading…</p></main></>);
  }
  if (data === null) {
    return (<><Header /><main className="wrap" style={{ padding: 32 }}><p>We could not find this celebration.</p><Link className="btn" href="/app">Back</Link></main></>);
  }

  const { project } = data;
  const live = project.status === "paid";

  return (
    <>
      <Header />
      <main className="wrap narrow" style={{ padding: "32px 20px 40px" }}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <Link href="/app" className="muted small">← My celebrations</Link>
          <span className={`chip ${live ? "ok" : project.status === "payment_claimed" ? "warn" : project.status === "suspended" ? "bad" : ""}`}>
            {live ? "Live" : project.status === "payment_claimed" ? "Confirming payment" : project.status === "suspended" ? "Suspended" : "Draft"}
          </span>
        </div>
        <h1 className="display" style={{ fontSize: "clamp(40px, 8vw, 64px)", fontWeight: 400, margin: "6px 0 14px" }}>{project.names}</h1>
        <div className="progress" aria-hidden="true"><i style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>

        <div className="steps" role="tablist">
          {STEPS.map((s, i) => (
            <button key={s} role="tab" className={`stepbtn ${i === step ? "on" : ""}`} onClick={() => setStep(i)}>{i + 1}. {s}</button>
          ))}
        </div>

        <div className="card" style={{ marginTop: 8 }}>
          {step === 0 ? <Basics data={data} save={save} /> : null}
          {step === 1 ? <Media data={data} save={save} /> : null}
          {step === 2 ? <Words data={data} save={save} /> : null}
          {step === 3 ? <Song data={data} save={save} /> : null}
          {step === 4 ? <Style data={data} save={save} /> : null}
          {step === 5 ? <PayStep data={data} /> : null}
        </div>

        <div className="savebar">
          <div className="row between">
            <div className="small">
              {status === "saving" ? <span className="muted">Saving…</span> : status === "saved" ? <span className="okmsg">Saved</span> : status === "error" ? <span className="err">{error}</span> : <span className="muted">Changes save automatically</span>}
            </div>
            <div className="row">
              {step > 0 ? <button className="btn ghost small" onClick={() => setStep(step - 1)}>Back</button> : null}
              {step < STEPS.length - 1 ? <button className="btn small" onClick={() => setStep(step + 1)}>Next</button> : null}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
