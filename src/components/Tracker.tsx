"use client";

import { useEffect } from "react";
import { useTrack } from "@/lib/track";

/** Fires one event when the page opens. */
export function Tracker({ name, slug }: { name: string; slug?: string }) {
  const track = useTrack();
  useEffect(() => {
    track(name, { slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, slug]);
  return null;
}
