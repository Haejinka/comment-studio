import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  // Keep browser download handles out of cloud-sync folders on Windows.
  outputDir:
    process.env.PLAYWRIGHT_OUTPUT_DIR ||
    path.join(tmpdir(), "comment-studio-playwright-results"),
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1440, height: 1000 },
  },
  workers: 1,
  reporter: "list",
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: true,
  },
});
