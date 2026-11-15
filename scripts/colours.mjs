// The 8 colours of the Prague bed (names from the reference page's swatch list).
// Shared by scripts/seed.mjs and scripts/make-placeholder-images.mjs so the
// list (and the file-name rule) lives in one place.
export const COLOURS = [
  ['Cream Naples', '#e6dcc6'],
  ['Charcoal Coniston', '#3d3f42'],
  ['Silver Plush Velvet', '#bfc1c3'],
  ['Seal Grey Naples', '#8a867e'],
  ['Emerald Coniston', '#1f5a45'],
  ['Pink Plush Velvet', '#e2b4b6'],
  ['Blue Plush Velvet', '#2e4868'],
  ['Black Naples', '#1f1f1f'],
];

// "Seal Grey Naples" -> "seal-grey-naples" (used for image folder names).
export const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

// The extra views every colour has (besides front.svg, its main image).
export const COLOUR_VIEWS = ['side', 'headboard', 'drawers', 'fabric'];
