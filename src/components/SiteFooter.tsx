import Link from "next/link";
import { CookieSettingsLink } from "./Consent";

export function SiteFooter() {
  return (
    <footer className="foot">
      <div className="wrap">
        <p className="serif foot-line">Oríkì is the Yoruba art of praise. We built Orikly to praise your people properly.</p>
        <nav className="foot-nav" aria-label="Footer">
          <div><span className="tagline">Orikly</span><Link href="/#how">How it works</Link><Link href="/wall">The wall of praise</Link><Link href="/login">Sign in</Link></div>
          <div><span className="tagline">For business</span><Link href="/partners">Packs for planners</Link><Link href="/app/credits">Buy credits</Link></div>
          <div><span className="tagline">Legal</span><Link href="/legal/terms">Terms</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal/cookies">Cookies</Link><Link href="/legal/refunds">Refunds</Link><CookieSettingsLink /></div>
        </nav>
        <div className="word display" aria-hidden="true">Orikly<i>.</i></div>
      </div>
    </footer>
  );
}
