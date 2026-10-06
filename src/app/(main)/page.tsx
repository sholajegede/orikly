import Link from "next/link";
import type { CSSProperties } from "react";
import { Header } from "@/components/Header";
import { Tracker } from "@/components/Tracker";
import { PhoneSite } from "@/components/PhoneSite";
import { StyleShowcase } from "@/components/StyleShowcase";
import { SiteFooter } from "@/components/SiteFooter";
import { WallGrid } from "@/components/WallGrid";
import { getWall } from "@/lib/wall";
import { textileSize, textileUrl, type Textile } from "@/lib/textile";
import { PRICE_LABEL } from "@convex/lib/constants";

const wa = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP;

const cloth = (kind: Textile, thread: string, ground: string, scale = 1): CSSProperties => ({
  backgroundImage: textileUrl(kind, thread, ground, scale),
  backgroundSize: textileSize(kind, scale),
});
const place = (d: number, r: string) => ({ "--d": d, "--r": r }) as CSSProperties;

const facts = [
  { n: "10", u: "minutes", d: "From your first photo to a link in the family group chat." },
  { n: "2", u: "videos", d: "Tall and wide. Directed by AI from your own photos, after you pay." },
  { n: PRICE_LABEL, u: "once", d: "No monthly fee. Build it free. Pay when it sweets you." },
  { n: "0", u: "apps", d: "Nothing to download. It opens in the browser on any phone." },
];

const minutes = [
  { at: "0:00", t: "Sign in", d: "Type your email, enter the code. No password." },
  { at: "1:00", t: "Add photos", d: "Up to 30, straight from your gallery. We shrink them so they do not finish your data." },
  { at: "5:00", t: "Say something", d: "Your names, your story, the hall and the colors of the day." },
  { at: "8:00", t: "See it", d: "You see your whole website before you pay one naira." },
  { at: "10:00", t: "Share it", d: "Pay once. Drop the link in the family group chat." },
];

const extras = [
  { t: "Colors of the day", d: "Aso-ebi colors and dress code in one place. Nobody comes in the wrong lace.", blocks: [["#1f7a55", "0"], ["#e9b13c", "50% 50% 0 0"]] },
  { t: "Venue, time, map", d: "One tap opens the venue in Google Maps. No more \"where is the hall?\"", blocks: [["#2b2fa8", "50% 50% 50% 0"], ["#e4572e", "0"]] },
  { t: "Gifts, one tap", d: "For the people who cannot come and spray you in person. They copy your account number, no mistakes.", blocks: [["#e9b13c", "0 100% 0 0"], ["#b3123f", "50%"]] },
  { t: "Light on data", d: "It opens fast, even when the network is misbehaving.", blocks: [["#e4572e", "100% 0 0 0"], ["#2b2fa8", "0"]] },
];

const faqs = [
  { q: "How fast is it, really?", a: "Most people finish in about ten minutes. Your website is live the moment your payment is confirmed. Your two videos are ready a few minutes after that." },
  { q: "Do I pay before I see anything?", a: "No. You build and see your whole website first. Your two videos are directed after you pay, because each one uses real AI time." },
  { q: "Who makes the videos?", a: "An AI director does. It looks at every photo and reads your words, then chooses the order, finds each face, plans every camera move and writes the captions. Your phone plays that plan with your song and saves the video. No two come out the same." },
  { q: "How do I pay?", a: "By card or bank transfer on a secure payment page. It is ₦20,000, once." },
  { q: "Can I use my own song?", a: "Yes. Upload it and it plays in your videos. It stays in your downloadable videos and does not play on the public website." },
  { q: "Can I change things after I pay?", a: "Your website, yes: update the photos, words and colors when you need to. Your videos are directed once, and you get one free redo if you want a different cut." },
  { q: "Who can see my website?", a: "Only people who have your link. We tell search engines not to list it, and we do not put advertising trackers on it." },
  { q: "What if something goes wrong?", a: "If your website or your videos do not work and we cannot fix it within 48 hours, we refund you in full. The refund policy has the details." },
];

