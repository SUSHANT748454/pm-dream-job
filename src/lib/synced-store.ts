"use client";

import * as React from "react";

import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Shared "localStorage first, Supabase when signed in" store.
 *
 * - localStorage is always written synchronously — the app works offline and
 *   logged out exactly as before.
 * - When a user is signed in, remote rows are pulled on mount / sign-in and
 *   pushed on every save (fire-and-forget; local stays the source of truth if
 *   the network fails).
 * - First sign-in with local data but no remote row migrates the local data up.
 *
 * Every field of the config must be a STABLE reference (module-level functions /
 * consts) — the hook depends on them directly.
 */

export interface RemoteAdapter<T> {
  fetch: (userId: string) => Promise<T | null>;
  push: (userId: string, value: T) => Promise<void>;
  remove: (userId: string) => Promise<void>;
}

export interface SyncedStoreConfig<T> {
  /**
   * The value before hydration — must be identical on the server and on the
   * first client render, so it CANNOT read localStorage. (`readLocal` does, and
   * only runs in the mount effect.)
   */
  empty: T;
  readLocal: () => T;
  writeLocal: (value: T) => void;
  clearLocal: () => void;
  /** Custom-event name dispatched by writeLocal, so sibling hooks re-read. */
  event: string;
  isEmpty: (value: T) => boolean;
  remote: RemoteAdapter<T>;
  /** Reconcile local + remote on sign-in. Default: remote wins. */
  merge?: (local: T, remote: T) => T;
}

export interface SyncedStore<T> {
  value: T;
  hydrated: boolean;
  syncing: boolean;
  save: (value: T) => void;
  clear: () => void;
}

export function useSyncedStore<T>(cfg: SyncedStoreConfig<T>): SyncedStore<T> {
  const { empty, readLocal, writeLocal, clearLocal, event, isEmpty, remote, merge } =
    cfg;
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [value, setValue] = React.useState<T>(empty);
  const [hydrated, setHydrated] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);

  // 1. Hydrate from localStorage after mount + listen for local changes.
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- deliberate client hydration */
    const resync = () => setValue(readLocal());
    resync();
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    window.addEventListener(event, resync);
    window.addEventListener("storage", resync);
    return () => {
      window.removeEventListener(event, resync);
      window.removeEventListener("storage", resync);
    };
  }, [readLocal, event]);

  // 2. On sign-in (or user switch), reconcile with the remote row.
  React.useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- sync status flag */
    setSyncing(true);

    (async () => {
      try {
        const fetched = await remote.fetch(userId);
        if (!active) return;
        const local = readLocal();

        if (fetched && !isEmpty(fetched)) {
          const next = merge ? merge(local, fetched) : fetched;
          writeLocal(next);
          setValue(next);
          if (merge && JSON.stringify(next) !== JSON.stringify(fetched)) {
            await remote.push(userId, next);
          }
        } else if (!isEmpty(local)) {
          await remote.push(userId, local); // migrate local → remote
        }
      } catch {
        /* offline / RLS / transient — local stays authoritative */
      } finally {
        if (active) setSyncing(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, readLocal, writeLocal, isEmpty, merge, remote]);

  const save = React.useCallback(
    (next: T) => {
      writeLocal(next);
      setValue(next);
      if (supabase && userId) {
        void remote.push(userId, next).catch(() => {});
      }
    },
    [userId, writeLocal, remote],
  );

  const clear = React.useCallback(() => {
    clearLocal();
    setValue(readLocal());
    if (supabase && userId) {
      void remote.remove(userId).catch(() => {});
    }
  }, [userId, clearLocal, readLocal, remote]);

  return { value, hydrated, syncing, save, clear };
}
