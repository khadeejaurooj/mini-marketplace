// =====================================================================
// Generates our own product images as SVG files (we are not allowed to use
// the reference shop's photos). Run once:
//     node scripts/make-placeholder-images.mjs
//
// Output:
//   public/images/colours/<colour>/front.svg      main picture
//   public/images/colours/<colour>/side.svg       angled side view
//   public/images/colours/<colour>/headboard.svg  headboard close-up
//   public/images/colours/<colour>/drawers.svg    storage drawers
//   public/images/colours/<colour>/fabric.svg     fabric close-up
//   public/images/sizes.svg                       size chart (same for every colour)
//   public/images/fabrics.svg                     all swatches (shop banner)
//
// Every colour gets its OWN full set, so the gallery genuinely changes when
// a buyer picks a colour. The database only stores the URLs, exactly as it
// would for real photos uploaded by a seller.
// =====================================================================
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { COLOURS, slug } from './colours.mjs';

// Make a colour lighter (amount > 0) or darker (amount < 0), e.g. for shading.
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount));
  const r = mix(n >> 16), g = mix((n >> 8) & 255), b = mix(n & 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

const svg = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs>${defs}</defs>${body}</svg>`;
const ROOM = `<rect width="800" height="600" fill="#f1ece4"/><rect y="430" width="800" height="170" fill="#e4dbcf"/>`;
const label = (text, hex) =>
  `<rect x="24" y="530" width="${40 + text.length * 9}" height="46" rx="23" fill="#fff" opacity="0.92"/>` +
  (hex ? `<circle cx="50" cy="553" r="11" fill="${hex}" stroke="#d6d0c6"/>` : '') +
  `<text x="${hex ? 70 : 44}" y="559" font-family="Arial, sans-serif" font-size="16" fill="#3b342c">${text}</text>`;

// Gradients shared by all views of one colour.
function fabricDefs(hex) {
  return `<linearGradient id="fab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(hex, 0.18)}"/><stop offset="1" stop-color="${hex}"/></linearGradient>
<linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hex}"/><stop offset="1" stop-color="${shade(hex, -0.25)}"/></linearGradient>`;
}

// A styled bedroom behind the bed: panelled wall, window with daylight,
// wooden floor, rug, bedside table with lamp, plant. Same for every colour,
// so only the bed's fabric changes between colour images.
const BEDROOM_DEFS = `
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3eee7"/><stop offset="1" stop-color="#e9e1d6"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdb79a"/><stop offset="1" stop-color="#b89f80"/></linearGradient>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8f0f2"/><stop offset="1" stop-color="#fbf8f2"/></linearGradient>
<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff6dc" stop-opacity="0.9"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient>
<filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>`;
function bedroom() {
  const panels = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${12 + i * 100}" y="300" width="84" height="100" rx="4" fill="none" stroke="#ddd3c5" stroke-width="2"/>`).join('');
  const boards = [0, 1, 2, 3, 4, 5].map((i) => `<line x1="0" y1="${440 + i * 28}" x2="800" y2="${440 + i * 28}" stroke="#a88f71" stroke-width="1" opacity="0.5"/>`).join('');
  return `<rect width="800" height="600" fill="url(#wall)"/>${panels}
<rect x="22" y="60" width="130" height="200" rx="4" fill="url(#sky)" stroke="#d8cdbd" stroke-width="6"/><line x1="87" y1="60" x2="87" y2="260" stroke="#d8cdbd" stroke-width="4"/>
<polygon points="152,80 260,420 150,420" fill="#fffaf0" opacity="0.35"/>
<rect y="420" width="800" height="180" fill="url(#floor)"/>${boards}
<ellipse cx="400" cy="520" rx="340" ry="48" fill="#e7ddd0"/><ellipse cx="400" cy="520" rx="320" ry="40" fill="none" stroke="#d6c9b7" stroke-width="2"/>
<circle cx="720" cy="250" r="90" fill="url(#glow)"/>
<rect x="680" y="350" width="90" height="100" rx="6" fill="#a98763"/><rect x="688" y="390" width="74" height="4" fill="#8d6e4f"/>
<rect x="718" y="300" width="14" height="50" fill="#7a6a58"/><path d="M692 270 L758 270 L746 236 L704 236 Z" fill="#f4ead6" stroke="#d8c9ad"/>
<rect x="40" y="380" width="54" height="64" rx="8" fill="#c9b8a1"/><path d="M67 380 C40 340 30 300 55 290 C60 320 66 340 67 380 C70 330 85 300 100 300 C98 330 80 360 67 380" fill="#6f8a5f"/>`;
}

