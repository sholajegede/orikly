import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Tracker } from "@/components/Tracker";
import { CREATOR_PAYOUT_KOBO } from "@convex/lib/constants";
import { naira } from "@/lib/format";

export const metadata: Metadata = { title: "Make videos, get paid", description: "Edit celebration videos for Orikly customers and get paid for every video we approve." };

const steps = [
  { t: "Apply", d: "Tell us about the videos you make and share a link to your work. We reply on WhatsApp." },
  { t: "Pick a job", d: "Open jobs show the style, the format and what you earn. You see the photos, song and words once you take one." },
  { t: "Edit and upload", d: "You have 48 hours. Upload one finished video from your phone or laptop." },
  { t: "Get paid", d: "We check your video. When it is approved the money moves to your balance. Ask for a payout any time from ₦5,000." },
];

export default function Creators() {
  const per = naira(CREATOR_PAYOUT_KOBO);
  return (
    <>
      <Tracker name="creators_view" />
      <Header dark />
      <main>
        <section className="page-hero">
          <div className="wrap">
            <div className="earn-big">{naira(CREATOR_PAYOUT_KOBO * 2)}</div>
            <h1 style={{ marginTop: 8 }}>for every celebration you finish.</h1>
            <p>Each celebration has two videos. You earn {per} for every video we approve. Work when you want, from anywhere in Nigeria.</p>
            <Link href="/app/creator" className="btn gold">Apply to make videos</Link>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            <h2>How it works</h2>
            <ol className="steps-o" style={{ padding: 0, margin: "28px 0 0" }}>
              {steps.map((s, i) => (
                <li key={s.t}><span className="n">{i + 1}</span><div><h3>{s.t}</h3><p>{s.d}</p></div></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="band alt">
          <div className="wrap narrow">
            <h2>What we look for</h2>
            <div className="stack" style={{ marginTop: 16 }}>
              <p>You can edit a vertical or wide video with music, text and photo motion, using CapCut, Premiere, DaVinci, After Effects or similar.</p>
              <p>You deliver on time and keep the customer's photos private. We never share customers' phone numbers with you.</p>
              <p>You can hold two jobs at a time. If you miss the 48 hours, the job goes back to the list.</p>
            </div>
            <div style={{ marginTop: 24 }}><Link href="/app/creator" className="btn">Apply to make videos</Link></div>
          </div>
        </section>
      </main>
    </>
  );
}
