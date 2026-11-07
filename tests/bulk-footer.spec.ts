import { test, expect } from "@playwright/test";
test("bulk export icon and label stay together and disabled selection remains legible", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Light app mode", exact: true })
    .click();
  await page.getByRole("button", { name: /Bulk mode/ }).click();
  const button = page.getByRole("button", { name: "Export all 1 as ZIP" });
  const gap = await button.evaluate((el) => {
    const icon = el.querySelector("svg")!.getBoundingClientRect();
    const text = Array.from(el.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (!text) throw Error("Missing export label");
    const range = document.createRange();
    range.selectNodeContents(text);
    return range.getBoundingClientRect().left - icon.right;
  });
  expect(gap).toBeGreaterThanOrEqual(0);
  expect(gap).toBeLessThan(16);
  await expect(
    page.getByRole("button", { name: "Export selected (0)" }),
  ).toBeDisabled();
  await page
    .locator(".export-footer")
    .screenshot({ path: "samples/bulk-footer-fixed.png" });
});
