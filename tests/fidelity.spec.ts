import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import fs from "node:fs/promises";

test("zero-padding tail, dark variant, native screenshot fidelity and canvas fallback", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".export-settings summary").click();
  await page.getByLabel("Resolution").selectOption("1");
  await page.getByLabel("Padding").fill("0");
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await page.getByRole("button", { name: "100%", exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  // Place the native reference on whole pixels to avoid subpixel screenshot offsets.
  await page.getByTestId("preview").evaluate((el) =>
    Object.assign((el as HTMLElement).style, {
      position: "fixed",
      left: "0px",
      top: "0px",
      transform: "none",
      zIndex: "1000",
    }),
  );
  const native = PNG.sync.read(
    await page.getByTestId("preview").screenshot({ omitBackground: true }),
  );
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export image" }).click();
  const buffer = await fs.readFile((await (await waiting).path())!);
  const png = PNG.sync.read(buffer);
  expect(png.width).toBe(525);
  expect(Math.abs(png.height - native.height)).toBeLessThanOrEqual(1);
  // Check the tail survives the crop and the clear pixels beside it remain transparent.
  const y = png.height - 4;
  expect(png.data[(y * png.width + 4) * 4 + 3]).toBe(255);
  expect(png.data[(y * png.width + 100) * 4 + 3]).toBe(0);
  // Compare RGB in the opaque card area with the browser's native screenshot.
  let total = 0,
    count = 0;
  for (let y = 15; y < Math.min(png.height, native.height) - 30; y++)
    for (let x = 15; x < png.width - 15; x++)
      for (let k = 0; k < 3; k++) {
        const i = (y * png.width + x) * 4 + k;
        total += Math.abs(png.data[i] - native.data[i]);
        count++;
      }
  await fs.writeFile("samples/native-dark.png", PNG.sync.write(native));
  await fs.writeFile("samples/tiktok-dark-zero-padding.png", buffer);
  // Native screenshots and SVG rasterization use different text antialiasing (6/255 tolerance).
  expect(total / count).toBeLessThan(6);
  await fs.writeFile("samples/tiktok-dark-zero-padding.png", buffer);
  const fallback = await page.evaluate(async () => {
    const { capture } = await import("/src/export.ts");
    const blob = await capture(
      document.querySelector(".capture-host .export-asset") as HTMLElement,
      {
        theme: "dark",
        scale: 1,
        background: "transparent",
        color: "#fff",
        padding: 0,
      },
      "fallback",
    );
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await fs.writeFile("samples/tiktok-fallback.png", Buffer.from(fallback));
  const decoded = PNG.sync.read(Buffer.from(fallback));
  expect(decoded.width).toBe(png.width);
  expect(decoded.data[(y * png.width + 4) * 4 + 3]).toBe(255);
  expect(decoded.data[(y * png.width + 100) * 4 + 3]).toBe(0);
  await fs.writeFile("samples/tiktok-fallback.png", Buffer.from(fallback));
});

test("all formatting operations, collapsed selection, and edits after a marked range", async ({
  page,
}) => {
  await page.goto("/");
  const text = page.getByLabel("Comment text");
  await text.fill("First second third");
  await text.evaluate((el: HTMLTextAreaElement) => {
    el.focus();
    el.setSelectionRange(6, 12);
  });
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await text.fill("First second third and more");
  await expect(page.getByTestId("preview").locator(".highlight")).toHaveText(
    "second",
  );
  for (const [button, css] of [
    ["Bold", "bold"],
    ["Strikethrough", "strike"],
    ["Redact", "redact"],
  ]) {
    await text.evaluate((el: HTMLTextAreaElement) => {
      el.focus();
      el.setSelectionRange(0, 0);
    });
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(
      page.getByTestId("preview").locator(`.${css}`).first(),
    ).toBeVisible();
  }
  await expect(
    page.getByTestId("preview").locator(".comment-body"),
  ).not.toContainText("First");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export image" }).click();
  expect(
    PNG.sync.read(await fs.readFile((await (await pending).path())!)).width,
  ).toBe(1146);
});

test("failed generation reports an error and can be retried without false success", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    (window as any).originalBitmap = window.createImageBitmap;
    window.createImageBitmap = async () => {
      throw new Error("Simulated decoding failure");
    };
  });
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.getByRole("button", { name: "Export image" }).click();
  await expect(page.getByRole("status")).toContainText("Export failed");
  expect(downloads).toBe(0);
  await page.evaluate(() => {
    window.createImageBitmap = (window as any).originalBitmap;
  });
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export image" }).click();
  await pending;
  await expect(page.getByRole("status")).toContainText("PNG generated");
});
