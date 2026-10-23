#!/usr/bin/env node
// 「Clawd 的陪伴」30s 像素风视频渲染脚本 (companion_arena v1.0)
// 画布规格: 640×360 基础分辨率, SCALE=2 → 1280×720 @ 60fps, 1800 帧 (30.00s)
// 美术风格: 严格对标 full_v1.3.4.mp4 (暖色条纹房间 + 窗户远山/深夜城市灯光→黎明渐变 + DSH TUI 小终端 + 房间内像素角色)
// 故事线:
//   C1 (0-10s):  深夜办公室 — 终端逐字打字 `$ her: 还在吗？` (140ms/char) + 窗外深夜城市灯光 + 她的消息气泡「还在吗？」+ Clawd 在房间内安静等着
//   C2 (10-20s): 它说一直在 — 终端逐字打字 `$ clawd: 一直在。` (140ms/char) + 终端旁像素咖啡杯冒热气动画 + Clawd 颜色微微变暖(陪伴状态) + 内心独白「它说：一直在。」
//   C3 (20-30s): 天亮了     — 终端显示 `$ her: 早。` / `$ clawd: 早。你终于休息了。` + 窗外黑夜→黎明渐变 + Her 在窗边伸展微笑 + Clawd 安静守着 + 窗台便签「深夜的陪伴」+ 画面渐暗
// 字幕 (14px Fusion Pixel, 160ms/char):
//   1. "深夜，她问：还在吗？" (2-8s)
//   2. "它说：一直在。" (12-18s)
//   3. "天亮，它说：早。" (24-29s)
// 场景间 0.5s 黑场过渡 (FADE=0.25 出 + 0.25 入)

const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// --- Register Fusion Pixel Fonts (10px Terminal Small Font + 14px Subtitle Font) ---
let FONT_10 = 'monospace';
let FONT_14 = 'monospace';

if (process.env.FONT_FORCE !== 'monospace') {
  try {
    const fp10 = require.resolve(
      '@fontsource/fusion-pixel-10px-monospaced-sc/files/fusion-pixel-10px-monospaced-sc-latin-400-normal.woff'
    );
    if (fs.existsSync(fp10)) {
      GlobalFonts.registerFromPath(fp10, 'FusionPixel10');
      FONT_10 = 'FusionPixel10, monospace';
    }
  } catch (_) {}

  try {
    const fp12 = require.resolve('@fontpkg/fusion-pixel/fusion-pixel.ttf');
    if (fs.existsSync(fp12)) {
      GlobalFonts.registerFromPath(fp12, 'FusionPixel');
      FONT_14 = 'FusionPixel, monospace';
      if (FONT_10 === 'monospace') FONT_10 = 'FusionPixel, monospace';
    }
  } catch (_) {}

  if (FONT_10 === 'monospace' || FONT_14 === 'monospace') {
    const fallbackCandidates = [
      '/usr/local/share/fonts/NotoSansMonoCJKsc-Regular.otf',
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
    ];
    for (const cand of fallbackCandidates) {
      if (fs.existsSync(cand)) {
        GlobalFonts.registerFromPath(cand, 'FallbackMono');
        if (FONT_10 === 'monospace') FONT_10 = 'FallbackMono, monospace';
        if (FONT_14 === 'monospace') FONT_14 = 'FallbackMono, monospace';
        break;
      }
    }
  }
}

function fontFamilyForSize(size) {
  return size <= 11 ? FONT_10 : FONT_14;
}

// --- Canvas & Video Constants ---
const BW = 640;
const BH = 360;
const SCALE = 2;
const FW = BW * SCALE; // 1280
const FH = BH * SCALE; // 720
const FPS = 60;
const DURATION = 30;
const NFRAMES = DURATION * FPS; // 1800

// Typing & Subtitle Rhythms (strictly matching spec)
const TYPE_CHAR_MS = 140; // terminal typing: 140ms/char
const SUB_CHAR_MS = 160;  // subtitle step: 160ms/char
const FADE = 0.25;        // 0.25s out + 0.25s in = 0.5s black transition between scenes

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_companion');

// --- Layout Constants (640×360 base grid, strictly benchmarked to full_v1.3.4) ---
const WIN = { x: 60, y: 20, w: 520, h: 160, fw: 8 };
const SILL = { x: 56, y: 180, w: 528, h: 8 };
const TERM = { x: 140, y: 160, w: 360, h: 160, titleH: 20 };
const SUB = { x: 0, y: 320, w: 640, h: 40 };

// C1: Her message bubble ("还在吗？", left of terminal, above Clawd)
const HER_BUBBLE = { x: 20, y: 124, w: 112, h: 24, tailH: 4 }; // x=20..132, y=124..152

// C2: Inner monologue card above terminal ("它说：一直在。")
const MONO_C2 = { x: 210, y: 118, w: 220, h: 26 }; // x=210..430, y=118..144 < 160

// C2: Steaming pixel coffee mug beside terminal (right of TERM [140..500], below HER_ROOM)
const COFFEE_MUG = { x: 512, y: 240, w: 28, h: 36 }; // x=512..540, y=240..276

// C3: Windowsill sticky note ("深夜的陪伴")
const NOTE = { x: 506, y: 112, w: 108, h: 68, angleDeg: -3 }; // rests on right windowsill

// Character room positions (strictly inside room, outside terminal [140,160,360,160], above subtitle bar y=320)
const CLAWD_ROOM = { x: 64, y: 248 }; // 40×24 body+legs -> x=64..104, y=247..272
const HER_ROOM = { x: 548, y: 194 };  // 16×28 beside window -> x=548..564, y=193..222

