import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocStatus } from "@/types/rag";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const CONFIG: Record<DocStatus, { variant: BadgeVariant; className?: string }> =
  {
    pending: { variant: "secondary" },
    parsed: {
      variant: "outline",
      className:
        "border-amber-500/40 text-amber-600 dark:text-amber-400",
    },
    indexed: {
      variant: "outline",
      className:
        "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
    },
    error: { variant: "destructive" },
  };

export function StatusBadge({
  status,
  stale,
}: {
  status: DocStatus;
  stale?: boolean;
}) {
  const { variant, className } = CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge variant={variant} className={cn("capitalize", className)}>
        {status}
      </Badge>
      {stale ? (
        <Badge
          variant="outline"
          className="border-orange-500/40 text-orange-600 dark:text-orange-400"
        >
          stale
        </Badge>
      ) : null}
    </span>
  );
}
