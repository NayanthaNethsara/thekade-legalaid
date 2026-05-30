"use server";

// Server Actions for RAG management — the mutation entry points the client
// components invoke. Each is reachable via a direct POST, so when role-based
// access is added, the admin check belongs HERE (see requireAdmin).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ragApi, RagApiError } from "@/lib/api/rag";
import type { ActionResult, SearchState } from "@/types/action";
import type { ParseNewResult } from "@/types/rag";

const LIST_PATH = "/admin/rag";

function errorMessage(err: unknown): string {
  if (err instanceof RagApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

// Placeholder for upcoming role-based access control. Wire real auth here and
// call it at the top of every action. Server Actions are reachable via direct
// POST requests, so this is the security boundary — not the UI.
async function requireAdmin(): Promise<void> {
  // TODO: const session = await auth(); if (session?.role !== "admin") throw ...
}

/** Register new PDFs in data/ and parse the ones not parsed yet. */
export async function scanAction(): Promise<
  ActionResult & { result?: ParseNewResult }
> {
  await requireAdmin();
  try {
    const result = await ragApi.scan();
    revalidatePath(LIST_PATH);
    return { ok: true, error: null, result };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** (Re)parse a single document's PDF to Markdown. */
export async function parseAction(
  id: number,
  force: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await ragApi.parse(id, force);
    revalidatePath(LIST_PATH);
    revalidatePath(`${LIST_PATH}/${id}`);
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Save human-edited Markdown to disk (does not re-index). */
export async function saveMarkdownAction(
  id: number,
  content: string,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await ragApi.saveMarkdown(id, content);
    revalidatePath(LIST_PATH);
    revalidatePath(`${LIST_PATH}/${id}`);
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Approve current Markdown and (re)build this document's vector index. */
export async function approveAction(id: number): Promise<ActionResult> {
  await requireAdmin();
  try {
    await ragApi.approve(id);
    revalidatePath(LIST_PATH);
    revalidatePath(`${LIST_PATH}/${id}`);
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/**
 * Remove the whole Markdown for a document and clear every RAG chunk derived
 * from it. With `drop`, the tracking row is removed too and we return to the
 * list; otherwise the document resets to `pending` for possible re-parsing.
 */
export async function deleteAction(
  id: number,
  drop: boolean,
): Promise<ActionResult> {
  await requireAdmin();
  try {
    await ragApi.remove(id, drop);
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
  revalidatePath(LIST_PATH);
  if (drop) {
    redirect(LIST_PATH); // throws control-flow; nothing after runs
  }
  revalidatePath(`${LIST_PATH}/${id}`);
  return { ok: true, error: null };
}

/** Upload a new PDF into the data/ folder (form action). */
export async function uploadAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a PDF file to upload" };
  }
  const forward = new FormData();
  forward.append("file", file, file.name);
  try {
    await ragApi.upload(forward);
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
  revalidatePath(LIST_PATH);
  return { ok: true, error: null };
}

/** Semantic search across indexed chunks (form action with useActionState). */
export async function searchAction(
  _prev: SearchState,
  formData: FormData,
): Promise<SearchState> {
  await requireAdmin();
  const query = String(formData.get("query") ?? "").trim();
  if (!query) {
    return { result: null, error: "Enter a search query" };
  }
  const rawDocId = String(formData.get("document_id") ?? "").trim();
  try {
    const result = await ragApi.search({
      query,
      top_k: 8,
      document_id: rawDocId ? Number(rawDocId) : null,
    });
    return { result, error: null };
  } catch (err) {
    return { result: null, error: errorMessage(err) };
  }
}
