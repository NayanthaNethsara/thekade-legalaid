// Secure proxy for web chat. The browser talks only to this Route Handler;
// it authenticates the session here and forwards the payload to the Go
// core-service with the caller's identity stamped into trusted internal
// headers (X-User-ID, X-User-Role). The core-service trusts these because it
// is reachable only from within the network perimeter.

import { NextResponse } from "next/server";

import { auth } from "@/auth";

const CORE_SERVICE_URL =
  process.env.CORE_SERVICE_URL ?? "http://localhost:8002";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.text();

  let res: Response;
  try {
    res = await fetch(`${CORE_SERVICE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-ID": session.user.id,
        "X-User-Role": session.user.role,
      },
      body: payload,
    });
  } catch {
    return NextResponse.json(
      { error: "Chat service unavailable" },
      { status: 502 },
    );
  }

  // Stream the upstream response straight back, preserving status and content
  // type so the client sees exactly what the core-service produced.
  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      "Content-Type":
        res.headers.get("Content-Type") ?? "application/json",
    },
  });
}
