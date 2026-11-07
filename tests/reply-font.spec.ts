import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import fs from "node:fs/promises";
test("reply heading uses native Proxima Nova semibold in preview and PNG", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill("Alex Kovač");
  await page
    .getByLabel("Comment text")
    .fill("do you think Erza and Jellal are secretly dating?");
  await page.locator(".export-settings summary").click();
  await page.getByLabel("Resolution").selectOption("1");
  await page.getByLabel("Padding").fill("0");
  await page.getByRole("button", { name: "100%", exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  const heading = page.getByTestId("preview").locator(".reply-heading");
  await expect(heading).toHaveCSS("font-weight", "600");
  await expect(heading).toHaveCSS("font-family", /Proxima Nova/);
  await expect(heading).toHaveCSS("color", "rgb(90, 90, 90)");
  await page.getByTestId("preview").evaluate((el) =>
    Object.assign((el as HTMLElement).style, {
      position: "fixed",
      left: "0px",
      top: "0px",
      transform: "none",
      zIndex: "1000",
    }),
  );
  const native = PNG.sync.read(await page.getByTestId("preview").screenshot());
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export image" }).click();
  const data = await fs.readFile((await (await pending).path())!);
  const png = PNG.sync.read(data);
  // Compare just the heading, so a substituted export font cannot hide in the card average.
  let difference = 0,
    n = 0;
  for (let y = 25; y < 55; y++)
    for (let x = 102; x < 505; x++)
      for (let k = 0; k < 3; k++) {
        const index = (y * png.width + x) * 4 + k;
        difference += Math.abs(png.data[index] - native.data[index]);
        n++;
      }
  await fs.writeFile(
    "samples/reply-heading-native.png",
    PNG.sync.write(native),
  );
  await fs.writeFile("samples/reply-heading-corrected.png", data);
  // Installed fonts use subpixel antialiasing in the native screenshot and
  // grayscale antialiasing inside SVG. Keep a 4% channel tolerance.
  expect(difference / n).toBeLessThan(10);
  await fs.writeFile("samples/reply-heading-corrected.png", data);
});
