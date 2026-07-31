"use client";

import { useRouter } from "next/navigation";
import { FileText, Scale, PenLine, CalendarClock } from "lucide-react";
import { stashFirstMessage } from "@/lib/chat/handoff";
import { newConversationId } from "@/lib/chat/conversation-id";

interface ActionTile {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
}

const ACTION_TILES: ActionTile[] = [
  {
    label: "Case Summary",
    icon: FileText,
    prompt:
      "Summarize my case so far based on our conversation: the key facts, the legal issues involved, and the suggested next steps.",
  },
  {
    label: "Legal Research",
    icon: Scale,
    prompt:
      "Research the legal position on my situation. Explain the relevant laws and my rights in plain language.",
  },
  {
    label: "Document Draft",
    icon: PenLine,
    prompt:
      "Help me draft a formal letter or document for my situation. Ask me for any details you need before drafting.",
  },
  {
    label: "Timeline",
    icon: CalendarClock,
    prompt:
      "Build a timeline of the important events and deadlines in my matter based on what we have discussed so far.",
  },
];

/**
 * Research-generation shortcuts. Inside a conversation the prompt submits into
 * the live stream; on the landing route it starts a new conversation through
 * the same handoff flow the composer uses.
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
          className="border-border bg-background hover:bg-pearl press-scale flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors"
        >
          <tile.icon className="text-primary h-4.5 w-4.5" />
          <span className="text-foreground/85 text-xs font-semibold">
            {tile.label}
          </span>
        </button>
      ))}
    </div>
  );
}