// 1. Front view: the bed in a styled bedroom (the colour's main picture).
//    Channel-tufted headboard, quilted mattress, pillows, a throw, divan base.
function front(name, hex) {
  const dark = shade(hex, -0.22), light = shade(hex, 0.2);
  const channels = [0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${222 + i * 52}" y="96" width="46" height="232" rx="22" fill="url(#fab)" stroke="${dark}" stroke-width="1.5"/>`).join('');
  const quilt = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<line x1="${200 + i * 50}" y1="330" x2="${200 + i * 50}" y2="372" stroke="#e6e0d6" stroke-width="1.5"/>`).join('');
  return svg(`${bedroom()}
<ellipse cx="400" cy="472" rx="310" ry="26" fill="#000" opacity="0.22" filter="url(#soft)"/>
<rect x="210" y="84" width="380" height="256" rx="26" fill="${dark}"/>${channels}
<rect x="160" y="318" width="480" height="58" rx="16" fill="#faf8f4"/>${quilt}
<rect x="232" y="286" width="150" height="48" rx="22" fill="#fff" stroke="#ebe5db"/><rect x="418" y="286" width="150" height="48" rx="22" fill="#fff" stroke="#ebe5db"/>
<rect x="300" y="296" width="200" height="40" rx="18" fill="${light}" opacity="0.9"/>
<path d="M160 352 L640 352 L640 384 L160 384 Z" fill="#8f8a83" opacity="0.85"/><path d="M160 352 L640 352" stroke="#a6a29b" stroke-width="3"/>
<rect x="150" y="372" width="500" height="88" rx="12" fill="url(#base)"/><line x1="162" y1="384" x2="638" y2="384" stroke="${light}" stroke-width="2" opacity="0.7"/>
<rect x="170" y="458" width="18" height="12" rx="3" fill="#3b342c"/><rect x="612" y="458" width="18" height="12" rx="3" fill="#3b342c"/>
${label(name, hex)}`, fabricDefs(hex) + BEDROOM_DEFS);
}

// 2. Angled side view: the bed seen from the foot corner (simple perspective).
function side(name, hex) {
  const dark = shade(hex, -0.25), darker = shade(hex, -0.4);
  return svg(`${ROOM}<ellipse cx="420" cy="470" rx="320" ry="26" fill="#000" opacity="0.10"/>
<polygon points="150,110 330,70 330,300 150,330" fill="url(#fab)" stroke="${dark}" stroke-width="2"/>
<polygon points="150,300 330,270 700,330 520,370" fill="#f8f6f2" stroke="#e2ddd4" stroke-width="2"/>
<polygon points="190,262 300,245 330,268 220,286" fill="#fff" stroke="#e2ddd4" stroke-width="2"/>
<polygon points="150,330 520,370 520,450 150,410" fill="url(#base)"/>
<polygon points="520,370 700,330 700,405 520,450" fill="${darker}"/>
<rect x="160" y="408" width="16" height="18" fill="#3b342c"/><rect x="505" y="448" width="16" height="18" fill="#3b342c"/><rect x="684" y="403" width="16" height="16" fill="#3b342c"/>
${label(name + ' · side view', hex)}`, fabricDefs(hex));
}

// 3. Headboard close-up: big tufted panels with buttons.
function headboard(name, hex) {
  const dark = shade(hex, -0.25), darker = shade(hex, -0.45);
  const panels = [0, 1, 2, 3].map((i) => `<rect x="${70 + i * 170}" y="40" width="150" height="460" rx="22" fill="url(#fab)" stroke="${dark}" stroke-width="3"/>`).join('');
  const buttons = [0, 1, 2, 3].map((i) => [140, 270, 400].map((y) => `<circle cx="${145 + i * 170}" cy="${y}" r="9" fill="${darker}"/><circle cx="${143 + i * 170}" cy="${y - 2}" r="3" fill="${shade(hex, 0.25)}"/>`).join('')).join('');
  return svg(`<rect width="800" height="600" fill="${dark}"/>${panels}${buttons}${label(name + ' · headboard', hex)}`, fabricDefs(hex));
}

// 4. Storage drawers in the divan base.
function drawers(name, hex) {
  const dark = shade(hex, -0.3);
  const drawer = (x) => `<rect x="${x}" y="230" width="250" height="150" rx="10" fill="url(#fab)" stroke="${dark}" stroke-width="3"/><rect x="${x + 95}" y="298" width="60" height="12" rx="6" fill="#b9a98f"/>`;
  return svg(`${ROOM}<rect x="80" y="190" width="640" height="240" rx="16" fill="url(#base)"/>${drawer(120)}${drawer(430)}
<rect x="100" y="428" width="24" height="20" fill="#3b342c"/><rect x="676" y="428" width="24" height="20" fill="#3b342c"/>
${label(name + ' · storage drawers', hex)}`, fabricDefs(hex));
}

// 5. Fabric close-up: woven texture in the colour.
function fabric(name, hex) {
  const lines = [];
  for (let y = 0; y < 600; y += 12) lines.push(`<rect x="0" y="${y}" width="800" height="5" fill="${shade(hex, y % 24 ? 0.08 : -0.08)}"/>`);
  for (let x = 0; x < 800; x += 14) lines.push(`<rect x="${x}" y="0" width="3" height="600" fill="${shade(hex, -0.12)}" opacity="0.35"/>`);
  return svg(`<rect width="800" height="600" fill="${hex}"/>${lines.join('')}${label(name + ' · fabric', hex)}`);
}

// Shared size chart (the same for every colour).
const sizes = svg(`${ROOM}
${[['2FT6', 75], ['3FT', 90], ['4FT', 120], ['4FT6', 135], ['5FT', 150], ['6FT', 180]].map(([s, w], i) =>
  `<rect x="${60 + i * 118}" y="${330 - w}" width="${w * 0.55}" height="${w}" rx="6" fill="none" stroke="#5b5248" stroke-width="3"/><text x="${60 + i * 118 + w * 0.275}" y="360" font-family="Arial" font-size="18" text-anchor="middle" fill="#5b5248">${s}</text>`).join('')}
<text x="400" y="80" font-family="Arial" font-size="26" text-anchor="middle" fill="#3b342c">Six sizes: Small Single to Super King</text>${label('Size guide')}`);

// All swatches on one card (decorative banner on the shop page).
const fabrics = svg(`${ROOM}${COLOURS.map(([n, h], i) =>
  `<circle cx="${160 + (i % 4) * 160}" cy="${190 + Math.floor(i / 4) * 170}" r="48" fill="${h}" stroke="#d6d0c6" stroke-width="3"/><text x="${160 + (i % 4) * 160}" y="${270 + Math.floor(i / 4) * 170}" font-family="Arial" font-size="15" text-anchor="middle" fill="#5b5248">${n}</text>`).join('')}`);

// Write everything (old files from earlier versions are removed first).
rmSync('public/images', { recursive: true, force: true });
for (const [name, hex] of COLOURS) {
  const dir = `public/images/colours/${slug(name)}`;
  mkdirSync(dir, { recursive: true });
  const views = { front, side, headboard, drawers, fabric };
  for (const [view, draw] of Object.entries(views)) writeFileSync(`${dir}/${view}.svg`, draw(name, hex));
}
writeFileSync('public/images/sizes.svg', sizes);
writeFileSync('public/images/fabrics.svg', fabrics);
console.log(`Wrote ${COLOURS.length} colours x 5 views + size chart + fabrics card.`);