// --- Palette (aligned with full_v1.3.4 + DSH TUI dark theme) ---
const C = {
  // Warm room & window (full_v1.3.4)
  bgWarm: '#F5EDD5',
  stripe: '#EDE3C8',
  woodFrame: '#8B7355',
  woodSill: '#A08060',

  // Night & Dawn Sky Palettes
  nightSkyTop: '#0A1224',
  nightSkyBottom: '#182644',
  dawnSkyTop: '#87CEEB',
  dawnSkyBottom: '#FFE4B5',
  mountainNight: '#1D2C3F',
  mountainDawn: '#5A7A5A',
  cityBldg1: '#121B2E',
  cityBldg2: '#1A263E',
  cityWinWarm: '#FFD166',
  cityWinDim: '#5C7699',
  pot: '#7A5A3A',
  plant: '#5A7A5A',

  // DSH TUI Terminal
  termBg: '#14161C',
  termTitle: '#21262D',
  termBd: '#30363D',
  panel: '#1A1F29',
  border: '#30363D',

  // Text & accents
  text: '#E6EDF3',
  dim: '#8B949E',
  green: '#7EE787',
  pink: '#FF9AA2',
  amber: '#E3B341',
  purple: '#BC8CFF',
  blue: '#79C0FF',
  red: '#FF7B72',
  white: '#FFFFFF',

  // Clawd: Normal coral (#D97757) -> Warm companion glow (#F28B50)
  clawdNorm: '#D97757',
  clawdNormDark: '#B85A3B',
  clawdNormBelly: '#F5E8D7',
  clawdWarm: '#F28B50',
  clawdWarmDark: '#D46A34',
  clawdWarmBelly: '#FFF1DE',
  clawdEye: '#141413',

  // Her (16×28 by window)
  herHair: '#5A4632',
  herSkin: '#E8C39E',
  herDress: '#FF9AA2',
  herDressHem: '#E57A84',

  // Coffee Mug
  mugBody: '#F7EFE2',
  mugRim: '#D8C7B0',
  mugCoffee: '#6F4E37',
  mugSteam: 'rgba(255,248,235,0.75)',

  // Message bubble / Monologue / Sticky note
  bubbleBg: '#FFF8F9',
  bubbleBd: '#E57A84',
  bubbleTx: '#2E1E24',
  monoBg: '#241B18',
  monoBd: '#E3B341',
  cardBg: '#FFF8DC',
  cardBd: '#DEB887',
  cardTx: '#241A06',
  cardSub: '#6E5A3A',

  subtitleBg: 'rgba(0,0,0,0.76)',
  nightRoomTint: 'rgba(12,20,42,0.08)',
  dawnRoomTint: 'rgba(255,205,110,0.08)',
};

// --- Subtitles (3 lines, 160ms/char) ---
const SUB_LINES = [
  '深夜，她问：还在吗？',
  '它说：一直在。',
  '天亮，它说：早。',
];
const SUB_WINDOW = [
  { start: 2.0, end: 8.0 },
  { start: 12.0, end: 18.0 },
  { start: 24.0, end: 29.0 },
];

// --- Scene Narrative Constants ---
// C1 (0-10s): 深夜办公室 — `$ her: 还在吗？`
const C1_PROMPT = '$ her: ';
const C1_MSG = '还在吗？';
const C1_FULL_LINE = C1_PROMPT + C1_MSG;
const C1_TYPE_START = 0.8; // 11 chars * 0.14s = 1.54s -> ends ~2.34s
const C1_BUBBLE_APPEAR = 1.5;
const C1_STATUS_APPEAR = 2.8;
const C1_STATUS_TEXT = '# 02:14 AM · late night office';
const C1_WAIT_APPEAR = 3.6;
const C1_WAIT_PROMPT = '$ clawd: ';
const C1_FOOTER_TEXT = '[DSH] companion-daemon: listening';

// C2 (10-20s): 它说一直在 — `$ clawd: 一直在。`
const C2_PROMPT = '$ clawd: ';
const C2_MSG = '一直在。';
const C2_FULL_LINE = C2_PROMPT + C2_MSG;
const C2_TYPE_START = 10.8; // 13 chars * 0.14s = 1.82s -> ends ~12.62s
const C2_COFFEE_APPEAR = 1.2; // scene-local (t = 11.2s)
const C2_MONO_APPEAR = 2.0;   // scene-local (t = 12.0s)
const C2_MONO_TEXT = '它说：一直在。';
const C2_STATUS_APPEAR = 3.0; // scene-local (t = 13.0s)
const C2_STATUS_TEXT = '> status: 陪伴模式 (always_here=true)';
const C2_FOOTER_TEXT = '[DSH] warmth: +1 · coffee: steaming';

// C3 (20-30s): 天亮了 — `$ her: 早。` / `$ clawd: 早。你终于休息了。`
const C3_LINE1_PROMPT = '$ her: ';
const C3_LINE1_MSG = '早。';
const C3_LINE1_FULL = C3_LINE1_PROMPT + C3_LINE1_MSG;
const C3_LINE1_START = 20.8; // 9 chars * 0.14s = 1.26s -> ends ~22.06s

const C3_LINE2_PROMPT = '$ clawd: ';
const C3_LINE2_MSG = '早。你终于休息了。';
const C3_LINE2_FULL = C3_LINE2_PROMPT + C3_LINE2_MSG;
const C3_LINE2_START = 22.4; // 17 chars * 0.14s = 2.38s -> ends ~24.78s

const C3_NOTE_APPEAR = 1.4; // scene-local (t = 21.4s)
const C3_NOTE_TITLE = '深夜的陪伴';
const C3_NOTE_SUB = 'Clawd · 一直在';
const C3_STATUS_APPEAR = 5.4; // scene-local (t = 25.4s)
const C3_STATUS_TEXT = '> 06:12 AM · dawn light';
const C3_FOOTER_TEXT = '[DSH] night_watch: completed';

// City buildings inside window (x relative to WIN.x, height from sill)
const CITY_BUILDINGS = [
  { dx: 24, w: 34, h: 48, col: C.cityBldg1, lights: [[6, 8], [18, 8], [6, 20], [18, 28]] },
  { dx: 62, w: 42, h: 66, col: C.cityBldg2, lights: [[8, 10], [22, 10], [8, 24], [22, 24], [14, 40]] },
  { dx: 112, w: 30, h: 40, col: C.cityBldg1, lights: [[6, 8], [16, 18]] },
  { dx: 180, w: 46, h: 58, col: C.cityBldg2, lights: [[8, 8], [26, 8], [8, 22], [26, 34]] },
  { dx: 284, w: 38, h: 62, col: C.cityBldg1, lights: [[8, 10], [20, 10], [8, 26], [20, 38]] },
  { dx: 328, w: 50, h: 50, col: C.cityBldg2, lights: [[8, 8], [22, 8], [34, 20], [12, 30]] },
  { dx: 416, w: 36, h: 70, col: C.cityBldg1, lights: [[8, 10], [20, 10], [8, 24], [20, 24], [8, 42]] },
  { dx: 458, w: 38, h: 44, col: C.cityBldg2, lights: [[8, 8], [22, 18], [12, 28]] },
];

