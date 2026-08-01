export interface ChatAction {
  kind: "pay" | "track";
  label: string;
  url: string;
}

/**
 * One step the agent took while answering a turn (a search it ran, a tool it
 * called), surfaced as inline chips and in the side results panel.
 */
export interface SearchStep {
  id: string;
  label: string;
  query?: string;
  resultCount?: number;
  status: "running" | "done";
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
  images?: string[];
  steps?: SearchStep[];
}

export type ChatResult =
  | {
      ok: true;
      reply: string;
      actions: ChatAction[];
    }
  | { ok: false; error: string };

export interface ChatApiResponse {
  reply: string;
  actions?: ChatAction[];
}

export interface MessageHistory {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: ChatAction[];
}

export interface ConversationSummary {
  id: string;
  title: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  summary: string;
  messages: MessageHistory[];
}

export interface QuickMessageItem {
  iconName: string;
  label: string;
  message: string;
}
