"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const subscribeNoop = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isMounted = React.useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="border-foreground/10 bg-foreground/5 text-foreground/60 hover:text-foreground/90 inline-flex items-center justify-center rounded-lg border p-2 transition-colors"
    >
      {/* Render a fixed icon until mounted so SSR markup matches the client. */}
      {isMounted && resolvedTheme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );
}
