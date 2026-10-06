"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAuthActions } from "@convex-dev/auth/react";
import { cleanError, naira, shortDate } from "@/lib/format";
import { uploadToStorage } from "@/lib/upload";

const STEP_LABELS: Record<string, string> = {
  landing_view: "Opened the landing page",
  login_code_sent: "Asked for a login code",
  login_verified: "Signed in",
  project_created: "Created a celebration",
  upload_photo: "Uploaded a photo",
  preview_viewed: "Reached preview and pay",
  payment_claimed: "Said they paid",
  payment_confirmed: "Payment confirmed",
};

const TABS = ["Today", "Projects", "Packs", "Customer", "Events"] as const;
type Tab = (typeof TABS)[number];

export default function AdminPage() {
  const isAdmin = useQuery(api.admin.amIAdmin);
  const { signOut } = useAuthActions();
  const leave = () => { void signOut().then(() => { window.location.href = "/login"; }); };
  if (isAdmin === undefined) return <main className="admin-login"><p style={{ opacity: 0.7 }}>Loading…</p></main>;
  if (!isAdmin) {
    return (
      <main className="admin-login">
        <div className="box stack">
          <h1>No access</h1>
          <p style={{ margin: 0, opacity: 0.8 }}>This account is not on the admin list.</p>
          <div><button className="btn hot" onClick={leave}>Sign out</button></div>
        </div>
      </main>
    );
  }
  return <AdminApp leave={leave} />;
}

function AdminApp({ leave }: { leave: () => void }) {
  const [tab, setTab] = useState<Tab>("Today");
  const me = useQuery(api.users.me);
  const q = useQuery(api.ops.queues);
  const badge: Partial<Record<Tab, number>> = { Packs: q?.packs };
  const [customerId, setCustomerId] = useState<Id<"users"> | null>(null);

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="logo"><i />Orikly <span>Admin</span></div>
        <nav>
          {TABS.map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}{badge[t] ? <b>{badge[t]}</b> : null}</button>
          ))}
        </nav>
        <div className="who"><span>{me?.email ?? ""}</span><button onClick={leave}>Sign out</button></div>
      </aside>
      <main className="admin-main stack">
      <h1 className="display" style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 400 }}>{tab}</h1>
      {tab === "Today" ? <Today /> : null}
      {tab === "Projects" ? <Projects openCustomer={(id) => { setCustomerId(id); setTab("Customer"); }} /> : null}
      {tab === "Packs" ? <Packs /> : null}
      {tab === "Customer" ? <Customer userId={customerId} /> : null}
      {tab === "Events" ? <Events /> : null}
      </main>
    </div>
  );
}

function Today() {
  const [days, setDays] = useState(30);
  const o = useQuery(api.admin.overview, { days });
  if (!o) return <p className="muted">Loading…</p>;
  const first = Math.max(1, o.funnel[0]?.people ?? 1);
  return (
    <div className="stack">
      <div className="row">
        {[7, 30, 90].map((d) => (
          <button key={d} className={`stepbtn ${days === d ? "on" : ""}`} onClick={() => setDays(d)}>Last {d} days</button>
        ))}
      </div>
      <div className="grid three">
        <div className="card"><div className="muted small">Customers</div><div className="stat">{o.customers}</div></div>
        <div className="card"><div className="muted small">Revenue (all time)</div><div className="stat">{naira(o.revenueKobo)}</div><div className="muted small">Today {naira(o.revenueTodayKobo)}</div></div>
        <div className="card"><div className="muted small">Waiting for payment check</div><div className="stat">{o.byStatus.payment_claimed ?? 0}</div><div className="muted small">Go to Projects and mark paid</div></div>
        <div className="card"><div className="muted small">Live websites</div><div className="stat">{o.byStatus.paid ?? 0}</div><div className="muted small">{o.byStatus.draft ?? 0} drafts · {o.byStatus.suspended ?? 0} suspended</div></div>
        <div className="card"><div className="muted small">Website views</div><div className="stat">{o.siteViews}</div><div className="muted small">views · {o.wishes} wishes</div></div>
        <div className="card"><div className="muted small">Clicks on "Make yours"</div><div className="stat">{o.footerClicks}</div><div className="muted small">New customers from websites</div></div>
      </div>

      <div className="card stack">
        <h2 style={{ fontSize: 22 }}>Funnel (people, last {o.days} days)</h2>
        {o.funnel.map((f, i) => {
          const prev = i === 0 ? null : o.funnel[i - 1].people;
          return (
            <div key={f.step}>
              <div className="row between small"><b>{STEP_LABELS[f.step] ?? f.step}</b><span>{f.people}{prev ? ` · ${Math.round((f.people / Math.max(prev, 1)) * 100)}% of previous` : ""}</span></div>
              <div className="funnelbar" style={{ width: `${Math.max(1, Math.round((f.people / first) * 100))}%`, marginTop: 4 }} />
            </div>
          );
        })}
        <div className="muted small">Counts are distinct people (signed-in user, or an anonymous browser session). Visitors without an account only appear in the first step.</div>
      </div>
    </div>
  );
}

