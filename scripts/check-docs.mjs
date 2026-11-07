import fs from "node:fs/promises";
import path from "node:path";
const files = ["README.md", "WINDOWS.md", "CONTRIBUTING.md"];
async function walk(dir) {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) await walk(p);
    else if (p.endsWith(".md")) files.push(p);
  }
}
await walk("docs");
const root = path.resolve("."),
  errors = [];
let checked = 0;
for (const file of files) {
  const text = await fs.readFile(file, "utf8");
  const links = [
    ...text.matchAll(/!?\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))\)/g),
  ].map((m) => m[1] || m[2]);
  for (const m of text.matchAll(/(?:src|srcset)="([^"]+)"/g))
    links.push(m[1].split(/\s/)[0]);
  for (const link of links) {
    if (/^(https?:|mailto:)/.test(link)) continue;
    const [raw, anchor] = link.split("#");
    const target = raw
      ? path.resolve(path.dirname(file), decodeURIComponent(raw))
      : path.resolve(file);
    if (!target.startsWith(root + path.sep) && target !== root) {
      errors.push(`${file}: link leaves repository: ${link}`);
      continue;
    }
    try {
      await fs.access(target);
    } catch {
      errors.push(`${file}: missing target ${link}`);
      continue;
    }
    if (anchor && target.endsWith(".md")) {
      const contents = await fs.readFile(target, "utf8");
      const anchors = [...contents.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) =>
        m[1]
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}_ -]/gu, "")
          .replace(/ /g, "-"),
      );
      if (!anchors.includes(anchor))
        errors.push(`${file}: missing anchor ${link}`);
    }
    checked++;
  }
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Validated ${checked} local links and images across ${files.length} Markdown guides.`,
  );
