import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "@/components/AuthModal";

export type AdminRole = "admin_super" | "admin_moderator" | "admin_finance" | "admin_affiliate";
export type UserKind = "client_individual" | "client_enterprise" | "worker";

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  kind: UserKind;
  domisili: string | null;
  headline: string | null;
  bio: string | null;
  rating: number;
  jobs_completed: number;
  ktp_verified: boolean;
  whatsapp_verified: boolean;
  lat: number | null;
  lng: number | null;
};

type AuthValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AdminRole[];
  loading: boolean;
  isAdmin: boolean;
  hasRole: (role: AdminRole) => boolean;
  /** Runs the action when signed in, otherwise opens the login modal. */
  requireAuth: (action?: () => void, reason?: string) => void;
  openLogin: (reason?: string) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; reason?: string | undefined }>({
    open: false,
  });
  const router = useRouter();
  const queryClient = useQueryClient();

  const loadProfile = useCallback(async (uid: string) => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((p as Profile | null) ?? null);
    setRoles(((r ?? []) as { role: AdminRole }[]).map((row) => row.role));
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) void loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setSession(next);
      if (next?.user) {
        void loadProfile(next.user.id);
        setModal({ open: false });
        void queryClient.invalidateQueries();
      } else {
        setProfile(null);
        setRoles([]);
      }
      void router.invalidate();
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, queryClient, router]);

  const openLogin = useCallback((reason?: string) => setModal({ open: true, reason }), []);

  const requireAuth = useCallback(
    (action?: () => void, reason?: string) => {
      if (session?.user) action?.();
      else setModal({ open: true, reason });
    },
    [session],
  );

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setRoles([]);
    void router.navigate({ to: "/", replace: true });
  }, [queryClient, router]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      roles,
      loading,
      isAdmin: roles.length > 0,
      hasRole: (role: AdminRole) => roles.includes(role) || roles.includes("admin_super"),
      requireAuth,
      openLogin,
      signOut,
      refreshProfile,
    }),
    [session, profile, roles, loading, requireAuth, openLogin, signOut, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthModal
        open={modal.open}
        reason={modal.reason}
        onOpenChange={(open) => setModal({ open })}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
