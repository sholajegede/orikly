"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";

export function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const creator = useQuery(api.creators.mine, isAuthenticated ? {} : "skip");
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { href: "/#how", label: "How it works" },
    { href: "/wall", label: "The wall" },
    { href: "/partners", label: "For planners" },
    ...(isAuthenticated && creator ? [{ href: "/app/creator", label: "Studio" }] : []),
  ];
  const leave = () => { void signOut().then(() => router.push("/")); };

  return (
    <header className="top">
      <div className="wrap">
        <Link href="/" className="logo" aria-label="Orikly home"><i />Orikly</Link>
        <nav className="navlinks" aria-label="Main">
          {links.map((l) => <Link key={l.href} className="link hide-s" href={l.href}>{l.label}</Link>)}
          {isAuthenticated ? (
            <>
              <button className="link hide-s plain" onClick={leave}>Sign out</button>
              <Link className="btn small" href="/app">My celebrations</Link>
            </>
          ) : !isLoading ? (
            <>
              <Link className="link hide-s" href="/login">Sign in</Link>
              <Link className="btn small hot" href="/login">Start free</Link>
            </>
          ) : null}
          <button className={`menu-btn${open ? " open" : ""}`} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}><span /><span /></button>
        </nav>
      </div>
      {open ? (
        <div className="sheet" id="site-menu">
          {links.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>)}
          {isAuthenticated ? (
            <>
              <Link href="/app" onClick={() => setOpen(false)}>My celebrations</Link>
              <Link href="/app/credits" onClick={() => setOpen(false)}>Credits</Link>
              <button className="plain" onClick={leave}>Sign out</button>
            </>
          ) : (
            <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
          )}
        </div>
      ) : null}
    </header>
  );
}
