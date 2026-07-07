"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";

async function ensureProfile(supabase: ReturnType<typeof createClient>, userId: string, email: string, userMetadata?: { full_name?: string; role?: string }) {
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (existingProfile) return existingProfile;

  const { data: newProfile } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email,
      full_name: userMetadata?.full_name ?? email.split("@")[0],
      role: userMetadata?.role ?? "worker",
    } as never)
    .select()
    .single();

  return newProfile;
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore();
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const profile = await ensureProfile(supabase, user.id, user.email!, user.user_metadata as { full_name?: string; role?: string } | undefined);
        if (profile) setProfile(profile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          const profile = await ensureProfile(supabase, session.user.id, session.user.email!, session.user.user_metadata as { full_name?: string; role?: string } | undefined);
          if (profile) setProfile(profile);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthInitializer>{children}</AuthInitializer>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
