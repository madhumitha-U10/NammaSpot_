import { useCallback, useEffect, useState } from "react";

import { ensureData } from "@/lib/api";

/**
 * Client-side data hook. Sellers/Products/Categories come from the Google
 * Sheets backend (fetched once, cached), merged with the localStorage overlay
 * for local writes — neither is available during SSR, so data resolves after
 * hydration.
 */
export function useStoreData<T>(load: () => T) {
  const [data, setData] = useState<T | null>(null);

  const refresh = useCallback(() => {
    void ensureData().then(() => setData(load()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    void ensureData().then(() => {
      if (alive) setData(load());
    }, () => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, refresh };
}
