"use client";

import { AppBar } from "@/components/AppBar";
import { COMPANY } from "@/lib/company";

const wa = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

const faqs = [
  { q: "Where is my website?", a: "Open your celebration from Home. The link is at the top, with buttons to open it, copy it and share it on WhatsApp. Before you pay, the same place shows a private preview." },
  { q: "How do I change my link?", a: "Open your celebration, go to Basics and edit \"Your link\". After your website is live you can change it up to 3 times. The old link stops working, so send the new one to your guests." },
  { q: "How do I get my videos?", a: "After you pay, open your celebration and go to the last step. Tap \"Direct my videos\", then \"Save my two videos\". They appear under Downloads and in Files." },
  { q: "Can I change my photos after paying?", a: "Yes. Your website updates right away. Your videos are directed once, with one free redo." },
  { q: "What are credits?", a: "One credit publishes one celebration. Buy them in packs at a lower price each. Credits never expire." },
  { q: "Where are my files?", a: "Files, in the menu. Every photo, clip, song and finished video is there to download." },
  { q: "How do I delete everything?", a: "Settings, then Delete account. To remove one celebration only, open it and use Delete at the bottom of Basics." },
];

export default function Help() {
  return (
    <>
      <AppBar />
      <main className="page slim">
        <div className="dash-top"><div><h1>Help</h1><p className="muted">Quick answers. If yours is not here, write to us.</p></div></div>
        <div className="faq">{faqs.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
        <div className="card" style={{ marginTop: 28 }}>
          <b style={{ fontSize: 20 }}>Talk to a person</b>
          <p className="muted" style={{ margin: "6px 0 14px" }}>We reply between 8am and 10pm, every day.</p>
          <div className="row">
            <a className="btn small" href={`mailto:${COMPANY.email}`}>Email {COMPANY.email}</a>
            {wa ? <a className="btn ghost small" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp us</a> : null}
          </div>
        </div>
      </main>
    </>
  );
}
