# Handoff: OWCT 2026 Tournament Thumbnail Generator

## Overview

This is a design + implementation spec for a **single-page web app that runs on
GitHub Pages**. The app lets a user:

1. Type the two player names (Player 01, Player 02)
2. Upload an avatar image for each player (drag-and-drop or click)
3. Optionally edit the tournament line and "civ" subtitles
4. **See the YouTube thumbnail render live**, in real time, at 1280×720
5. Click **Download PNG** to save the rendered thumbnail to disk

The design is **the "HUD Overlay" thumbnail** (variation 02) from the
exploration deck — a cinematic Old World screenshot background with a
glassy bottom HUD bar showing both players, their avatars, and a glowing
gold "VS" divider.

The end goal is: the host of the "Old World Community Tournament 2026"
opens this page, types names, drops in two leader portraits, downloads
the PNG, and uploads it as the YouTube thumbnail for that episode.

## About the Design Files

The files in `reference/` are a **static HTML reference** showing the
intended design pixel-perfectly. They are **not** the app you're building
— they are the visual target. The app you build should reproduce this
look exactly, but be driven by live form inputs.

You can use any stack you want, but the constraints are:

- **Must work on GitHub Pages** — that means **static files only**, no
  build server, no Node runtime in production. A pure HTML/CSS/JS app is
  ideal; if you use a bundler (Vite, esbuild) the build output must be
  static and committable. If you use a framework, it must compile to
  static files.
- **No external API calls** — everything happens in the browser. Image
  upload is via `<input type="file">` + `FileReader` or
  `URL.createObjectURL()`. Image export is via `<canvas>` +
  `canvas.toBlob()`.
- **Recommended stack**: vanilla HTML/CSS/JS, or a single React file via
  the unpkg CDN, or Preact/Lit. Avoid Next.js/Remix.
- **Fonts**: Google Fonts via `<link>` — Cinzel, Inter, JetBrains Mono.

## Fidelity

**High-fidelity (hifi).** The reference file is pixel-perfect. Match
colors, typography, spacing, and effects exactly. Use the design tokens
listed below as constants.

## The App: Functional Spec

### Layout

Two-pane layout, side-by-side on desktop, stacked on mobile:

```
┌──────────────────────────┬────────────────────────┐
│                          │  Tournament Thumbnail  │
│                          │  ──────────────────    │
│   [ THUMBNAIL PREVIEW ]  │                        │
│   (1280×720, scaled to   │  Player 01 ──────────  │
│    fit the pane width)   │   [ name input ]       │
│                          │   [ avatar upload ]    │
│                          │                        │
│                          │  Player 02 ──────────  │
│                          │   [ name input ]       │
│                          │   [ avatar upload ]    │
│                          │                        │
│                          │  Caption ────────────  │
│                          │   [ tournament line ]  │
│                          │                        │
│                          │  ▼  Download PNG       │
└──────────────────────────┴────────────────────────┘
```

The preview must use the SAME DOM and CSS as the renderer — don't
maintain two implementations. Use `transform: scale()` on the preview
container to fit it to the viewport while keeping the underlying box at
exactly 1280×720.

### Inputs

| Field             | Default                       | Notes                       |
| ----------------- | ----------------------------- | --------------------------- |
| Player 01 name    | `Moovse`                      | Trim. Live-updates preview. |
| Player 01 avatar  | (placeholder text "avatar")   | Optional. See below.        |
| Player 02 name    | `Moose`                       | Trim. Live-updates preview. |
| Player 02 avatar  | (placeholder text "avatar")   | Optional.                   |
| Tournament line   | `Community Tournament 2026`   | Trim. Live-updates preview. |
| Civ subtitle 01   | `civ · placeholder`           | Optional, hide if blank.    |
| Civ subtitle 02   | `civ · placeholder`           | Optional, hide if blank.    |
| Part badge text   | `Part 1`                      | Off by default. Toggleable. |

### Avatar upload behavior

- Click the avatar slot OR drag-and-drop a file onto it.
- Accepted formats: PNG, JPG, WebP.
- Read with `FileReader.readAsDataURL()` and set as `<img src>`.
- Image must fit 140×140 with `object-fit: cover` (cropped to fit).
- A small **× remove** button appears once an avatar is set.
- If no avatar is provided, the slot displays the placeholder string
  "avatar" in the mono font at 11px / 0.18em letter-spacing.

### Name-size auto-fit

The Cinzel display font on the player name uses a base size of **60px**
that shrinks proportionally for long names. Implement this helper:

```js
// max = character count above which the size shrinks.
// base = font-size at or below max chars.
// min = floor; never go below this.
function fitName(name, { max = 12, base = 60, min = 32 } = {}) {
  if (name.length <= max) return base;
  return Math.max(min, Math.round(base * max / name.length));
}
```

Apply the result as an inline `font-size: <N>px` on `.cell__name`.

A stress-test name is `ThePurpleBullMoose` (18 chars). The layout MUST
hold for two of those at once.

