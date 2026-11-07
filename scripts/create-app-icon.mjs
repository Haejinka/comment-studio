import fs from "node:fs/promises";
import { PNG } from "pngjs";
const size = 256,
  png = new PNG({ width: size, height: size });
function inside(x, y, left, top, right, bottom, r) {
  const dx = Math.max(left + r - x, 0, x - (right - r)),
    dy = Math.max(top + r - y, 0, y - (bottom - r));
  return (
    x >= left &&
    x <= right &&
    y >= top &&
    y <= bottom &&
    dx * dx + dy * dy <= r * r
  );
}
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const bg = inside(x, y, 4, 4, 251, 251, 52);
    const outer = inside(x, y, 52, 57, 204, 177, 25);
    const inner = inside(x, y, 65, 70, 191, 164, 13);
    const tail =
      x >= 56 && x <= 96 && y >= 163 && y <= 205 && y - 163 < (96 - x) * 1.05;
    const ink = (outer && !inner) || tail;
    png.data[i] = png.data[i + 1] = png.data[i + 2] = ink ? 245 : 16;
    png.data[i + 3] = bg ? 255 : 0;
  }
const bytes = PNG.sync.write(png);
await fs.writeFile("src-tauri/icons/icon.png", bytes);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 0;
header[7] = 0;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(bytes.length, 14);
header.writeUInt32LE(22, 18);
await fs.writeFile("src-tauri/icons/icon.ico", Buffer.concat([header, bytes]));
const p = JSON.parse(await fs.readFile("package.json", "utf8"));
Object.assign(p.scripts, {
  tauri: "tauri",
  desktop: "tauri dev",
  "dist:win": "tauri build --bundles nsis",
  "test:rust": "cargo test --manifest-path src-tauri/Cargo.toml",
});
await fs.writeFile("package.json", JSON.stringify(p, null, 2) + "\n");