export default async function Landing() {
  const wall = await getWall(8);
  return (
    <>
      <Tracker name="landing_view" />
      <Header />
      <main>
        <section className="hero-x">
          <div className="wrap">
            <p className="tagline">Weddings, birthdays, anniversaries</p>
            <h1>Praise them <em>properly.</em></h1>
            <p className="lead">Your photos become a celebration website and two videos, sharp sharp. About ten minutes, from your phone. No designer. No wahala.</p>
            <div className="row cta">
              <Link href="/login" className="btn hot">Start free</Link>
              <a href="#how" className="btn ghost">See how it works</a>
            </div>
            <p className="fine">{PRICE_LABEL} once. Build your website free. Pay when it sweets you.</p>
          </div>

          <div className="objs" aria-hidden="true">
            <div className="obj o-site" style={place(0, "-7deg")}>
              <span className="cap">Website</span>
              <div className="face">
                <div className="cover" style={cloth("adire", "#e6e8ff", "#2b2fa8", 0.9)} />
                <div className="txt"><b>Tolu &amp; Bisi</b><span>tolu-and-bisi.orikly.ng</span></div>
              </div>
            </div>
            <div className="obj o-video" style={place(1, "6deg")}>
              <span className="cap">Video</span>
              <div className="face"><div className="tx" style={cloth("asooke", "#e9b13c", "#7a3d0c", 0.8)} /><span className="play" /><span className="time">0:42</span></div>
            </div>
            <div className="obj o-tag" style={place(2, "-12deg")}><div><b>10 min</b><span>start to share</span></div></div>
            <div className="obj o-wish" style={place(3, "4deg")}>
              <span className="cap">Wishes</span>
              <div className="face"><p>May your home overflow with joy.</p><b>Aunty Funmi</b></div>
            </div>
          </div>
        </section>

        <section className="wrap">
          <div className="facts-x">
            {facts.map((f) => (
              <div key={f.u}><div className="n">{f.n}<span>{f.u}</span></div><p>{f.d}</p></div>
            ))}
          </div>
        </section>

        <section className="bandx" id="how">
          <div className="wrap">
            <div className="sect-head">
              <h2>Ten minutes. Sharp sharp.</h2>
              <Link href="/login" className="btn">Start free</Link>
            </div>
            <div className="cells five">
              {minutes.map((m) => (
                <div className="cell" key={m.at}>
                  <span className="clock">{m.at}</span>
                  <h3>{m.t}</h3>
                  <p>{m.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bandx indigo" id="what">
          <div className="wrap feat">
            <div>
              <span className="num">01.</span>
              <h2>A website with your name on it</h2>
              <p>tolu-and-bisi.orikly.ng. Your photos, your story, a countdown to the day, the hall and the colors. One link for everybody, from Lagos to London.</p>
              <Link href="/login" className="btn light">Claim your link</Link>
            </div>
            <div className="vis">
              <PhoneSite look={{ a: "#e4572e", b: "#e9b13c", bg: "#f3eee4", ink: "#1f0f08", card: "#fffdf8", font: "'Instrument Serif', Georgia, serif", radius: "10px", textile: "ankara", cloth: "#e4572e", thread: "#f3d9b0" }} />
            </div>
          </div>
        </section>

        <section className="bandx">
          <div className="wrap feat flip">
            <div>
              <span className="num">02.</span>
              <h2>Two videos in two minutes</h2>
              <p>One tall for WhatsApp status and Instagram. One wide for the hall screen. An AI director studies your photos, finds every face and cuts the film to your song.</p>
              <Link href="/login" className="btn">Start free</Link>
            </div>
            <div className="vis">
              <div className="duo">
                <div className="v p"><div className="tx" style={cloth("kente", "#e9b13c", "#1f7a55", 0.7)} /><span className="lab">9:16</span></div>
                <div className="v l"><div className="tx" style={cloth("adire", "#f3eee4", "#b3123f", 0.9)} /><span className="lab">16:9</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="bandx espresso">
          <div className="wrap feat">
            <div>
              <span className="num">03.</span>
              <h2>A wall of wishes you keep</h2>
              <p>Aunties, uncles and friends drop their prayers and wishes on your website, from anywhere. You choose which ones show. Read them again on your first anniversary.</p>
              <Link href="/login" className="btn hot">Start free</Link>
            </div>
            <div className="vis">
              <div className="notes">
                <div className="n"><p>May your home overflow with joy.</p><b>Aunty Funmi</b></div>
                <div className="n"><p>Congratulations, my people. We go dance!</p><b>Kunle</b></div>
                <div className="n"><p>God bless your new home.</p><b>Mummy Tolu</b></div>
              </div>
            </div>
          </div>
        </section>

        <section className="bandx">
          <div className="wrap">
            <div className="sect-head"><h2>Made for owambe</h2></div>
            <div className="cells">
              {extras.map((s) => (
                <div className="cell" key={s.t}>
                  <div className="blocks">{s.blocks.map(([c, r], j) => <i key={j} style={{ background: c, borderRadius: r, height: j % 2 ? 56 : 28 }} />)}</div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {wall.length >= 3 ? (
          <section className="bandx" style={{ paddingTop: 0 }}>
            <div className="wrap">
              <div className="sect-head"><h2>Fresh praise</h2><Link href="/wall" className="btn ghost">See the whole wall</Link></div>
              <WallGrid items={wall.slice(0, 8)} />
            </div>
          </section>
        ) : null}

        <section className="bandx" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="panel">
              <h2>Make it look like you</h2>
              <p className="kicker">Four styles and six color schemes. Tap one and watch your website change.</p>
              <StyleShowcase />
            </div>
          </div>
        </section>

        <section className="bandx hot">
          <div className="wrap price-x">
            <div>
              <p className="tagline">One price. No story.</p>
              <div className="amount display">{PRICE_LABEL}</div>
            </div>
            <div>
              <ul>
                <li><b>Your own website</b> with photos, story, countdown, venue and wishes</li>
                <li><b>Two videos</b>, directed by AI, ready in minutes</li>
                <li><b>Yours to keep.</b> Your link stays up and your videos are yours to download</li>
                <li><b>Free to build.</b> Pay only when it sweets you</li>
              </ul>
              <Link href="/login" className="btn dark">Start free</Link>
            </div>
          </div>
        </section>

        <section className="bandx">
          <div className="wrap doors">
            <Link href="/wall" className="door a">
              <span className="go">The wall of praise</span>
              <div><h3>See what people made</h3><p>Celebrations shared by the people who made them. Yours can join, if you choose.</p></div>
            </Link>
            <Link href="/partners" className="door b">
              <span className="go">For planners and photographers</span>
              <div><h3>Make them for clients</h3><p>Buy in packs from ₦15,000 each. Charge your clients what you like and keep the difference.</p></div>
            </Link>
          </div>
        </section>

        <section className="bandx" style={{ paddingTop: 0 }}>
          <div className="wrap narrow">
            <h2 className="h-sect">Questions</h2>
            <div className="faq" style={{ marginTop: 24 }}>
              {faqs.map((f) => (
                <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
              ))}
            </div>
            {wa ? <div style={{ marginTop: 28 }}><a className="btn ghost" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">Chat with us on WhatsApp</a></div> : null}
          </div>
        </section>

        <section className="bandx indigo closer">
          <div className="wrap">
            <h2 className="big">The day is coming. <em>Be ready tonight.</em></h2>
            <div className="row" style={{ justifyContent: "center", marginTop: 36 }}>
              <Link href="/login" className="btn hot">Start free</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
