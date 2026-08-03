"use server";

import { apiFetch } from "@/lib/api";
import { workspaceBearer } from "@/lib/workspace/bearer";
import type { SourceItem, SourceKind } from "@/types/workspace";

interface SourceApiResponse {
  id: string;
  conversation_id: string;
  kind: SourceKind;
  name: string;
  size: number;
  content_type: string;
  url: string | null;
  is_selected: boolean;
  added_at: string;
}

function toSource(data: SourceApiResponse): SourceItem {
  return {
    id: data.id,
    conversationId: data.conversation_id,
    kind: data.kind,
    name: data.name,
    size: data.size,
    type: data.content_type,
    url: data.url ?? undefined,
    isSelected: data.is_selected,
    addedAt: data.added_at,
  };
}

export async function fetchSources(conversationId: string): Promise<SourceItem[]> {
  const bearer = await workspaceBearer();
  if (!bearer) return [];

  const query = `?conversation_id=${encodeURIComponent(conversationId)}`;
  const result = await apiFetch<SourceApiResponse[]>(`/sources${query}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${bearer}` },
  });
  return result.ok ? result.data.map(toSource) : [];
}

export async function createLinkSource(
  conversationId: string,
  url: string
): Promise<{ ok: true; source: SourceItem } | { ok: false; error: string }> {
  const bearer = await workspaceBearer();
  if (!bearer) return { ok: false, error: "Your session expired. Please reload." };

  const result = await apiFetch<SourceApiResponse>("/sources/link", {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ conversation_id: conversationId, url }),
  });
  return result.ok
    ? { ok: true, source: toSource(result.data) }
    : { ok: false, error: result.detail };
}

export async function createTextSource(
  conversationId: string,
  content: string
): Promise<{ ok: true; source: SourceItem } | { ok: false; error: string }> {
  const bearer = await workspaceBearer();
  if (!bearer) return { ok: false, error: "Your session expired. Please reload." };

  const result = await apiFetch<SourceApiResponse>("/sources/text", {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ conversation_id: conversationId, content }),
  });
  return result.ok
    ? { ok: true, source: toSource(result.data) }
    : { ok: false, error: result.detail };
}

export async function setSourceSelected(
  sourceId: string,
  isSelected: boolean
): Promise<boolean> {
  const bearer = await workspaceBearer();
  if (!bearer) return false;

  const result = await apiFetch<SourceApiResponse>(`/sources/${sourceId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ is_selected: isSelected }),
  });
  return result.ok;
}

export async function setAllSourcesSelected(
  conversationId: string,
  isSelected: boolean
): Promise<SourceItem[]> {
  const bearer = await workspaceBearer();
  if (!bearer) return [];

  const result = await apiFetch<SourceApiResponse[]>("/sources/select-all", {
    method: "PATCH",
    headers: { Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({
      conversation_id: conversationId,
      is_selected: isSelected,
    }),
  });
  return result.ok ? result.data.map(toSource) : [];
}

export async function deleteSource(sourceId: string): Promise<boolean> {
  const bearer = await workspaceBearer();
  if (!bearer) return false;

  const result = await apiFetch<unknown>(`/sources/${sourceId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${bearer}` },
  });
  return result.ok;
}
