import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import fs from "node:fs/promises";
function inkBounds(png: PNG) {
  let minX = png.width,
    minY = png.height,
    maxX = -1,
    maxY = -1;
  for (let y = 25; y < 55; y++)
    for (let x = 102; x < 505; x++) {
      const i = (y * png.width + x) * 4;
      if (
        png.data[i + 3] > 200 &&
        png.data[i] < 190 &&
        png.data[i + 1] < 190 &&
        png.data[i + 2] < 190
      ) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  return { minX, minY, maxX, maxY };
}
for (const font of ["system", "bundled fallback"] as const) {
  test(`reply heading preserves semibold typography in preview and PNG (${font})`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Username", { exact: true }).fill("Alex Kovač");
    await page
      .getByLabel("Comment text")
      .fill("Can you show us how you made this?");
    if (font === "bundled fallback")
      await page.addStyleTag({
        content:
          ".reply-heading{font-family:Inter,Arial,sans-serif !important}",
      });
    await page.locator(".export-settings summary").click();
    await page.getByLabel("Resolution").selectOption("1");
    await page.getByLabel("Padding").fill("0");
    await page.getByRole("button", { name: "100%", exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    const heading = page.getByTestId("preview").locator(".reply-heading");
    await expect(heading).toHaveCSS("font-weight", "600");
    await expect(heading).toHaveCSS(
      "font-family",
      font === "system" ? /Proxima Nova/ : /^Inter/,
    );
    await expect(heading).toHaveCSS("color", "rgb(90, 90, 90)");
    await page
      .getByTestId("preview")
      .evaluate((el) =>
        Object.assign((el as HTMLElement).style, {
          position: "fixed",
          left: "0px",
          top: "0px",
          transform: "none",
          zIndex: "1000",
        }),
      );
    const native = PNG.sync.read(
      await page.getByTestId("preview").screenshot(),
    );
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export image" }).click();
    const data = await fs.readFile((await (await pending).path())!);
    const png = PNG.sync.read(data);
    await fs.writeFile(
      `samples/reply-heading-${font === "system" ? "native" : "fallback-native"}.png`,
      PNG.sync.write(native),
    );
    await fs.writeFile(
      `samples/reply-heading-${font === "system" ? "corrected" : "fallback-export"}.png`,
      data,
    );
    // Font substitution changes glyph extents. Check these explicitly instead of
    // treating OS ClearType versus SVG grayscale antialiasing as a font failure.
    const expected = inkBounds(native),
      actual = inkBounds(png);
    expect(expected.maxX).toBeGreaterThan(expected.minX);
    for (const key of ["minX", "minY", "maxX", "maxY"] as const)
      expect(
        Math.abs(actual[key] - expected[key]),
        `${font}: ${key}`,
      ).toBeLessThanOrEqual(2);
    let difference = 0,
      n = 0;
    for (let y = 25; y < 55; y++)
      for (let x = 102; x < 505; x++)
        for (let k = 0; k < 3; k++) {
          const i = (y * png.width + x) * 4 + k;
          difference += Math.abs(png.data[i] - native.data[i]);
          n++;
        }
    expect(difference / n).toBeLessThan(16);
  });
}
