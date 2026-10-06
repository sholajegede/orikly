import { Email } from "@convex-dev/auth/providers/Email";
import { Resend as ResendAPI } from "resend";

function sixDigits(): string {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(a[0] % 1_000_000).padStart(6, "0");
}

/**
 * Email login with a 6-digit code, sent through Resend.
 * Set AUTH_RESEND_KEY and AUTH_EMAIL_FROM in the Convex environment.
 * For local testing only: AUTH_DEV_LOG_CODES=true prints the code in the Convex logs instead of sending an email.
 */
export const EmailOTP = Email({
  id: "email-otp",
  maxAge: 60 * 10, // 10 minutes
  async generateVerificationToken() {
    return sixDigits();
  },
  async sendVerificationRequest({ identifier: email, token }) {
    if (process.env.AUTH_DEV_LOG_CODES === "true") {
      console.log(`[dev] login code for ${email}: ${token}`);
      return;
    }
    const key = process.env.AUTH_RESEND_KEY;
    if (!key) throw new Error("AUTH_RESEND_KEY is not set");
    const resend = new ResendAPI(key);
    const { error } = await resend.emails.send({
      from: process.env.AUTH_EMAIL_FROM ?? "Orikly <onboarding@resend.dev>",
      to: [email],
      subject: `Your Orikly code is ${token}`,
      text: `Your Orikly login code is ${token}.\n\nIt works for 10 minutes. If you did not ask for it, you can ignore this email.`,
    });
    if (error) throw new Error(JSON.stringify(error));
  },
});
