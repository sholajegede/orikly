import { query } from "./_generated/server";
import { requireUser } from "./lib/auth";
import { PRICE_KOBO } from "./lib/constants";

/** Bank details for the manual transfer step. Set BANK_* in the Convex environment. */
export const bankDetails = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const bankName = process.env.BANK_NAME;
    const accountNumber = process.env.BANK_ACCOUNT_NUMBER;
    const accountName = process.env.BANK_ACCOUNT_NAME;
    if (!bankName || !accountNumber || !accountName) return null;
    return { bankName, accountNumber, accountName, amountKobo: PRICE_KOBO };
  },
});

// Phase 2 (Opus): Paystack initialize action, webhook handler, and payment verification live here.
