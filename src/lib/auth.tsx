"use client";

import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase, supabaseReady } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";

/**
 * Auth context. When Supabase isn't configured (`supabaseReady === false`) this
 * still renders fine — `user` is always null and the sign-in UI hides itself.
 */

interface AuthValue {
  ready: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  /** Sends a magic link. Resolves when the email is on its way. */
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthValue>({
  ready: false,
  loading: false,
  user: null,
  session: null,
  signInWithEmail: async () => ({ error: "Sign-in isn't configured." }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(supabaseReady);

  React.useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = React.useCallback(async (email: string) => {
    if (!supabase) return { error: "Sign-in isn't configured yet." };
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = React.useCallback(async () => {
    await supabase?.auth.signOut();
    trackEvent({ name: "signed_out" });
  }, []);

  const value = React.useMemo<AuthValue>(
    () => ({
      ready: supabaseReady,
      loading,
      user: session?.user ?? null,
      session,
      signInWithEmail,
      signOut,
    }),
    [loading, session, signInWithEmail, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  return React.useContext(AuthContext);
}
