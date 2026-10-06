import Link from "next/link";
import { notFound } from "next/navigation";

const docs: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: "Terms of use",
    body: [
      "DRAFT. These terms are a working draft and must be reviewed by a Nigerian lawyer before launch.",
      "Orikly makes a celebration website and two videos from the photos, videos, words and songs you upload. You confirm that you own or have permission to use everything you upload, including every song and every person in your photos.",
      "You pay a one-time fee. We make your website available as long as Orikly operates. We may remove a website that breaks the law, or that is abusive, hateful or sexual, or that uses someone else's work without permission.",
      "If someone says your content belongs to them, we may take it down while we check.",
    ],
  },
  privacy: {
    title: "Privacy",
    body: [
      "DRAFT. This notice must be reviewed by a Nigerian lawyer, including the requirements of the Nigeria Data Protection Act 2023, before launch.",
      "We collect your email, the content you upload, and how you use Orikly (for example which steps you finish). We use this to run the service, help you, and improve the product. We do not sell your data.",
      "Visitors to a celebration website are counted without names or phone numbers. We do not use advertising trackers on celebration websites.",
      "You can ask us to delete your account and everything you uploaded. Contact support from your dashboard.",
    ],
  },
  refunds: {
    title: "Refunds",
    body: [
      "DRAFT. Review with a lawyer before launch.",
      "If we cannot deliver your website or videos within 48 hours of confirming your payment and we cannot fix the problem, we refund you in full.",
      "After you have downloaded your final videos, we do not refund the payment.",
    ],
  },
};

export default async function Legal({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = docs[doc];
  if (!d) notFound();
  return (
    <main className="wrap narrow" style={{ padding: "40px 16px" }}>
      <Link href="/" className="logo">Orikly<i>.</i></Link>
      <h1 className="display" style={{ fontSize: 44, margin: "24px 0 16px" }}>{d.title}</h1>
      <div className="stack">
        {d.body.map((p) => (
          <p key={p} className="muted" style={{ margin: 0 }}>{p}</p>
        ))}
      </div>
    </main>
  );
}
