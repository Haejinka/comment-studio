import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
await page.goto(process.env.CAPTURE_BASE_URL || "http://127.0.0.1:5173");
await page.getByLabel("Username", { exact: true }).fill("alex.creates");
await page
  .getByLabel("Comment text")
  .fill("Can you show us how you made this? 👀");
await page.getByRole("switch", { name: "Verified badge" }).click();
await page.getByRole("button", { name: "Toggle transparency grid" }).click();
await page.evaluate(() => document.fonts.ready);
await expect(page.getByText("All changes saved",{exact:true})).toBeVisible();
await page.mouse.move(450, 80);
await page.screenshot({ path: "docs/images/editor-dark.png" });
await page.getByRole("button", { name: "Light app mode", exact: true }).click();
await expect(page.getByText("All changes saved",{exact:true})).toBeVisible();
await page.mouse.move(450, 80);
await page.screenshot({ path: "docs/images/editor-light.png" });
const download = page.waitForEvent("download");
await page.getByRole("button", { name: "Export image" }).click();
await fs.copyFile(await (await download).path(), "samples/example-comment.png");
await page.getByRole("button", { name: "Dark app mode", exact: true }).click();
await page.getByRole("button", { name: "Instagram", exact: true }).click();
await page.getByLabel("Comment text").fill("This is exactly what I needed ✨");
await page.getByLabel("Like count").fill("128");
await page.getByLabel("Reply count").fill("3");
await page.locator(".sidebar-scroll").evaluate((el) => {
  el.scrollTop = 260;
});
await expect(page.getByText("All changes saved",{exact:true})).toBeVisible();
await page.mouse.move(450, 80);
await page.screenshot({ path: "docs/images/customize.png" });
await page.getByRole("button", { name: /Bulk mode/ }).click();
await page.getByTitle("Add comment", { exact: true }).click();
await page.getByLabel("Username", { exact: true }).fill("morgan.edits");
await page.getByLabel("Comment text").fill("More tutorials like this, please!");
await page.getByRole("button", { name: "YouTube", exact: true }).click();
await page.getByLabel("Reply count").fill("5");
await page.locator(".sidebar-scroll").evaluate((el) => {
  el.scrollTop = 0;
});
await expect(page.getByText("All changes saved",{exact:true})).toBeVisible();
await page.mouse.move(450, 80);
await page.screenshot({ path: "docs/images/bulk-mode.png" });
await fs.copyFile(
  "samples/native-template-gallery.png",
  "docs/images/templates.png",
);
await fs.copyFile("src-tauri/icons/icon.png", "docs/images/app-icon.png");
await fs.copyFile(
  "samples/windows-native-comments.zip",
  "samples/example-comments.zip",
);
await browser.close();
console.log("Captured clean dark, light, customization and bulk screenshots.");