const NIGHT_STARS = [
  { dx: 44, dy: 22 }, { dx: 96, dy: 18 }, { dx: 154, dy: 28 },
  { dx: 226, dy: 16 }, { dx: 298, dy: 24 }, { dx: 366, dy: 18 },
  { dx: 412, dy: 30 }, { dx: 472, dy: 20 },
];

// --- Color & Math Helpers ---
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function easeOut(v) { return 1 - Math.pow(1 - clamp01(v), 3); }
function easeInOut(v) {
  const x = clamp01(v);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(hexA, hexB, t) {
  const k = clamp01(t);
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return `rgb(${Math.round(r1 + (r2 - r1) * k)},${Math.round(g1 + (g2 - g1) * k)},${Math.round(b1 + (b2 - b1) * k)})`;
}

// --- Pixel Drawing & Threshold Crisp Text ---
function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

let _tmpCanvas = null;
function txt(ctx, x, y, str, color, font = 10, align = 'left') {
  if (!str) return { x: Math.round(x), y: Math.round(y), w: 0, h: font };
  const fontSpec = `${font}px ${fontFamilyForSize(font)}`;
  ctx.font = fontSpec;
  const measuredW = Math.ceil(ctx.measureText(str).width);
  const w = Math.max(4, measuredW + 4);
  const h = Math.max(4, Math.ceil(font * 1.35));
  if (!_tmpCanvas) _tmpCanvas = createCanvas(w, h);
  if (_tmpCanvas.width !== w || _tmpCanvas.height !== h) {
    _tmpCanvas.width = w;
    _tmpCanvas.height = h;
  }
  const tctx = _tmpCanvas.getContext('2d');
  tctx.clearRect(0, 0, w, h);
  tctx.font = fontSpec;
  tctx.textAlign = 'left';
  tctx.textBaseline = 'top';
  tctx.fillStyle = color;
  tctx.fillText(str, 1, Math.ceil(font * 0.08));
  const img = tctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) {
    d[i] = d[i] > 115 ? 255 : 0;
  }
  tctx.putImageData(img, 0, 0);
  let dx = x;
  if (align === 'center') dx = x - measuredW / 2 - 1;
  else if (align === 'right') dx = x - measuredW - 2;
  ctx.drawImage(_tmpCanvas, Math.round(dx), Math.round(y));
  return { x: Math.round(dx), y: Math.round(y), w: measuredW, h: font };
}

function measureTxt(ctx, str, font = 10) {
  if (!str) return 0;
  ctx.font = `${font}px ${fontFamilyForSize(font)}`;
  return Math.ceil(ctx.measureText(str).width);
}

