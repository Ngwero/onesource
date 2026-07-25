import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../..");
const W = 1200;
const H = 630;
const logoPath = path.join(root, "public/brand/logo-on-dark-horizontal.png");
const outPath = path.join(root, "public/brand/og-share.png");

const logoWidth = 420;
const logo = await sharp(logoPath)
  .resize({
    width: logoWidth,
    height: 160,
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();

const logoMeta = await sharp(logo).metadata();
const logoH = logoMeta.height || 160;
const logoW = logoMeta.width || logoWidth;

const svg = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2e5e4a"/>
      <stop offset="55%" stop-color="#244a3b"/>
      <stop offset="100%" stop-color="#1a3530"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <circle cx="180" cy="120" r="220" fill="rgba(180,207,90,0.08)"/>
  <circle cx="1040" cy="520" r="260" fill="rgba(240,201,71,0.07)"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="24"
    fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="2"/>
  <text x="600" y="400" text-anchor="middle"
    font-family="Helvetica Neue, Arial, sans-serif"
    font-size="48" font-weight="700" fill="#ffffff"
    letter-spacing="-0.8">Everything on One Place</text>
  <text x="600" y="455" text-anchor="middle"
    font-family="Helvetica Neue, Arial, sans-serif"
    font-size="24" font-weight="500" fill="rgba(255,255,255,0.62)">
    Fresh foods  ·  Kitchen ware  ·  Everyday essentials
  </text>
  <rect x="520" y="500" width="160" height="3" rx="2" fill="#f0c947"/>
</svg>
`);

await sharp(svg)
  .composite([
    {
      input: logo,
      top: Math.round(150),
      left: Math.round((W - logoW) / 2),
    },
  ])
  .png()
  .toFile(outPath);

const meta = await sharp(outPath).metadata();
console.log("wrote", outPath, meta.width, "x", meta.height, fs.statSync(outPath).size, "bytes");
