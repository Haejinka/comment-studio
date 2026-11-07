import { invoke, isTauri } from "@tauri-apps/api/core";
export const isDesktop = isTauri();
export async function saveNativeFile(
  name: string,
  blob: Blob,
): Promise<boolean> {
  const result = await invoke<{ cancelled: boolean }>("save_file", {
    name,
    bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
  });
  return !result.cancelled;
}
export async function copyImage(blob: Blob) {
  if (isDesktop) {
    await invoke("copy_image", {
      bytes: Array.from(new Uint8Array(await blob.arrayBuffer())),
    });
    return;
  }
  if (!navigator.clipboard?.write || !window.ClipboardItem)
    throw new Error("Image clipboard is unavailable.");
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}
export async function copyText(text: string) {
  if (isDesktop) await invoke("copy_text", { text });
  else await navigator.clipboard.writeText(text);
}

export async function setAppTheme(theme: "light" | "dark") {
  if (isDesktop) await invoke("set_app_theme", { theme });
}
