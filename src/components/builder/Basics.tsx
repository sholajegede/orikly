"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { cleanError } from "@/lib/format";
import { api } from "@convex/_generated/api";
import { OCCASIONS, normalizeSlug } from "@convex/lib/constants";
import type { BuilderData, ProjectPatch } from "./shared";

export function Basics({ data, save }: { data: BuilderData; save: (p: ProjectPatch) => Promise<boolean> }) {
  const { project } = data;
  const occ = OCCASIONS.find((o) => o.id === project.occasion)!;
  const [names, setNames] = useState(project.names);
  const [date, setDate] = useState(project.eventDate ?? "");
  const [slug, setSlug] = useState(project.slug);
  const [venue, setVenue] = useState(project.venue ?? "");
  const [dress, setDress] = useState(project.dressCode ?? "");
  const [map, setMap] = useState(project.mapUrl ?? "");
  const [bank, setBank] = useState(project.giftBank ?? "");
  const [acctName, setAcctName] = useState(project.giftAccountName ?? "");
  const [acctNo, setAcctNo] = useState(project.giftAccountNumber ?? "");
  const live = project.status === "paid";
  const changesLeft = Math.max(0, 3 - (project.slugChanges ?? 0));
  const locked = live && changesLeft === 0;
  const removeProject = useMutation(api.projects.remove);
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [asking, setAsking] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "orikly.ng";

  useEffect(() => setNames(project.names), [project.names]);
  const check = useQuery(api.projects.checkSlug, slug !== project.slug ? { slug, projectId: project._id } : "skip");

  return (
    <div className="stack">
      <label className="field">
        <span>{occ.namesLabel}</span>
        <input type="text" value={names} maxLength={60} onChange={(e) => setNames(e.target.value)} onBlur={() => names.trim() !== project.names && void save({ names })} />
      </label>
      <label className="field">
        <span>{occ.dateLabel}</span>
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); void save({ eventDate: e.target.value }); }} />
        <div className="hint">If the date is still ahead, your website shows a countdown.</div>
      </label>
      <label className="field">
        <span>Your link</span>
        <input type="text" value={slug} disabled={locked} autoCapitalize="none" onChange={(e) => setSlug(normalizeSlug(e.target.value))} />
        <div className="hint">{slug}.{root}</div>
        {locked ? <div className="hint">You have changed this link 3 times. Contact us to change it again.</div> : live ? <div className="hint">Your website is live. If you change the link, the old one stops working, so send the new one to your guests. {changesLeft} change{changesLeft === 1 ? "" : "s"} left.</div> : null}
        {check && !check.ok ? <div className="err" style={{ marginTop: 6 }}>{check.reason}</div> : null}
        {!locked && slug !== project.slug ? (
          <button type="button" className="btn small" style={{ marginTop: 8 }} disabled={!check?.ok} onClick={() => void save({ slug })}>
            Use this link
          </button>
        ) : null}
      </label>

      <div className="subhead"><h3>The day</h3><p className="hint">Optional. Guests see this on your website, so nobody has to ask in the group chat.</p></div>
      <label className="field">
        <span>Time</span>
        <input type="time" value={project.eventTime ?? ""} onChange={(e) => void save({ eventTime: e.target.value })} />
      </label>
      <label className="field">
        <span>Venue</span>
        <input type="text" value={venue} maxLength={140} placeholder="The Monarch Event Centre, Lekki" onChange={(e) => setVenue(e.target.value)} onBlur={() => venue !== (project.venue ?? "") && void save({ venue })} />
      </label>
      <label className="field">
        <span>Map link</span>
        <input type="url" value={map} placeholder="Paste a Google Maps link" onChange={(e) => setMap(e.target.value)} onBlur={() => map !== (project.mapUrl ?? "") && void save({ mapUrl: map })} />
      </label>
      <label className="field">
        <span>Colors of the day or dress code</span>
        <input type="text" value={dress} maxLength={80} placeholder="Emerald green and gold" onChange={(e) => setDress(e.target.value)} onBlur={() => dress !== (project.dressCode ?? "") && void save({ dressCode: dress })} />
      </label>

      <div className="subhead"><h3>Gifts</h3><p className="hint">Optional. Add an account and guests can copy the details from your website. Fill all three to show it.</p></div>
      <label className="field">
        <span>Bank</span>
        <input type="text" value={bank} maxLength={60} onChange={(e) => setBank(e.target.value)} onBlur={() => bank !== (project.giftBank ?? "") && void save({ giftBank: bank })} />
      </label>
      <label className="field">
        <span>Account number</span>
        <input type="text" inputMode="numeric" maxLength={10} value={acctNo} onChange={(e) => setAcctNo(e.target.value.replace(/\D/g, ""))} onBlur={() => acctNo !== (project.giftAccountNumber ?? "") && (acctNo.length === 10 || acctNo.length === 0) && void save({ giftAccountNumber: acctNo })} />
      </label>
      <label className="field">
        <span>Account name</span>
        <input type="text" value={acctName} maxLength={80} onChange={(e) => setAcctName(e.target.value)} onBlur={() => acctName !== (project.giftAccountName ?? "") && void save({ giftAccountName: acctName })} />
      </label>

      <div className="subhead"><h3 style={{ color: "var(--danger)" }}>Delete this celebration</h3><p className="hint">Removes the website, every photo, video, song and wish for it. This cannot be undone. A payment or credit used on it is not returned.</p></div>
      {!asking ? <div><button type="button" className="btn ghost small" onClick={() => setAsking(true)}>Delete this celebration</button></div> : (
        <div className="stack">
          <label className="field"><span>Type {project.slug} to confirm</span><input type="text" value={confirm} autoCapitalize="none" autoComplete="off" onChange={(e) => setConfirm(e.target.value)} /></label>
          {delError ? <div className="err">{delError}</div> : null}
          <div className="row">
            <button type="button" className="btn danger small" disabled={confirm.trim().toLowerCase() !== project.slug} onClick={() => { setDelError(null); void removeProject({ id: project._id, confirm }).then(() => router.replace("/app")).catch((e) => setDelError(cleanError(e))); }}>Delete it</button>
            <button type="button" className="btn ghost small" onClick={() => { setAsking(false); setConfirm(""); }}>Keep it</button>
          </div>
        </div>
      )}
    </div>
  );
}
