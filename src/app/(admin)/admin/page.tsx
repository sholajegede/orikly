"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useAuthActions } from "@convex-dev/auth/react";
import { cleanError, naira, shortDate } from "@/lib/format";

const STEP_LABELS: Record<string, string> = {
  landing_view: "Opened the landing page",
  login_code_sent: "Asked for a login code",
  login_verified: "Signed in",
  project_created: "Created a celebration",
  upload_photo: "Uploaded a photo",
  preview_viewed: "Reached preview and pay",
  payment_confirmed: "Payment confirmed",
};

const TABS = ["Today", "Projects", "Updates", "Customer", "Events"] as const;
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
  const [more, setMore] = useState(false);
  const go = (t: Tab) => { setTab(t); setMore(false); window.scrollTo(0, 0); };
  const [customerId, setCustomerId] = useState<Id<"users"> | null>(null);

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="logo"><i />Orikly <span>Admin</span></div>
        <nav>
          {TABS.map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
        <div className="who"><span>{me?.email ?? ""}</span><button onClick={leave}>Sign out</button></div>
      </aside>
      <nav className="admin-tabbar" aria-label="Admin">
        {(["Today", "Projects", "Updates"] as const).map((t, i) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => go(t)}><i className="ico" data-k={["home", "files", "help"][i]} /><span>{t}</span></button>
        ))}
        <button className={more || tab === "Customer" || tab === "Events" ? "on" : ""} onClick={() => setMore(!more)} aria-expanded={more}><i className="ico" data-k="more" /><span>More</span></button>
      </nav>
      {more ? (
        <div className="more-sheet admin-more" role="dialog" aria-label="More">
          <button onClick={() => go("Customer")}>Customer</button>
          <button onClick={() => go("Events")}>Events</button>
          <div className="who"><span>{me?.email ?? ""}</span><button onClick={leave}>Sign out</button></div>
        </div>
      ) : null}
      <main className="admin-main stack">
      <h1 className="display" style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 400 }}>{tab}</h1>
      {tab === "Today" ? <Today /> : null}
      {tab === "Projects" ? <Projects openCustomer={(id) => { setCustomerId(id); setTab("Customer"); }} /> : null}
      {tab === "Updates" ? <Updates /> : null}
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
        <div className="card"><div className="muted small">Drafts not yet paid</div><div className="stat">{o.byStatus.draft ?? 0}</div><div className="muted small">Payment is automatic</div></div>
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
  const publishFree = useMutation(api.admin.publishFree);
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
                onMarkPaid={() => void run(() => publishFree({ projectId: p._id }))}
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
  const cls = p.status === "paid" ? "ok" : p.status === "suspended" ? "bad" : "";
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
            {p.status !== "paid" && p.status !== "suspended" ? <button className="btn ghost small" title="Publish without payment. Records no revenue." onClick={onMarkPaid}>Publish free</button> : null}
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
  if (!d) return <p className="muted">Loading…</p>;
  return (
    <div className="grid two" style={{ padding: "8px 0" }}>
      <div className="stack" style={{ gap: 10 }}>
        <b>What the customer gave us</b>
        <div className="small">Song: {d.project.songName ?? d.project.songChoice ?? "none chosen"} {d.songUrl ? <a href={d.songUrl} target="_blank" rel="noreferrer">(listen)</a> : null}</div>
        <div className="small"><b>Headline:</b> {d.project.headline ?? "none"}</div>
        <div className="small" style={{ whiteSpace: "pre-wrap" }}><b>Story:</b> {d.project.story ?? "none"}</div>
        <div className="small" style={{ whiteSpace: "pre-wrap" }}><b>Note:</b> {d.project.message ?? "none"}</div>
        <div className="small">Photos: {d.photoUrls.map((p, i) => p.url ? <a key={p.id} href={p.url} target="_blank" rel="noreferrer" style={{ marginRight: 6 }}>{i + 1}</a> : null)}</div>
        <div className="small">Payments: {d.payments.length === 0 ? "none" : d.payments.map((p) => `${p.status} ${naira(p.amountKobo)} by ${p.method}${p.reference ? ` ref ${p.reference}` : ""}`).join("; ")}</div>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        <b>What the AI made</b>
        <div className="small">Website design: {d.project.siteDesign ? "done" : "not yet"} · Runs used: {d.project.directedCount ?? 0} of 2</div>
        {d.deliverables.length === 0 ? <div className="muted small">No videos saved yet.</div> : d.deliverables.map((x) => (
          <div key={x.index} className="row between card" style={{ padding: 10 }}>
            <span className="small"><b>{x.label}</b> · {x.format}</span>
            {x.url ? <a className="btn ghost small" href={x.url} target="_blank" rel="noreferrer">Open</a> : null}
          </div>
        ))}
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

function Updates() {
  const rows = useQuery(api.announcements.list);
  const publish = useMutation(api.announcements.publish);
  const setActive = useMutation(api.announcements.setActive);
  const [f, setF] = useState({ title: "", body: "", linkUrl: "", linkLabel: "" });
  const { err, run } = useRun();
  return (
    <div className="grid two">
      <div className="card stack">
        <b>Post an update</b>
        <p className="muted small" style={{ margin: 0 }}>It shows at the bottom of every customer's sidebar. A new update replaces the live one.</p>
        <label className="field"><span>Title</span><input type="text" maxLength={60} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="New: Storybook video style" /></label>
        <label className="field"><span>Message</span><textarea maxLength={200} style={{ minHeight: 80 }} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>
        <label className="field"><span>Link (optional)</span><input type="text" value={f.linkUrl} onChange={(e) => setF({ ...f, linkUrl: e.target.value })} placeholder="/app/credits or https://..." /></label>
        <label className="field"><span>Link text (optional)</span><input type="text" maxLength={30} value={f.linkLabel} onChange={(e) => setF({ ...f, linkLabel: e.target.value })} placeholder="See the packs" /></label>
        {err ? <div className="err">{err}</div> : null}
        <div><button className="btn small" onClick={() => void run(async () => { await publish({ title: f.title, body: f.body, linkUrl: f.linkUrl || undefined, linkLabel: f.linkLabel || undefined }); setF({ title: "", body: "", linkUrl: "", linkLabel: "" }); })}>Publish to all customers</button></div>
      </div>
      <div className="stack">
        {rows === undefined ? <p className="muted">Loading…</p> : rows.length === 0 ? <p className="muted">No updates yet.</p> : rows.map((a) => (
          <div key={a._id} className="card stack" style={{ gap: 6 }}>
            <div className="row between"><b>{a.title}</b><span className={`chip ${a.active ? "ok" : ""}`}>{a.active ? "Live" : "Off"}</span></div>
            <div className="small">{a.body}</div>
            <div className="row"><span className="muted small grow">{shortDate(a.createdAt)}{a.linkUrl ? ` · ${a.linkUrl}` : ""}</span><button className="btn ghost small" onClick={() => void run(() => setActive({ id: a._id, active: !a.active }))}>{a.active ? "Take down" : "Make live"}</button></div>
          </div>
        ))}
      </div>
    </div>
  );
}
