export type Consent = { v: 1; analytics: boolean; marketing: boolean; at: number };

const KEY = "orikly_consent";
const MAX_AGE_DAYS = 180;

/** The saved choice, or null when the visitor has not chosen yet or the choice is older than six months. */
export function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(KEY) ?? decodeURIComponent(document.cookie.split("; ").find((c) => c.startsWith(`${KEY}=`))?.split("=")[1] ?? "");
    if (!raw) return null;
    const c = JSON.parse(raw) as Consent;
    if (c.v !== 1 || Date.now() - c.at > MAX_AGE_DAYS * 86_400_000) return null;
    return c;
  } catch {
    return null;
  }
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }): Consent {
  const c: Consent = { v: 1, analytics: choice.analytics, marketing: choice.marketing, at: Date.now() };
  const raw = JSON.stringify(c);
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    /* private mode: the cookie below still holds it */
  }
  document.cookie = `${KEY}=${encodeURIComponent(raw)}; path=/; max-age=${MAX_AGE_DAYS * 86_400}; SameSite=Lax`;
  window.dispatchEvent(new CustomEvent("orikly:consent", { detail: c }));
  return c;
}

/** Reopen the cookie choices, for the "Cookie settings" link. */
export function openConsent() {
  window.dispatchEvent(new Event("orikly:consent-open"));
}
