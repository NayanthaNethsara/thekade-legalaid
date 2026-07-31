"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";

import { ProfilePanel } from "./profile-panel";

interface ProfileButtonProps {
  name: string;
}

export function ProfileButton({ name }: ProfileButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-foreground/8 bg-background/25 text-foreground/70 hover:bg-background/40 hover:text-foreground/85 dark:border-foreground/10 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm backdrop-blur-lg transition-colors duration-200"
      >
        <UserRound className="h-4 w-4" />
        <span className="max-w-[10rem] truncate">{name}</span>
      </button>
      <ProfilePanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
