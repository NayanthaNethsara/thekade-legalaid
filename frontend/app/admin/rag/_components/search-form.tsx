"use client";

import { useActionState, useState } from "react";
import { Search } from "lucide-react";

import { searchAction } from "@/app/actions/rag";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SearchState } from "@/types/action";

const INITIAL: SearchState = { result: null, error: null };
const ALL = "all";

type DocOption = { id: number; source_filename: string };

export function SearchForm({ documents }: { documents: DocOption[] }) {
  const [state, formAction, pending] = useActionState(searchAction, INITIAL);
  const [docId, setDocId] = useState<string>(ALL);

  return (
    <div className="flex flex-col gap-5">
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
        {/* Resolved selection submitted with the form; empty = all documents. */}
        <input
          type="hidden"
          name="document_id"
          value={docId === ALL ? "" : docId}
        />
        <Input
          type="text"
          name="query"
          placeholder="e.g. what is the penalty for driving without a licence?"
          className="flex-1"
        />
        <Select value={docId} onValueChange={setDocId}>
          <SelectTrigger className="sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All documents</SelectItem>
            {documents.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.source_filename}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="lg" disabled={pending}>
          <Search />
          {pending ? "Searching…" : "Search"}
        </Button>
      </form>

      {state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      {state.result ? (
        state.result.hits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No matches. Approve some documents first, or try a different query.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {state.result.hits.map((hit) => (
              <Card key={`${hit.document_id}-${hit.chunk_index}`}>
                <CardContent className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">
                      doc #{hit.document_id} · chunk #{hit.chunk_index}
                      {hit.heading ? ` · ${hit.heading}` : ""}
                    </span>
                    <span className="rounded-none bg-emerald-500/10 px-2 py-0.5 font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                      {(hit.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs whitespace-pre-wrap text-foreground/80">
                    {hit.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}
