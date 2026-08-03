"use server";

import { apiFetch } from "@/lib/api";
import { workspaceBearer } from "@/lib/workspace/bearer";
import type { NoteItem } from "@/types/workspace";

interface NoteApiResponse {
  id: string;
  conversation_id: string;
  content: string;
  updated_at: string;
}

function toNote(data: NoteApiResponse): NoteItem {
  return {
    id: data.id,
    conversationId: data.conversation_id,
    content: data.content,
    updatedAt: data.updated_at,
  };
}

export async function fetchNotes(conversationId: string): Promise<NoteItem[]> {
  const bearer = await workspaceBearer();
  if (!bearer) return [];

  const query = `?conversation_id=${encodeURIComponent(conversationId)}`;
  const result = await apiFetch<NoteApiResponse[]>(`/notes${query}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${bearer}` },
  });
  return result.ok ? result.data.map(toNote) : [];
}

export async function createNote(
  conversationId: string,
  content: string
): Promise<NoteItem | null> {
  const bearer = await workspaceBearer();
  if (!bearer) return null;

  const result = await apiFetch<NoteApiResponse>("/notes", {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ conversation_id: conversationId, content }),
  });
  return result.ok ? toNote(result.data) : null;
}

export async function updateNote(
  noteId: string,
  content: string
): Promise<NoteItem | null> {
  const bearer = await workspaceBearer();
  if (!bearer) return null;

  const result = await apiFetch<NoteApiResponse>(`/notes/${noteId}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ content }),
  });
  return result.ok ? toNote(result.data) : null;
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const bearer = await workspaceBearer();
  if (!bearer) return false;

  const result = await apiFetch<unknown>(`/notes/${noteId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${bearer}` },
  });
  return result.ok;
}
