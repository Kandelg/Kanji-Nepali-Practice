/**
 * Replaces SVG placeholder backgrounds in style.css with real Unsplash photos.
 * Each theme gets a layered CSS background:
 *   linear-gradient(color-overlay) + Unsplash photo URL
 *
 * Run: node tools/_apply-photo-bg.js
 */
const fs = require("fs");
const path = require("path");
const CSS_PATH = path.join(__dirname, "..", "style.css");

// overlay = page-bg color at ~62% opacity (light) or ~68-70% (dark)
// photo   = Unsplash photo ID for a Japan-themed shot
const THEMES = [
  {
    id: "fuji",
    overlay: "207, 224, 247, 0.62",
    photo: "1547592166-23ac45744acd",
  }, // Mt Fuji reflection
  {
    id: "sakura",
    overlay: "255, 245, 249, 0.60",
    photo: "1522383225653-ed111181a951",
  }, // Cherry blossoms
  {
    id: "ninja",
    overlay: "22, 23, 27, 0.70",
    photo: "1528360983277-13d401cdc186",
  }, // Japanese castle night
  {
    id: "anime",
    overlay: "244, 236, 255, 0.60",
    photo: "1607604276583-eef5d076aa5f",
  }, // Akihabara colorful street
  {
    id: "temple",
    overlay: "253, 247, 236, 0.62",
    photo: "1478436127897-769e1b3f0f36",
  }, // Fushimi Inari torii gates
  {
    id: "sea",
    overlay: "238, 249, 251, 0.58",
    photo: "1504233529578-6d46baba6d34",
  }, // Japanese coastal waves
  {
    id: "train",
    overlay: "247, 249, 252, 0.62",
    photo: "1569629743817-70d8db6c323b",
  }, // Shinkansen bullet train
  {
    id: "matcha",
    overlay: "245, 250, 240, 0.60",
    photo: "1556679343-c7306c1976bc",
  }, // Matcha tea bowl ceremony
  {
    id: "matsuri",
    overlay: "21, 14, 18, 0.68",
    photo: "1533107862482-0e6974b06ec4",
  }, // Festival lanterns night
  {
    id: "neon",
    overlay: "11, 9, 22, 0.68",
    photo: "1540959733332-eab4deabeeaf",
  }, // Tokyo neon night
];

const BASE_URL = "https://images.unsplash.com/photo-";
const PHOTO_PARAMS = "?w=1400&q=80&auto=format&fit=crop";

let css = fs.readFileSync(CSS_PATH, "utf8");
let changed = 0;
const errors = [];

for (const { id, overlay, photo } of THEMES) {
  const photoUrl = `${BASE_URL}${photo}${PHOTO_PARAMS}`;

  // Match the 4 old background lines at the end of each theme block
  const re = new RegExp(
    `(body\\[data-theme="${id}"\\] \\{[\\s\\S]*?)` +
      `  background-image: url\\("data:image/svg\\+xml;base64,[^"]*"\\);\\r?\\n` +
      `  background-repeat: no-repeat;\\r?\\n` +
      `  background-position: top right;\\r?\\n` +
      `  background-size: 440px;\\r?\\n` +
      `(\\})`,
  );

  const replacement =
    `$1` +
    `  background-image:\n` +
    `    linear-gradient(rgba(${overlay}), rgba(${overlay})),\n` +
    `    url("${photoUrl}");\n` +
    `  background-size: cover;\n` +
    `  background-position: center;\n` +
    `  background-repeat: no-repeat;\n` +
    `$2`;

  const updated = css.replace(re, replacement);
  if (updated === css) {
    errors.push(`FAILED: no SVG background block found for theme "${id}"`);
  } else {
    css = updated;
    changed++;
    console.log(`  ok  ${id}`);
  }
}

if (errors.length > 0) {
  errors.forEach((e) => console.error(e));
  process.exit(1);
}

fs.writeFileSync(CSS_PATH, css);
console.log(`\nDone. Updated ${changed} / ${THEMES.length} theme backgrounds.`);
