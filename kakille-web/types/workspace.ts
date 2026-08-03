export type SourceKind = "file" | "website" | "youtube" | "text";

export interface SourceItem {
  id: string;
  conversationId: string;
  kind: SourceKind;
  name: string;
  size: number;
  type: string;
  url?: string;
  isSelected: boolean;
  addedAt: string;
}

export interface NoteItem {
  id: string;
  conversationId: string;
  content: string;
  updatedAt: string;
}

export interface ReminderItem {
  id: string;
  conversationId: string;
  title: string;
  dueDate: string;
  isDone: boolean;
}
