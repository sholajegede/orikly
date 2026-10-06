"use client";

import { use } from "react";
import { LettersView } from "@/components/LettersView";

/** The owner's private preview of the "Open when…" letters. */
export default function LettersPreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <LettersView slug={slug} />;
}
