"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

function ThemeCleanup() {
  React.useEffect(() => {
    return () => {
      const el = document.documentElement;
      el.classList.remove("dark", "light");
      el.style.colorScheme = "";
    };
  }, []);
  return null;
}

export function AdminThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="kakille-admin-theme"
    >
      <ThemeCleanup />
      {children}
    </NextThemesProvider>
  );
}
