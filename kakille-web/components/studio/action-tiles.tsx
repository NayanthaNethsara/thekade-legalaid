"use client";

import { useRouter } from "next/navigation";
import {
  AudioLines,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FileText,
  Layers,
  Network,
  PenLine,
  Scale,
} from "lucide-react";
import { stashFirstMessage } from "@/lib/chat/handoff";
import { newConversationId } from "@/lib/chat/conversation-id";

interface ActionTile {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconTint: string;
  prompt: string;
}

const ACTION_TILES: ActionTile[] = [
  {
    label: "Audio Overview",
    icon: AudioLines,
    iconTint: "text-sky-600 dark:text-sky-400",
    prompt:
      "Create an audio-overview script of my matter: a conversational walkthrough I could listen to, covering the key facts, the legal issues, and what happens next.",
  },
  {
    label: "Case Summary",
    icon: FileText,
    iconTint: "text-primary dark:text-primary-soft",
    prompt:
      "Summarize my case so far based on our conversation: the key facts, the legal issues involved, and the suggested next steps.",
  },
  {
    label: "Legal Research",
    icon: Scale,
    iconTint: "text-emerald-600 dark:text-emerald-400",
    prompt:
      "Research the legal position on my situation. Explain the relevant laws and my rights in plain language.",
  },
  {
    label: "Document Draft",
    icon: PenLine,
    iconTint: "text-amber-600 dark:text-amber-400",
    prompt:
      "Help me draft a formal letter or document for my situation. Ask me for any details you need before drafting.",
  },
  {
    label: "Timeline",
    icon: CalendarClock,
    iconTint: "text-rose-600 dark:text-rose-400",
    prompt:
      "Build a timeline of the important events and deadlines in my matter based on what we have discussed so far.",
  },
  {
    label: "Mind Map",
    icon: Network,
    iconTint: "text-teal-600 dark:text-teal-400",
    prompt:
      "Lay out a mind map of my matter in text form: the central issue, and branches for the parties, facts, legal questions, and options.",
  },
  {
    label: "Report",
    icon: ClipboardList,
    iconTint: "text-indigo-600 dark:text-indigo-400",
    prompt:
      "Write a structured report on my matter: background, current position, applicable law, risks, and recommendations.",
  },
  {
    label: "Flashcards",
    icon: Layers,
    iconTint: "text-orange-600 dark:text-orange-400",
    prompt:
      "Make flashcards from my matter: short question-and-answer pairs covering the key legal terms, rights, and deadlines I should remember.",
  },
];

/**
 * NotebookLM-style generation tiles. Inside a conversation the prompt submits
 * into the live stream; on the landing route it starts a new conversation
 * through the same handoff flow the composer uses.
 */
export function ActionTiles({ activeId }: { activeId: string }) {
  const router = useRouter();

  const runPrompt = (prompt: string) => {
    if (activeId) {
      window.dispatchEvent(
        new CustomEvent("submit-chat-message", { detail: { text: prompt } })
      );
      return;
    }
    const conversationId = newConversationId();
    stashFirstMessage(conversationId, { text: prompt });
    router.push(`/${conversationId}`);
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {ACTION_TILES.map((tile) => (
        <button
          key={tile.label}
          type="button"
          onClick={() => runPrompt(tile.prompt)}
          className="bg-muted hover:bg-accent press-scale flex items-center justify-between gap-1 rounded-xl p-3 text-left transition-colors"
        >
          <span className="flex min-w-0 flex-col items-start gap-1.5">
            <tile.icon className={`h-4.5 w-4.5 ${tile.iconTint}`} />
            <span className="text-foreground/85 w-full truncate text-xs font-semibold">
              {tile.label}
            </span>
          </span>
          <ChevronRight className="text-foreground/25 h-4 w-4 shrink-0" />
        </button>
      ))}
    </div>
  );
}
