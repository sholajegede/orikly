"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { AppBar } from "@/components/AppBar";
import { cleanError } from "@/lib/format";
import { OCCASIONS, normalizeSlug, type OccasionId } from "@convex/lib/constants";

export default function NewCelebration() {
  const router = useRouter();
  const create = useMutation(api.projects.create);
  const [occasion, setOccasion] = useState<OccasionId>("wedding");
  const [names, setNames] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const occ = OCCASIONS.find((o) => o.id === occasion)!;

  useEffect(() => {
    if (!slugTouched) setSlug(normalizeSlug(names));
  }, [names, slugTouched]);

  const check = useQuery(api.projects.checkSlug, slug.length >= 1 ? { slug } : "skip");
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "orikly.ng";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const id = await create({ occasion, names, slug, eventDate: date || undefined });
      router.push(`/app/${id}`);
    } catch (err) {
      setError(cleanError(err));
      setBusy(false);
    }
  }

  return (
    <>
      <AppBar />
      <main className="page slim">
        <div className="dash-top"><div><h1>New celebration</h1><p className="muted">Three details to start. You can change them later.</p></div></div>
        <form className="card stack" onSubmit={submit}>
          <div>
            <div className="field"><span style={{ fontWeight: 600, fontSize: 14 }}>What are you celebrating?</span></div>
            <div className="row" style={{ marginTop: 8 }}>
              {OCCASIONS.map((o) => (
                <button type="button" key={o.id} className={`opt ${occasion === o.id ? "on" : ""}`} onClick={() => setOccasion(o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>{occ.namesLabel}</span>
            <input type="text" required maxLength={60} value={names} onChange={(e) => setNames(e.target.value)} placeholder={occ.namesHint} />
          </label>
          <label className="field">
            <span>{occ.dateLabel} (optional)</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Your link</span>
            <input type="text" required value={slug} onChange={(e) => { setSlugTouched(true); setSlug(normalizeSlug(e.target.value)); }} placeholder="tolu-and-bisi" autoCapitalize="none" />
            <div className="hint">{slug || "your-name"}.{root}</div>
            {check ? (
              check.ok ? (
                <div className="okmsg" style={{ marginTop: 6 }}>Available</div>
              ) : (
                <div className="err" style={{ marginTop: 6 }}>
                  {check.reason}{" "}
                  {check.suggestions.map((s) => (
                    <button type="button" key={s} className="btn ghost small" style={{ marginLeft: 6 }} onClick={() => { setSlugTouched(true); setSlug(s); }}>{s}</button>
                  ))}
                </div>
              )
            ) : null}
          </label>
          {error ? <div className="err">{error}</div> : null}
          <button className="btn" disabled={busy || !names.trim() || !check?.ok}>{busy ? "Creating…" : "Continue"}</button>
        </form>
      </main>
    </>
  );
}
