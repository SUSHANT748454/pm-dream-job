"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";

import { supabase } from "@/lib/supabase/client";
import { readNextPath } from "@/lib/next-path";
import { trackEvent } from "@/lib/analytics";

export function CallbackClient() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-shot auth-callback handling */
    if (!supabase) {
      router.replace("/");
      return;
    }

    let done = false;
    const target = readNextPath("/app");
    const finish = () => {
      if (done) return;
      done = true;
      trackEvent({ name: "signed_in", props: {} });
      router.replace(target);
    };

    const params = new URLSearchParams(window.location.search);
    const errDesc = params.get("error_description") ?? params.get("error");
    if (errDesc) {
      setError(errDesc.replace(/\+/g, " "));
      return;
    }

    // supabase-js auto-exchanges the ?code= in the URL; wait for the session.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) finish();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });

    const timeout = setTimeout(() => {
      if (!done) setError("That sign-in link didn't work. Request a new one.");
    }, 8000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router]);

  return (
    <div className="grid min-h-[70vh] place-items-center px-6 text-center">
      {error ? (
        <div className="max-w-sm">
          <AlertTriangle className="mx-auto h-6 w-6 text-amber-400" />
          <p className="mt-3 text-sm text-text-muted">{error}</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-gold-soft hover:text-gold"
          >
            Back to home
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
          <p className="text-sm text-text-muted">Signing you in…</p>
        </div>
      )}
    </div>
  );
}
