/* =========================================================
   OWCT 2026 thumbnail generator — vanilla JS, no build step.

   Data flow:
     state ──(render)──▶ .thumb DOM ──(html-to-image)──▶ PNG
                            │
                            └── also shown in preview, scaled
   ========================================================= */

// Nation roster — pulled from owreference/src/data/nations.json (colors)
// and ../owreference/public/img/crests/ (crest images).
// Embedded inline so the site is fully static (no fetch needed).
const NATIONS = [
  { slug: 'aksum',     name: 'Aksum',     color: '#f8a3b4' },
  { slug: 'assyria',   name: 'Assyria',   color: '#fadc3b' },
  { slug: 'babylonia', name: 'Babylonia', color: '#82c83e' },
  { slug: 'carthage',  name: 'Carthage',  color: '#f6efe1' },
  { slug: 'egypt',     name: 'Egypt',     color: '#bc6304' },
  { slug: 'greece',    name: 'Greece',    color: '#2360bc' },
  { slug: 'hittite',   name: 'Hittite',   color: '#80e3e8' },
  { slug: 'kush',      name: 'Kush',      color: '#ffffb6' },
  { slug: 'maurya',    name: 'Maurya',    color: '#a749ff' },
  { slug: 'persia',    name: 'Persia',    color: '#c04e4a' },
  { slug: 'rome',      name: 'Rome',      color: '#880d56' },
  { slug: 'tamil',     name: 'Tamil',     color: '#00b281' },
  { slug: 'yuezhi',    name: 'Yuezhi',    color: '#ad7e00' },
  // crest files exist for hyksos + mitanni too; uncomment if you want them.
  // { slug: 'hyksos',  name: 'Hyksos',  color: '#888' },
  // { slug: 'mitanni', name: 'Mitanni', color: '#888' },
];
const NATIONS_BY_SLUG = Object.fromEntries(NATIONS.map(n => [n.slug, n]));
const crestPath = slug => `./assets/crests/${slug}.png`;

const LS_KEY = 'owct-thumb-state-v3';

const DEFAULT_STATE = {
  player1: { name: 'Player 1', nation: 'persia', customAvatar: null },
  player2: { name: 'Player 2', nation: 'greece', customAvatar: null },
  tournament: 'Community Tournament 2026',
  showPart: false,
  partLabel: 'Part 1',
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...parsed };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) {
    // localStorage full (probably from a giant custom avatar). Drop the avatars and retry.
    console.warn('localStorage save failed, dropping custom avatars', e);
    const slim = structuredClone(state);
    slim.player1.customAvatar = null;
    slim.player2.customAvatar = null;
    try { localStorage.setItem(LS_KEY, JSON.stringify(slim)); } catch {}
  }
}

/* ---------- helpers ---------- */

// From the design spec.
function fitName(name, { max = 12, base = 60, min = 32 } = {}) {
  const n = (name || '').length;
  if (n <= max) return base;
  return Math.max(min, Math.round(base * max / n));
}

// Safe filename fragment.
const safeName = s => (s || 'player').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'player';

// Downscale an image File → data URL so it fits within `max` px on the long side.
// Keeps localStorage quotas happy and exports faster.
async function fileToScaledDataUrl(file, max = 280) {
  const img = await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
    im.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    im.src = url;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  // PNG to preserve transparency for portraits with alpha.
  return canvas.toDataURL('image/png');
}

/* ---------- DOM refs ---------- */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const refs = {
  thumb:           $('#thumb'),
  previewFrame:    $('#previewFrame'),
  tournamentLine:  $('#tournamentLine'),
  partBadge:       $('#partBadge'),
  cells: {
    1: { avatar: $('#avatar1'), name: $('#name1'), civ: $('#civ1') },
    2: { avatar: $('#avatar2'), name: $('#name2'), civ: $('#civ2') },
  },
  ctrls: {
    tournament:    $('#tournamentInput'),
    showPart:      $('#showPartInput'),
    partLabel:     $('#partLabelInput'),
  },
};

/* ---------- render ---------- */

