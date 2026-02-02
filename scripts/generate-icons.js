/**
 * Generates public/icon-192.png and public/icon-512.png for PWA.
 * Run: node scripts/generate-icons.js
 * Requires: npm install sharp (dev)
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const GREEN = "#22c55e";
const OUT_DIR = path.join(__dirname, "..", "public");

// SVG: green rounded square (app icon style)
const svg = `
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="${GREEN}"/>
</svg>
`;

async function generate() {
  const buffer = Buffer.from(svg.trim());
  fs.mkdirSync(OUT_DIR, { recursive: true });

  await sharp(buffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(OUT_DIR, "icon-192.png"));
  console.log("Created public/icon-192.png (192×192)");

  await sharp(buffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(OUT_DIR, "icon-512.png"));
  console.log("Created public/icon-512.png (512×512)");
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
