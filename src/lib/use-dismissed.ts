"use client";

import { useEffect, useState } from "react";

/**
 * Per-session dismiss flag backed by sessionStorage. Starts "dismissed" so
 * nothing renders during SSR / the hydration render, then reads the real value
 * in an effect.
 */
export function useDismissed(key: string): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time client read */
    try {
      setDismissed(sessionStorage.getItem(key) === "1");
    } catch {
      setDismissed(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [key]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return [dismissed, dismiss];
}
