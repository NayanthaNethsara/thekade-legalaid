"use client";

import { useEffect, useState } from "react";

/**
 * Track whether a CSS media query currently matches. Starts `false` on the
 * server and first client render to avoid hydration mismatches, then resolves
 * after mount. Use for layout that must branch on viewport in JS (e.g. the
 * sidebar behaving as a drawer below `md`).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}
