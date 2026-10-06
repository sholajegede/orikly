/** Who runs Orikly, for the legal pages. Set these in .env.local before launch. */
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? "Orikly",
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "hello@orikly.ng",
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS ?? "Lagos, Nigeria",
  updated: "6 October 2026",
};
