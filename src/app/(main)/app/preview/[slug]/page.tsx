"use client";

import { use } from "react";
import { SiteView } from "@/components/SiteView";

/** The owner's private preview. It subscribes live, so it needs the signed-in session. */
export default function Preview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <SiteView slug={slug} />;
}
