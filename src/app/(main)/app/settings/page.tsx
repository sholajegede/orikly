"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";
import { AppBar } from "@/components/AppBar";
import { CookieSettingsLink } from "@/components/Consent";
import { cleanError } from "@/lib/format";

export default function Settings() {
  const me = useQuery(api.users.me);
  const prefs = useQuery(api.account.prefs);
  const setProfile = useMutation(api.users.setProfile);
  const setUpdates = useMutation(api.account.setEmailUpdates);
  const remove = useMutation(api.account.deleteAccount);
  const convex = useConvex();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (me) setName(me.name ?? ""); }, [me?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function download() {
    setBusy(true);
    try {
      const data = await convex.query(api.account.exportData, {});
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-orikly-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(cleanError(e));
    } finally {
      setBusy(false);
    }
  }

  async function deleteEverything() {
    setBusy(true);
    setError(null);
    try {
      await remove({ confirm });
      await signOut().catch(() => {});
      router.replace("/");
    } catch (e) {
      setError(cleanError(e));
      setBusy(false);
    }
  }

  return (
    <>
      <AppBar />
      <main className="page slim">
        <div className="dash-top"><div><h1>Settings</h1><p className="muted">Your profile, your emails and your data.</p></div></div>

        <section className="set">
          <div><h2>Profile</h2><p className="muted small">How we greet you.</p></div>
          <div className="stack">
            <label className="field"><span>Your name</span>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                <button className="btn small" disabled={name.trim() === (me?.name ?? "") || name.trim().length < 2} onClick={() => void setProfile({ name }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); })}>{saved ? "Saved" : "Save"}</button>
              </div>
            </label>
            <label className="field"><span>Email</span><input type="email" value={me?.email ?? ""} disabled readOnly /><div className="hint">You sign in with a code sent to this address.</div></label>
          </div>
        </section>

        <section className="set">
          <div><h2>Emails from us</h2><p className="muted small">Receipts and sign-in codes always come.</p></div>
          <label className="row" style={{ cursor: "pointer", alignItems: "flex-start" }}>
            <input type="checkbox" checked={prefs?.emailUpdates ?? true} onChange={(e) => void setUpdates({ on: e.target.checked })} style={{ width: 22, height: 22, marginTop: 2 }} />
            <span className="grow"><b>Tell me about new styles and features</b><span className="hint" style={{ display: "block" }}>A short email now and then. Never more than twice a month.</span></span>
          </label>
        </section>

        <section className="set">
          <div><h2>Privacy</h2><p className="muted small">Your data is yours.</p></div>
          <div className="stack">
            <div className="row"><button className="btn ghost small" disabled={busy} onClick={() => void download()}>Download my data</button><CookieSettingsLink className="btn ghost small" /></div>
            <div className="row small" style={{ gap: 16 }}><Link href="/legal/privacy">Privacy notice</Link><Link href="/legal/terms">Terms</Link><Link href="/legal/refunds">Refunds</Link></div>
          </div>
        </section>

        <section className="set danger">
          <div><h2>Delete account</h2><p className="muted small">This cannot be undone.</p></div>
          <div className="stack">
            <p style={{ margin: 0 }}>This deletes your account, every celebration, every photo, video, song and wish, and takes your websites offline. Unused credits are lost. We keep payment records only, because the law requires it.</p>
            {!asking ? <div><button className="btn danger small" onClick={() => setAsking(true)}>Delete my account and data</button></div> : (
              <>
                <label className="field"><span>Type {me?.email} to confirm</span><input type="email" value={confirm} autoComplete="off" onChange={(e) => setConfirm(e.target.value)} /></label>
                <div className="row">
                  <button className="btn danger small" disabled={busy || confirm.trim().toLowerCase() !== (me?.email ?? "").toLowerCase()} onClick={() => void deleteEverything()}>{busy ? "Deleting…" : "Delete everything"}</button>
                  <button className="btn ghost small" onClick={() => { setAsking(false); setConfirm(""); }}>Keep my account</button>
                </div>
              </>
            )}
            {error ? <div className="err">{error}</div> : null}
          </div>
        </section>
      </main>
    </>
  );
}
