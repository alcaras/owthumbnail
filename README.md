# OWCT 2026 Thumbnail Generator

Single-page static site for generating YouTube thumbnails for the **Old World
Community Tournament 2026**. Pick two players, choose their nations (crests
and colors from the in-game data), optionally override the avatar with a
custom image, and download a 1280×720 PNG.

**Live:** https://alcaras.github.io/owthumbnail/

## Run locally

```sh
python3 -m http.server 8765
# open http://localhost:8765/
```

No build step. Pure HTML / CSS / vanilla JS. The only runtime dependency is
[`html-to-image`](https://github.com/bubkoo/html-to-image), loaded from unpkg
for the PNG export.

## Files

```
index.html                       single page, preview + controls
styles.css                       design tokens + thumbnail + app shell
app.js                           state, nation picker, upload, PNG export
assets/
  fort.png                       background painting (from design handoff)
  owct-logo.png                  tournament logo (from design handoff)
  crests/*.png                   nation crests (from the owreference project)
design_handoff_owct_thumbnail/   original design spec — pixel-perfect reference
```

## Credits

- Design handoff (HUD Overlay layout, color tokens, typography) — see
  `design_handoff_owct_thumbnail/README.md` for the full spec.
- Nation crests and colors — sourced from the
  [owreference](https://github.com/alcaras/owreference) project.
