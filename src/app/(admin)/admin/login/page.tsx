"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@convex/_generated/api";

/** Staff sign-in. Only emails on the admin list are ever sent a code. */
export default function AdminLogin() {
  const { signIn } = useAuthActions();
  const allowed = useMutation(api.admin.mayRequestCode);
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = () => email.trim().toLowerCase();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (await allowed({ email: clean() })) {
        const fd = new FormData();
        fd.set("email", clean());
        await signIn("email-otp", fd);
      }
      setStep("code");
    } catch {
      setError("We could not send the code. Try again.");
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
      fd.set("email", clean());
      fd.set("code", code.trim());
      await signIn("email-otp", fd);
      router.replace("/");
    } catch {
      setError("That code is wrong or has expired.");
      setBusy(false);
    }
  }

  return (
    <main className="admin-login">
      <div className="box">
        <p className="tagline">Orikly staff</p>
        <h1>{step === "email" ? "Admin sign in" : "Enter your code"}</h1>
        {step === "email" ? (
          <form className="stack" onSubmit={sendCode}>
            <label className="field"><span>Work email</span><input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            {error ? <div className="err">{error}</div> : null}
            <button className="btn hot" disabled={busy || !email.includes("@")}>{busy ? "Sending…" : "Send my code"}</button>
          </form>
        ) : (
          <form className="stack" onSubmit={verify}>
            <p style={{ margin: 0, opacity: 0.8 }}>If {clean()} has admin access, a 6-digit code is on its way. It works for 10 minutes.</p>
            <label className="field"><span>6-digit code</span><input type="text" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></label>
            {error ? <div className="err">{error}</div> : null}
            <button className="btn hot" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Sign in"}</button>
            <button type="button" className="consent-link" onClick={() => { setStep("email"); setCode(""); setError(null); }}>Use a different email</button>
          </form>
        )}
      </div>
    </main>
  );
}
