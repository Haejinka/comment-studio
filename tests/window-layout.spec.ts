import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 1320, height: 800 },
  { width: 1280, height: 720 },
  { width: 1024, height: 600 },
  { width: 850, height: 480 },
]) {
  test(`export controls stay visible at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    for (const mode of ["single", "bulk"]) {
      if (mode === "bulk")
        await page.getByRole("button", { name: /Bulk mode/ }).click();
      const labels =
        mode === "single"
          ? [/^Export image/, /^Copy image$/, /^Copy text$/]
          : [/^Export all .* as ZIP$/, /^Export selected/];
      for (const name of labels) {
        const button = page.getByRole("button", { name });
        await expect(button).toBeInViewport({ ratio: 1 });
      }
      const scroll = page.locator(".sidebar-scroll");
      await scroll.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      // The last editor controls remain reachable without moving the export footer.
      await expect(
        page.getByRole("button", { name: "Clear saved state" }),
      ).toBeInViewport({ ratio: 1 });
      await expect(
        page.getByRole("button", { name: labels[0] }),
      ).toBeInViewport({ ratio: 1 });
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
      ).toBe(viewport.height);
    }
  });
}
