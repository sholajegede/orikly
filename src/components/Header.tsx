"use client";

import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";

export function Header({ dark = false }: { dark?: boolean }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const isAdmin = useQuery(api.admin.amIAdmin, isAuthenticated ? {} : "skip");
  const creator = useQuery(api.creators.mine, isAuthenticated ? {} : "skip");

  return (
    <header className={`top${dark ? " dark" : ""}`}>
      <div className="wrap">
        <Link href="/" className="logo">
          Orikly<i>.</i>
        </Link>
        <nav className="navlinks">
          <Link className="btn ghost small hide-s" href="/creators">Earn with videos</Link>
          <Link className="btn ghost small hide-s" href="/partners">For planners</Link>
          {isAuthenticated && isAdmin ? <Link className="btn ghost small" href="/admin">Admin</Link> : null}
          {isAuthenticated ? (
            <>
              {creator ? <Link className="btn ghost small" href="/app/creator">Studio</Link> : null}
              <Link className="btn ghost small" href="/app">My celebrations</Link>
              <button className="btn ghost small hide-s" onClick={() => { void signOut().then(() => router.push("/")); }}>Sign out</button>
            </>
          ) : !isLoading ? (
            <Link className={`btn small${dark ? " gold" : ""}`} href="/login">Sign in</Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
