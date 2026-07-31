import { NextResponse } from "next/server";

import { arcjetDenial } from "@/lib/arcjet";
import { auth } from "@/lib/auth/config";
import {
  GUEST_COOKIE,
  GUEST_MAX_AGE,
  INTERNAL_KEY_HEADER,
} from "@/lib/guest/constants";

const API_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";

/**
 * Guest bootstrap, wrapped by NextAuth so `req.auth` carries the session.
 * There is no separate login route: sign-in happens in a dialog on the main
 * page. A session whose backend refresh fails is destroyed inside the NextAuth
 * jwt callback (never here -- middleware cookie deletion is overridden by the
 * wrapper), so a sessionless visitor with a dead or missing guest cookie
 * simply gets a fresh guest below.
 */
export default auth(async (req) => {
  const denied = await arcjetDenial(req);
  if (denied) return denied;

  const isLoggedIn = Boolean(req.auth);

  // Mint a guest only for real page navigations into the app, so assets and
  // data requests never trigger backend calls. The existing cookie is verified
  // against the backend (not just presence-checked): a stale token -- expired,
  // flushed from Redis, or signed with a rotated secret -- is replaced, so
  // visitors can never get stuck guest-less.
  const isPageRequest =
    req.headers.get("sec-fetch-mode") === "navigate" ||
    req.headers.get("rsc") === "1" ||
    !req.nextUrl.pathname.includes(".");

  if (!isLoggedIn && isPageRequest) {
    const existing = req.cookies.get(GUEST_COOKIE)?.value ?? null;
    if (!(existing && (await isGuestAlive(existing)))) {
      const token = await mintGuestToken();
      if (token) {
        const response = NextResponse.next();
        response.cookies.set(GUEST_COOKIE, token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: GUEST_MAX_AGE,
        });
        return response;
      }
    }
  }

  return NextResponse.next();
});

async function isGuestAlive(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/guest/me`, {
      headers: {
        [INTERNAL_KEY_HEADER]: process.env.INTERNAL_API_KEY ?? "",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    // Backend unreachable: keep the cookie rather than churn replacements.
    return true;
  }
}

async function mintGuestToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/guest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [INTERNAL_KEY_HEADER]: process.env.INTERNAL_API_KEY ?? "",
      },
      body: "{}",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { guest_token?: string };
    return data.guest_token ?? null;
  } catch {
    // Backend unreachable: don't block the page; the next navigation will retry.
    return null;
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
