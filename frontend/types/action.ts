// Shared shapes for Server Action results consumed by client components
// (useActionState / useTransition).

import type { SearchResult } from "./rag";

/** Generic result returned by mutation actions. */
export type ActionResult = {
  ok: boolean;
  error: string | null;
};

/** State for the search form action (useActionState). */
export type SearchState = {
  result: SearchResult | null;
  error: string | null;
};
