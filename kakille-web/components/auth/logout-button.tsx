"use client";

import { LogOut } from "lucide-react";

import { logout } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export function LogoutButton({ collapsed }: { collapsed?: boolean } = {}) {
  return (
    <form action={logout} className={collapsed ? "" : "w-full"}>
      <button
        type="submit"
        className={cn(
          "border-foreground/6 bg-background/15 text-foreground/70 hover:bg-background/30 hover:text-foreground/90 inline-flex items-center rounded-xl border transition-colors duration-200",
          collapsed
            ? "h-9 w-9 shrink-0 justify-center"
            : "w-full gap-2.5 px-3 py-2.5 text-sm font-medium"
        )}
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
        {!collapsed && <span>Sign out</span>}
      </button>
    </form>
  );
}
