import { test, expect } from "@playwright/test";
test("editor uses flat neutral colors and retains all platform icon labels", async ({
  page,
}) => {
  await page.goto("/");
  for (const name of ["TikTok", "Instagram", "YouTube", "X / Twitter"])
    await expect(page.getByRole("button", { name, exact: true })).toContainText(
      name,
    );
  await expect(page.locator(".workspace")).toHaveCSS(
    "background-color",
    "rgb(16, 16, 16)",
  );
  const gradients = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".app-shell *"))
      .filter(
        (el) =>
          /gradient/.test(getComputedStyle(el).backgroundImage) ||
          /gradient/.test(getComputedStyle(el, "::before").backgroundImage),
      )
      .map((el) => el.className),
  );
  expect(gradients).toEqual([]);
  await page.getByRole("button", { name: "Toggle transparency grid" }).click();
  await page.getByRole("button", { name: "Toggle transparency grid" }).click();
  await page.screenshot({
    path: "samples/editor-flat-colors.png",
    fullPage: true,
  });
});
