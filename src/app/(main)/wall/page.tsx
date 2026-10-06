import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { WallGrid } from "@/components/WallGrid";
import { getWall } from "@/lib/wall";

export const metadata: Metadata = { title: "The wall of praise", description: "Celebrations made with Orikly, shared by the people who made them." };

export default async function Wall() {
  const items = await getWall(48);
  return (
    <>
      <Header />
      <main className="wrap app-main">
        <div className="app-head">
          <div>
            <p className="tagline muted">Shared by the people who made them</p>
            <h1>The wall of <em>praise</em></h1>
          </div>
          <Link href="/login" className="btn hot">Make yours</Link>
        </div>
        {items.length ? <WallGrid items={items} /> : (
          <div className="empty">
            <h2>The first praise could be yours.</h2>
            <p>When people choose to share their celebration, it shows here. Make yours in about ten minutes, sharp sharp.</p>
            <Link href="/login" className="btn hot">Start free</Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
