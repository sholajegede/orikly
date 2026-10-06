"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Header } from "@/components/Header";
import { textileSize, textileUrl } from "@/lib/textile";
import { useTrack } from "@/lib/track";

const statusLabel: Record<string, { text: string; cls: string; next: string }> = {
  draft: { text: "Draft", cls: "", next: "Keep building" },
  payment_claimed: { text: "Confirming payment", cls: "warn", next: "See status" },
  paid: { text: "Live", cls: "ok", next: "Open, share, download" },
  suspended: { text: "Suspended", cls: "bad", next: "Contact support" },
};
const cloth = { backgroundImage: textileUrl("adire", "#5a5fd6", "#2b2fa8", 1.3), backgroundSize: textileSize("adire", 1.3) };

export default function Dashboard() {
  const me = useQuery(api.users.me);
  const projects = useQuery(api.projects.mine);
  const setProfile = useMutation(api.users.setProfile);
  const track = useTrack();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (me) {
      setName(me.name ?? "");
      setWhatsapp(me.whatsapp ?? "");
    }
  }, [me?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!me) return;
    try {
      if (window.sessionStorage.getItem("orikly_just_logged_in")) {
        window.sessionStorage.removeItem("orikly_just_logged_in");
        track("login_verified");
      }
    } catch {
      /* ignore */
    }
  }, [me?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveProfile() {
    await setProfile({ name, whatsapp });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const first = (me?.name ?? "").trim().split(" ")[0];
  const credits = me?.credits ?? 0;

  return (
    <>
      <Header />
      <main className="wrap app-main">
        <div className="app-head">
          <div>
            <p className="tagline muted">{first ? `Welcome back, ${first}` : "Welcome"}</p>
            <h1>Your <em>celebrations</em></h1>
          </div>
          <div className="row">
            <Link href="/app/credits" className="btn ghost">{credits > 0 ? `${credits} credit${credits === 1 ? "" : "s"}` : "Buy a pack"}</Link>
            <Link href="/app/new" className="btn hot">New celebration</Link>
          </div>
        </div>

        {projects === undefined ? (
          <p className="muted">Loading…</p>
        ) : projects.length === 0 ? (
          <div className="empty">
            <p className="tagline">About ten minutes</p>
            <h2>Who are we celebrating?</h2>
            <p>Add your photos and words, pick a look, and watch your website come together. You pay only when it sweets you.</p>
            <Link href="/app/new" className="btn hot">Start a celebration</Link>
          </div>
        ) : (
          <div className="projs">
            {projects.map((p) => {
              const s = statusLabel[p.status] ?? statusLabel.draft;
              return (
                <Link key={p._id} href={`/app/${p._id}`} className="proj">
                  <div className="pic" style={p.coverUrl ? undefined : cloth}>{p.coverUrl ? <img src={p.coverUrl} alt="" /> : null}</div>
                  <div className="meta">
                    <div className="row between"><span className={`chip ${s.cls}`}>{s.text}</span><span className="muted small" style={{ textTransform: "capitalize" }}>{p.occasion}</span></div>
                    <b>{p.names}</b>
                    <span className="muted small">{s.next}</span>
                  </div>
                </Link>
              );
            })}
            <Link href="/app/new" className="proj new"><div><b>New celebration</b>A wedding, a birthday or an anniversary</div></Link>
          </div>
        )}

        <div className="panel-plain">
          <div className="card stack">
            <h2 style={{ fontSize: 26 }}>Your details</h2>
            <p className="muted small" style={{ margin: 0 }}>Signed in as {me?.email ?? "…"}. Add your WhatsApp number so we can reach you about your videos.</p>
            <label className="field"><span>Your name</span><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="field"><span>WhatsApp number</span><input type="tel" inputMode="tel" placeholder="0801 234 5678" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></label>
            <div className="row"><button className="btn small" onClick={() => void saveProfile()}>Save</button>{saved ? <span className="okmsg">Saved</span> : null}</div>
          </div>
          <div className="card stack" style={{ background: "var(--gold)", borderColor: "transparent" }}>
            <h2 style={{ fontSize: 26 }}>Planning for clients?</h2>
            <p style={{ margin: 0 }}>Buy celebrations in a pack and pay as little as ₦15,000 each. One credit publishes one celebration.</p>
            <div><Link href="/app/credits" className="btn">See the packs</Link></div>
          </div>
        </div>
      </main>
    </>
  );
}
