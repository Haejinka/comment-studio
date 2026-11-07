import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import fs from "node:fs/promises";
test("visible image picker uploads, replaces, restores profile visibility and persists the real image", async ({
  page,
}) => {
  await page.goto("/");
  function image(r: number, g: number, b: number) {
    const png = new PNG({ width: 80, height: 60 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    }
    return PNG.sync.write(png);
  }
  let chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload image", exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: "profile.png",
    mimeType: "image/png",
    buffer: image(240, 20, 40),
  });
  await expect(
    page.getByTestId("preview").locator(".avatar img"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Replace image", exact: true }),
  ).toBeVisible();
  await page.getByRole("switch", { name: "Show profile", exact: true }).click();
  await expect(page.getByTestId("preview").locator(".avatar")).toHaveCount(0);
  chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Replace image", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "replacement.png",
    mimeType: "image/png",
    buffer: image(10, 80, 240),
  });
  await expect(
    page.getByTestId("preview").locator(".avatar img"),
  ).toBeVisible();
  await expect(
    page.getByRole("switch", { name: "Show profile", exact: true }),
  ).toBeChecked();
  await page.reload();
  await expect(
    page.getByTestId("preview").locator(".avatar img"),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export image" }).click();
  const data = await fs.readFile((await (await pending).path())!);
  const png = PNG.sync.read(data);
  let blue = 0,
    red = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (
      png.data[i] < 30 &&
      png.data[i + 1] > 60 &&
      png.data[i + 1] < 100 &&
      png.data[i + 2] > 220
    )
      blue++;
    if (png.data[i] > 220 && png.data[i + 1] < 40 && png.data[i + 2] < 60)
      red++;
  }
  expect(blue).toBeGreaterThan(1000);
  expect(red).toBe(0);
  await fs.writeFile("samples/replaced-profile-image.png", data);
  await page.screenshot({
    path: "samples/profile-image-controls.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Remove profile image", exact: true })
    .click();
  await expect(page.getByTestId("preview").locator(".avatar img")).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Upload image", exact: true }),
  ).toBeVisible();
});
