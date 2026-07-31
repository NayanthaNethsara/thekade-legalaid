import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/next";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Arcjet edge protection: the outer layer in front of the app.
 *
 * The authoritative rate limits live in the FastAPI backend (per phone/principal,
 * Redis-backed), since the backend can be reached directly without this frontend.
 * Arcjet adds bot detection, common-attack shielding, and a coarse per-IP throttle
 * as a first line of defense for browser traffic. Active only when ARCJET_KEY is
 * set, so local dev and CI run without an account. Set ARCJET_ENV=development
 * locally so private/localhost IPs are not treated as spoofed.
 */
const aj = process.env.ARCJET_KEY
  ? arcjet({
      key: process.env.ARCJET_KEY,
      rules: [
        shield({ mode: "LIVE" }),
        detectBot({ mode: "LIVE", allow: ["CATEGORY:SEARCH_ENGINE"] }),
        tokenBucket({
          mode: "LIVE",
          refillRate: 20,
          interval: 10,
          capacity: 40,
        }),
      ],
    })
  : null;

// No dedicated auth routes remain (sign-in is a dialog posting a server action
// to the current page), so no paths get Arcjet's extra throttle; the backend's
// Redis rate limits stay the authoritative protection.
const PROTECTED_ROUTES: string[] = [];

/**
 * Returns a denial response when Arcjet blocks the request, or null to let it
 * continue. Null is also returned when Arcjet is disabled or the path is not a
 * protected route.
 */
export async function arcjetDenial(
  req: NextRequest
): Promise<NextResponse | null> {
  if (!aj) return null;
  if (
    !PROTECTED_ROUTES.some((route) => req.nextUrl.pathname.startsWith(route))
  ) {
    return null;
  }

  const decision = await aj.protect(req, { requested: 1 });
  if (!decision.isDenied()) return null;

  if (decision.reason.isRateLimit()) {
    return NextResponse.json(
      { detail: "Too many requests. Please slow down and try again later." },
      { status: 429 }
    );
  }
  return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
}
