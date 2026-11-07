import { useEffect, useState } from "react";
import { STORAGE_KEY, type Comment, type Settings } from "./model";
/** Debounced saves during typing, with a synchronous final flush before refresh. */
export function useDraftPersistence(
  comments: Comment[],
  active: string,
  settings: Settings,
  onError: (message: string) => void,
) {
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    setSaved(false);
    const persist = () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ comments, active, settings }),
        );
        setSaved(true);
      } catch {
        onError(
          "Local storage is full or unavailable. Export your work and remove large avatars.",
        );
      }
    };
    const timer = setTimeout(persist, 300);
    window.addEventListener("pagehide", persist);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
    };
  }, [comments, active, settings, onError]);
  return saved;
}