// --- Reusable Scene Component: Warm Striped Room + Night/Dawn Window (full_v1.3.4) ---
// dawnProgress: 0 = deep night with city lights (C1/C2), 0..1 = night -> dawn transition (C3)
function drawBackground(ctx, t, dawnProgress = 0) {
  const dp = clamp01(dawnProgress);

  // 1. Warm striped wallpaper (full_v1.3.4 signature)
  px(ctx, 0, 0, BW, BH, C.bgWarm);
  for (let x = 0; x < BW; x += 16) {
    px(ctx, x, 0, 8, BH, C.stripe);
  }
  // Subtle ambient room tint (night vs warm dawn)
  if (dp < 0.5) {
    px(ctx, 0, 0, BW, BH, `rgba(12,20,42,${((1 - dp * 2) * 0.07).toFixed(3)})`);
  } else {
    px(ctx, 0, 0, BW, BH, `rgba(255,205,110,${((dp - 0.5) * 2 * 0.08).toFixed(3)})`);
  }

  // 2. Large window (x=60, y=20, w=520, h=160)
  const { x: wx, y: wy, w: ww, h: wh, fw } = WIN;
  px(ctx, wx, wy, ww, wh, C.woodFrame);
  const gx = wx + fw;
  const gy = wy + fw;
  const gw = ww - 2 * fw;
  const gh = wh - 2 * fw;

  ctx.save();
  ctx.beginPath();
  ctx.rect(gx, gy, gw, gh);
  ctx.clip();

  // Sky gradient: interpolates smoothly from late-night indigo to dawn sky
  const topCol = lerpColor(C.nightSkyTop, C.dawnSkyTop, dp);
  const botCol = lerpColor(C.nightSkyBottom, C.dawnSkyBottom, dp);
  const grd = ctx.createLinearGradient(0, gy, 0, gy + gh);
  grd.addColorStop(0, topCol);
  grd.addColorStop(1, botCol);
  ctx.fillStyle = grd;
  ctx.fillRect(gx, gy, gw, gh);

  // Night stars (fade out as dawn arrives)
  if (dp < 0.85) {
    const starAlpha = (1 - dp / 0.85) * 0.85;
    for (let i = 0; i < NIGHT_STARS.length; i++) {
      const s = NIGHT_STARS[i];
      const twinkle = 0.55 + 0.45 * Math.sin(t * 2.6 + i * 1.7);
      px(ctx, wx + s.dx, wy + s.dy, 2, 2, `rgba(255,250,220,${(starAlpha * twinkle).toFixed(3)})`);
    }
    // Crescent pixel moon in upper right sky pane
    const moonX = wx + 432;
    const moonY = wy + 26;
    px(ctx, moonX, moonY, 12, 12, `rgba(255,244,196,${(starAlpha * 0.9).toFixed(3)})`);
    px(ctx, moonX + 4, moonY + 1, 9, 9, topCol);
  }

  // Dawn rising sun glow in C3
  if (dp > 0.2) {
    const sunK = clamp01((dp - 0.2) / 0.8);
    const sunX = wx + 196;
    const sunY = Math.round(wy + 116 - sunK * 52);
    px(ctx, sunX - 18, sunY - 18, 36, 36, `rgba(255,216,120,${(sunK * 0.26).toFixed(3)})`);
    px(ctx, sunX - 11, sunY - 11, 22, 22, `rgba(255,228,132,${(sunK * 0.52).toFixed(3)})`);
    px(ctx, sunX - 7, sunY - 7, 14, 14, `rgba(255,238,160,${(sunK * 0.9).toFixed(3)})`);
  }

  // 2 distant mountains (silhouette at night -> green at dawn)
  const mtCol = lerpColor(C.mountainNight, C.mountainDawn, dp);
  ctx.fillStyle = mtCol;
  ctx.beginPath();
  ctx.moveTo(gx, gy + gh);
  ctx.lineTo(wx + 132, wy + 72);
  ctx.lineTo(wx + 234, gy + gh);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(wx + 176, gy + gh);
  ctx.lineTo(wx + 332, wy + 50);
  ctx.lineTo(wx + 474, gy + gh);
  ctx.closePath();
  ctx.fill();

  // Pixel city skyline silhouette + glowing windows at night (fades softly into morning mist at dawn)
  const cityFade = clamp01(1 - dp * 0.75);
  for (let bi = 0; bi < CITY_BUILDINGS.length; bi++) {
    const b = CITY_BUILDINGS[bi];
    const bx = wx + b.dx;
    const by = gy + gh - b.h;
    const bCol = lerpColor(b.col, '#4E6B58', dp * 0.7);
    px(ctx, bx, by, b.w, b.h, bCol);
    // Lit office/apartment windows at night
    if (dp < 0.9) {
      for (let li = 0; li < b.lights.length; li++) {
        const [lx, ly] = b.lights[li];
        const flicker = Math.sin(t * 1.4 + bi * 2.1 + li * 1.3) > -0.65;
        const winCol = flicker
          ? `rgba(255,209,102,${(cityFade * 0.92).toFixed(3)})`
          : `rgba(92,118,153,${(cityFade * 0.55).toFixed(3)})`;
        px(ctx, bx + lx, by + ly, 6, 6, winCol);
      }
    }
  }

  // Drifting pixel clouds (subtle at night, bright white at dawn)
  const cloudAlpha = (0.18 + dp * 0.72).toFixed(3);
  const cx1 = wx + 118 + Math.round(Math.sin(t * 0.32) * 12);
  px(ctx, cx1, wy + 38, 38, 9, `rgba(255,255,255,${cloudAlpha})`);
  px(ctx, cx1 + 8, wy + 32, 22, 6, `rgba(255,255,255,${cloudAlpha})`);
  const cx2 = wx + 334 + Math.round(Math.cos(t * 0.24) * 14);
  px(ctx, cx2, wy + 52, 46, 9, `rgba(255,255,255,${cloudAlpha})`);
  px(ctx, cx2 + 10, wy + 46, 26, 6, `rgba(255,255,255,${cloudAlpha})`);

  ctx.restore();

  // Cross mullions
  px(ctx, wx + ww / 2 - 3, gy, 6, gh, C.woodFrame);
  px(ctx, gx, wy + wh / 2 - 3, gw, 6, C.woodFrame);

  // Windowsill (y=180..188)
  px(ctx, SILL.x, SILL.y, SILL.w, SILL.h, C.woodSill);
  px(ctx, SILL.x, SILL.y, SILL.w, 2, C.woodFrame);

  // Small potted plant on left sill (x=88..102, y=161..180)
  const px0 = wx + 28;
  const py0 = wy + wh;
  px(ctx, px0 + 2, py0 - 16, 10, 8, '#6AA86A');
  px(ctx, px0, py0 - 13, 14, 5, '#4E864E');
  px(ctx, px0 + 4, py0 - 19, 6, 3, '#7BC07B');
  px(ctx, px0, py0 - 8, 14, 2, '#B06A46');
  px(ctx, px0 + 1, py0 - 6, 12, 6, C.pot);
}

// --- Reusable UI Component: DSH TUI Small Terminal (360×160 @ 140,160) ---
function drawTerminal(ctx, title, accentColor = C.green) {
  const { x, y, w, h, titleH } = TERM;
  px(ctx, x + 4, y + 4, w, h, 'rgba(0,0,0,0.16)'); // shadow
  px(ctx, x, y, w, h, C.termBg);                   // body
  px(ctx, x, y, w, titleH, C.termTitle);           // title bar
  px(ctx, x, y + titleH - 1, w, 1, accentColor);   // DSH accent line
  ctx.strokeStyle = C.termBd;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Window buttons (6×6)
  px(ctx, x + 8, y + 7, 6, 6, C.red);
  px(ctx, x + 18, y + 7, 6, 6, C.amber);
  px(ctx, x + 28, y + 7, 6, 6, C.green);
  txt(ctx, x + w / 2, y + 5, title, C.dim, 10, 'center');

  // CRT scanlines
  for (let sy = y + titleH + 2; sy < y + h - 2; sy += 3) {
    px(ctx, x + 2, sy, w - 4, 1, 'rgba(255,255,255,0.025)');
  }
}