function render() {
  refs.tournamentLine.textContent = state.tournament || '';
  refs.partBadge.hidden = !state.showPart;
  refs.partBadge.textContent = state.partLabel || '';

  for (const id of [1, 2]) {
    const player = state[`player${id}`];
    const cell = refs.cells[id];

    // Name + auto-fit
    cell.name.textContent = player.name || '';
    cell.name.style.fontSize = fitName(player.name) + 'px';

    // Civ subtitle: nation name, with directional arrow per side.
    const nation = NATIONS_BY_SLUG[player.nation];
    if (nation) {
      const arrow = id === 1 ? '› ' : ' ‹';
      const civText = nation.name.toUpperCase();
      cell.civ.textContent = id === 1 ? (arrow + civText) : (civText + arrow);
    } else {
      cell.civ.textContent = '';
    }

    // Avatar: customAvatar (data URL) overrides crest. Else show crest. Else placeholder.
    cell.avatar.innerHTML = '';
    cell.avatar.classList.remove('cell__avatar--empty', 'cell__avatar--crest');
    cell.avatar.style.borderColor = nation ? nation.color : 'var(--c-gold)';

    if (player.customAvatar) {
      const img = document.createElement('img');
      img.src = player.customAvatar;
      img.alt = '';
      cell.avatar.appendChild(img);
    } else if (nation) {
      const img = document.createElement('img');
      img.src = crestPath(nation.slug);
      img.alt = nation.name + ' crest';
      img.crossOrigin = 'anonymous';
      cell.avatar.classList.add('cell__avatar--crest');
      cell.avatar.appendChild(img);
    } else {
      cell.avatar.classList.add('cell__avatar--empty');
      const s = document.createElement('span');
      s.className = 'cell__avatar-placeholder';
      s.textContent = 'avatar';
      cell.avatar.appendChild(s);
    }

    // Right-pane mirror: avatar thumb + current-nation label + clear button visibility.
    const thumb = document.querySelector(`.avatar-thumb[data-player="${id}"]`);
    const clearBtn = document.querySelector(`.js-clear-btn[data-player="${id}"]`);
    const nationCurrent = document.querySelector(`.js-nation-current[data-player="${id}"]`);
    nationCurrent.textContent = nation ? nation.name : '';

    thumb.innerHTML = '';
    thumb.classList.remove('has-crest');
    thumb.style.borderColor = nation ? nation.color : '';
    if (player.customAvatar) {
      const img = document.createElement('img');
      img.src = player.customAvatar;
      thumb.appendChild(img);
      clearBtn.hidden = false;
    } else if (nation) {
      const img = document.createElement('img');
      img.src = crestPath(nation.slug);
      thumb.classList.add('has-crest');
      thumb.appendChild(img);
      clearBtn.hidden = true;
    } else {
      const s = document.createElement('span');
      s.className = 'avatar-thumb__empty';
      s.textContent = 'crest';
      thumb.appendChild(s);
      clearBtn.hidden = true;
    }

    // Nation grid selected state.
    document.querySelectorAll(`.js-nation-grid[data-player="${id}"] .nation-chip`).forEach(chip => {
      chip.classList.toggle('is-selected', chip.dataset.nation === player.nation);
    });
  }

  saveState();
}

/* ---------- preview scaling ---------- */

function fitPreview() {
  const frame = refs.previewFrame;
  const w = frame.clientWidth;
  const scale = w / 1280;
  refs.thumb.style.transform = `scale(${scale})`;
  // The .thumb is positioned absolutely top:0 left:0 inside .preview-frame,
  // so scaling from top-left fills the frame. Height tracks via aspect-ratio on .preview-frame.
}
window.addEventListener('resize', fitPreview);

/* ---------- nation grid build ---------- */

function buildNationGrids() {
  for (const id of [1, 2]) {
    const grid = document.querySelector(`.js-nation-grid[data-player="${id}"]`);
    grid.innerHTML = '';
    for (const n of NATIONS) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'nation-chip';
      chip.dataset.nation = n.slug;
      chip.title = n.name;

      const img = document.createElement('img');
      img.src = crestPath(n.slug);
      img.alt = n.name;
      chip.appendChild(img);

      const tip = document.createElement('span');
      tip.className = 'nation-chip__tooltip';
      tip.textContent = n.name;
      chip.appendChild(tip);

      chip.addEventListener('click', () => {
        const player = state[`player${id}`];
        // Toggle off if clicking the already-selected nation.
        player.nation = (player.nation === n.slug) ? null : n.slug;
        render();
      });
      grid.appendChild(chip);
    }
  }
}

/* ---------- input wiring ---------- */

