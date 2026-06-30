"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-metaforge-navy px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white ring-1 ring-metaforge-navy/10">
            <span className="text-[10px] font-bold tracking-tight text-metaforge-navy">MEHTA</span>
          </div>
          <div>
            <p className="text-base font-bold leading-tight text-metaforge-navy">METAFORGE</p>
            <p className="text-[11px] font-medium uppercase tracking-wider text-metaforge-amber">
              Raw Material Inventory
            </p>
          </div>
        </div>

        <h1 className="mb-1 text-lg font-semibold text-metaforge-navy">Sign in</h1>
        <p className="mb-6 text-sm text-muted-foreground">Khatwad plant · internal access only</p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-metaforge-navy">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              placeholder="you@metaforge.in"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-metaforge-navy">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <Button className="w-full" onClick={handleSignIn} disabled={loading || !email || !password}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      </div>
    </div>
  );
}
