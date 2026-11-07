import fs from "node:fs/promises";
import { PNG } from "pngjs";
import JSZip from "jszip";
const images = [];
for (const file of (await fs.readdir("samples")).filter((name) =>
  name.endsWith(".png"),
)) {
  const bytes = await fs.readFile(`samples/${file}`);
  const png = PNG.sync.read(bytes);
  let transparent = 0;
  for (let i = 3; i < png.data.length; i += 4)
    if (png.data[i] === 0) transparent++;
  images.push({
    file,
    bytes: bytes.length,
    width: png.width,
    height: png.height,
    transparentPixels: transparent,
  });
}
const zip = await JSZip.loadAsync(await fs.readFile("samples/comments.zip"));
const assets = Object.keys(zip.files).filter((name) => name.endsWith(".png"));
for (const name of assets)
  PNG.sync.read(await zip.file(name).async("nodebuffer"));
const report = {
  generatedAt: new Date().toISOString(),
  images,
  zip: {
    file: "comments.zip",
    validPNGCount: assets.length,
    manifest: JSON.parse(await zip.file("manifest.json").async("string")),
  },
};
await fs.writeFile("samples/validation.json", JSON.stringify(report, null, 2));
console.log(
  `Decoded ${images.length} PNGs and ${assets.length} ZIP images; wrote samples/validation.json.`,
);
