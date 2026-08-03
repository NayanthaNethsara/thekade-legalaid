"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace, useWorkspaceDeletions } from "./workspace-store";

function isOverdue(dueDate: string, isDone: boolean): boolean {
  if (isDone || !dueDate) return false;
  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(23, 59, 59, 999);
  return due < today;
}

/** Reminders with due dates for the active conversation, stored on the server. */
export function RemindersWidget() {
  const {
    reminders,
    addReminder: saveReminder,
    toggleReminderDone,
  } = useWorkspace();
  const { removeReminder } = useWorkspaceDeletions();
  const scopedReminders = reminders.items;
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const addReminder = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTitle("");
    setDueDate("");
    void saveReminder(trimmed, dueDate);
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addReminder();
            }
          }}
          placeholder="Add a reminder"
          className="border-border bg-background text-foreground/90 placeholder:text-foreground/30 w-full rounded-lg border px-3 py-2 text-xs focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Due date"
            className="border-border bg-background text-foreground/70 min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-xs focus:outline-none"
          />
          <button
            type="button"
            onClick={addReminder}
            disabled={!title.trim()}
            aria-label="Add reminder"
            className="bg-primary text-primary-foreground hover:bg-primary/90 press-scale shrink-0 rounded-full p-2 transition-colors disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {scopedReminders.length === 0 ? (
        <p className="text-foreground/30 py-1.5 text-center text-xs">
          Reminders will appear here
        </p>
      ) : (
        <ul className="space-y-1.5">
          {scopedReminders.map((reminder) => {
            const overdue = isOverdue(reminder.dueDate, reminder.isDone);
            return (
              <li
                key={reminder.id}
                className="group bg-muted flex items-center gap-2 rounded-lg px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() =>
                    void toggleReminderDone(reminder.id, !reminder.isDone)
                  }
                  aria-label={
                    reminder.isDone ? "Mark as not done" : "Mark as done"
                  }
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                    reminder.isDone
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-foreground/25 hover:border-primary"
                  )}
                >
                  {reminder.isDone && <Check className="h-2.5 w-2.5" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-xs",
                      reminder.isDone
                        ? "text-foreground/35 line-through"
                        : "text-foreground/80"
                    )}
                  >
                    {reminder.title}
                  </p>
                  {reminder.dueDate && (
                    <p
                      className={cn(
                        "mt-0.5 text-[10px]",
                        overdue ? "text-destructive" : "text-foreground/40"
                      )}
                    >
                      Due {reminder.dueDate}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void removeReminder(reminder.id)}
                  aria-label="Delete reminder"
                  className="text-foreground/20 hover:text-foreground/55 shrink-0 rounded-md p-1 opacity-100 transition-colors md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