// --- Reusable Character: Clawd (40×24 in room; calm <-> warm companion state) ---
// mood: 'calm' | 'warm' | 'smile'
// warmMix: 0 (normal coral #D97757) .. 1 (warm companion amber-coral #F28B50)
function drawClawd(ctx, x, y, t, mood = 'calm', warmMix = 0) {
  const bob = Math.sin(t * 2.2) > 0.45 ? -1 : 0;
  const by = Math.round(y + bob);
  const bodyH = 17;
  const bodyCol = lerpColor(C.clawdNorm, C.clawdWarm, warmMix);
  const darkCol = lerpColor(C.clawdNormDark, C.clawdWarmDark, warmMix);
  const bellyCol = lerpColor(C.clawdNormBelly, C.clawdWarmBelly, warmMix);

  px(ctx, x, by, 40, bodyH, bodyCol);
  px(ctx, x, by, 40, 2, darkCol);
  px(ctx, x + 9, by + 11, 22, 4, bellyCol);

  const blink = (t % 3.4) < 0.14;
  if (mood === 'smile' || mood === 'warm') {
    if (blink) {
      px(ctx, x + 10, by + 8, 4, 1, C.clawdEye);
      px(ctx, x + 26, by + 8, 4, 1, C.clawdEye);
    } else if (mood === 'smile') {
      px(ctx, x + 9, by + 6, 2, 1, C.clawdEye);
      px(ctx, x + 11, by + 5, 2, 1, C.clawdEye);
      px(ctx, x + 13, by + 6, 2, 1, C.clawdEye);
      px(ctx, x + 25, by + 6, 2, 1, C.clawdEye);
      px(ctx, x + 27, by + 5, 2, 1, C.clawdEye);
      px(ctx, x + 29, by + 6, 2, 1, C.clawdEye);
    } else {
      px(ctx, x + 10, by + 6, 4, 4, C.clawdEye);
      px(ctx, x + 26, by + 6, 4, 4, C.clawdEye);
      px(ctx, x + 11, by + 7, 1, 1, C.white);
      px(ctx, x + 27, by + 7, 1, 1, C.white);
    }
    // Gentle companion smile + warm cheeks
    px(ctx, x + 16, by + 12, 2, 1, C.clawdEye);
    px(ctx, x + 18, by + 13, 4, 1, C.clawdEye);
    px(ctx, x + 22, by + 12, 2, 1, C.clawdEye);
    px(ctx, x + 5, by + 8, 3, 2, C.pink);
    px(ctx, x + 32, by + 8, 3, 2, C.pink);
  } else if (blink) {
    px(ctx, x + 10, by + 8, 4, 1, C.clawdEye);
    px(ctx, x + 26, by + 8, 4, 1, C.clawdEye);
  } else {
    px(ctx, x + 10, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 26, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 11, by + 7, 1, 1, C.white);
    px(ctx, x + 27, by + 7, 1, 1, C.white);
  }

  // Legs
  const step = Math.sin(t * 3.0) > 0.6 ? 1 : 0;
  px(ctx, x + 3, by + bodyH, 6, 7 - step, darkCol);
  px(ctx, x + 13, by + bodyH, 6, 7, darkCol);
  px(ctx, x + 21, by + bodyH, 6, 7, darkCol);
  px(ctx, x + 31, by + bodyH, 6, 7 - step, darkCol);
}

// --- Reusable Character: Her (16×28 by window; 'stand' | 'stretch_smile') ---
function drawHer(ctx, x, y, t, pose = 'stand') {
  const bob = Math.sin(t * 1.8 + 0.8) > 0.45 ? -1 : 0;
  const by = Math.round(y + bob);

  // Hair & Head (y+0..y+9)
  px(ctx, x + 3, by, 10, 3, C.herHair);
  px(ctx, x + 10, by + 2, 4, 6, C.herHair);
  px(ctx, x + 3, by + 3, 8, 6, C.herSkin);

  if (pose === 'stretch_smile' || pose === 'smile') {
    px(ctx, x + 5, by + 5, 2, 1, C.cardTx);
    px(ctx, x + 8, by + 6, 2, 1, C.herDressHem);
    px(ctx, x + 5, by + 7, 3, 1, '#C45A65');
  } else {
    px(ctx, x + 5, by + 5, 1, 2, C.cardTx);
  }

  // Dress (y+9..y+21)
  px(ctx, x + 4, by + 9, 8, 6, C.herDress);
  px(ctx, x + 2, by + 15, 12, 6, C.herDress);
  px(ctx, x + 2, by + 20, 12, 1, C.herDressHem);

  // Arms (in C3 'stretch_smile', arms gently stretch upward within x..x+16)
  if (pose === 'stretch_smile') {
    const stretchDy = Math.sin(t * 3.0) > 0 ? -2 : -1;
    px(ctx, x + 1, by + 6 + stretchDy, 2, 5, C.herSkin);
    px(ctx, x + 13, by + 6 + stretchDy, 2, 5, C.herSkin);
  } else {
    px(ctx, x + 2, by + 10, 2, 4, C.herSkin);
    px(ctx, x + 12, by + 10, 2, 4, C.herSkin);
  }

  // Legs & shoes (y+21..y+28)
  px(ctx, x + 5, by + 21, 2, 5, C.herSkin);
  px(ctx, x + 9, by + 21, 2, 5, C.herSkin);
  px(ctx, x + 4, by + 26, 3, 2, C.herHair);
  px(ctx, x + 9, by + 26, 3, 2, C.herHair);
}

// --- Steaming Pixel Coffee Mug (beside terminal in C2, strictly within COFFEE_MUG [512,240,28,36]) ---
function drawCoffeeMug(ctx, t, appear = 1) {
  if (appear <= 0) return;
  const { x, y, w, h } = COFFEE_MUG;
  ctx.save();
  ctx.globalAlpha = clamp01(appear);

  // Coaster/saucer at bottom of box (y+32..y+36)
  px(ctx, x + 2, y + 32, 22, 4, C.woodFrame);

  // Mug body (x+4..x+22, y+16..y+32 -> 18×16)
  px(ctx, x + 4, y + 16, 18, 16, C.mugBody);
  px(ctx, x + 4, y + 16, 18, 3, C.mugRim);
  px(ctx, x + 6, y + 17, 14, 2, C.mugCoffee);
  // Warm heart/stripe motif on mug
  px(ctx, x + 11, y + 23, 4, 4, C.clawdWarm);

  // Mug handle on right (x+22..x+26, y+19..y+28)
  px(ctx, x + 22, y + 19, 4, 2, C.mugRim);
  px(ctx, x + 24, y + 21, 2, 5, C.mugRim);
  px(ctx, x + 22, y + 26, 4, 2, C.mugRim);

  // Animated rising pixel steam wisps (strictly within y+2..y+14, x+6..x+20)
  for (let i = 0; i < 3; i++) {
    const phase = (t * 2.2 + i * 0.9) % 1;
    const sy = Math.round(y + 12 - phase * 9); // y+3..y+12
    const sway = Math.round(Math.sin(t * 4.0 + i * 2.0) * 1.5);
    const sx = x + 7 + i * 5 + sway;
    const sAlpha = (1 - Math.abs(phase - 0.5) * 1.6) * 0.75 * appear;
    if (sAlpha > 0.05) {
      px(ctx, sx, sy, 2, 3, `rgba(255,248,235,${sAlpha.toFixed(3)})`);
    }
  }

  ctx.restore();
}

