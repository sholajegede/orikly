"use client";

import { useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

function safeSession(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getAnonId(): string {
  const s = safeSession();
  let id = s?.getItem("orikly_anon");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    s?.setItem("orikly_anon", id);
  }
  return id;
}

/** Remember where the visitor came from (?ref=vendor, ?utm_source=...) for the rest of the session. */
export function captureSource(): string | undefined {
  const s = safeSession();
  const params = new URLSearchParams(window.location.search);
  const found = params.get("ref") ?? params.get("utm_source") ?? params.get("src");
  if (found) s?.setItem("orikly_src", found.slice(0, 60));
  const stored = s?.getItem("orikly_src");
  if (stored) return stored;
  if (document.referrer) {
    try {
      const host = new URL(document.referrer).hostname;
      if (host !== window.location.hostname) return host.slice(0, 60);
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

function device(): string {
  return /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop";
}

export function useTrack() {
  const track = useMutation(api.events.track);
  return useCallback(
    (name: string, extra?: { slug?: string; props?: Record<string, string | number | boolean> }) => {
      void track({
        name,
        anonId: getAnonId(),
        source: captureSource(),
        device: device(),
        slug: extra?.slug,
        props: extra?.props,
      }).catch(() => {});
    },
    [track],
  );
}