### Download PNG

Use `html-to-image` (small, MIT-licensed, browser-only) or
`dom-to-image-more`:

```html
<script src="https://unpkg.com/html-to-image@1.11.13/dist/html-to-image.js"></script>
```

```js
import { toBlob } from 'html-to-image';

async function download() {
  const node = document.querySelector('.thumb');
  // Render at native 1280×720 regardless of preview scale:
  const blob = await toBlob(node, {
    width: 1280,
    height: 720,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: '#070d18',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Filename: OWCT-2026-<player1>-vs-<player2>.png
  const safe = s => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  a.download = `OWCT-2026-${safe(p1)}-vs-${safe(p2)}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
```

Critical considerations:
- The Cinzel/Inter/Mono fonts MUST be loaded BEFORE the download runs.
  Either use `document.fonts.ready` or `Promise.all` over each font face
  before calling `toBlob`.
- `backdrop-filter: blur(8px)` on the HUD bar does not always render in
  the PNG. Test in Chrome and Firefox; if blur disappears, swap to a
  pre-blurred semi-opaque background (`background: rgba(8,14,24,0.85)`
  with no blur) at export time.
- Pass `pixelRatio: 1` to ensure a true 1280×720 output (YouTube spec).
  If `pixelRatio: 2`, the file will be 2560×1440 — also fine for YouTube
  but doubles file size.

## Design Tokens

```css
:root {
  /* Color */
  --c-navy:         #0e1828;
  --c-navy-deep:    #070d18;
  --c-parchment:    #e7dcc1;
  --c-parchment-hi: #f5ecd3;
  --c-gold:         #c9a352;
  --c-gold-hi:      #e3c477;
  --c-crimson:      #8c2a33;
  --c-crimson-deep: #5a161c;
  --hud-glass:      rgba(8, 14, 24, 0.74);

  /* Type */
  --f-display: 'Cinzel', 'Trajan Pro', 'Times New Roman', serif;
  --f-ui:      'Inter', system-ui, sans-serif;
  --f-mono:    'JetBrains Mono', ui-monospace, monospace;
}
```

Google Fonts URL:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

## The Thumbnail — Exact Layout (1280 × 720)

All coordinates assume a 1280×720 box with `position: relative`. Every
internal element is `position: absolute` unless noted.

### Stack order (z-axis, bottom → top)

1. Background image (fort painting)
2. Vertical scrim gradient
3. Top stack (logo + tournament caption)
4. Bottom HUD bar
5. (Optional) Part badge

### 1. Background

- `<img>` filling the full 1280×720.
- `object-fit: cover; object-position: center 30%;`
- Source: `assets/fort.png` (Old World Chittor Fort painting,
  included in this handoff).

### 2. Scrim gradient

- Full-canvas overlay, no pointer events.
- `linear-gradient(180deg, rgba(7,13,24,0.62) 0%, rgba(7,13,24,0) 28%, rgba(7,13,24,0) 50%, rgba(7,13,24,0.92) 95%)`
- This darkens the top (for the logo) and the bottom (under the HUD).

### 3. Top stack

- Positioned `top: 30px; left: 0; right: 0;`.
- Flex column, centered, `gap: 6px`.
- Children, in order:
  1. **OWCT logo** — `assets/owct-logo.png`, `width: 520px; height: auto;`,
     filter: `drop-shadow(0 0 20px rgba(231,196,119,0.35)) drop-shadow(0 4px 18px rgba(0,0,0,0.7))`
  2. **Tournament caption** — Cinzel 22px / 600, color `var(--c-gold-hi)`,
     `letter-spacing: 0.34em; text-transform: uppercase;`,
     `text-shadow: 0 2px 8px rgba(0,0,0,0.8);`

### 4. Bottom HUD bar

- Positioned `left: 40px; right: 40px; bottom: 40px; height: 200px;`.
- Background: `var(--hud-glass)` (rgba(8,14,24,0.74))
- `backdrop-filter: blur(8px)` (with `-webkit-` prefix)
- Border: `1.5px solid var(--c-gold)`
- Box-shadow:
  `0 0 0 1px rgba(0,0,0,0.4), inset 0 1px 0 rgba(231,196,119,0.18)`
- Grid: `grid-template-columns: 1fr 120px 1fr; align-items: stretch;`

**HUD grid contents — left to right:**

#### Player cell (left)
- `padding: 0 28px; gap: 22px; flex-direction: row;`
- **Avatar** — 140×140, `border-radius: 14px`, 1.5px gold border,
  `background: rgba(255,255,255,0.04)`. When empty, mono-font "avatar"
  text at 11px / 0.18em / `rgba(231,196,119,0.55)`.
- **Text block** — flex 1, left-aligned, min-width 0:
  - **Role**: `PLAYER · 01` — mono 13px / 500 / 0.32em /
    `rgba(231,196,119,0.7)`, uppercase, `margin-bottom: 6px`.
  - **Name**: Cinzel 700, line-height 1, `letter-spacing: -0.005em`,
    color `var(--c-parchment-hi)`,
    `text-shadow: 0 2px 12px rgba(0,0,0,0.6)`,
    white-space nowrap / overflow hidden / text-overflow ellipsis.
    Font-size from `fitName()` — base 60.
  - **Civ subtitle**: mono 12px / 500 / 0.2em /
    `rgba(231,220,193,0.55)`, uppercase, `margin-top: 8px`.
    Prefix with `› ` on the left cell.

#### VS column
- Width 120px (set by the grid).
- Two vertical gold gradient lines as `::before` / `::after`, at left and
  right edges, top: 18px, bottom: 18px, width 1px,
  `linear-gradient(180deg, transparent, rgba(231,196,119,0.6), transparent)`.
- The **VS** text: Cinzel 64px / 700, color `var(--c-gold-hi)`,
  `letter-spacing: 0.05em`,
  `text-shadow: 0 0 24px rgba(231,196,119,0.4)`.

#### Player cell (right)
- Same as left, but `flex-direction: row-reverse;` and
  `text-align: right;`. Role text is `PLAYER · 02`.
- Civ subtitle prefix is `‹ ` on the **right** (suffix).

### 5. Optional Part badge

- `top: 24px; right: 32px;`
- `padding: 6px 16px;`
- Background: `var(--c-crimson)`, color `var(--c-parchment-hi)`.
- Cinzel 18px / 600, `letter-spacing: 0.3em`, uppercase.

## Interactions & Behavior

- **Live preview**: every input change (text, file upload, toggle)
  updates the rendered thumbnail in the same paint frame. Debouncing is
  not needed at this scale.
- **Persistence**: store the form state in `localStorage` under
  `owct-thumb-state` so a refresh doesn't wipe a half-built thumbnail.
  Re-hydrate on load. Image data URLs are fine to store, but warn if
  the user uploads a huge image (>2MB) — downscale to 280×280 max before
  saving to localStorage to stay under the quota.
- **Drag-and-drop**: prevent default on `dragover`, handle `drop` on the
  avatar slot. Highlight the slot with a brighter gold border while a
  file is being dragged over it.
- **Mobile**: stack the preview above the form. Preview should scale
  down with `transform: scale(min(1, viewportWidth / 1280))`.

## State Management

For a vanilla-JS implementation, a single object is fine:

```js
const state = {
  player1: { name: 'Moovse', avatarDataUrl: null, civ: '' },
  player2: { name: 'Moose',  avatarDataUrl: null, civ: '' },
  tournament: 'Community Tournament 2026',
  showPart: false,
  partLabel: 'Part 1',
};
```

Whenever `state` changes, call `render()` which updates the live DOM.
No virtual DOM needed.

## Assets

In `reference/assets/`:

- `fort.png` — Chittor Fort painting from the existing Old World
  community tournament template. Use this as the background. License:
  it was provided by the user (the tournament organizer); if you want to
  swap in a different in-game screenshot, this is the slot to do it.
- `owct-logo.png` — "Old World — Empires of the Indus / Community
  Tournament" combination logo, designed for use on dark backgrounds.
  Has built-in transparency.

Both assets should be committed to the repo and referenced with relative
paths (`./assets/fort.png`, etc.).

## Files in this Handoff

```
design_handoff_owct_thumbnail/
├── README.md                          ← you are here
└── reference/
    ├── thumbnail.html                 ← static design reference (1280×720)
    ├── preview.png                    ← rendered screenshot of the design
    └── assets/
        ├── fort.png                   ← background image
        └── owct-logo.png              ← tournament logo
