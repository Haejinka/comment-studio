import { test, expect, type Page } from "@playwright/test";
import { PNG } from "pngjs";
import JSZip from "jszip";
import fs from "node:fs/promises";
const preview = (page: Page) => page.getByTestId("preview");
async function pngDownload(page: Page) {
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export image" }).click();
  const dl = await waiting;
  const path = await dl.path();
  expect(path).toBeTruthy();
  const buffer = await fs.readFile(path!);
  return { png: PNG.sync.read(buffer), buffer, dl };
}
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("live fields, verified badge, persistence, themes and templates", async ({
  page,
}) => {
  await page
    .getByRole("textbox", { name: "Username", exact: true })
    .fill("test.creator");
  await page
    .getByRole("textbox", { name: "Comment text" })
    .fill("A custom comment ✨\nAnother line");
  await expect(preview(page)).toContainText("test.creator");
  await expect(preview(page)).toContainText("Another line");
  await page.getByRole("switch", { name: "Verified badge" }).click();
  await expect(preview(page).locator(".badge")).toBeVisible();
  for (const [platform, css, template] of [
    ["Instagram", "instagram", "Reels Comment"],
    ["YouTube", "youtube", "Shorts Comment"],
    ["X / Twitter", "twitter", "Post Comment"],
    ["TikTok", "tiktok-reply", "Video Comment"],
  ]) {
    await page.getByRole("button", { name: platform, exact: true }).click();
    await expect(preview(page).locator(`.${css}`)).toBeVisible();
    await page.getByLabel("Comment template").selectOption(template);
    await expect(preview(page)).toContainText("A custom comment");
    await expect(preview(page)).toContainText("test.creator");
  }
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await expect(preview(page).locator("article")).toHaveClass(/dark/);
  await page.waitForTimeout(500);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Username", exact: true }),
  ).toHaveValue("test.creator");
  await expect(preview(page).locator("article")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Light theme", exact: true }).click();
  await expect(preview(page).locator("article")).toHaveClass(/light/);
});
test("transparent PNG, exact resolution, solid background and visible content", async ({
  page,
}) => {
  await page.locator(".export-settings summary").click();
  await page.getByLabel("Resolution").selectOption("1");
  const one = await pngDownload(page);
  expect(one.png.width).toBe(573);
  expect(one.png.height).toBeGreaterThan(140);
  expect(one.png.data[3]).toBe(0);
  let opaque = 0,
    dark = 0;
  for (let i = 0; i < one.png.data.length; i += 4) {
    if (one.png.data[i + 3] === 255) opaque++;
    if (one.png.data[i] < 90 && one.png.data[i + 3] === 255) dark++;
  }
  expect(opaque).toBeGreaterThan(40000);
  expect(dark).toBeGreaterThan(1500);
  await fs.writeFile("samples/tiktok-reply-transparent-1x.png", one.buffer);
  for (const scale of [2, 3, 4]) {
    await page.getByLabel("Resolution").selectOption(String(scale));
    const next = await pngDownload(page);
    expect(next.png.width).toBe(one.png.width * scale);
    expect(next.png.height).toBe(one.png.height * scale);
    if (scale === 2)
      await fs.writeFile(
        "samples/tiktok-reply-transparent-2x.png",
        next.buffer,
      );
  }
  await page.getByLabel("Resolution").selectOption("1");
  await page.getByLabel("Background", { exact: true }).selectOption("solid");
  const solid = await pngDownload(page);
  expect(solid.png.data[3]).toBe(255);
});
test("uploaded avatar appears as colored pixels in export and can be removed", async ({
  page,
}) => {
  const avatar = new PNG({ width: 64, height: 64 });
  for (let i = 0; i < avatar.data.length; i += 4) {
    avatar.data[i] = 240;
    avatar.data[i + 1] = 20;
    avatar.data[i + 2] = 40;
    avatar.data[i + 3] = 255;
  }
  await page.getByLabel("Upload avatar").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: PNG.sync.write(avatar),
  });
  await expect(preview(page).locator(".avatar img")).toBeVisible();
  const { png, buffer } = await pngDownload(page);
  let red = 0;
  for (let i = 0; i < png.data.length; i += 4)
    if (png.data[i] > 220 && png.data[i + 1] < 40 && png.data[i + 2] < 60)
      red++;
  expect(red).toBeGreaterThan(1000);
  await fs.writeFile("samples/tiktok-avatar.png", buffer);
  await page.getByTitle("Remove avatar").click();
  await expect(preview(page).locator(".avatar img")).toHaveCount(0);
});
test("long multiline emoji text expands asset with no layout overflow and exports", async ({
  page,
}) => {
  const text =
    "A long comment with emoji 👀 ✨ 🎬 and a new line.\n".repeat(12) +
    "END OF COMMENT";
  await page.getByLabel("Comment text").fill(text);
  await expect(preview(page)).toContainText("END OF COMMENT");
  const body = preview(page).locator(".comment-body");
  expect(
    await body.evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBeTruthy();
  const card = preview(page).locator("article");
  expect(
    await card.evaluate((el) => {
      const body = el.querySelector(".comment-body")!;
      return (
        body.getBoundingClientRect().bottom <= el.getBoundingClientRect().bottom
      );
    }),
  ).toBeTruthy();
  const { png, buffer } = await pngDownload(page);
  expect(png.height).toBeGreaterThan(1000);
  await fs.writeFile("samples/long-multiline.png", buffer);
});
test("selected rich text formatting, reset, undo and redo preserve exported appearance", async ({
  page,
}) => {
  await page.getByLabel("Comment text").fill("First second third");
  await page.getByLabel("Comment text").evaluate((el: HTMLTextAreaElement) => {
    el.focus();
    el.setSelectionRange(6, 12);
  });
  await page.getByRole("button", { name: "Highlight", exact: true }).click();
  await expect(preview(page).locator(".highlight")).toHaveText("second");
  const { png } = await pngDownload(page);
  let yellow = 0;
  for (let i = 0; i < png.data.length; i += 4)
    if (
      png.data[i] > 240 &&
      png.data[i + 1] > 190 &&
      png.data[i + 1] < 245 &&
      png.data[i + 2] < 150
    )
      yellow++;
  expect(yellow).toBeGreaterThan(100);
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(preview(page).locator(".highlight")).toHaveCount(0);
  await page.getByTitle("Redo", { exact: true }).click();
  await expect(preview(page).locator(".highlight")).toHaveCount(1);
  await page.getByTitle("Reset formatting").click();
  await expect(preview(page).locator(".highlight")).toHaveCount(0);
});
test("clipboard receives actual PNG data when permission is available", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy image", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("PNG copied");
  const types = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    return items.flatMap((i) => i.types);
  });
  expect(types).toContain("image/png");
});
test("clipboard denial downloads a real PNG fallback", async ({ page }) => {
  await page.evaluate(() =>
    Object.defineProperty(navigator.clipboard, "write", {
      value: () => Promise.reject(new Error("Denied")),
      configurable: true,
    }),
  );
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Copy image", exact: true }).click();
  expect(
    PNG.sync.read(await fs.readFile((await (await dl).path())!)).width,
  ).toBeGreaterThan(500);
  await expect(page.getByRole("status")).toContainText(
    "Downloaded the PNG instead",
  );
});
test("bulk independent editing, duplication, reordering, CSV import, selected and full ZIP", async ({
  page,
}) => {
  await page.getByRole("button", { name: /Bulk mode/ }).click();
  await page.getByTitle("Add comment", { exact: true }).click();
  await page.getByLabel("Comment text").fill("Distinct second image");
  await page.getByTitle("Duplicate comment").last().click();
  await page.getByLabel("Comment text").fill("Distinct third image");
  await page.getByTitle("Move up").last().click();
  await expect(page.locator(".bulk-name").nth(1)).toContainText(
    "Distinct third",
  );
  await page.getByTitle("Remove comment").last().click();
  const csv =
    'platform,template,username,text\nyoutube,Shorts Comment,imported,"CSV comment, with comma"';
  await page.locator('input[type=file][accept=".csv"]').setInputFiles({
    name: "comments.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(preview(page)).toContainText("CSV comment, with comma");
  await page.getByLabel("Select comment 1").check();
  let pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export selected (1)" }).click();
  let zip = await JSZip.loadAsync(
    await fs.readFile((await (await pending).path())!),
  );
  expect(Object.keys(zip.files).filter((f) => f.endsWith(".png"))).toHaveLength(
    1,
  );
  pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export all 3 as ZIP" }).click();
  const data = await fs.readFile((await (await pending).path())!);
  zip = await JSZip.loadAsync(data);
  const names = Object.keys(zip.files).filter((f) => f.endsWith(".png"));
  expect(names).toHaveLength(3);
  expect(await zip.file(names[0])!.async("base64")).not.toBe(
    await zip.file(names[1])!.async("base64"),
  );
  for (const n of names)
    expect(
      PNG.sync.read(await zip.file(n)!.async("nodebuffer")).width,
    ).toBeGreaterThan(800);
  expect(
    JSON.parse(await zip.file("manifest.json")!.async("string")).comments,
  ).toHaveLength(3);
  await fs.writeFile("samples/comments.zip", data);
});
test("all templates export real PNGs and fallback engine generates alpha", async ({
  page,
}) => {
  for (const [platform, template] of [
    ["Instagram", "Post Comment"],
    ["Instagram", "Reels Comment"],
    ["YouTube", "Video Comment"],
    ["YouTube", "Shorts Comment"],
    ["X / Twitter", "Post Comment"],
    ["TikTok", "Video Comment"],
  ]) {
    await page.getByRole("button", { name: platform, exact: true }).click();
    await page.getByLabel("Comment template").selectOption(template);
    const { png, buffer } = await pngDownload(page);
    expect(png.data[3]).toBe(0);
    await fs.writeFile(
      `samples/${platform.split(" ")[0].toLowerCase()}-${template.toLowerCase().replaceAll(" ", "-")}.png`,
      buffer,
    );
  }
  const result = await page.evaluate(async () => {
    const { capture } = await import("/src/export.ts");
    const node = document.querySelector(
      ".capture-host .export-asset",
    ) as HTMLElement;
    const blob = await capture(
      node,
      {
        theme: "light",
        scale: 2,
        background: "transparent",
        color: "#fff",
        padding: 24,
      },
      "fallback",
    );
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  const fallback = PNG.sync.read(Buffer.from(result));
  expect(fallback.width).toBe(1146);
  expect(fallback.data[3]).toBe(0);
  await fs.writeFile("samples/fallback-engine.png", Buffer.from(result));
});
test("desktop and mobile layouts are usable and render without external requests", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (req) => {
    if (
      !req.url().startsWith("http://127.0.0.1:5173") &&
      !req.url().startsWith("data:")
    )
      external.push(req.url());
  });
  await page.reload();
  await page.screenshot({ path: "samples/editor-desktop.png", fullPage: true });
  expect(external).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("preview")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByLabel("Username", { exact: true }).fill("mobile.creator");
  await expect(preview(page)).toContainText("mobile.creator");
  await page.screenshot({ path: "samples/editor-mobile.png", fullPage: true });
});
