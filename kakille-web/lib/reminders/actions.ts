"use server";

import { apiFetch } from "@/lib/api";
import { workspaceBearer } from "@/lib/workspace/bearer";
import type { ReminderItem } from "@/types/workspace";

interface ReminderApiResponse {
  id: string;
  conversation_id: string;
  title: string;
  due_date: string | null;
  is_done: boolean;
}

function toReminder(data: ReminderApiResponse): ReminderItem {
  return {
    id: data.id,
    conversationId: data.conversation_id,
    title: data.title,
    dueDate: data.due_date ?? "",
    isDone: data.is_done,
  };
}

export async function fetchReminders(
  conversationId: string
): Promise<ReminderItem[]> {
  const bearer = await workspaceBearer();
  if (!bearer) return [];

  const query = `?conversation_id=${encodeURIComponent(conversationId)}`;
  const result = await apiFetch<ReminderApiResponse[]>(`/reminders${query}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${bearer}` },
  });
  return result.ok ? result.data.map(toReminder) : [];
}

export async function createReminder(
  conversationId: string,
  title: string,
  dueDate: string
): Promise<ReminderItem | null> {
  const bearer = await workspaceBearer();
  if (!bearer) return null;

  const result = await apiFetch<ReminderApiResponse>("/reminders", {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({
      conversation_id: conversationId,
      title,
      due_date: dueDate || null,
    }),
  });
  return result.ok ? toReminder(result.data) : null;
}

export async function updateReminder(
  reminderId: string,
  patch: { title?: string; dueDate?: string; isDone?: boolean }
): Promise<ReminderItem | null> {
  const bearer = await workspaceBearer();
  if (!bearer) return null;

  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.dueDate !== undefined) body.due_date = patch.dueDate || null;
  if (patch.isDone !== undefined) body.is_done = patch.isDone;

  const result = await apiFetch<ReminderApiResponse>(
    `/reminders/${reminderId}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${bearer}` },
      body: JSON.stringify(body),
    }
  );
  return result.ok ? toReminder(result.data) : null;
}

export async function deleteReminder(reminderId: string): Promise<boolean> {
  const bearer = await workspaceBearer();
  if (!bearer) return false;

  const result = await apiFetch<unknown>(`/reminders/${reminderId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${bearer}` },
  });
  return result.ok;
}
