// =====================================================================
// Generates our own placeholder product images as SVG files (we are not
// allowed to use the reference shop's photos). Run once:
//     node scripts/make-placeholder-images.mjs
// Output:
//   public/images/colours/<colour>.svg  - the bed drawn in each fabric colour
//   public/images/detail-1..5.svg       - colour-neutral gallery detail images
// These are normal image files: the database stores their URLs, exactly as
// it would for real photos uploaded by a seller.
// =====================================================================
import { mkdirSync, writeFileSync } from 'node:fs';

const COLOURS = [
  ['Cream Naples', '#e6dcc6'],
  ['Charcoal Coniston', '#3d3f42'],
  ['Silver Plush Velvet', '#bfc1c3'],
  ['Seal Grey Naples', '#8a867e'],
  ['Emerald Coniston', '#1f5a45'],
  ['Pink Plush Velvet', '#e2b4b6'],
  ['Blue Plush Velvet', '#2e4868'],
  ['Black Naples', '#1f1f1f'],
];

export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// Make a colour lighter (amount > 0) or darker (amount < 0).
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = mix(n >> 16), g = mix((n >> 8) & 255), b = mix(n & 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

const BG = `<rect width="800" height="600" fill="#f1ece4"/><rect y="430" width="800" height="170" fill="#e4dbcf"/>`;

// The bed drawn in one fabric colour.
function bedSvg(name, hex) {
  const light = shade(hex, 0.18), dark = shade(hex, -0.25), darker = shade(hex, -0.45);
  const panels = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${196 + i * 70}" y="118" width="58" height="190" rx="10" fill="url(#fab)" stroke="${dark}" stroke-width="2"/>`).join('');
  const buttons = [0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${225 + i * 70}" cy="180" r="4" fill="${darker}"/><circle cx="${225 + i * 70}" cy="245" r="4" fill="${darker}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
<defs><linearGradient id="fab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${hex}"/></linearGradient>
<linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hex}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
${BG}
<ellipse cx="400" cy="478" rx="330" ry="22" fill="#000" opacity="0.10"/>
<rect x="180" y="104" width="440" height="216" rx="18" fill="${dark}"/>${panels}${buttons}
<rect x="118" y="292" width="564" height="54" rx="14" fill="#f8f6f2" stroke="#e2ddd4" stroke-width="2"/>
<path d="M140 318 H660" stroke="#e7e2d9" stroke-width="2" stroke-dasharray="10 8"/>
<rect x="190" y="262" width="180" height="46" rx="20" fill="#ffffff" stroke="#e2ddd4" stroke-width="2"/>
<rect x="430" y="262" width="180" height="46" rx="20" fill="#ffffff" stroke="#e2ddd4" stroke-width="2"/>
<rect x="108" y="340" width="584" height="118" rx="12" fill="url(#base)"/>
<path d="M120 352 H680" stroke="${light}" stroke-width="2" opacity="0.6"/>
<rect x="128" y="456" width="22" height="16" rx="4" fill="#3b342c"/><rect x="650" y="456" width="22" height="16" rx="4" fill="#3b342c"/>
<rect x="584" y="526" width="196" height="46" rx="23" fill="#ffffff" opacity="0.9"/>
<circle cx="610" cy="549" r="11" fill="${hex}" stroke="#d6d0c6"/>
<text x="630" y="555" font-family="Arial, sans-serif" font-size="16" fill="#3b342c">${name}</text>
</svg>`;
}

// Five neutral "detail" images for the gallery (same for every colour).
const caption = (text) => `<text x="400" y="560" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#5b5248">${text}</text>`;
const line = 'fill="none" stroke="#5b5248" stroke-width="3"';
const DETAILS = [
  // 1. Sizes
  `${BG}<rect x="170" y="150" width="460" height="230" rx="10" ${line}/><rect x="170" y="150" width="460" height="60" rx="10" ${line}/>
   <path d="M170 410 H630 M170 400 V420 M630 400 V420" ${line}/><text x="400" y="440" font-family="Arial" font-size="20" text-anchor="middle" fill="#5b5248">Width: 2FT6 to 6FT</text>
   <path d="M660 150 V380 M650 150 H670 M650 380 H670" ${line}/><text x="690" y="270" font-family="Arial" font-size="20" fill="#5b5248">6FT3</text>${caption('Six sizes, from Small Single to Super King')}`,
  // 2. Storage drawers
  `${BG}<rect x="140" y="220" width="520" height="160" rx="12" fill="#d9cfc1" stroke="#5b5248" stroke-width="3"/>
   <rect x="170" y="250" width="200" height="100" rx="8" fill="#e9e2d7" stroke="#5b5248" stroke-width="3"/><rect x="430" y="250" width="200" height="100" rx="8" fill="#e9e2d7" stroke="#5b5248" stroke-width="3"/>
   <rect x="245" y="292" width="50" height="10" rx="5" fill="#5b5248"/><rect x="505" y="292" width="50" height="10" rx="5" fill="#5b5248"/>${caption('Optional storage: 2 or 4 drawers')}`,
  // 3. Headboards
  `${BG}<rect x="150" y="260" width="200" height="120" rx="12" fill="#d9cfc1" stroke="#5b5248" stroke-width="3"/><rect x="450" y="120" width="200" height="260" rx="12" fill="#d9cfc1" stroke="#5b5248" stroke-width="3"/>
   <text x="250" y="420" font-family="Arial" font-size="22" text-anchor="middle" fill="#5b5248">26" (free)</text><text x="550" y="420" font-family="Arial" font-size="22" text-anchor="middle" fill="#5b5248">54" floor standing</text>${caption('Choose your headboard height')}`,
  // 4. Base strength
  `${BG}<rect x="130" y="250" width="240" height="110" rx="10" fill="#d9cfc1" stroke="#5b5248" stroke-width="3"/><rect x="430" y="250" width="240" height="110" rx="10" fill="#d9cfc1" stroke="#5b5248" stroke-width="3"/>
   <path d="M450 270 L650 340 M450 340 L650 270" stroke="#5b5248" stroke-width="3"/>
   <text x="250" y="400" font-family="Arial" font-size="22" text-anchor="middle" fill="#5b5248">Standard: 50 stone</text><text x="550" y="400" font-family="Arial" font-size="22" text-anchor="middle" fill="#5b5248">Reinforced: 100 stone</text>${caption('Standard or reinforced base')}`,
  // 5. Fabric swatches (all colours)
  `${BG}${COLOURS.map(([n, h], i) => `<circle cx="${160 + (i % 4) * 160}" cy="${190 + Math.floor(i / 4) * 170}" r="48" fill="${h}" stroke="#d6d0c6" stroke-width="3"/><text x="${160 + (i % 4) * 160}" y="${270 + Math.floor(i / 4) * 170}" font-family="Arial" font-size="15" text-anchor="middle" fill="#5b5248">${n}</text>`).join('')}${caption('Fabric colours')}`,
].map((body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">${body}</svg>`);

mkdirSync('public/images/colours', { recursive: true });
for (const [name, hex] of COLOURS) writeFileSync(`public/images/colours/${slug(name)}.svg`, bedSvg(name, hex));
DETAILS.forEach((svg, i) => writeFileSync(`public/images/detail-${i + 1}.svg`, svg));
console.log(`Wrote ${COLOURS.length} colour images and ${DETAILS.length} detail images.`);
