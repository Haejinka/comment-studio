import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import JSZip from "jszip";
import { ExportAsset } from "./renderers";
import { capture, download, filename } from "./export";
import type { Comment, Settings } from "./model";
export async function exportBatch(
  list: Comment[],
  settings: Settings,
  setStatus: (message: string) => void,
) {
  const host = document.createElement("div");
  host.className = "capture-host";
  document.body.append(host);
  const root = createRoot(host);
  const zip = new JSZip();
  const manifest: { file: string; comment: Comment }[] = [];
  const errors: string[] = [];
  try {
    for (let i = 0; i < list.length; i++) {
      setStatus(`Exporting ${i + 1} of ${list.length}…`);
      await new Promise((r) => setTimeout(r, 20));
      const item = list[i];
      try {
        flushSync(() =>
          root.render(<ExportAsset comment={item} settings={settings} />),
        );
        const blob = await capture(
          host.firstElementChild as HTMLElement,
          settings,
        );
        const name = `${String(i + 1).padStart(3, "0")}-${filename(item)}`;
        zip.file(name, blob);
        manifest.push({ file: name, comment: item });
      } catch (e) {
        errors.push(`${item.username}: ${(e as Error).message}`);
      }
    }
    if (!manifest.length) throw new Error(errors.join("; "));
    zip.file(
      "manifest.json",
      JSON.stringify({ settings, comments: manifest, errors }, null, 2),
    );
    const saved = await download(
      await zip.generateAsync({ type: "blob" }),
      "comment-studio.zip",
    );
    if (!saved) return "Save cancelled. No ZIP was written.";
    return `${manifest.length} PNGs exported in ZIP.${errors.length ? ` ${errors.length} failed; see manifest.` : ""}`;
  } finally {
    root.unmount();
    host.remove();
  }
}
