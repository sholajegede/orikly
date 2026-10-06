"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { cleanError } from "@/lib/format";

const SEGMENTS = [
  { id: "myself", t: "Me or my partner", d: "Our wedding, my birthday, our anniversary" },
  { id: "family", t: "Family or a friend", d: "A surprise, a gift, a parent's big day" },
  { id: "clients", t: "My clients", d: "I plan events, shoot, MC or design" },
];
const HEARD = [
  { id: "instagram", t: "Instagram" },
  { id: "tiktok", t: "TikTok" },
  { id: "whatsapp", t: "WhatsApp" },
  { id: "friend", t: "A friend told me" },
  { id: "saw_one", t: "I saw someone's Orikly" },
  { id: "google", t: "Google" },
  { id: "other", t: "Somewhere else" },
];

/** Three questions, asked once, so the app can greet people properly and we learn who uses it. */
export default function Welcome() {
  const me = useQuery(api.users.me);
  const finish = useMutation(api.users.finishOnboarding);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (me?.name && !name) setName(me.name); }, [me?.name]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (me?.onboarded) router.replace("/app"); }, [me?.onboarded]); // eslint-disable-line react-hooks/exhaustive-deps

  async function done(heardFrom: string) {
    setBusy(true);
    setError(null);
    try {
      await finish({ name, segment, heardFrom });
      router.replace(segment === "clients" ? "/app/credits" : "/app/new");
    } catch (e) {
      setError(cleanError(e));
      setBusy(false);
    }
  }

  const first = name.trim().split(" ")[0];
  return (
    <main className="onb">
      <div className="onb-top">
        <span className="logo"><i />Orikly</span>
        <div className="onb-dots" aria-label={`Question ${step + 1} of 3`}>{[0, 1, 2].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>
      </div>

      <div className="onb-body" key={step}>
        {step === 0 ? (
          <form onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) setStep(1); }}>
            <p className="tagline">Welcome</p>
            <h1>First, what do we <em>call you?</em></h1>
            <input type="text" autoFocus autoComplete="given-name" value={name} maxLength={80} placeholder="Your name" onChange={(e) => setName(e.target.value)} />
            <button className="btn hot" disabled={name.trim().length < 2}>Continue</button>
          </form>
        ) : step === 1 ? (
          <div>
            <p className="tagline">Nice to meet you, {first}</p>
            <h1>Who are you <em>celebrating?</em></h1>
            <div className="onb-opts">
              {SEGMENTS.map((s) => (
                <button key={s.id} className={segment === s.id ? "on" : ""} onClick={() => { setSegment(s.id); setStep(2); }}><b>{s.t}</b><span>{s.d}</span></button>
              ))}
            </div>
            <button className="onb-back" onClick={() => setStep(0)}>Back</button>
          </div>
        ) : (
          <div>
            <p className="tagline">Last one</p>
            <h1>How did you <em>find us?</em></h1>
            <div className="onb-opts small">
              {HEARD.map((h) => <button key={h.id} disabled={busy} onClick={() => void done(h.id)}><b>{h.t}</b></button>)}
            </div>
            {error ? <div className="err" style={{ marginTop: 12 }}>{error}</div> : null}
            <button className="onb-back" onClick={() => setStep(1)}>Back</button>
          </div>
        )}
      </div>
    </main>
  );
}
