import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { COMPANY } from "@/lib/company";
import { LEGAL, type Block } from "@/lib/legal";

type Props = { params: Promise<{ doc: string }> };
const slugOf = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doc } = await params;
  return { title: LEGAL[doc]?.title ?? "Legal" };
}

function Part({ b }: { b: Block }) {
  if (typeof b === "string") return <p>{b}</p>;
  if ("list" in b) return <ul>{b.list.map((x) => <li key={x}>{x}</li>)}</ul>;
  return (
    <div className="scroll-x">
      <table className="tbl legal-tbl">
        <thead><tr>{b.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{b.table.map((r) => <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default async function Legal({ params }: Props) {
  const { doc } = await params;
  const d = LEGAL[doc];
  if (!d) notFound();
  return (
    <>
      <Header />
      <main className="wrap legal">
        <aside>
          <p className="tagline">Legal</p>
          <nav aria-label="Legal documents">
            {Object.entries(LEGAL).map(([k, v]) => <Link key={k} href={`/legal/${k}`} aria-current={k === doc ? "page" : undefined}>{v.title}</Link>)}
          </nav>
        </aside>
        <article>
          <h1>{d.title}</h1>
          <p className="tagline muted">Last updated {COMPANY.updated}</p>
          <p className="legal-intro">{d.intro}</p>
          <nav className="toc" aria-label="On this page">{d.sections.map((s) => <a key={s.h} href={`#${slugOf(s.h)}`}>{s.h}</a>)}</nav>
          {d.sections.map((s) => (
            <section key={s.h} id={slugOf(s.h)}>
              <h2>{s.h}</h2>
              {s.body.map((b, i) => <Part key={i} b={b} />)}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