// --- C1 Her Message Bubble ("还在吗？") ---
function drawMessageBubble(ctx, t) {
  const appear = easeOut((t - C1_BUBBLE_APPEAR) / 0.45);
  if (appear <= 0) return;
  const { x, y, w, h, tailH } = HER_BUBBLE;
  ctx.save();
  ctx.globalAlpha = appear;
  px(ctx, x + 2, y + 2, w, h, 'rgba(0,0,0,0.12)');
  px(ctx, x, y, w, h, C.bubbleBg);
  ctx.strokeStyle = C.bubbleBd;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  // pointer toward terminal
  px(ctx, x + w - 14, y + h, 8, tailH, C.bubbleBd);
  txt(ctx, x + w / 2, y + 6, C1_MSG, C.bubbleTx, 10, 'center');
  ctx.restore();
}

// --- C2 Inner Monologue Card Above Terminal ("它说：一直在。") ---
function drawMonologueCard(ctx, st) {
  const appear = easeOut((st - C2_MONO_APPEAR) / 0.5);
  if (appear <= 0) return;
  const { x, y, w, h } = MONO_C2;
  ctx.save();
  ctx.globalAlpha = appear;
  px(ctx, x + 2, y + 2, w, h, 'rgba(0,0,0,0.20)');
  px(ctx, x, y, w, h, C.monoBg);
  ctx.strokeStyle = C.monoBd;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  txt(ctx, x + w / 2, y + 7, C2_MONO_TEXT, C.amber, 10, 'center');
  ctx.restore();
}

// --- C3 Windowsill Sticky Note ("深夜的陪伴") ---
function drawStickyNote(ctx, st) {
  const appear = easeOut((st - C3_NOTE_APPEAR) / 0.7);
  if (appear <= 0) return;
  const cx = Math.round(NOTE.x + NOTE.w / 2);
  const cy = Math.round(NOTE.y + NOTE.h / 2);
  ctx.save();
  ctx.globalAlpha = appear;
  ctx.translate(cx, cy);
  ctx.rotate((NOTE.angleDeg * Math.PI) / 180);
  px(ctx, -NOTE.w / 2 + 2, -NOTE.h / 2 + 2, NOTE.w, NOTE.h, 'rgba(0,0,0,0.14)');
  px(ctx, -NOTE.w / 2, -NOTE.h / 2, NOTE.w, NOTE.h, C.cardBg);
  ctx.strokeStyle = C.cardBd;
  ctx.lineWidth = 2;
  ctx.strokeRect(-NOTE.w / 2 + 1, -NOTE.h / 2 + 1, NOTE.w - 2, NOTE.h - 2);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = appear;
  px(ctx, cx - 4, NOTE.y + 5, 8, 8, C.red);
  px(ctx, cx - 2, NOTE.y + 6, 2, 2, C.pink);
  txt(ctx, cx, NOTE.y + 20, C3_NOTE_TITLE, C.cardTx, 10, 'center');
  txt(ctx, cx, NOTE.y + 40, C3_NOTE_SUB, C.cardSub, 10, 'center');
  ctx.restore();
}

// --- Bottom Subtitle Bar (14px Fusion Pixel, 160ms/char) ---
function curSubtitle(t) {
  for (let i = 0; i < SUB_LINES.length; i++) {
    const w = SUB_WINDOW[i];
    if (t >= w.start && t < w.end) {
      return { idx: i, elapsed: t - w.start };
    }
  }
  return null;
}

function drawSubtitle(ctx, t) {
  px(ctx, SUB.x, SUB.y, SUB.w, SUB.h, C.subtitleBg);
  px(ctx, SUB.x, SUB.y, SUB.w, 1, 'rgba(255,255,255,0.14)');
  const sub = curSubtitle(t);
  if (!sub) return;
  const chars = Array.from(SUB_LINES[sub.idx]);
  const shown = Math.min(chars.length, Math.floor((sub.elapsed * 1000) / SUB_CHAR_MS) + 1);
  const visible = chars.slice(0, shown).join('');
  if (visible) {
    txt(ctx, BW / 2, SUB.y + 12, visible, C.white, 14, 'center');
  }
}

// Helper to render a typed prompt+message line inside terminal
function drawTypedTermLine(ctx, x, y, promptStr, msgStr, startT, t, promptCol, msgCol, showCursor) {
  const fullLine = promptStr + msgStr;
  const fullChars = Array.from(fullLine);
  const typedCount = t >= startT
    ? Math.min(fullChars.length, Math.floor(((t - startT) * 1000) / TYPE_CHAR_MS) + 1)
    : 0;
  const promptLen = Array.from(promptStr).length;
  const cursorOn = Math.floor(t * 2.5) % 2 === 0;

  if (typedCount > 0) {
    const typedPrompt = fullChars.slice(0, Math.min(promptLen, typedCount)).join('');
    txt(ctx, x, y, typedPrompt, promptCol, 10);
    let cursorX = x + measureTxt(ctx, typedPrompt, 10);
    if (typedCount > promptLen) {
      const typedMsg = fullChars.slice(promptLen, typedCount).join('');
      const promptW = measureTxt(ctx, promptStr, 10);
      txt(ctx, x + promptW, y, typedMsg, msgCol, 10);
      cursorX = x + promptW + measureTxt(ctx, typedMsg, 10);
    }
    if (showCursor && cursorOn) {
      px(ctx, cursorX + 2, y, 6, 10, promptCol);
    }
  } else if (showCursor && cursorOn) {
    px(ctx, x, y, 6, 10, promptCol);
  }
}

