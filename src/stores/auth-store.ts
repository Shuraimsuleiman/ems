import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { Profile, Role } from "@/types/database";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: Role | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (isLoading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  role: null,
  setUser: (user) =>
    set({ user, isAuthenticated: !!user }),
  setProfile: (profile) =>
    set({ profile, role: profile?.role ?? null }),
  setLoading: (isLoading) =>
    set({ isLoading }),
  reset: () =>
    set({
      user: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
      role: null,
    }),
}));
