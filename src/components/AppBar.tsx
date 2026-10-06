"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";

const NAV = [
  { href: "/app", label: "Home", k: "home", match: (p: string) => p === "/app" },
  { href: "/app/files", label: "Files", k: "files", match: (p: string) => p.startsWith("/app/files") },
  { href: "/app/credits", label: "Credits", k: "credits", match: (p: string) => p.startsWith("/app/credits") },
  { href: "/app/settings", label: "Settings", k: "settings", match: (p: string) => p.startsWith("/app/settings") },
  { href: "/app/help", label: "Help", k: "help", match: (p: string) => p.startsWith("/app/help") },
];
const DOT: Record<string, string> = { paid: "var(--green)", payment_claimed: "var(--gold)", suspended: "var(--zobo)", draft: "var(--line)" };

function Update({ onDone }: { onDone?: () => void }) {
  const u = useQuery(api.announcements.current);
  const [hidden, setHidden] = useState<string | null>(null);
  useEffect(() => {
    try { setHidden(window.localStorage.getItem("orikly_update_hidden")); } catch { /* ignore */ }
  }, []);
  if (!u || hidden === u._id) return null;
  const hide = () => {
    try { window.localStorage.setItem("orikly_update_hidden", u._id); } catch { /* ignore */ }
    setHidden(u._id);
  };
  return (
    <div className="side-update">
      <button className="x" aria-label="Hide this update" onClick={hide}>×</button>
      <span className="tagline">New</span>
      <b>{u.title}</b>
      <p>{u.body}</p>
      {u.linkUrl ? <Link href={u.linkUrl} onClick={onDone}>{u.linkLabel ?? "See more"}</Link> : null}
    </div>
  );
}

/**
 * The frame around every signed-in screen.
 * Desktop: a sidebar with everything a customer owns. Phone: a slim top bar and a tab bar at the thumb.
 */
export function AppBar() {
  const me = useQuery(api.users.me);
  const projects = useQuery(api.projects.mine);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const [more, setMore] = useState(false);

  useEffect(() => setMore(false), [pathname]);

  const label = (me?.name ?? "").trim() || me?.email || "";
  const initial = (label[0] ?? "O").toUpperCase();
  const credits = me?.credits ?? 0;
  const leave = () => { void signOut().then(() => router.push("/")); };

  const links = (close?: () => void) => NAV.map((n) => (
    <Link key={n.href} href={n.href} className={n.match(pathname) ? "on" : ""} onClick={close}>
      <i className="ico" data-k={n.k} aria-hidden="true" />{n.label}
      {n.k === "credits" ? <b>{credits}</b> : null}
    </Link>
  ));
  const mine = (close?: () => void) => (projects ?? []).length ? (
    <div className="side-list">
      <span className="tagline">Your celebrations</span>
      {(projects ?? []).map((p) => (
        <Link key={p._id} href={`/app/${p._id}`} className={pathname === `/app/${p._id}` ? "on" : ""} onClick={close}>
          <i style={{ background: DOT[p.status] ?? DOT.draft }} />{p.names}
        </Link>
      ))}
    </div>
  ) : null;
  const user = (
    <div className="side-user">
      <span className="avatar">{initial}</span>
      <span className="who"><b>{(me?.name ?? "").trim() || "Your account"}</b><small>{me?.email}</small></span>
      <button onClick={leave} aria-label="Sign out" title="Sign out">Sign out</button>
    </div>
  );

  return (
    <>
      <aside className="side">
        <Link href="/app" className="logo" aria-label="Your dashboard"><i />Orikly</Link>
        <Link href="/app/new" className="btn hot side-new">New celebration</Link>
        <nav className="side-nav" aria-label="App">{links()}</nav>
        {mine()}
        <div className="side-foot"><Update />{user}</div>
      </aside>

      <header className="appbar">
        <Link href="/app" className="logo" aria-label="Your dashboard"><i />Orikly</Link>
        <Link href="/app/credits" className="chip gold">{credits} credit{credits === 1 ? "" : "s"}</Link>
      </header>

      <nav className="tabbar" aria-label="App">
        <Link href="/app" className={pathname === "/app" ? "on" : ""}><i className="ico" data-k="home" /><span>Home</span></Link>
        <Link href="/app/files" className={pathname.startsWith("/app/files") ? "on" : ""}><i className="ico" data-k="files" /><span>Files</span></Link>
        <Link href="/app/new" className="plus"><i className="ico" data-k="new" /><span>New</span></Link>
        <Link href="/app/credits" className={pathname.startsWith("/app/credits") ? "on" : ""}><i className="ico" data-k="credits" /><span>Credits</span></Link>
        <button onClick={() => setMore(!more)} className={more ? "on" : ""} aria-expanded={more}><i className="ico" data-k="more" /><span>More</span></button>
      </nav>

      {more ? (
        <div className="more-sheet" role="dialog" aria-label="More">
          <nav className="side-nav">{links(() => setMore(false))}</nav>
          {mine(() => setMore(false))}
          <Update onDone={() => setMore(false)} />
          {user}
        </div>
      ) : null}
    </>
  );
}
