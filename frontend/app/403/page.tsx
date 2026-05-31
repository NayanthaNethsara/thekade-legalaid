// Shown when an authenticated non-admin hits an /admin route. The proxy
// rewrites here with a 403 status, so the URL stays on the attempted path.

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-2xl font-semibold">403 — Forbidden</h1>
      <p className="text-muted-foreground">
        Your account does not have access to this area.
      </p>
    </main>
  );
}
