// Web chat proxy: authenticates the session, then forwards to core-service with
// HMAC-signed identity headers so it can reject calls not from this edge.

import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { internalAuthHeaders } from "@/lib/internal-auth";

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
        ...internalAuthHeaders("POST", "/api/chat", {
          userId: session.user.id,
          role: session.user.role,
        }),
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