function wireInputs() {
  refs.ctrls.tournament.value = state.tournament;
  refs.ctrls.tournament.addEventListener('input', e => {
    state.tournament = e.target.value;
    render();
  });

  refs.ctrls.showPart.checked = state.showPart;
  refs.ctrls.showPart.addEventListener('change', e => {
    state.showPart = e.target.checked;
    render();
  });

  refs.ctrls.partLabel.value = state.partLabel;
  refs.ctrls.partLabel.addEventListener('input', e => {
    state.partLabel = e.target.value;
    render();
  });

  // Per-player name inputs
  $$('.js-name').forEach(input => {
    const id = input.dataset.player;
    input.value = state[`player${id}`].name;
    input.addEventListener('input', e => {
      state[`player${id}`].name = e.target.value;
      render();
    });
  });

  // Per-player upload (click button → trigger hidden file input)
  $$('.js-upload-btn').forEach(btn => {
    const id = btn.dataset.player;
    const fileInput = document.querySelector(`.js-file[data-player="${id}"]`);
    btn.addEventListener('click', () => fileInput.click());
  });

  // Per-player file input
  $$('.js-file').forEach(input => {
    const id = input.dataset.player;
    input.addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await fileToScaledDataUrl(file);
        state[`player${id}`].customAvatar = dataUrl;
        render();
      } catch (err) {
        console.error(err);
        alert('Could not read that image.');
      }
      e.target.value = '';
    });
  });

  // Per-player clear button → drop custom avatar (revert to crest)
  $$('.js-clear-btn').forEach(btn => {
    const id = btn.dataset.player;
    btn.addEventListener('click', () => {
      state[`player${id}`].customAvatar = null;
      render();
    });
  });

  // Per-player drop zone (the small thumb on the right pane)
  $$('.avatar-thumb.js-avatar-drop').forEach(zone => {
    const id = zone.dataset.player;
    const fileInput = document.querySelector(`.js-file[data-player="${id}"]`);

    zone.addEventListener('click', () => fileInput.click());

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('is-dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
    zone.addEventListener('drop', async e => {
      e.preventDefault();
      zone.classList.remove('is-dragover');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file || !/^image\//.test(file.type)) return;
      try {
        const dataUrl = await fileToScaledDataUrl(file);
        state[`player${id}`].customAvatar = dataUrl;
        render();
      } catch (err) {
        console.error(err);
      }
    });
  });
}

/* ---------- download ---------- */

const dlBtn = $('#downloadBtn');
const dlHint = $('#downloadHint');

dlBtn.addEventListener('click', async () => {
  dlBtn.disabled = true;
  const originalText = dlBtn.textContent;
  dlBtn.textContent = 'Rendering…';

  try {
    // 1. Wait for fonts so Cinzel doesn't fall back to a serif in the export.
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    // 2. Wait for every <img> inside .thumb to be fully loaded.
    await Promise.all(
      Array.from(refs.thumb.querySelectorAll('img')).map(img =>
        img.complete && img.naturalWidth > 0
          ? Promise.resolve()
          : new Promise(res => {
              img.addEventListener('load', res, { once: true });
              img.addEventListener('error', res, { once: true });
            })
      )
    );

    // 3. Swap the preview into export mode (solid HUD bg — backdrop-filter
    //    rarely survives html-to-image; .exporting class swaps in a solid fill).
    refs.thumb.classList.add('exporting');

    // 4. Temporarily reset the preview transform so we capture the native box.
    //    html-to-image traverses the source DOM at its real size, but a scale()
    //    transform on the root can confuse some browsers' bbox math.
    const prevTransform = refs.thumb.style.transform;
    refs.thumb.style.transform = 'scale(1)';
    // Hide overflow on the parent to prevent the unscaled box from briefly painting outside the frame.
    const prevOverflow = refs.previewFrame.style.overflow;
    refs.previewFrame.style.overflow = 'hidden';

    let blob;
    try {
      blob = await htmlToImage.toBlob(refs.thumb, {
        width: 1280,
        height: 720,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: '#070d18',
      });
    } finally {
      refs.thumb.style.transform = prevTransform;
      refs.previewFrame.style.overflow = prevOverflow;
      refs.thumb.classList.remove('exporting');
    }

    if (!blob) throw new Error('toBlob returned null');

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OWCT-2026-${safeName(state.player1.name)}-vs-${safeName(state.player2.name)}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    dlHint.textContent = `Saved ${a.download}`;
  } catch (err) {
    console.error(err);
    alert('Export failed: ' + (err.message || err));
  } finally {
    dlBtn.disabled = false;
    dlBtn.textContent = originalText;
  }
});

$('#resetBtn').addEventListener('click', () => {
  if (!confirm('Reset all fields to defaults?')) return;
  state = structuredClone(DEFAULT_STATE);
  // Sync the form fields back to defaults.
  refs.ctrls.tournament.value = state.tournament;
  refs.ctrls.showPart.checked = state.showPart;
  refs.ctrls.partLabel.value = state.partLabel;
  $$('.js-name').forEach(input => { input.value = state[`player${input.dataset.player}`].name; });
  render();
});

/* ---------- boot ---------- */

buildNationGrids();
wireInputs();
render();
// Wait one frame so layout settles before measuring.
requestAnimationFrame(fitPreview);
// And once again after fonts load (logo width may shift things).
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(fitPreview);
}
