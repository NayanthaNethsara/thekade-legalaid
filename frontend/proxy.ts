// Gatekeeper for the platform. In Next.js 16 the `middleware` file convention
// is deprecated and renamed to `proxy` (nodejs runtime). This is the single
// edge of trust: it decodes the Auth.js session and enforces access before any
// route renders, so downstream services never validate web auth themselves.
//
//   /admin/*  -> requires a session AND role === 'ADMIN' (else 403 / login)
//   /chat/*   -> requires any logged-in session (else login)

import { NextResponse } from "next/server";

import { auth } from "@/auth";

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  const isAdminRoute = pathname.startsWith("/admin");
  const isChatRoute = pathname.startsWith("/chat");

  if (!session?.user) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/403", request.nextUrl.origin));
  }

  // Authenticated chat users (and authorized admins) pass through untouched.
  void isChatRoute;
  return NextResponse.next();
});

export const config = {
  // Only guarded sections pay the proxy cost; everything else is public.
  matcher: ["/admin/:path*", "/chat/:path*"],
};