function Projects({ openCustomer }: { openCustomer: (id: Id<"users">) => void }) {
  const [status, setStatus] = useState("");
  const rows = useQuery(api.admin.projects, { status: status || undefined });
  const markPaid = useMutation(api.admin.markPaid);
  const setProjectStatus = useMutation(api.admin.setProjectStatus);
  const [open, setOpen] = useState<Id<"projects"> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setErr(null);
    try { await fn(); } catch (e) { setErr(cleanError(e)); }
  }

  return (
    <div className="stack">
      <div className="row">
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 240 }}>
          <option value="">All projects</option>
          <option value="payment_claimed">Waiting for payment check</option>
          <option value="draft">Drafts</option>
          <option value="paid">Live</option>
          <option value="suspended">Suspended</option>
        </select>
        {err ? <span className="err">{err}</span> : null}
      </div>
      <div className="card scroll-x">
        <table className="tbl">
          <thead><tr><th>Celebration</th><th>Customer</th><th>Status</th><th>Content</th><th>Reach</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {rows === undefined ? <tr><td colSpan={7}>Loading…</td></tr> : rows.length === 0 ? <tr><td colSpan={7} className="muted">Nothing here yet.</td></tr> : rows.map((p) => (
              <FragmentRow key={p._id} p={p} open={open === p._id} onToggle={() => setOpen(open === p._id ? null : p._id)} openCustomer={openCustomer}
                onMarkPaid={() => void run(() => markPaid({ projectId: p._id }))}
                onSuspend={() => void run(() => setProjectStatus({ projectId: p._id, action: p.status === "suspended" ? "restore" : "suspend" }))} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Row = NonNullable<ReturnType<typeof useQuery<typeof api.admin.projects>>>[number];

function FragmentRow({ p, open, onToggle, openCustomer, onMarkPaid, onSuspend }: { p: Row; open: boolean; onToggle: () => void; openCustomer: (id: Id<"users">) => void; onMarkPaid: () => void; onSuspend: () => void }) {
  const cls = p.status === "paid" ? "ok" : p.status === "payment_claimed" ? "warn" : p.status === "suspended" ? "bad" : "";
  return (
    <>
      <tr>
        <td><b>{p.names}</b><div className="muted small">{p.occasion} · /{p.slug}</div></td>
        <td><button className="btn ghost small" onClick={() => openCustomer(p.ownerId)}>{p.ownerEmail ?? "customer"}</button>{p.ownerWhatsapp ? <div className="muted small">WhatsApp {p.ownerWhatsapp}</div> : null}</td>
        <td><span className={`chip ${cls}`}>{p.status.replace("_", " ")}</span></td>
        <td className="small">{p.photos} photos · {p.videos} videos<div className="muted">{p.siteStyle} · {p.videoStyles.join(" + ")}</div><div className="muted">Song: {p.songName ?? "none"}</div></td>
        <td className="small">{p.siteViews} views<br />{p.wishes} wishes</td>
        <td className="small">{shortDate(p.createdAt)}</td>
        <td>
          <div className="row" style={{ gap: 6 }}>
            {p.status !== "paid" && p.status !== "suspended" ? <button className="btn small" onClick={onMarkPaid}>Mark paid</button> : null}
            <Link className="btn ghost small" href={`/preview/${p.slug}`} target="_blank">Open</Link>
            <button className="btn ghost small" onClick={onToggle}>{open ? "Close" : "Manage"}</button>
            <button className="btn ghost small" onClick={onSuspend}>{p.status === "suspended" ? "Restore" : "Suspend"}</button>
          </div>
        </td>
      </tr>
      {open ? <tr><td colSpan={7}><Detail projectId={p._id} /></td></tr> : null}
    </>
  );
}

function Detail({ projectId }: { projectId: Id<"projects"> }) {
  const d = useQuery(api.admin.projectDetail, { projectId });
  const genUrl = useMutation(api.admin.generateUploadUrl);
  const attach = useMutation(api.admin.attachDeliverable);
  const remove = useMutation(api.admin.removeDeliverable);
  const input = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [format, setFormat] = useState("portrait");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!d) return <p className="muted">Loading…</p>;

  async function upload(file: File) {
    setError(null);
    try {
      setProgress(0);
      const url = await genUrl({});
      const storageId = await uploadToStorage(url, file, file.type || "video/mp4", setProgress);
      await attach({ projectId, label: label || file.name, format, storageId: storageId as Id<"_storage"> });
      setLabel("");
    } catch (e) {
      setError(cleanError(e));
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="grid two" style={{ padding: "8px 0" }}>
      <div className="stack" style={{ gap: 10 }}>
        <b>Everything to make the videos</b>
        <div className="small">Song: {d.project.songName ?? d.project.songChoice ?? "none chosen"} {d.songUrl ? <a href={d.songUrl} target="_blank" rel="noreferrer">(download)</a> : null}</div>
        <div className="small">Video styles: {d.project.videoStyles.join(" + ")} · Site style: {d.project.siteStyle} / {d.project.palette}</div>
        <div className="small"><b>Headline:</b> {d.project.headline ?? "none"}</div>
        <div className="small" style={{ whiteSpace: "pre-wrap" }}><b>Story:</b> {d.project.story ?? "none"}</div>
        <div className="small" style={{ whiteSpace: "pre-wrap" }}><b>Note:</b> {d.project.message ?? "none"}</div>
        <div className="small">Photos (in order): {d.photoUrls.map((p, i) => p.url ? <a key={p.id} href={p.url} target="_blank" rel="noreferrer" style={{ marginRight: 6 }}>{i + 1}</a> : null)}</div>
        <div className="small">Videos: {d.videoUrls.map((p, i) => p.url ? <a key={p.id} href={p.url} target="_blank" rel="noreferrer" style={{ marginRight: 6 }}>{i + 1}</a> : null)}</div>
        <div className="small">Payments: {d.payments.length === 0 ? "none" : d.payments.map((p) => `${p.status} ${naira(p.amountKobo)}${p.senderName ? ` from ${p.senderName}` : ""}${p.reference ? ` ref ${p.reference}` : ""}`).join("; ")}</div>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        <b>Finished videos (the customer downloads these)</b>
        {d.deliverables.map((x) => (
          <div key={x.index} className="row between card" style={{ padding: 10 }}>
            <span className="small"><b>{x.label}</b> · {x.format}</span>
            <span className="row">{x.url ? <a className="btn ghost small" href={x.url} target="_blank" rel="noreferrer">Open</a> : null}<button className="btn ghost small" onClick={() => void remove({ projectId, index: x.index })}>Remove</button></span>
          </div>
        ))}
        <div className="row">
          <input type="text" placeholder="Label, e.g. Cinematic" value={label} onChange={(e) => setLabel(e.target.value)} style={{ flex: "1 1 160px" }} />
          <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ flex: "0 0 140px" }}>
            <option value="portrait">portrait</option>
            <option value="landscape">landscape</option>
          </select>
        </div>
        <div><button className="btn small" disabled={progress !== null} onClick={() => input.current?.click()}>Upload finished video</button></div>
        <input ref={input} type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        {progress !== null ? <div className="bar"><i style={{ width: `${Math.round(progress * 100)}%` }} /></div> : null}
        {error ? <div className="err">{error}</div> : null}
      </div>
    </div>
  );
}

function Customer({ userId }: { userId: Id<"users"> | null }) {
  const c = useQuery(api.admin.customer, userId ? { userId } : "skip");
  const addNote = useMutation(api.admin.addNote);
  const [note, setNote] = useState("");
  const [tag, setTag] = useState("");
  if (!userId) return <p className="muted">Pick a customer from the Projects tab.</p>;
  if (c === undefined) return <p className="muted">Loading…</p>;
  if (c === null) return <p className="err">Customer not found.</p>;
  return (
    <div className="grid two">
      <div className="stack">
        <div className="card stack" style={{ gap: 6 }}>
          <h2 style={{ fontSize: 22 }}>{c.user.name ?? c.user.email}</h2>
          <div className="small">Email: {c.user.email ?? "none"}</div>
          <div className="small">Came from: {c.user.source ?? "unknown"}</div>
          <div className="small">Making for: {c.user.segment ?? "not asked"} · Heard from: {c.user.heardFrom ?? "not asked"}</div>
          <div className="small">First seen {shortDate(c.user.firstSeenAt)}{c.user.lastSeenAt ? ` · last seen ${shortDate(c.user.lastSeenAt)}` : ""}</div>
        </div>
        <div className="card stack" style={{ gap: 8 }}>
          <b>Celebrations</b>
          {c.projects.map((p) => <div key={p._id} className="small"><b>{p.names}</b> · {p.occasion} · /{p.slug} · <span className="chip">{p.status.replace("_", " ")}</span></div>)}
          <b style={{ marginTop: 8 }}>Payments</b>
          {c.payments.length === 0 ? <div className="muted small">None</div> : c.payments.map((p) => <div key={p._id} className="small">{p.status} · {naira(p.amountKobo)} · {p.method}{p.senderName ? ` · from ${p.senderName}` : ""} · {shortDate(p.createdAt)}</div>)}
        </div>
        <div className="card stack" style={{ gap: 8 }}>
          <b>Notes</b>
          {c.notes.map((n) => <div key={n._id} className="small"><span className="muted">{shortDate(n.createdAt)}{n.tag ? ` · ${n.tag}` : ""}</span><br />{n.body}</div>)}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note about this customer" style={{ minHeight: 70 }} />
          <input type="text" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag (optional), e.g. vip, vendor" />
          <div><button className="btn small" disabled={!note.trim()} onClick={() => { void addNote({ userId, body: note, tag: tag || undefined }); setNote(""); setTag(""); }}>Save note</button></div>
        </div>
      </div>
      <div className="card stack" style={{ gap: 8 }}>
        <b>Timeline</b>
        {c.events.length === 0 ? <div className="muted small">No events yet.</div> : c.events.map((e) => (
          <div key={e._id} className="small"><span className="muted">{shortDate(e.at)}</span> · <b>{e.name}</b>{e.device ? <span className="muted"> · {e.device}</span> : null}{e.props ? <span className="muted mono"> {JSON.stringify(e.props)}</span> : null}</div>
        ))}
      </div>
    </div>
  );
}

function Events() {
  const rows = useQuery(api.admin.recentEvents);
  return (
    <div className="card scroll-x">
      <table className="tbl">
        <thead><tr><th>When</th><th>Event</th><th>Who</th><th>Source</th><th>Device</th><th>Details</th></tr></thead>
        <tbody>
          {rows === undefined ? <tr><td colSpan={6}>Loading…</td></tr> : rows.map((e) => (
            <tr key={e._id}>
              <td className="small">{shortDate(e.at)}</td>
              <td><b>{e.name}</b></td>
              <td className="small mono">{e.userId ? "user" : e.anonId ? `anon ${e.anonId.slice(0, 6)}` : "system"}</td>
              <td className="small">{e.source ?? ""}</td>
              <td className="small">{e.device ?? ""}</td>
              <td className="small mono">{e.props ? JSON.stringify(e.props) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useRun() {
  const [err, setErr] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); } catch (e) { setErr(cleanError(e)); } };
  return { err, run };
}

function Packs() {
  const rows = useQuery(api.ops.packOrders);
  const confirm = useMutation(api.ops.confirmPack);
  const reject = useMutation(api.ops.rejectPack);
  const { err, run } = useRun();
  return (
    <div className="stack">
      {err ? <span className="err">{err}</span> : null}
      {rows === undefined ? <p className="muted">Loading…</p> : rows.length === 0 ? <p className="muted">No pack payments waiting.</p> : rows.map((o) => (
        <div key={o._id} className="card stack" style={{ gap: 6 }}>
          <div className="row between"><b>{o.credits} credits · {naira(o.amountKobo)}</b><span className="muted small">{o.email}</span></div>
          <div className="small">Paid from {o.senderName}{o.reference ? ` · ref ${o.reference}` : ""} · {shortDate(o.createdAt)}</div>
          <div className="row"><button className="btn small" onClick={() => void run(() => confirm({ orderId: o._id }))}>Payment received</button><button className="btn ghost small" onClick={() => void run(() => reject({ orderId: o._id }))}>Reject</button></div>
        </div>
      ))}
    </div>
  );
}
