"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { textileSize, textileUrl, type Textile } from "@/lib/textile";
import { PhoneSite } from "./PhoneSite";

const STEPS = [
  { at: "0:00", t: "Sign in", d: "Type your email, enter the code. No password to remember." },
  { at: "1:00", t: "Add your photos", d: "Up to 30, straight from your gallery. We shrink them so they do not finish your data." },
  { at: "5:00", t: "Say something", d: "Your names, your story, the hall and the colors of the day." },
  { at: "8:00", t: "See it", d: "You see your whole website before you pay one naira." },
  { at: "10:00", t: "Share it", d: "Pay once. Drop the link in the family group chat." },
];
const HOLD_MS = 4200;
const TILES: [Textile, string, string][] = [
  ["adire", "#e6e8ff", "#2b2fa8"], ["asooke", "#e9b13c", "#7a3d0c"], ["ankara", "#f3d9b0", "#e4572e"],
  ["kente", "#e9b13c", "#1f7a55"], ["adire", "#f3eee4", "#b3123f"], ["ankara", "#d9daf4", "#2b2fa8"],
];
const cloth = ([k, fg, bg]: [Textile, string, string]): CSSProperties => ({ backgroundImage: textileUrl(k, fg, bg, 0.6), backgroundSize: textileSize(k, 0.6) });

function Scene({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="tl-card">
        <span className="tagline">Your email</span>
        <div className="tl-input">tolu@gmail.com</div>
        <span className="tagline">Your code</span>
        <div className="tl-code">{"482916".split("").map((n, i) => <i key={i} style={{ "--i": i } as CSSProperties}>{n}</i>)}</div>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="tl-card">
        <div className="tl-grid">{TILES.map((t, i) => <i key={i} style={{ ...cloth(t), "--i": i } as CSSProperties} />)}</div>
        <div className="row between" style={{ marginTop: 14 }}><span className="tagline">18 of 30 photos</span><span className="tagline">2.1 MB</span></div>
        <div className="tl-bar"><i /></div>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="tl-card">
        <span className="tagline">Our story</span>
        <p className="tl-story">We met at a friend&apos;s birthday in 2019. Two cities and one long argument about jollof later, here we are.</p>
        <div className="row" style={{ gap: 8 }}><span className="tl-chip">The Monarch, Lekki</span><span className="tl-chip">Emerald and gold</span><span className="tl-chip">2:00 pm</span></div>
      </div>
    );
  }
  if (step === 3) {
    return <div className="tl-phone"><PhoneSite look={{ a: "#1f7a55", b: "#e9b13c", bg: "#f3eee4", ink: "#1f0f08", card: "#fffdf8", font: "'Instrument Serif', Georgia, serif", radius: "10px", textile: "kente", cloth: "#1f7a55", thread: "#e9b13c" }} /></div>;
  }
  return (
    <div className="tl-chat">
      <div className="me">
        <div className="link"><div className="cov" style={cloth(TILES[0])} /><b>Tolu &amp; Bisi</b><span>tolu-and-bisi.orikly.ng</span></div>
        Our wedding website is ready!
      </div>
      <div className="them"><b>Aunty Funmi</b>Congratulations o! God has done it.</div>
      <div className="them"><b>Uncle Dele</b>See fine couple. I am coming with my dancing shoes.</div>
    </div>
  );
}

/** The ten-minute walkthrough. Steps advance by themselves; tap one to hold it. */
export function TenMinutes() {
  const [step, setStep] = useState(0);
  const [held, setHeld] = useState(false);
  const still = useRef(false);

  useEffect(() => { still.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches; }, []);
  useEffect(() => {
    if (held || still.current) return;
    const id = window.setTimeout(() => setStep((s) => (s + 1) % STEPS.length), HOLD_MS);
    return () => window.clearTimeout(id);
  }, [step, held]);

  return (
    <div className="tl" onMouseEnter={() => setHeld(true)} onMouseLeave={() => setHeld(false)}>
      <ol className="tl-steps">
        {STEPS.map((s, i) => (
          <li key={s.at} className={i === step ? "on" : ""}>
            <button onClick={() => { setStep(i); setHeld(true); }} aria-current={i === step ? "step" : undefined}>
              <span className="clock">{s.at}</span>
              <span className="what"><b>{s.t}</b><span>{s.d}</span></span>
            </button>
            <i className="run" style={i === step && !held ? { animationDuration: `${HOLD_MS}ms` } : undefined} data-run={i === step && !held} />
          </li>
        ))}
      </ol>
      <div className="tl-stage" key={step} aria-hidden="true"><Scene step={step} /></div>
    </div>
  );
}
