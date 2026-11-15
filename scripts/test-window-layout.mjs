import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { chromium, expect } from "@playwright/test";

const profile = await fs.mkdtemp(path.join(tmpdir(), "comment-studio-window-"));
const proc = spawn(
  path.resolve("src-tauri/target/release/comment-studio.exe"),
  ["--test-mode"],
  {
    env: {
      ...process.env,
      COMMENT_STUDIO_TEST_USER_DATA: profile,
    WEBVIEW2_USER_DATA_FOLDER: profile,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=9238",
    },
    stdio: "ignore",
  },
);
let browser;
try {
  for (let i = 0; i < 60; i++) {
    try {
      browser = await chromium.connectOverCDP("http://127.0.0.1:9238");
      break;
    } catch {
      if (proc.exitCode !== null) throw Error("App exited during startup");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!browser) throw Error("Could not connect to test WebView2");
  const page = browser.contexts()[0].pages()[0];
  await expect(page.getByTestId("preview")).toBeVisible();
  const bounds = await page.evaluate(async () => {
    const invoke = window.__TAURI_INTERNALS__.invoke;
    return {
      monitor: await invoke("plugin:window|current_monitor"),
      position: await invoke("plugin:window|outer_position", { label: "main" }),
      size: await invoke("plugin:window|outer_size", { label: "main" }),
      maximized: await invoke("plugin:window|is_maximized", { label: "main" }),
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
  const work = bounds.monitor.workArea;
  expect(bounds.maximized).toBe(false);
  expect(bounds.position.x).toBeGreaterThanOrEqual(work.position.x);
  expect(bounds.position.y).toBeGreaterThanOrEqual(work.position.y);
  expect(bounds.position.x + bounds.size.width).toBeLessThanOrEqual(
    work.position.x + work.size.width,
  );
  expect(bounds.position.y + bounds.size.height).toBeLessThanOrEqual(
    work.position.y + work.size.height,
  );
  for (const name of [/^Export image/, /^Copy image$/, /^Copy text$/]) {
    await expect(page.getByRole("button", { name })).toBeInViewport({
      ratio: 1,
    });
  }
  await page.getByRole("button", { name: /Bulk mode/ }).click();
  await expect(
    page.getByRole("button", { name: /^Export selected/ }),
  ).toBeInViewport({ ratio: 1 });
  await fs.mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/window-launch.png" });
  console.log(
    "Native startup fits desktop; single and bulk controls are visible:",
    JSON.stringify(bounds),
  );
} finally {
  if (browser) await browser.close();
  proc.kill();
}
