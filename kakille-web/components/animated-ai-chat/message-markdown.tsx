"use client";

import React from "react";
import { ExternalLink } from "lucide-react";

interface Block {
  type: "paragraph" | "bullet-list" | "ordered-list" | "code-block";
  lines: string[];
  lang?: string;
}

function parseBlocks(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let currentBlock: Block | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (currentBlock && currentBlock.type === "code-block") {
        blocks.push(currentBlock);
        currentBlock = null;
      } else {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        const lang = line.trim().slice(3).trim();
        currentBlock = {
          type: "code-block",
          lines: [],
          lang,
        };
      }
      continue;
    }

    if (currentBlock && currentBlock.type === "code-block") {
      currentBlock.lines.push(line);
      continue;
    }

    const trimmedLine = line.trim();

    if (trimmedLine === "") {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    const bulletMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
    if (bulletMatch) {
      const content = bulletMatch[3];
      if (currentBlock && currentBlock.type === "bullet-list") {
        currentBlock.lines.push(content);
      } else {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: "bullet-list",
          lines: [content],
        };
      }
      continue;
    }

    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      const content = orderedMatch[3];
      if (currentBlock && currentBlock.type === "ordered-list") {
        currentBlock.lines.push(content);
      } else {
        if (currentBlock) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: "ordered-list",
          lines: [content],
        };
      }
      continue;
    }

    if (currentBlock && currentBlock.type === "paragraph") {
      currentBlock.lines.push(line);
    } else {
      if (currentBlock) {
        blocks.push(currentBlock);
      }
      currentBlock = {
        type: "paragraph",
        lines: [line],
      };
    }
  }

  if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}

function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  const tokens = [
    {
      type: "bold",
      regex: /^\*\*([\s\S]+?)\*\*/,
      searchRegex: /\*\*([\s\S]+?)\*\*/,
      render: (match: string[], key: string) => (
        <strong key={key} className="text-foreground font-bold">
          {parseInline(match[1])}
        </strong>
      ),
    },
    {
      type: "italic",
      regex: /^\*([\s\S]+?)\*/,
      searchRegex: /\*([\s\S]+?)\*/,
      render: (match: string[], key: string) => (
        <em key={key} className="text-foreground/90 italic">
          {parseInline(match[1])}
        </em>
      ),
    },
    {
      type: "italic_underscore",
      regex: /^_(.+)_(?=[^_]|$)/,
      searchRegex: /_(.+)_(?=[^_]|$)/,
      render: (match: string[], key: string) => (
        <em key={key} className="text-foreground/90 italic">
          {parseInline(match[1])}
        </em>
      ),
    },
    {
      type: "code",
      regex: /^`([^`]+)`/,
      searchRegex: /`([^`]+)`/,
      render: (match: string[], key: string) => (
        <code
          key={key}
          className="border-foreground/5 bg-foreground/10 text-primary dark:text-primary-soft rounded border px-1.5 py-0.5 font-mono text-xs"
        >
          {match[1]}
        </code>
      ),
    },
    {
      type: "link",
      regex: /^\[([^\]]+)\]\(([^)]+)\)/,
      searchRegex: /\[([^\]]+)\]\(([^)]+)\)/,
      render: (match: string[], key: string) => (
        <a
          key={key}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary dark:text-primary-soft inline-flex items-center gap-0.5 font-semibold underline hover:opacity-80"
        >
          {parseInline(match[1])}
          <ExternalLink className="inline h-3 w-3 opacity-70" />
        </a>
      ),
    },
  ];

  const result: React.ReactNode[] = [];
  let currentText = text;
  let keyIdx = 0;

  while (currentText) {
    let matched = false;

    for (const token of tokens) {
      const match = currentText.match(token.regex);
      if (match) {
        result.push(token.render(match, `inline-${keyIdx++}`));
        currentText = currentText.slice(match[0].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      let nextTokenIdx = currentText.length;
      for (const token of tokens) {
        const index = currentText.search(token.searchRegex);
        if (index !== -1 && index < nextTokenIdx) {
          nextTokenIdx = index;
        }
      }

      const plainText = currentText.slice(0, nextTokenIdx);
      result.push(<span key={`text-${keyIdx++}`}>{plainText}</span>);
      currentText = currentText.slice(nextTokenIdx);
    }
  }

  return result;
}

export function MessageMarkdown({ content }: { content: string }) {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <div className="text-foreground/95 w-full space-y-3.5">
      {blocks.map((block, idx) => {
        const key = `block-${idx}`;
        switch (block.type) {
          case "code-block":
            return (
              <pre
                key={key}
                className="border-foreground/10 bg-foreground/5 text-primary dark:text-primary-soft my-1.5 overflow-x-auto rounded-xl border p-3.5 font-mono text-[11.5px] leading-relaxed"
              >
                <code className="block whitespace-pre">
                  {block.lines.join("\n")}
                </code>
              </pre>
            );
          case "bullet-list":
            return (
              <ul
                key={key}
                className="text-foreground/90 mt-1 mb-2 list-disc space-y-1.5 pl-6 text-sm leading-relaxed"
              >
                {block.lines.map((line, lIdx) => (
                  <li key={`li-${lIdx}`}>{parseInline(line)}</li>
                ))}
              </ul>
            );
          case "ordered-list":
            return (
              <ol
                key={key}
                className="text-foreground/90 mt-1 mb-2 list-decimal space-y-1.5 pl-6 text-sm leading-relaxed"
              >
                {block.lines.map((line, lIdx) => (
                  <li key={`li-${lIdx}`}>{parseInline(line)}</li>
                ))}
              </ol>
            );
          case "paragraph":
          default:
            const joinedText = block.lines.join("\n");
            return (
              <p
                key={key}
                className="text-foreground/90 text-sm leading-relaxed font-normal break-words"
              >
                {parseInline(joinedText)}
              </p>
            );
        }
      })}
    </div>
  );
}
