"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTrack } from "@/lib/track";

function LoginForm() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const params = useSearchParams();
  const track = useTrack();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("email", email.trim().toLowerCase());
      await signIn("email-otp", fd);
      track("login_code_sent");
      setStep("code");
    } catch {
      setError("We could not send the code. Check the email address and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("email", email.trim().toLowerCase());
      fd.set("code", code.trim());
      await signIn("email-otp", fd);
      try {
        window.sessionStorage.setItem("orikly_just_logged_in", "1");
      } catch {
        /* ignore */
      }
      const next = params.get("next");
      router.replace(next && next.startsWith("/") ? next : "/app");
    } catch {
      setError("That code is wrong or has expired. Check it or ask for a new one.");
      setBusy(false);
    }
  }

  return (
    <main className="wrap narrow" style={{ padding: "48px 16px" }}>
      <Link href="/" className="logo">Orikly<i>.</i></Link>
      <div className="card stack" style={{ marginTop: 28 }}>
        <h1 className="display" style={{ fontSize: 40 }}>{step === "email" ? "Sign in" : "Enter your code"}</h1>
        {step === "email" ? (
          <form className="stack" onSubmit={sendCode}>
            <p className="muted" style={{ margin: 0 }}>Enter your email. We send you a 6-digit code. No password needed.</p>
            <label className="field">
              <span>Email</span>
              <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            {error ? <div className="err">{error}</div> : null}
            <button className="btn" disabled={busy || !email.includes("@")}>{busy ? "Sending…" : "Send my code"}</button>
          </form>
        ) : (
          <form className="stack" onSubmit={verify}>
            <p className="muted" style={{ margin: 0 }}>We sent a code to <b>{email}</b>. It works for 10 minutes. Check your spam folder if you do not see it.</p>
            <label className="field">
              <span>6-digit code</span>
              <input type="text" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
            </label>
            {error ? <div className="err">{error}</div> : null}
            <button className="btn" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Continue"}</button>
            <button type="button" className="btn ghost" onClick={() => { setStep("email"); setCode(""); setError(null); }}>Use a different email</button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
