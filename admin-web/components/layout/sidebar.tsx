"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ADMIN_NAV_ITEMS } from "@/config/navigation";
import { ADMIN_API_ENDPOINTS } from "@/config/api";
import { APP_CONFIG } from "@/config/constants";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch(ADMIN_API_ENDPOINTS.AUTH_LOGOUT, { method: "POST" });
    } catch {
      // Ignore network errors on logout cleanup
    } finally {
      localStorage.removeItem(APP_CONFIG.AUTH_TOKEN_KEY);
      document.cookie = `${APP_CONFIG.AUTH_TOKEN_KEY}=; path=/; max-age=0`;
      router.push("/login");
    }
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col p-6 h-screen sticky top-0">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
          {APP_CONFIG.APP_NAME}
        </span>
      </div>

      <nav className="flex flex-col gap-1.5 flex-1">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-sidebar-border">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
