"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";

const TABS = [
  { href: "/app", label: "Home", match: (p: string) => p === "/app" || /^\/app\/(?!new|credits)/.test(p) },
  { href: "/app/new", label: "New", match: (p: string) => p === "/app/new" },
  { href: "/app/credits", label: "Credits", match: (p: string) => p.startsWith("/app/credits") },
];

/** The frame around every signed-in screen: a top bar on desktop, plus a tab bar at the thumb on phones. */
export function AppBar() {
  const me = useQuery(api.users.me);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menu.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("mousedown", close); window.removeEventListener("keydown", close); };
  }, [open]);

  const label = (me?.name ?? "").trim() || me?.email || "";
  const initial = (label[0] ?? "O").toUpperCase();
  const credits = me?.credits ?? 0;
  const leave = () => { void signOut().then(() => router.push("/")); };

  return (
    <>
      <header className="appbar">
        <div className="wrap">
          <Link href="/app" className="logo" aria-label="Your dashboard"><i />Orikly</Link>
          <nav className="appnav" aria-label="App">
            {TABS.filter((t) => t.href !== "/app/new").map((t) => <Link key={t.href} href={t.href} className={t.match(pathname) ? "on" : ""}>{t.label === "Home" ? "Dashboard" : t.label}{t.href === "/app/credits" && credits ? <b>{credits}</b> : null}</Link>)}
          </nav>
          <div className="appbar-right" ref={menu}>
            <Link href="/app/new" className="btn hot small appbar-new">New celebration</Link>
            <button className="avatar" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen(!open)}>{initial}</button>
            {open ? (
              <div className="acct-menu" role="menu">
                <div className="who"><b>{(me?.name ?? "").trim() || "Your account"}</b><span>{me?.email}</span></div>
                <Link href="/app#account" role="menuitem">Account</Link>
                <Link href="/wall" role="menuitem">The wall of praise</Link>
                <Link href="/" role="menuitem">Orikly home</Link>
                <button role="menuitem" onClick={leave}>Sign out</button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <nav className="tabbar" aria-label="App">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={`${t.match(pathname) ? "on" : ""}${t.href === "/app/new" ? " plus" : ""}`}>
            <i aria-hidden="true" data-k={t.label} />
            <span>{t.label}</span>
          </Link>
        ))}
        <button onClick={() => setOpen(!open)} className={open ? "on" : ""}><i aria-hidden="true" className="me">{initial}</i><span>You</span></button>
      </nav>
    </>
  );
}
