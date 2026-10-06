"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adPage, applyConsent, consentDefaults } from "@/lib/ads";
import { openConsent, readConsent, saveConsent } from "@/lib/consent";

/** The cookie banner and the loader for analytics and advertising tags. Mounted once, in the main layout. */
export function Consent() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    consentDefaults();
    const saved = readConsent();
    if (saved) {
      applyConsent(saved);
      setAnalytics(saved.analytics);
      setMarketing(saved.marketing);
    } else {
      setOpen(true);
    }
    const reopen = () => { setChoosing(true); setOpen(true); };
    window.addEventListener("orikly:consent-open", reopen);
    return () => window.removeEventListener("orikly:consent-open", reopen);
  }, []);

  useEffect(() => { adPage(pathname); }, [pathname]);

  function decide(choice: { analytics: boolean; marketing: boolean }) {
    applyConsent(saveConsent(choice));
    setAnalytics(choice.analytics);
    setMarketing(choice.marketing);
    setOpen(false);
    setChoosing(false);
  }

  if (!open) return null;
  return (
    <div className="consent" role="dialog" aria-modal="false" aria-label="Cookie choices">
      {choosing ? (
        <>
          <h2>Your cookie choices</h2>
          <label className="consent-row"><input type="checkbox" checked disabled /><span><b>Necessary</b>Keep you signed in and remember this choice. Always on.</span></label>
          <label className="consent-row"><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /><span><b>Analytics</b>Show us which pages work, so we can make Orikly better.</span></label>
          <label className="consent-row"><input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /><span><b>Marketing</b>Let Meta, TikTok and Google measure our adverts and show you ones that fit.</span></label>
          <div className="consent-actions">
            <button className="btn hot small" onClick={() => decide({ analytics, marketing })}>Save my choices</button>
            <button className="btn light small" onClick={() => decide({ analytics: false, marketing: false })}>Only necessary</button>
          </div>
        </>
      ) : (
        <>
          <h2>Cookies, briefly</h2>
          <p>We use cookies to keep you signed in. With your OK, we also use them to see what works and to measure our adverts. <Link href="/legal/cookies">Read more</Link></p>
          <div className="consent-actions">
            <button className="btn hot small" onClick={() => decide({ analytics: true, marketing: true })}>Accept all</button>
            <button className="btn light small" onClick={() => decide({ analytics: false, marketing: false })}>Only necessary</button>
            <button className="consent-link" onClick={() => setChoosing(true)}>Choose</button>
          </div>
        </>
      )}
    </div>
  );
}

export function CookieSettingsLink({ className }: { className?: string }) {
  return <button type="button" className={className ?? "linklike"} onClick={openConsent}>Cookie settings</button>;
}