```

Open `reference/thumbnail.html` in a browser to see the design at native
resolution. All CSS is inline at the top of that file — use it as the
authoritative source for class names, selectors, and exact CSS values.

## Suggested Build Order

1. Get the static thumbnail rendering in your app (copy reference HTML,
   replace asset paths). Confirm it looks identical to `preview.png`.
2. Wire the four text fields. Make sure `fitName()` works for the
   stress-test name (`ThePurpleBullMoose` × 2).
3. Wire the avatar uploads (click + drag-and-drop).
4. Add the Download PNG button using `html-to-image`. Verify the
   downloaded file is 1280×720 and that fonts are baked in (not
   substituted with serif fallbacks).
5. Add localStorage persistence.
6. Test in Chrome + Firefox + Safari. Pay attention to the
   `backdrop-filter` — Safari may need the `-webkit-` prefix; older
   Firefox renders it incorrectly during PNG export and may need a
   no-blur fallback.

## Future Enhancements (out of scope, but worth noting)

- Toggle to switch to other thumbnail layouts (Slab Stack, Type Forward,
  etc. — see the source project for more variations).
- Background image upload, so the user can drop in a different Old
  World screenshot per episode.
- Preset list of nation colors / leaders.
- "Copy share link" that encodes state in the URL hash.