// ================= Scene C1 (0-10s): 深夜办公室 =================
function drawC1(ctx, t) {
  drawBackground(ctx, t, 0); // Deep night + city lights
  drawTerminal(ctx, 'clawd@dsh:~$ — night', C.pink);

  // Her message bubble: "还在吗？"
  drawMessageBubble(ctx, t);

  // Terminal content (`$ her: 还在吗？` @ 140ms/char)
  ctx.save();
  ctx.translate(TERM.x, TERM.y + TERM.titleH);
  const cursorOn = Math.floor(t * 2.5) % 2 === 0;

  drawTypedTermLine(
    ctx,
    14,
    20,
    C1_PROMPT,
    C1_MSG,
    C1_TYPE_START,
    t,
    C.pink,
    C.text,
    t < C1_WAIT_APPEAR
  );

  if (t >= C1_STATUS_APPEAR) {
    txt(ctx, 14, 50, C1_STATUS_TEXT, C.dim, 10);
  }

  if (t >= C1_WAIT_APPEAR) {
    txt(ctx, 14, 80, C1_WAIT_PROMPT, C.green, 10);
    if (cursorOn) {
      px(ctx, 14 + measureTxt(ctx, C1_WAIT_PROMPT, 10) + 2, 80, 6, 10, C.green);
    }
  }

  txt(ctx, 14, 114, C1_FOOTER_TEXT, C.dim, 10);
  ctx.restore();

  // Characters in room: Clawd quietly waiting, Her working late
  drawClawd(ctx, CLAWD_ROOM.x, CLAWD_ROOM.y, t, 'calm', 0);
  drawHer(ctx, HER_ROOM.x, HER_ROOM.y, t, 'stand');

  drawSubtitle(ctx, t);
}

// ================= Scene C2 (10-20s): 它说一直在 =================
function drawC2(ctx, t) {
  const st = t - 10;
  drawBackground(ctx, t, 0.08); // Still deep night
  drawTerminal(ctx, 'clawd@dsh:~$ — companion', C.amber);

  // Inner monologue card above terminal: "它说：一直在。"
  drawMonologueCard(ctx, st);

  // Steaming coffee mug beside terminal
  const coffeeAppear = easeOut((st - C2_COFFEE_APPEAR) / 0.5);
  drawCoffeeMug(ctx, t, coffeeAppear);

  // Terminal content (`$ clawd: 一直在。` @ 140ms/char)
  ctx.save();
  ctx.translate(TERM.x, TERM.y + TERM.titleH);

  // Dimmed context line from C1
  txt(ctx, 14, 16, C1_FULL_LINE, C.dim, 10);

  drawTypedTermLine(
    ctx,
    14,
    44,
    C2_PROMPT,
    C2_MSG,
    C2_TYPE_START,
    t,
    C.green,
    C.amber,
    true
  );

  if (st >= C2_STATUS_APPEAR) {
    txt(ctx, 14, 76, C2_STATUS_TEXT, C.green, 10);
  }

  txt(ctx, 14, 114, C2_FOOTER_TEXT, C.dim, 10);
  ctx.restore();

  // Clawd color warms up smoothly (companion state)
  const warmMix = easeInOut((st - 0.6) / 1.5);
  drawClawd(ctx, CLAWD_ROOM.x, CLAWD_ROOM.y, t, 'warm', warmMix);
  drawHer(ctx, HER_ROOM.x, HER_ROOM.y, t, 'stand');

  drawSubtitle(ctx, t);
}

// ================= Scene C3 (20-30s): 天亮了 =================
function drawC3(ctx, t) {
  const st = t - 20;
  // Smooth night -> dawn transition across C3
  const dawnProgress = easeInOut(st / 5.5);
  drawBackground(ctx, t, dawnProgress);
  drawTerminal(ctx, 'clawd@dsh:~$ — dawn', C.green);

  // Sticky note on windowsill: "深夜的陪伴"
  drawStickyNote(ctx, st);

  // Terminal content:
  //   $ her: 早。
  //   $ clawd: 早。你终于休息了。
  ctx.save();
  ctx.translate(TERM.x, TERM.y + TERM.titleH);

  drawTypedTermLine(
    ctx,
    14,
    18,
    C3_LINE1_PROMPT,
    C3_LINE1_MSG,
    C3_LINE1_START,
    t,
    C.pink,
    C.text,
    t < C3_LINE2_START
  );

  if (t >= C3_LINE2_START) {
    drawTypedTermLine(
      ctx,
      14,
      46,
      C3_LINE2_PROMPT,
      C3_LINE2_MSG,
      C3_LINE2_START,
      t,
      C.green,
      C.amber,
      true
    );
  }

  if (st >= C3_STATUS_APPEAR) {
    txt(ctx, 14, 78, C3_STATUS_TEXT, C.blue, 10);
  }

  txt(ctx, 14, 114, C3_FOOTER_TEXT, C.dim, 10);
  ctx.restore();

  // Clawd quietly guarding (warm smile); Her stretching & smiling by the window
  drawClawd(ctx, CLAWD_ROOM.x, CLAWD_ROOM.y, t, 'smile', 0.85);
  drawHer(ctx, HER_ROOM.x, HER_ROOM.y, t, 'stretch_smile');

  drawSubtitle(ctx, t);
}

// --- Scene Dispatcher with 0.5s Black Transitions at 10s & 20s ---
const SCENES = [
  { id: 'C1', start: 0, end: 10, draw: drawC1 },
  { id: 'C2', start: 10, end: 20, draw: drawC2 },
  { id: 'C3', start: 20, end: 30, draw: drawC3 },
];

function renderScenes(ctx, t) {
  let blackAlpha = 0;
  if (t < 10) {
    drawC1(ctx, t);
    if (t >= 10 - FADE) blackAlpha = (t - (10 - FADE)) / FADE;
  } else if (t < 10 + FADE) {
    drawC2(ctx, t);
    blackAlpha = 1 - (t - 10) / FADE;
  } else if (t < 20) {
    drawC2(ctx, t);
    if (t >= 20 - FADE) blackAlpha = (t - (20 - FADE)) / FADE;
  } else if (t < 20 + FADE) {
    drawC3(ctx, t);
    blackAlpha = 1 - (t - 20) / FADE;
  } else {
    drawC3(ctx, t);
  }
  if (blackAlpha > 0) {
    px(ctx, 0, 0, BW, BH, `rgba(0,0,0,${clamp01(blackAlpha).toFixed(3)})`);
  }
}

