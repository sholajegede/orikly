"use client";

import { AppBar } from "@/components/AppBar";
import { COMPANY } from "@/lib/company";

const wa = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

const faqs = [
  { q: "Where is my website?", a: "Open your celebration from Home. The link is at the top, with buttons to open it, copy it and share it on WhatsApp. Before you pay, the same place shows a private preview." },
  { q: "How do I change my link?", a: "Open your celebration, go to Basics and edit \"Your link\". After your website is live you can change it up to 3 times. The old link stops working, so send the new one to your guests." },
  { q: "How do I get my videos?", a: "They make themselves. After you pay, the studio designs your website and renders two films, one tall and one wide. It takes about ten minutes and you can close the page. They appear on the last step under Downloads, and in Files." },
  { q: "Can I change my photos after paying?", a: "Yes. Your website updates right away. Making your films again after a change costs 2 credits." },
  { q: "Can I edit my website myself?", a: "Yes, for free, as often as you like. Open your celebration and go to Look. Change the colors, the lettering, the cover photo, and move, rename or hide any part of the page." },
  { q: "How do I pay?", a: "On the last step, by card or bank transfer on a secure payment page. You are buying credits, and your website goes live by itself the moment the payment enters. Nobody has to approve it." },
  { q: "What are Open when… letters?", a: "Short letters for the days ahead, each sealed in its own envelope: Open when you're tired, Open when you miss me. Write them on the Letters step, free. Publishing the set costs 3 credits and gives you a page and a film." },
  { q: "What are credits?", a: "Credits pay for what the studio makes. A website is 5, each film is 2, a whole new design is 3, and making your films again is 1 each. Editing by hand is free. ₦10,000 buys 12, and they never expire." },
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
          <p className="muted" style={{ margin: "6px 0 14px" }}>Payments, websites and videos all run by themselves, day and night. For anything else, email us and we reply within one working day.</p>
          <div className="row">
            <a className="btn small" href={`mailto:${COMPANY.email}`}>Email {COMPANY.email}</a>
            {wa ? <a className="btn ghost small" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">WhatsApp us</a> : null}
          </div>
        </div>
      </main>
    </>
  );
}
