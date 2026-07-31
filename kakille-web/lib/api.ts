import "server-only";

import { INTERNAL_KEY_HEADER } from "@/lib/guest/constants";

const API_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; detail: string };

/**
 * Server-side fetch wrapper for the backend API. Calls run inside Server
 * Actions, so tokens, the backend URL, and the internal key (which the backend
 * requires on every business route) never reach the browser.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        [INTERNAL_KEY_HEADER]: process.env.INTERNAL_API_KEY ?? "",
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      status: 0,
      detail: "Cannot reach the server. Try again.",
    };
  }

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => body?.detail ?? "Request failed.")
      .catch(() => "Request failed.");
    return { ok: false, status: response.status, detail };
  }

  const data = (await response.json().catch(() => ({}))) as T;
  return { ok: true, data };
}
