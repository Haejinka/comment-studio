import { isDesktop, saveNativeFile } from "./native";
import { toBlob } from "html-to-image";
import html2canvas from "html2canvas";
import type { Comment, Settings } from "./model";
export async function capture(
  node: HTMLElement,
  settings: Settings,
  engine: "auto" | "fallback" = "auto",
): Promise<Blob> {
  await document.fonts.ready;
  await Promise.all(
    Array.from(node.querySelectorAll("img")).map(async (img) => {
      if (!img.complete)
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () =>
            reject(new Error("Avatar could not load. Replace it and retry."));
        });
      await img.decode();
    }),
  );
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r)),
  );
  const rect = node.getBoundingClientRect();
  if (rect.width * rect.height * settings.scale ** 2 > 64000000)
    throw new Error(
      "Image is too large. Reduce resolution or shorten the comment.",
    );
  let blob: Blob | null = null;
  if (engine === "auto")
    try {
      blob = await toBlob(node, {
        pixelRatio: settings.scale,
        cacheBust: false,
        // Keep all bundled font sources: the library's preferred-format filter
        // drops alternate font-face rules and can silently substitute Arial.
        skipAutoScale: true,
      });
    } catch {
      /* Fall back to canvas for browsers without SVG foreignObject support. */
    }
  if (!blob) {
    const canvas = await html2canvas(node, {
      scale: settings.scale,
      backgroundColor: null,
      logging: false,
      useCORS: true,
    });
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // html2canvas does not reliably paint positioned SVG tails. Paint the same path
    // in canvas coordinates rather than delivering an incomplete speech bubble.
    const tail = node.querySelector<SVGSVGElement>(".bubble-tail");
    if (tail) {
      const bounds = tail.getBoundingClientRect();
      ctx.save();
      ctx.translate(
        (bounds.left - rect.left) * settings.scale,
        (bounds.top - rect.top) * settings.scale,
      );
      ctx.scale(
        (settings.scale * bounds.width) / 35,
        (settings.scale * bounds.height) / 30,
      );
      ctx.fillStyle =
        tail.querySelector("path")?.getAttribute("fill") || "#ffffff";
      ctx.fill(new Path2D("M0 0H35L8 27C4 31 0 30 0 24Z"));
      ctx.restore();
    }
    // The canvas fallback ignores CSS filter. Apply the blur to affected text
    // rectangles explicitly, retaining transparency outside their small halos.
    if (node.querySelector(".blur")) {
      const source = document.createElement("canvas");
      source.width = canvas.width;
      source.height = canvas.height;
      source.getContext("2d")!.drawImage(canvas, 0, 0);
      for (const span of node.querySelectorAll<HTMLElement>(".blur"))
        for (const bounds of span.getClientRects()) {
          const halo = 8 * settings.scale;
          const x = Math.max(
              0,
              (bounds.left - rect.left) * settings.scale - halo,
            ),
            y = Math.max(0, (bounds.top - rect.top) * settings.scale - halo);
          const width = Math.min(
              canvas.width - x,
              bounds.width * settings.scale + halo * 2,
            ),
            height = Math.min(
              canvas.height - y,
              bounds.height * settings.scale + halo * 2,
            );
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, width, height);
          ctx.clip();
          ctx.clearRect(x, y, width, height);
          ctx.filter = "blur(" + 4 * settings.scale + "px)";
          ctx.drawImage(source, x, y, width, height, x, y, width, height);
          ctx.restore();
        }
    }
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  }
  if (!blob || blob.size < 100)
    throw new Error(
      "PNG generation failed. Please retry or reduce the export resolution.",
    );
  const bitmap = await createImageBitmap(blob);
  if (!bitmap.width || !bitmap.height)
    throw new Error("Generated image could not be decoded.");
  bitmap.close();
  return blob;
}
export async function download(blob: Blob, name: string): Promise<boolean> {
  if (isDesktop) return saveNativeFile(name, blob);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return true;
}
export function filename(c: Comment) {
  const d = new Date();
  const date = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
  return `${c.platform}-${c.template.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-${date}.png`;
}
