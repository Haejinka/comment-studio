import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import fs from "node:fs/promises";
const referenceText = "Write any comment and see what happens 😊";
test("seven native templates match reference structure and export individually", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill("username");
  await page.getByLabel("Comment text").fill(referenceText);
  await page.locator(".export-settings summary").click();
  await page.getByLabel("Resolution").selectOption("1");
  await page.getByLabel("Padding").fill("0");
  const gallery: { label: string; data: string }[] = [];
  const variants = [
    ["TikTok", "Comment Reply", 525, "tiktok-reply"],
    ["TikTok", "Video Comment", 525, "tiktok-video"],
    ["Instagram", "Post Comment", 525, "instagram-post"],
    ["Instagram", "Reels Comment", 319, "instagram-reels"],
    ["YouTube", "Video Comment", 525, "youtube-video"],
    ["YouTube", "Shorts Comment", 381, "youtube-shorts"],
    ["X / Twitter", "Post Comment", 525, "x-post"],
  ] as const;
  for (const [platform, template, width, file] of variants) {
    await page.getByRole("button", { name: platform, exact: true }).click();
    await page.getByLabel("Comment template").selectOption(template);
    if (platform === "TikTok" && template === "Video Comment") {
      await page.getByLabel("Timestamp", { exact: true }).fill("1");
      await page.getByLabel("Time unit").selectOption("d");
      await page.getByLabel("Like count").fill("1,393");
      await page.getByLabel("Reply count").fill("2");
    }
    if (platform === "Instagram" && template === "Post Comment") {
      await page.getByLabel("Timestamp", { exact: true }).fill("2");
      await page.getByLabel("Time unit").selectOption("w");
      await page.getByLabel("Like count").fill("114");
      await page.getByLabel("Reply count").fill("5");
    }
    if (platform === "YouTube" && template === "Video Comment") {
      await page.getByLabel("Username", { exact: true }).fill("Username");
      await page.getByLabel("Timestamp", { exact: true }).fill("10");
      await page.getByLabel("Time unit").selectOption("mo");
      await page.getByLabel("Like count").fill("72");
      await page.getByLabel("Reply count").fill("2");
    }
    if (platform === "X / Twitter") {
      await page.getByLabel("Username", { exact: true }).fill("Display Name");
      await page.getByLabel("Handle", { exact: true }).fill("username");
      await page.getByLabel("Timestamp", { exact: true }).fill("2");
      await page.getByLabel("Time unit").selectOption("h");
      await page.getByLabel("Like count").fill("1.2K");
      await page.getByLabel("Reply count").fill("45");
      await page.getByLabel("Reposts", { exact: true }).fill("12");
      await page.getByLabel("View count").fill("12K");
      expect(
        await page.getByLabel("Comment template").locator("option").count(),
      ).toBe(1);
    }
    const card = page.getByTestId("preview").locator("article");
    expect(
      await card.evaluate((el) => el.getBoundingClientRect().width),
    ).toBeGreaterThan(150);
    if (template === "Reels Comment") {
      await expect(card).toContainText("Replying to username");
      await expect(card.locator(".side-like,.thread")).toHaveCount(0);
    }
    if (template === "Shorts Comment") {
      await expect(card).toContainText("Comment from @Username");
      await expect(
        card.locator(".youtube-actions,.youtube-thread"),
      ).toHaveCount(0);
    }
    if (platform === "YouTube" && template === "Video Comment")
      await expect(card.locator(".youtube-connector")).toHaveCount(1);
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export image" }).click();
    const data = await fs.readFile((await (await pending).path())!);
    const png = PNG.sync.read(data);
    expect(png.width).toBe(width);
    await fs.writeFile(`samples/native-${file}.png`, data);
    gallery.push({
      label: `${platform} · ${template}`,
      data: data.toString("base64"),
    });
  }
  const sheet = await browser.newPage({
    viewport: { width: 1200, height: 1100 },
  });
  await sheet.setContent(
    `<html><head><style>body{margin:0;background:#100d17;color:#c3b4d6;font:12px Arial;padding:36px}h1{font-size:20px;font-weight:500;margin:0 0 8px}p{color:#887698;margin:0 0 30px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:30px 38px}section{min-height:150px}h2{font-size:11px;font-weight:400;letter-spacing:.3px;margin:0 0 18px;color:#aa94c1}img{display:block;max-width:100%}</style></head><body><h1>Native comment templates</h1><p>Seven independently rendered assets · transparent PNG · original scale</p><div class="grid">${gallery.map((item) => `<section><h2>${item.label}</h2><img src="data:image/png;base64,${item.data}"/></section>`).join("")}</div></body></html>`,
  );
  await sheet.screenshot({
    path: "samples/native-template-gallery.png",
    fullPage: true,
  });
  await sheet.close();
});

test("profile and metrics visibility, local randomization, blur and removal", async ({
  page,
}) => {
  await page.goto("/");
  const preview = page.getByTestId("preview");
  await page.getByRole("switch", { name: "Show profile" }).click();
  await expect(preview.locator(".avatar,.reply-heading")).toHaveCount(0);
  await page.getByRole("switch", { name: "Show profile" }).click();
  await page.getByTitle("Generate random identity", { exact: true }).click();
  await expect(page.getByLabel("Username", { exact: true })).not.toHaveValue(
    "alex.creates",
  );
  await page.getByLabel("Comment template").selectOption("Video Comment");
  await page.getByRole("switch", { name: "Show likes", exact: true }).click();
  await expect(preview.locator(".tiktok-reactions")).toHaveCount(0);
  await page.getByRole("switch", { name: "Show replies", exact: true }).click();
  await expect(preview.locator(".thread")).toHaveCount(0);
  await page
    .getByRole("switch", { name: "Show timestamp", exact: true })
    .click();
  await expect(
    preview.locator(".tiktok-actions>span:not(.tiktok-reactions)"),
  ).toHaveCount(0);
  await page.getByTitle("Generate random engagement metrics").click();
  const field = page.getByLabel("Comment text");
  await field.fill("Hide this part, keep this.");
  await field.evaluate((el: HTMLTextAreaElement) => {
    el.focus();
    el.setSelectionRange(0, 14);
  });
  await page.getByRole("button", { name: "Blur", exact: true }).click();
  await expect(preview.locator(".blur")).toHaveText("Hide this part");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export image" }).click();
  expect(
    PNG.sync.read(await fs.readFile((await (await pending).path())!)).width,
  ).toBe(1146);
  await field.evaluate((el: HTMLTextAreaElement) => {
    el.focus();
    el.setSelectionRange(0, 16);
  });
  await page
    .getByRole("button", { name: "Remove selected text", exact: true })
    .click();
  await expect(field).toHaveValue("keep this.");
  await page.getByTitle("Undo", { exact: true }).click();
  await expect(field).toHaveValue("Hide this part, keep this.");
});
