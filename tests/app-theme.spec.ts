import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import fs from "node:fs/promises";
test("app light/dark mode persists and does not alter comment theme or PNG output", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Dark app mode", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const card = page.getByTestId("preview").locator("article");
  await expect(card).toHaveClass(/light/);
  async function exportPNG() {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export image" }).click();
    return await fs.readFile((await (await pending).path())!);
  }
  const darkUI = await exportPNG();
  await page
    .getByRole("button", { name: "Light app mode", exact: true })
    .click();
  await expect(page.locator(".app-shell")).toHaveClass(/ui-light/);
  await expect(page.locator(".workspace")).toHaveCSS(
    "background-color",
    "rgb(243, 243, 243)",
  );
  await expect(card).toHaveClass(/light/);
  const lightUI = await exportPNG();
  await expect(page.getByRole("button", { name: "Export image" })).toHaveCSS(
    "background-color",
    "rgb(7, 106, 166)",
  );
  expect(PNG.sync.read(lightUI).data.equals(PNG.sync.read(darkUI).data)).toBe(
    true,
  );
  await page.screenshot({ path: "samples/app-light-mode.png", fullPage: true });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Light app mode", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(card).toHaveClass(/light/);
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await expect(card).toHaveClass(/dark/);
  await expect(page.locator(".app-shell")).toHaveClass(/ui-light/);
  await page
    .getByRole("button", { name: "Dark app mode", exact: true })
    .click();
  await expect(page.locator(".app-shell")).toHaveClass(/ui-dark/);
  await expect(card).toHaveClass(/dark/);
  await page.screenshot({ path: "samples/app-dark-mode.png", fullPage: true });
});
