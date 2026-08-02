"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import { ADMIN_API_ENDPOINTS } from "@/config/api";
import { APP_CONFIG } from "@/config/constants";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(ADMIN_API_ENDPOINTS.AUTH_LOGIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid admin credentials");
      }

      const data = await response.json();
      localStorage.setItem(APP_CONFIG.AUTH_TOKEN_KEY, data.token);
      document.cookie = `${APP_CONFIG.AUTH_TOKEN_KEY}=${data.token}; path=/; max-age=${APP_CONFIG.SESSION_MAX_AGE_SECONDS}`;
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border/60 shadow-xl backdrop-blur-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">{APP_CONFIG.APP_NAME}</CardTitle>
          <CardDescription>
            Sign in to manage RAG pipeline training and document verification
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/15 border border-destructive/30 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Username
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex-col space-y-4">
            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? "Authenticating..." : "Sign In to Admin Portal"}
            </Button>

            <div className="text-center">
              <Badge variant="outline" className="text-[11px] text-muted-foreground font-normal">
                Single-User Mode (.env ADMIN_USERNAME / ADMIN_PASSWORD)
              </Badge>
            </div>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
