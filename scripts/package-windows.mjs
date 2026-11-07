import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const root = JSON.parse(await fs.readFile("package.json", "utf8"));
const version = root.version;
const out = path.resolve("release");
await fs.mkdir(out, { recursive: true });
const files = [
  ["src-tauri/target/release/comment-studio.exe", "Comment-Studio.exe"],
  [
    `src-tauri/target/release/bundle/nsis/Comment Studio_${version}_x64-setup.exe`,
    "Comment-Studio-Setup.exe",
  ],
  ["src-tauri/icons/icon.ico", "Comment-Studio.ico"],
  ["docs/START-HERE.txt", "START-HERE.txt"],
  ["WINDOWS.md", "WINDOWS.md"],
];
const hashes = [];
for (const [source, name] of files) {
  let bytes = await fs.readFile(source);
  if (
    name.endsWith(".exe") &&
    (bytes.toString("ascii", 0, 2) !== "MZ" || bytes.length < 100000)
  )
    throw Error("Invalid executable: " + source);
  if (name === "WINDOWS.md")
    bytes = Buffer.from(
      bytes
        .toString()
        .replaceAll(
          "](docs/",
          "](https://github.com/Haejinka/comment-studio/blob/main/docs/",
        )
        .replaceAll(
          "](README.md)",
          "](https://github.com/Haejinka/comment-studio)",
        ),
    );
  await fs.writeFile(path.join(out, name), bytes);
  hashes.push(`${createHash("sha256").update(bytes).digest("hex")}  ${name}`);
}
await fs.writeFile(path.join(out, "SHA256SUMS.txt"), hashes.join("\n") + "\n");
console.log(`Packaged Comment Studio ${version} for Windows in ${out}`);
