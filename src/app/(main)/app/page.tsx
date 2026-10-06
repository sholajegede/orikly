"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Header } from "@/components/Header";
import { useTrack } from "@/lib/track";

const statusLabel: Record<string, { text: string; cls: string }> = {
  draft: { text: "Draft", cls: "" },
  payment_claimed: { text: "Confirming payment", cls: "warn" },
  paid: { text: "Live", cls: "ok" },
  suspended: { text: "Suspended", cls: "bad" },
};

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

  return (
    <>
      <Header />
      <main className="wrap" style={{ padding: "28px 16px 64px" }}>
        <div className="row between" style={{ marginBottom: 20 }}>
          <h1 className="display" style={{ fontSize: 44 }}>My celebrations</h1>
          <div className="row">
            <Link href="/app/credits" className="btn ghost">{(me?.credits ?? 0) > 0 ? `${me?.credits} credits` : "Buy credits"}</Link>
            <Link href="/app/new" className="btn">New celebration</Link>
          </div>
        </div>

        {projects === undefined ? (
          <p className="muted">Loading…</p>
        ) : projects.length === 0 ? (
          <div className="card stack" style={{ textAlign: "center", padding: 40 }}>
            <h2 className="display" style={{ fontSize: 32 }}>Start your first celebration</h2>
            <p className="muted" style={{ margin: 0 }}>It takes about 10 minutes. You see a preview before you pay.</p>
            <div><Link href="/app/new" className="btn">Create a celebration</Link></div>
          </div>
        ) : (
          <div className="grid three">
            {projects.map((p) => {
              const s = statusLabel[p.status] ?? statusLabel.draft;
              return (
                <Link key={p._id} href={`/app/${p._id}`} className="card" style={{ textDecoration: "none", padding: 0, overflow: "hidden" }}>
                  <div style={{ aspectRatio: "16/10", background: "var(--line)" }}>
                    {p.coverUrl ? <img src={p.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                  </div>
                  <div style={{ padding: 16 }}>
                    <div className="row between">
                      <b style={{ fontSize: 18 }}>{p.names}</b>
                      <span className={`chip ${s.cls}`}>{s.text}</span>
                    </div>
                    <div className="muted small" style={{ marginTop: 4 }}>{p.occasion} · /{p.slug}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="card stack" style={{ marginTop: 32, maxWidth: 560 }}>
          <h2 style={{ fontSize: 20 }}>Your details</h2>
          <p className="muted small" style={{ margin: 0 }}>Signed in as {me?.email ?? "…"}. Add your WhatsApp number so we can message you when your videos are ready.</p>
          <label className="field"><span>Your name</span><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span>WhatsApp number</span><input type="tel" inputMode="tel" placeholder="0801 234 5678" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></label>
          <div className="row"><button className="btn small" onClick={() => void saveProfile()}>Save</button>{saved ? <span className="okmsg">Saved</span> : null}</div>
        </div>
      </main>
    </>
  );
}
