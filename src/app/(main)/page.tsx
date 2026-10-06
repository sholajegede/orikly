import Link from "next/link";
import { Header } from "@/components/Header";
import { Tracker } from "@/components/Tracker";
import { StyleShowcase } from "@/components/StyleShowcase";
import { PRICE_LABEL } from "@convex/lib/constants";

const wa = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

const steps = [
  { t: "Sign in with your email", d: "No password. We send you a code." },
  { t: "Add your photos and words", d: "Up to 30 photos and 5 videos, straight from your phone. We shrink them so they use little data." },
  { t: "Pick a style and colors", d: "Choose how your website and your two videos look." },
  { t: "See it, then pay", d: "Preview your website first. Pay by card or bank transfer, then share your link." },
];

const faqs = [
  { q: "How long do the videos take?", a: "Your website is live as soon as we confirm your payment. Your two videos are made by hand and sent to your dashboard, usually within 24 hours." },
  { q: "How do I pay?", a: "By card or bank transfer on a secure payment page. Your website goes live as soon as the payment is confirmed, usually within a minute." },
  { q: "Can I use my own song?", a: "Yes. Upload it and we put it in your two videos. It stays private to your downloadable videos and does not play on the public website." },
  { q: "Can I change things after I pay?", a: "Yes. You can change your photos, words and colors any time from your dashboard." },
  { q: "Can I use my own domain?", a: "Not yet. Every website gets a link like yourname.orikly.ng. Your own domain is coming." },
  { q: "Who can see my website?", a: "Only people you send the link to. We tell search engines not to list it." },
];

export default function Landing() {
  return (
    <>
      <Tracker name="landing_view" />
      <Header />
      <main>
        <section className="hero-o">
          <div className="wrap hero-grid">
            <div>
              <p className="occasions">Weddings, birthdays, anniversaries</p>
              <h1 className="chant" aria-label="Praise them properly.">
                <span className="ln" aria-hidden="true"><span style={{ "--i": 0 } as React.CSSProperties}>Praise them</span></span>
                <span className="ln zobo" aria-hidden="true"><span style={{ "--i": 1 } as React.CSSProperties}>properly.</span></span>
              </h1>
              <p className="lead">A website and two videos for your celebration. Add your photos and words on your phone, pick a style, and share one link.</p>
              <div className="row actions" style={{ gap: 22 }}>
                <Link href="/login" className="btn">Start free</Link>
                <div className="price-tag"><b>{PRICE_LABEL}</b><span>once. Website and 2 videos.</span></div>
              </div>
              <p className="small muted" style={{ marginTop: 14 }}>You see your preview before you pay.</p>
            </div>
            <div className="cloth" role="img" aria-label="Adire cloth with a woven label reading Tolu and Bisi">
              <div className="label">
                <small>14 February</small>
                <b>Tolu &amp; Bisi</b>
                <span>tolu-and-bisi.orikly.ng</span>
              </div>
            </div>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            <h2>Make it look like you</h2>
            <p className="kicker">Four styles and six color schemes. Tap to see how your website could look.</p>
            <StyleShowcase />
          </div>
        </section>

        <section className="band alt">
          <div className="wrap">
            <h2>Ready in an evening</h2>
            <ol className="steps-o" style={{ padding: 0, margin: "28px 0 0" }}>
              {steps.map((s, i) => (
                <li key={s.t}>
                  <span className="n">{i + 1}</span>
                  <div><h3>{s.t}</h3><p>{s.d}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            <div className="price-panel">
              <div style={{ position: "relative", zIndex: 1 }}>
                <div className="big">{PRICE_LABEL}</div>
                <p style={{ color: "#c9cbe8", margin: "8px 0 22px" }}>Paid once. No monthly fee.</p>
                <Link href="/login" className="btn gold">Start free</Link>
              </div>
              <ul>
                <li><span><b>Your own website.</b> A link like tolu-and-bisi.orikly.ng with your photos, videos, story and a wall for guest wishes.</span></li>
                <li><span><b>Two videos.</b> Two styles, made for WhatsApp status and for the big screen. Yours to download.</span></li>
                <li><span><b>Your account.</b> Come back any time to change things, download your videos and read the wishes.</span></li>
              </ul>
            </div>
          </div>
        </section>

        <section className="band alt">
          <div className="wrap">
            <div className="join-grid">
              <Link href="/creators" className="join earn">
                <h3>Make videos, get paid</h3>
                <p>Edit celebration videos from your phone or laptop. You earn ₦3,500 for every video we approve.</p>
                <span className="go">See how it works</span>
              </Link>
              <Link href="/partners" className="join pack">
                <h3>Planner or photographer?</h3>
                <p>Buy celebrations in packs and pay as little as ₦15,000 each. Give every client their own website and videos.</p>
                <span className="go">See the packs</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="band">
          <div className="wrap narrow">
            <h2>Questions</h2>
            <div className="faq" style={{ marginTop: 20 }}>
              {faqs.map((f) => (
                <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
              ))}
            </div>
            <div style={{ marginTop: 28 }} className="row">
              <Link href="/login" className="btn">Start free</Link>
              {wa ? <a className="btn ghost" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">Chat with us on WhatsApp</a> : null}
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="wrap">
          <p style={{ maxWidth: 520, margin: "0 0 16px" }}>Oríkì is the Yoruba art of praise. We built Orikly to praise your people properly.</p>
          <Link href="/creators">Earn with videos</Link>
          <Link href="/partners">For planners</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/refunds">Refunds</Link>
          <span>© Orikly</span>
        </div>
      </footer>
    </>
  );
}
