import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import { PNG } from "pngjs";
import JSZip from "jszip";
const output = path.resolve("test-results/windows-smoke/run-" + Date.now());
await fs.mkdir(output, { recursive: true });
const binary = path.resolve("src-tauri/target/release/comment-studio.exe");
const proc = spawn(binary, ["--test-mode"], {
  env: {
    ...process.env,
    COMMENT_STUDIO_TEST_SAVE_DIR: output,
    COMMENT_STUDIO_TEST_USER_DATA: path.join(output, "webview-profile"),
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9237",
  },
  stdio: "ignore",
  windowsHide: false,
});
let browser;
for (let i = 0; i < 90; i++) {
  try {
    browser = await chromium.connectOverCDP("http://127.0.0.1:9237");
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}
if (!browser)
  throw new Error("Could not connect to the Windows WebView2 test instance.");
const page = browser.contexts()[0].pages()[0];
page.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await expect(page.getByTestId("preview")).toBeVisible();
await page.getByLabel("Username", { exact: true }).fill("windows.creator");
await page
  .getByLabel("Comment text")
  .fill("A real Windows app.\nOffline PNG export ✨");
await page.getByRole("switch", { name: "Verified badge" }).click();
const avatar = new PNG({ width: 32, height: 32 });
for (let i = 0; i < avatar.data.length; i += 4) {
  avatar.data[i] = 20;
  avatar.data[i + 1] = 210;
  avatar.data[i + 2] = 80;
  avatar.data[i + 3] = 255;
}
await page.getByLabel("Upload avatar").setInputFiles({
  name: "avatar.png",
  mimeType: "image/png",
  buffer: PNG.sync.write(avatar),
});
await expect(page.getByTestId("preview").locator(".avatar img")).toBeVisible();
await page.getByRole("button", { name: "Copy image", exact: true }).click();
await expect(page.getByRole("status")).toContainText("PNG copied to clipboard");
await page.getByRole("button", { name: "Copy text", exact: true }).click();
await expect(page.getByRole("status")).toContainText("Comment text copied");
await page.reload();
await expect(page.getByLabel("Username", { exact: true })).toHaveValue(
  "windows.creator",
);
await expect(page.getByTestId("preview").locator(".avatar img")).toBeVisible();
await page.screenshot({ path: "samples/windows-app.png", fullPage: true });
async function waitForFile(name) {
  const target = path.join(output, name);
  console.log("SAVE_DIALOG_TARGET: " + target);
  for (let i = 0; i < 300; i++) {
    try {
      return await fs.readFile(target);
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Native Save As was not completed for " + target);
}
await page.getByRole("button", { name: "Export image" }).click();
const today = await page.evaluate(() => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
});
const data = await waitForFile("tiktok-comment-reply-" + today + ".png");
await expect(page.getByRole("status")).toContainText("PNG saved");
const png = PNG.sync.read(data);
expect(png.width).toBe(1146);
expect(png.data[3]).toBe(0);
let green = 0;
for (let i = 0; i < png.data.length; i += 4)
  if (
    png.data[i] < 40 &&
    png.data[i + 1] > 190 &&
    png.data[i + 2] > 60 &&
    png.data[i + 2] < 100
  )
    green++;
expect(green).toBeGreaterThan(1000);
await fs.writeFile("samples/windows-native-export.png", data);
console.log("PNG_NATIVE_SAVE_PASSED");
await page.getByRole("button", { name: "Export image" }).click();
console.log("CANCEL_NATIVE_SAVE_DIALOG");
await expect(page.getByRole("status")).toContainText("Save cancelled", {
  timeout: 300000,
});
await page.getByRole("button", { name: /Bulk mode/ }).click();
await page.getByTitle("Add comment", { exact: true }).click();
await page
  .getByLabel("Comment text")
  .fill("A second, distinct Windows export.");
await page.getByRole("button", { name: "Export all 2 as ZIP" }).click();
const zipData = await waitForFile("comment-studio.zip");
const zip = await JSZip.loadAsync(zipData);
const names = Object.keys(zip.files).filter((x) => x.endsWith(".png"));
expect(names).toHaveLength(2);
for (const name of names)
  PNG.sync.read(await zip.file(name).async("nodebuffer"));
expect(
  JSON.parse(await zip.file("manifest.json").async("string")).comments,
).toHaveLength(2);
await fs.writeFile("samples/windows-native-comments.zip", zipData);
expect(errors).toEqual([]);
await fs.writeFile(
  path.join(output, "result.json"),
  JSON.stringify(
    {
      passed: true,
      checks: [
        "offline packaged startup",
        "live fields",
        "avatar",
        "verified badge",
        "native PNG clipboard",
        "native text clipboard",
        "draft refresh persistence",
        "native PNG Save As with transparency and avatar pixels",
        "cancelled save reports cancellation",
        "native ZIP Save As with distinct PNGs and manifest",
      ],
      png: { width: png.width, height: png.height },
      zipImages: names.length,
    },
    null,
    2,
  ),
);
console.log("WINDOWS_SMOKE_PASSED");
// Leave the test app open for visual inspection. Close it normally after inspecting.
await new Promise((resolve) => proc.once("exit", resolve));
