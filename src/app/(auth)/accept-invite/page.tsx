"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth-store";

export default function AcceptInvitePage() {
  const router = useRouter();
  const reset = useAuthStore((s) => s.reset);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const tokenHash = params.get("token_hash");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setInviteError(exchangeError.message);
            setChecking(false);
            return;
          }
        } else if (tokenHash) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "invite",
          });
          if (verifyError) {
            setInviteError(verifyError.message);
            setChecking(false);
            return;
          }
        } else {
          const hash = window.location.hash;
          if (hash) {
            const hashParams = new URLSearchParams(hash.replace("#", ""));
            const accessToken = hashParams.get("access_token");
            const refreshToken = hashParams.get("refresh_token");
            const hashError = hashParams.get("error_description");
            if (hashError) {
              setInviteError(hashError.replace(/\+/g, " "));
              setChecking(false);
              return;
            }
            if (accessToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken ?? "",
              });
              if (sessionError) {
                setInviteError(sessionError.message);
                setChecking(false);
                return;
              }
            }
          }
        }

        const { data: { user } } = await supabase.auth.getUser();
        setAuthenticated(!!user);
      } catch (err) {
        setInviteError(err instanceof Error ? err.message : "Failed to process invitation");
      }

      setChecking(false);
      window.history.replaceState({}, "", window.location.pathname);
    }

    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();

    const { data: { user }, error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    if (user) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name ?? user.email!.split("@")[0],
          role: user.user_metadata?.role ?? "worker",
        } as never);
      }
    }

    setSuccess(true);
    await supabase.auth.signOut();
    reset();
    router.push("/login");
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">Invalid Invitation</h1>
          {inviteError && (
            <p className="text-sm text-destructive">{inviteError}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Please use the invitation link sent to your email to set up your
            account. If you already have an account,{" "}
            <a href="/login" className="text-primary underline">
              sign in here
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">Password Set!</h1>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Set Your Password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a password to secure your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Setting password..." : "Set Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
