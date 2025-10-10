import { ReactNode } from "react";
import { cn } from "./ui/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <div 
      className={cn(
        "backdrop-blur-xl bg-white/60 border border-white/30 rounded-2xl p-4 sm:p-6 shadow-xl",
        "transition-all duration-300",
        hover && "hover:bg-white/70 hover:shadow-2xl hover:-translate-y-1",
        className
      )}
      style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(248, 248, 248, 0.4) 100%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 0 20px rgba(212, 175, 55, 0.05)',
      }}
    >
      {children}
    </div>
  );
}