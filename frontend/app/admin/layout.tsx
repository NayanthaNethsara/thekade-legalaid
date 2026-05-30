import Link from "next/link";
import { FileText, Search } from "lucide-react";

// Admin shell. Role-based access will gate this segment later; for now it is
// open. The nav is intentionally minimal and shared across admin tools.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/admin/rag" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">
              kakille<span className="text-emerald-600 dark:text-emerald-400">AI</span>
            </span>
            <span className="rounded-none bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Admin
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/admin/rag"
              className="flex items-center gap-1.5 rounded-none px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <FileText className="size-4" />
              Documents
            </Link>
            <Link
              href="/admin/rag/search"
              className="flex items-center gap-1.5 rounded-none px-3 py-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Search className="size-4" />
              Search
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
