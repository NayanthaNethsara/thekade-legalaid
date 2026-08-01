"use client";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { APP_CONFIG } from "@/config/constants";

export function Header() {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/50 backdrop-blur-md sticky top-0 z-40">
      <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
        <span>{APP_CONFIG.PORTAL_NAME}</span>
        <span>&bull;</span>
        <span className="text-foreground font-semibold">Single-User Admin</span>
      </div>

      <div className="flex items-center gap-4">
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-1">
          Active Session
        </Badge>
        <Avatar className="h-8 w-8 border border-border">
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
            AD
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
