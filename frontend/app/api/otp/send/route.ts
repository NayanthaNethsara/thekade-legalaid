// Step 1 of passwordless login: the browser submits a phone number here, and
// this Route Handler asks the Go core-service to generate a 6-digit OTP and
// dispatch it over WhatsApp. The frontend never generates or stores the code
// itself — verification happens later in the CredentialsProvider.

import { NextResponse } from "next/server";

const CORE_SERVICE_URL =
  process.env.CORE_SERVICE_URL ?? "http://localhost:8002";

// Accepts E.164-ish phone numbers: optional leading +, then 8-15 digits.
const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

export async function POST(request: Request) {
  let phone: string;
  try {
    ({ phone } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  phone = String(phone ?? "").trim();
  if (!PHONE_PATTERN.test(phone)) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${CORE_SERVICE_URL}/api/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
  } catch {
    return NextResponse.json(
      { error: "OTP service unavailable" },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 502 },
    );
  }

  // Never echo the code back to the browser; success is all the client needs.
  return NextResponse.json({ ok: true });
}