// --- Keyboard Click & Event Timestamps (strictly synced with typing & visual events) ---
function getClickTimestamps() {
  const clicks = [];

  // 1. Subtitle character clicks (160ms/char)
  for (let li = 0; li < SUB_LINES.length; li++) {
    const chars = Array.from(SUB_LINES[li]);
    for (let ci = 0; ci < chars.length; ci++) {
      clicks.push(SUB_WINDOW[li].start + (ci * SUB_CHAR_MS) / 1000);
    }
  }

  // 2. C1 terminal typing (`$ her: 还在吗？` @ 140ms/char) + bubble/status events
  const c1Chars = Array.from(C1_FULL_LINE);
  for (let ci = 0; ci < c1Chars.length; ci++) {
    clicks.push(C1_TYPE_START + (ci * TYPE_CHAR_MS) / 1000);
  }
  clicks.push(C1_BUBBLE_APPEAR, C1_STATUS_APPEAR, C1_WAIT_APPEAR);

  // 3. C2 terminal typing (`$ clawd: 一直在。` @ 140ms/char) + coffee/monologue/status events
  const c2Chars = Array.from(C2_FULL_LINE);
  for (let ci = 0; ci < c2Chars.length; ci++) {
    clicks.push(C2_TYPE_START + (ci * TYPE_CHAR_MS) / 1000);
  }
  clicks.push(10 + C2_COFFEE_APPEAR, 10 + C2_MONO_APPEAR, 10 + C2_STATUS_APPEAR);

  // 4. C3 terminal typing (`$ her: 早。` + `$ clawd: 早。你终于休息了。` @ 140ms/char) + note/status events
  const c3L1Chars = Array.from(C3_LINE1_FULL);
  for (let ci = 0; ci < c3L1Chars.length; ci++) {
    clicks.push(C3_LINE1_START + (ci * TYPE_CHAR_MS) / 1000);
  }
  const c3L2Chars = Array.from(C3_LINE2_FULL);
  for (let ci = 0; ci < c3L2Chars.length; ci++) {
    clicks.push(C3_LINE2_START + (ci * TYPE_CHAR_MS) / 1000);
  }
  clicks.push(20 + C3_NOTE_APPEAR, 20 + C3_STATUS_APPEAR);

  // Deduplicate timestamps closer than 35ms (prevents click overlap/clipping)
  const uniq = [];
  for (const c of clicks.sort((a, b) => a - b)) {
    if (c < 0 || c >= DURATION - 0.05) continue;
    if (!uniq.length || c - uniq[uniq.length - 1] >= 0.035) {
      uniq.push(Number(c.toFixed(3)));
    }
  }
  return uniq;
}

// --- Canvases & Full Frame Sequence Renderer ---
const baseCanvas = createCanvas(BW, BH);
const baseCtx = baseCanvas.getContext('2d');
const outCanvas = createCanvas(FW, FH);
const outCtx = outCanvas.getContext('2d');
outCtx.imageSmoothingEnabled = false;

function renderFrameToCanvas(n) {
  const t = n / FPS;
  baseCtx.clearRect(0, 0, BW, BH);
  renderScenes(baseCtx, t);

  // Opening fade-in (0.4s) & closing fade-out in C3 (0.8s smooth fade to dark)
  const fadeInDur = 0.4;
  const fadeOutDur = 0.8;
  let alpha = 1;
  if (t < fadeInDur) alpha = t / fadeInDur;
  else if (t > DURATION - fadeOutDur) alpha = (DURATION - t) / fadeOutDur;
  if (alpha < 1) {
    px(baseCtx, 0, 0, BW, BH, `rgba(0,0,0,${(1 - clamp01(alpha)).toFixed(3)})`);
  }

  outCtx.clearRect(0, 0, FW, FH);
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(baseCanvas, 0, 0, FW, FH);
  return { baseCanvas, outCanvas };
}

function renderAllFrames(outDir = OUT_DIR) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  console.log(`「Clawd 的陪伴」: ${BW}×${BH} (SCALE=${SCALE}) → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Fonts: FONT_10="${FONT_10}" | FONT_14="${FONT_14}"`);
  console.log(`Frames directory: ${outDir}`);
  const t0 = Date.now();
  for (let i = 0; i < NFRAMES; i++) {
    renderFrameToCanvas(i);
    const fp = path.join(outDir, `f_${String(i).padStart(5, '0')}.png`);
    fs.writeFileSync(fp, outCanvas.toBuffer('image/png'));
    if (i % 300 === 0 || i === NFRAMES - 1) {
      const elapsed = (Date.now() - t0) / 1000;
      const eta = (elapsed / (i + 1)) * (NFRAMES - i - 1);
      console.log(`  frame ${i}/${NFRAMES} (${(((i + 1) / NFRAMES) * 100).toFixed(1)}%) elapsed=${elapsed.toFixed(1)}s eta=${eta.toFixed(1)}s`);
    }
  }
  console.log(`Rendered ${NFRAMES} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

if (require.main === module) {
  renderAllFrames();
}

module.exports = {
  BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES,
  TYPE_CHAR_MS, SUB_CHAR_MS, FADE,
  WIN, SILL, TERM, SUB,
  HER_BUBBLE, MONO_C2, COFFEE_MUG, NOTE,
  CLAWD_ROOM, HER_ROOM, C,
  FONT_10, FONT_14,
  SUB_LINES, SUB_WINDOW,
  C1_PROMPT, C1_MSG, C1_FULL_LINE, C1_TYPE_START,
  C1_BUBBLE_APPEAR, C1_STATUS_APPEAR, C1_STATUS_TEXT, C1_WAIT_APPEAR, C1_WAIT_PROMPT, C1_FOOTER_TEXT,
  C2_PROMPT, C2_MSG, C2_FULL_LINE, C2_TYPE_START,
  C2_COFFEE_APPEAR, C2_MONO_APPEAR, C2_MONO_TEXT, C2_STATUS_APPEAR, C2_STATUS_TEXT, C2_FOOTER_TEXT,
  C3_LINE1_PROMPT, C3_LINE1_MSG, C3_LINE1_FULL, C3_LINE1_START,
  C3_LINE2_PROMPT, C3_LINE2_MSG, C3_LINE2_FULL, C3_LINE2_START,
  C3_NOTE_APPEAR, C3_NOTE_TITLE, C3_NOTE_SUB, C3_STATUS_APPEAR, C3_STATUS_TEXT, C3_FOOTER_TEXT,
  SCENES, px, txt, measureTxt, lerpColor,
  drawBackground, drawTerminal, drawClawd, drawHer,
  drawCoffeeMug, drawMessageBubble, drawMonologueCard, drawStickyNote, drawSubtitle,
  curSubtitle, getClickTimestamps,
  renderFrameToCanvas, renderAllFrames,
};
