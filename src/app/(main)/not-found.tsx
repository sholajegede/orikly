import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap narrow" style={{ padding: "80px 16px", textAlign: "center" }}>
      <h1 className="display" style={{ fontSize: 64 }}>Not found</h1>
      <p className="muted">This page does not exist, or the website is not live yet.</p>
      <Link href="/" className="btn">Go to Orikly</Link>
    </main>
  );
}
