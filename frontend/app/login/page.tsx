"use client";

// Two-step passwordless login UI.
//   Step 1: submit phone -> POST /api/otp/send (Go core-service dispatches OTP)
//   Step 2: submit OTP    -> signIn("whatsapp-otp") verifies and mints session

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

type Step = "phone" | "otp";

export default function LoginPage() {
  // useSearchParams requires a Suspense boundary or the whole route deopts to
  // client-side rendering at build time.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function requestOtp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setPending(false);
    if (!res.ok) {
      setError("Could not send the verification code. Check the number.");
      return;
    }
    setStep("otp");
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const res = await signIn("whatsapp-otp", {
      phone,
      otp,
      redirect: false,
      callbackUrl,
    });
    setPending(false);
    if (!res || res.error) {
      setError("Invalid or expired code.");
      return;
    }
    window.location.href = res.url ?? callbackUrl;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <form
        onSubmit={step === "phone" ? requestOtp : verifyOtp}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-xl font-semibold">Sign in with WhatsApp</h1>

        {step === "phone" ? (
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="+94771234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="rounded border px-3 py-2"
          />
        ) : (
          <input
            name="otp"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            className="rounded border px-3 py-2 tracking-widest"
          />
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-foreground px-3 py-2 text-background disabled:opacity-50"
        >
          {step === "phone"
            ? pending
              ? "Sending…"
              : "Send code"
            : pending
              ? "Verifying…"
              : "Verify & sign in"}
        </button>
      </form>
    </main>
  );
}
