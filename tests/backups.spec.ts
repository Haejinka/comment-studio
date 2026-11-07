import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";
test("browser draft backup transfers comment, formatting, presets and export settings", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Username", { exact: true }).fill("migrate.creator");
  await page.getByLabel("Comment text").fill("Transfer this draft ✨");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await page.locator(".export-settings summary").click();
  await page.getByLabel("Resolution").selectOption("3");
  await page.locator(".presets:not(.draft-backups) summary").click();
  await page.getByRole("button", { name: "Save current comment" }).click();
  await page.locator(".draft-backups summary").click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const data = await fs.readFile((await (await pending).path())!);
  const json = JSON.parse(data.toString());
  expect(json.format).toBe("comment-studio-backup");
  expect(json.comments[0].username).toBe("migrate.creator");
  expect(json.comments[0].marks[0].type).toBe("bold");
  expect(json.settings.scale).toBe(3);
  expect(json.presets).toHaveLength(1);
  await page.getByLabel("Username", { exact: true }).fill("temporary");
  await page
    .getByLabel("Import draft backup")
    .setInputFiles({
      name: "drafts.json",
      mimeType: "application/json",
      buffer: data,
    });
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(
    "migrate.creator",
  );
  await expect(page.getByTestId("preview").locator(".bold")).toHaveText(
    "Transfer this draft ✨",
  );
  await expect(page.getByRole("status")).toContainText("Draft backup imported");
  await page.reload();
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(
    "migrate.creator",
  );
  await expect(page.getByTestId("preview").locator("article")).toHaveClass(
    /dark/,
  );
  await page.locator(".draft-backups summary").click();
  await page
    .getByLabel("Import draft backup")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":999}'),
    });
  await expect(page.getByRole("status")).toContainText("Import failed");
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(
    "migrate.creator",
  );
  await fs.writeFile("samples/draft-backup.json", data);
});
