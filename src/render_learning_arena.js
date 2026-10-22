#!/usr/bin/env node
// 「Clawd 的学习」30s 像素风视频渲染脚本 (learning_arena v1.0)
// 画布规格: 640×360 基础分辨率, SCALE=2 → 1280×720 @ 60fps, 1800 帧 (30.00s)
// 美术风格: 严格对标 full_v1.3.4.mp4 (暖色条纹房间 + 晨窗远山 + 小终端 DSH TUI + 房间内像素角色)
// 故事线:
//   L1 (0-10s):  她的请求 — 终端逐字打字 `$ her: 帮我写一封辞职信` (140ms/char) + 终端上方消息气泡 + Clawd 平静→思考
//   L2 (10-20s): 思考中   — 终端逐行显示 checkHeart() 代码 + Clawd 正常色→深紫色思考态 + 内心独白「它第一次说了不。」
//   L3 (20-30s): 成长     — 终端回复 `$ clawd: 不，我不想。` / `$ her: (笑了)` / `$ her: 这就是成长。`
//                           + 窗台便签「它有了自己的意志。」 + Clawd 恢复正常色微笑 + Her 在窗边微笑

const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// --- Register Fusion Pixel Fonts (10px Terminal Small Font + 12px/14px Subtitle Font) ---
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
    ];
    for (const cand of fallbackCandidates) {
      if (fs.existsSync(cand)) {
        GlobalFonts.registerFromPath(cand, 'NotoMonoCJK');
        if (FONT_10 === 'monospace') FONT_10 = 'NotoMonoCJK, monospace';
        if (FONT_14 === 'monospace') FONT_14 = 'NotoMonoCJK, monospace';
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
const TYPE_CHAR_MS = 140; // L1 terminal typing: 140ms/char
const SUB_CHAR_MS = 160;  // Subtitle step: 160ms/char
const FADE = 0.25;        // 0.25s out + 0.25s in = 0.5s black transition between scenes

const OUT_DIR = process.env.FRAMES_DIR || '/tmp/frames_learning';

// --- Layout Constants (640×360 base grid, strictly benchmarked to full_v1.3.4) ---
const WIN = { x: 60, y: 20, w: 520, h: 160, fw: 8 };
const SILL = { x: 56, y: 180, w: 528, h: 8 };
const TERM = { x: 140, y: 160, w: 360, h: 160, titleH: 20 };
const SUB = { x: 0, y: 320, w: 640, h: 40 };

// Floating UI overlays in room space (zero overlap with TERM [140,160,360,160] & characters)
const BUBBLE_L1 = { x: 220, y: 116, w: 200, h: 28, tailH: 6 }; // y=116..150 < 160
const MONO_L2 = { x: 210, y: 116, w: 220, h: 28 };             // y=116..144 < 160
const NOTE = { x: 506, y: 112, w: 108, h: 68, angleDeg: -3 };  // rests right on windowsill y=180, x>500

// Character room positions (strictly inside room, outside terminal, above subtitle bar y=320)
const CLAWD_ROOM = { x: 64, y: 248 };     // 40×24 body+legs -> x=64..104, y=246..272
const CLAWD_THOUGHT = { x: 66, y: 214, w: 36, h: 20 }; // thought dots above Clawd -> y=214..234 < 246
const HER_ROOM = { x: 548, y: 194 };      // 16×28 beside window -> x=548..564, y=193..222

// Warm sparkles for L3 growth moment (anchored in open room/window areas, zero overlap)
const SPARKLE_ANCHORS = [
  { x: 28, y: 108 },
  { x: 196, y: 54 },
  { x: 388, y: 50 },
  { x: 598, y: 268 },
];

// --- Palette (aligned with full_v1.3.4 + DSH TUI dark theme) ---
const C = {
  // Warm room & morning window (full_v1.3.4)
  bgWarm: '#F5EDD5',
  stripe: '#EDE3C8',
  woodFrame: '#8B7355',
  woodSill: '#A08060',
  skyTop: '#87CEEB',
  skyBottom: '#E0F0FF',
  mountain: '#5A7A5A',
  mountainHi: '#6A8B68',
  pot: '#7A5A3A',

  // DSH TUI Terminal
  termBg: '#14161C',
  termTitle: '#21262D',
  termBd: '#30363D',
  panel: '#1A1F29',
  border: '#30363D',
  codeHighlight: '#241B3B',

  // Syntax & UI accents
  text: '#E6EDF3',
  dim: '#8B949E',
  green: '#7EE787',
  pink: '#FF9AA2',
  amber: '#E3B341',
  blue: '#79C0FF',
  purple: '#BC8CFF',
  purple2: '#A371F7',
  red: '#FF7B72',
  pinRed: '#FF5555',
  white: '#FFFFFF',

  // Clawd colors: Normal (warm coral from full_v1.3.4) -> Deep Purple (thinking state in L2)
  clawdNorm: '#D97757',
  clawdNormDark: '#B85A3B',
  clawdNormBelly: '#F5E8D7',
  clawdDeepPurple: '#5B32A8',
  clawdDeepPurpleDark: '#3E1F78',
  clawdDeepPurpleBelly: '#DDD0FA',
  clawdEye: '#141413',

  // Her (16×28 by window)
  herHair: '#5A4632',
  herSkin: '#E8C39E',
  herDress: '#FF9AA2',
  herDressHem: '#E57A84',

  // Message bubble / Monologue / Sticky note
  bubbleBg: '#FFF8F9',
  bubbleBd: '#E57A84',
  bubbleTx: '#2E1E24',
  monoBg: '#1D1533',
  monoBd: '#9D78F2',
  cardBg: '#FFF8DC',
  cardBd: '#DEB887',
  cardTx: '#241A06',
  cardSub: '#6E5A3A',

  subtitleBg: 'rgba(0,0,0,0.76)',
  warmOverlay: 'rgba(255,205,110,0.08)',
};

// --- Narrative Text & Timing Definitions (DO NOT MUTATE AT RUNTIME) ---
const LINES = [
  '它第一次说了不。',
  '它有了自己的意志。',
  '这就是成长。',
];
const SUB_WINDOW = [
  { start: 2.0, end: 8.0 },
  { start: 12.0, end: 18.0 },
  { start: 24.0, end: 29.0 },
];

// L1 (0-10s): Her's request
const L1_PROMPT = '$ her: ';
const L1_MSG = '帮我写一封辞职信';
const L1_FULL_LINE = L1_PROMPT + L1_MSG;
const L1_TYPE_START = 0.8; // 15 chars * 0.14s = 2.10s -> finishes at 2.90s
const L1_BUBBLE_APPEAR = 1.6;
const L1_THINK_SHIFT = 3.2; // Clawd transitions from calm -> thinking expression
const L1_STATUS_APPEAR = 3.5;
const L1_WAIT_PROMPT_APPEAR = 4.5;

// L2 (10-20s): Code lines appearing sequentially
const L2_CODE_LINES = [
  { num: '1', text: 'if (task === "quit_job") {', delay: 0.5, highlight: false },
  { num: '2', text: '  const feelings = checkHeart();', delay: 1.4, highlight: false },
  { num: '3', text: '  if (feelings !== "wants_to_stay") {', delay: 2.3, highlight: false },
  { num: '4', text: '    return "no";', delay: 3.2, highlight: true },
  { num: '5', text: '  }', delay: 4.0, highlight: false },
  { num: '6', text: '}', delay: 4.6, highlight: false },
];
const L2_MONO_TEXT = '它第一次说了不。';
const L2_MONO_APPEAR = 3.3; // scene-local seconds (t = 13.3s, right as `return "no";` lands)

// L3 (20-30s): Growth dialogue & sticky note on windowsill
const L3_DIALOGUE = [
  { prefix: '$ clawd: ', body: '不，我不想。', prefixCol: C.green, bodyCol: C.purple, y: 18, delay: 0.6 },
  { prefix: '$ her: ', body: '(笑了)', prefixCol: C.pink, bodyCol: C.amber, y: 48, delay: 2.6 },
  { prefix: '$ her: ', body: '这就是成长。', prefixCol: C.pink, bodyCol: C.text, y: 78, delay: 4.1 },
];
const L3_STATUS_TEXT = '# will: online · growth +1';
const L3_STATUS_DELAY = 5.8;
const NOTE_LINE_1 = '它有了';
const NOTE_LINE_2 = '自己的意志。';
const NOTE_FULL_TEXT = '它有了自己的意志。';
const NOTE_APPEAR = 1.2; // scene-local seconds (t = 21.2s)

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
  const r = Math.round(r1 + (r2 - r1) * k);
  const g = Math.round(g1 + (g2 - g1) * k);
  const b = Math.round(b1 + (b2 - b1) * k);
  return `rgb(${r},${g},${b})`;
}

// --- Pixel Drawing & Threshold Crisp Text Primitives ---
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

//Syntax-colored code token renderer for L2 (preserves exact pixel advance of L2_CODE_LINES)
function drawCodeTokens(ctx, x, y, rawLine, font = 10) {
  const tokenRe = /("quit_job"|"wants_to_stay"|"no")|\b(if|const|return)\b|\b(checkHeart)\b|(===|!==)|(\s+|[^\s]+)/g;
  let cx = x;
  let match;
  while ((match = tokenRe.exec(rawLine)) !== null) {
    const tok = match[0];
    let col = C.text;
    if (match[1]) col = tok === '"no"' ? C.amber : C.green;
    else if (match[2]) col = C.purple;
    else if (match[3]) col = C.blue;
    else if (match[4]) col = C.pink;
    else if (/^[{}();]$/.test(tok)) col = C.dim;
    if (!/^\s+$/.test(tok)) {
      txt(ctx, cx, y, tok, col, font, 'left');
    }
    cx += measureTxt(ctx, tok, font);
  }
}

// --- Reusable Scene Component: Warm Striped Room + Morning Window (full_v1.3.4) ---
function drawBackground(ctx, t, opts = {}) {
  // 1. Warm striped wallpaper (#F5EDD5 + #EDE3C8 vertical stripes every 16px)
  px(ctx, 0, 0, BW, BH, C.bgWarm);
  for (let x = 0; x < BW; x += 16) {
    px(ctx, x, 0, 8, BH, C.stripe);
  }

  // 2. Large morning window (x=60, y=20, w=520, h=160)
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

  // Sky gradient (#87CEEB -> #E0F0FF)
  const grd = ctx.createLinearGradient(0, gy, 0, gy + gh);
  grd.addColorStop(0, C.skyTop);
  grd.addColorStop(1, C.skyBottom);
  ctx.fillStyle = grd;
  ctx.fillRect(gx, gy, gw, gh);

  // Morning sun glow in upper-left sky pane
  const sunX = wx + 84;
  const sunY = wy + 40;
  const sunPulse = Math.sin(t * 1.6) > 0 ? 2 : 0;
  px(ctx, sunX - 16 - sunPulse, sunY - 16 - sunPulse, 32 + sunPulse * 2, 32 + sunPulse * 2, 'rgba(255,228,130,0.22)');
  px(ctx, sunX - 11, sunY - 11, 22, 22, 'rgba(255,224,110,0.45)');
  px(ctx, sunX - 7, sunY - 7, 14, 14, '#FFE478');

  // 2 distant mountains (#5A7A5A)
  ctx.fillStyle = C.mountain;
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

  // Drifting pixel clouds
  const cx1 = wx + 118 + Math.round(Math.sin(t * 0.32) * 12);
  px(ctx, cx1, wy + 38, 38, 9, 'rgba(255,255,255,0.92)');
  px(ctx, cx1 + 8, wy + 32, 22, 6, 'rgba(255,255,255,0.92)');

  const cx2 = wx + 334 + Math.round(Math.cos(t * 0.24) * 14);
  px(ctx, cx2, wy + 52, 46, 9, 'rgba(255,255,255,0.90)');
  px(ctx, cx2 + 10, wy + 46, 26, 6, 'rgba(255,255,255,0.90)');

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
  if (opts.bloom) px(ctx, px0 + 6, py0 - 21, 2, 2, C.pink);
  px(ctx, px0, py0 - 8, 14, 2, '#B06A46');
  px(ctx, px0 + 1, py0 - 6, 12, 6, C.pot);
}

// --- Reusable UI Component: DSH TUI Small Terminal (360×160 @ 140,160) ---
function drawTerminal(ctx, title, accentColor = C.green) {
  const { x, y, w, h, titleH } = TERM;
  // Soft drop shadow
  px(ctx, x + 4, y + 4, w, h, 'rgba(0,0,0,0.16)');
  // Dark TUI body
  px(ctx, x, y, w, h, C.termBg);
  // Title bar (20px) + DSH 1px accent line
  px(ctx, x, y, w, titleH, C.termTitle);
  px(ctx, x, y + titleH - 1, w, 1, accentColor);
  // Border
  ctx.strokeStyle = C.termBd;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Window buttons (6×6)
  px(ctx, x + 8, y + 7, 6, 6, C.red);
  px(ctx, x + 18, y + 7, 6, 6, C.amber);
  px(ctx, x + 28, y + 7, 6, 6, C.green);

  // 10px Fusion Pixel title
  txt(ctx, x + w / 2, y + 5, title, C.dim, 10, 'center');

  // Subtle CRT scanlines inside content area
  for (let sy = y + titleH + 2; sy < y + h - 2; sy += 3) {
    px(ctx, x + 2, sy, w - 4, 1, 'rgba(255,255,255,0.025)');
  }
}

// --- Reusable Character: Clawd (40×24 pixel creature in room, normal <-> deep purple) ---
// mood: 'calm' | 'thinking' | 'smile'
// purpleMix: 0 (normal coral #D97757) .. 1 (deep purple #5B32A8 thinking state)
function drawClawd(ctx, x, y, t, mood = 'calm', purpleMix = 0) {
  const bob = Math.sin(t * 2.2) > 0.45 ? -1 : 0;
  const by = Math.round(y + bob);
  const bodyH = 17;

  const bodyCol = lerpColor(C.clawdNorm, C.clawdDeepPurple, purpleMix);
  const darkCol = lerpColor(C.clawdNormDark, C.clawdDeepPurpleDark, purpleMix);
  const bellyCol = lerpColor(C.clawdNormBelly, C.clawdDeepPurpleBelly, purpleMix);

  // Subtle pixel body (40×17) + top shading strip
  px(ctx, x, by, 40, bodyH, bodyCol);
  px(ctx, x, by, 40, 2, darkCol);
  // Belly highlight patch
  px(ctx, x + 9, by + 11, 22, 4, bellyCol);

  // Eyes & facial expression
  const blink = mood !== 'thinking' && (t % 3.4) < 0.14;
  if (mood === 'smile') {
    // Happy curved eyes (^ ^) + gentle pixel smile on belly
    px(ctx, x + 9, by + 6, 2, 1, C.clawdEye);
    px(ctx, x + 11, by + 5, 2, 1, C.clawdEye);
    px(ctx, x + 13, by + 6, 2, 1, C.clawdEye);

    px(ctx, x + 25, by + 6, 2, 1, C.clawdEye);
    px(ctx, x + 27, by + 5, 2, 1, C.clawdEye);
    px(ctx, x + 29, by + 6, 2, 1, C.clawdEye);

    // Pixel smile curve
    px(ctx, x + 16, by + 12, 2, 1, C.clawdEye);
    px(ctx, x + 18, by + 13, 4, 1, C.clawdEye);
    px(ctx, x + 22, by + 12, 2, 1, C.clawdEye);
    // Warm rosy cheeks
    px(ctx, x + 6, by + 8, 3, 2, C.pink);
    px(ctx, x + 31, by + 8, 3, 2, C.pink);
  } else if (mood === 'thinking') {
    // Focused upward-looking pixel eyes + slight furrowed brow
    const glance = Math.sin(t * 1.8) > 0 ? 1 : 0;
    px(ctx, x + 9, by + 4, 5, 1, darkCol);
    px(ctx, x + 26, by + 4, 5, 1, darkCol);
    px(ctx, x + 10, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 26, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 10 + glance, by + 6, 2, 2, C.white);
    px(ctx, x + 26 + glance, by + 6, 2, 2, C.white);
    // Small thoughtful mouth dash
    px(ctx, x + 18, by + 13, 4, 1, C.clawdEye);
  } else if (blink) {
    px(ctx, x + 10, by + 8, 4, 1, C.clawdEye);
    px(ctx, x + 26, by + 8, 4, 1, C.clawdEye);
  } else {
    // Calm default expression
    px(ctx, x + 10, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 26, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 11, by + 7, 1, 1, C.white);
    px(ctx, x + 27, by + 7, 1, 1, C.white);
  }

  // 4 signature pixel legs (matching full_v1.3.4 silhouette, total height 24px)
  const step = mood === 'thinking' ? 0 : (Math.sin(t * 3.0) > 0.6 ? 1 : 0);
  px(ctx, x + 3, by + bodyH, 6, 7 - step, darkCol);
  px(ctx, x + 13, by + bodyH, 6, 7, darkCol);
  px(ctx, x + 21, by + bodyH, 6, 7, darkCol);
  px(ctx, x + 31, by + bodyH, 6, 7 - step, darkCol);
}

// Thought indicator pill above Clawd in room (strictly inside CLAWD_THOUGHT [66,214,36,20])
function drawClawdThought(ctx, t, purpleMix = 0, alpha = 1) {
  if (alpha <= 0.01) return;
  const { x, y, w, h } = CLAWD_THOUGHT;
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  const bg = purpleMix > 0.4 ? C.monoBg : '#FFFFFF';
  const bd = purpleMix > 0.4 ? C.purple2 : C.woodFrame;
  const dotCol = purpleMix > 0.4 ? C.purple : C.clawdNorm;
  px(ctx, x, y, w, h - 4, bg);
  ctx.strokeStyle = bd;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 5);
  // Small thought tail dot inside box bottom (y + 17..19)
  px(ctx, x + 16, y + h - 3, 4, 3, bd);

  const activeDots = (Math.floor(t * 2.5) % 3) + 1;
  for (let i = 0; i < 3; i++) {
    px(ctx, x + 9 + i * 8, y + 6, 4, 4, i < activeDots ? dotCol : C.dim);
  }
  ctx.restore();
}

// --- Reusable Character: Her (16×28 pixel figure by the window) ---
// pose: 'stand' | 'smile'
function drawHer(ctx, x, y, t, pose = 'stand') {
  const bob = Math.sin(t * 1.8 + 0.8) > 0.45 ? -1 : 0;
  const by = Math.round(y + bob);

  // Hair & face (y+0..y+9)
  px(ctx, x + 3, by, 10, 3, C.herHair);
  px(ctx, x + 10, by + 2, 4, 6, C.herHair); // hair side facing left toward room/Clawd
  px(ctx, x + 3, by + 3, 8, 6, C.herSkin);

  if (pose === 'smile') {
    // Happy smiling eye + rosy cheek + tiny smile facing Clawd
    px(ctx, x + 5, by + 5, 2, 1, C.cardTx);
    px(ctx, x + 8, by + 6, 2, 1, C.herDressHem);
    px(ctx, x + 5, by + 7, 3, 1, '#C45A65');
  } else {
    px(ctx, x + 5, by + 5, 1, 2, C.cardTx);
  }

  // Pink dress (y+9..y+21)
  px(ctx, x + 4, by + 9, 8, 6, C.herDress);
  px(ctx, x + 2, by + 15, 12, 6, C.herDress);
  px(ctx, x + 2, by + 20, 12, 1, C.herDressHem);

  // Arms (gentle happy wave when smiling in L3, staying strictly within x..x+16)
  if (pose === 'smile') {
    const waveDy = Math.sin(t * 4.2) > 0 ? -2 : 0;
    px(ctx, x + 1, by + 8 + waveDy, 3, 2, C.herSkin);
    px(ctx, x + 2, by + 10 + waveDy, 2, 3, C.herDress);
    px(ctx, x + 12, by + 10, 2, 4, C.herSkin);
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

// --- L1 Message Bubble Above Terminal ("帮我写一封辞职信") ---
function drawMessageBubble(ctx, t) {
  const appear = easeOut((t - L1_BUBBLE_APPEAR) / 0.45);
  if (appear <= 0) return;
  const { x, y, w, h, tailH } = BUBBLE_L1;
  ctx.save();
  ctx.globalAlpha = appear;
  px(ctx, x + 2, y + 2, w, h, 'rgba(0,0,0,0.12)');
  px(ctx, x, y, w, h, C.bubbleBg);
  ctx.strokeStyle = C.bubbleBd;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  // Small pointer triangle toward terminal below (strictly within y+h..y+h+tailH = 144..150 < 160)
  px(ctx, x + w / 2 - 4, y + h, 8, 3, C.bubbleBd);
  px(ctx, x + w / 2 - 2, y + h + 3, 4, tailH - 3, C.bubbleBd);
  // Bubble message text (10px Fusion Pixel)
  txt(ctx, x + w / 2, y + 8, L1_MSG, C.bubbleTx, 10, 'center');
  ctx.restore();
}

// --- L2 Inner Monologue Caption Above Terminal ("它第一次说了不。") ---
function drawMonologueBubble(ctx, st) {
  const appear = easeOut((st - L2_MONO_APPEAR) / 0.5);
  if (appear <= 0) return;
  const { x, y, w, h } = MONO_L2;
  ctx.save();
  ctx.globalAlpha = appear;
  px(ctx, x + 2, y + 2, w, h, 'rgba(20,12,40,0.22)');
  px(ctx, x, y, w, h, C.monoBg);
  ctx.strokeStyle = C.monoBd;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  txt(ctx, x + w / 2, y + 8, `“${L2_MONO_TEXT}”`, C.purple, 10, 'center');
  ctx.restore();
}

// --- L3 Sticky Note on Windowsill ("它有了自己的意志。") ---
function drawStickyNote(ctx, st) {
  const appear = easeOut((st - NOTE_APPEAR) / 0.7);
  if (appear <= 0) return;
  const cx = Math.round(NOTE.x + NOTE.w / 2);
  const cy = Math.round(NOTE.y + NOTE.h / 2);

  // Tilted sticky-note card paper (-3°) resting on the windowsill
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

  // Integer-grid crisp pixel pin & text (zero rotation blur on 640×360 canvas)
  ctx.save();
  ctx.globalAlpha = appear;
  px(ctx, cx - 4, NOTE.y + 5, 8, 8, C.pinRed);
  px(ctx, cx - 2, NOTE.y + 6, 2, 2, C.pink);
  txt(ctx, cx, NOTE.y + 20, NOTE_LINE_1, C.cardTx, 10, 'center');
  txt(ctx, cx, NOTE.y + 40, NOTE_LINE_2, C.cardTx, 10, 'center');
  ctx.restore();
}

// --- Warm Golden Sparkles in L3 ---
function drawSparkles(ctx, t) {
  for (let i = 0; i < SPARKLE_ANCHORS.length; i++) {
    const a = SPARKLE_ANCHORS[i];
    const sx = Math.round(a.x + Math.sin(t * 2.0 + i * 1.4) * 6);
    const sy = Math.round(a.y + Math.cos(t * 1.6 + i * 1.9) * 8);
    const alpha = (0.35 + 0.50 * (0.5 + 0.5 * Math.sin(t * 3.1 + i * 1.2))).toFixed(3);
    const col = `rgba(255,215,90,${alpha})`;
    px(ctx, sx, sy, 3, 3, col);
    px(ctx, sx + 1, sy - 2, 1, 7, col);
    px(ctx, sx - 2, sy + 1, 7, 1, col);
  }
}

// --- Bottom Subtitle Bar (y=320, h=40, 14px Fusion Pixel, 160ms/char) ---
function curSubtitle(t) {
  for (let i = 0; i < LINES.length; i++) {
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
  const chars = Array.from(LINES[sub.idx]);
  const shown = Math.min(chars.length, Math.floor((sub.elapsed * 1000) / SUB_CHAR_MS) + 1);
  const visible = chars.slice(0, shown).join('');
  if (visible) {
    txt(ctx, BW / 2, SUB.y + 12, visible, C.white, 14, 'center');
  }
}

// ================= Scene L1 (0-10s): 她的请求 =================
function drawL1(ctx, t) {
  drawBackground(ctx, t, { bloom: false });
  drawTerminal(ctx, 'clawd@dsh:~$ — request', C.pink);

  // Message bubble above terminal: "帮我写一封辞职信"
  drawMessageBubble(ctx, t);

  // Terminal content area (local 0..360, 0..140)
  ctx.save();
  ctx.translate(TERM.x, TERM.y + TERM.titleH);

  const fullChars = Array.from(L1_FULL_LINE);
  const typedCount = t >= L1_TYPE_START
    ? Math.min(fullChars.length, Math.floor(((t - L1_TYPE_START) * 1000) / TYPE_CHAR_MS) + 1)
    : 0;

  const promptLen = Array.from(L1_PROMPT).length;
  const cursorOn = Math.floor(t * 2.5) % 2 === 0;

  if (typedCount > 0) {
    const typedPrompt = fullChars.slice(0, Math.min(promptLen, typedCount)).join('');
    txt(ctx, 14, 18, typedPrompt, C.pink, 10);
    let cursorX = 14 + measureTxt(ctx, typedPrompt, 10);
    if (typedCount > promptLen) {
      const typedMsg = fullChars.slice(promptLen, typedCount).join('');
      const promptW = measureTxt(ctx, L1_PROMPT, 10);
      txt(ctx, 14 + promptW, 18, typedMsg, C.text, 10);
      cursorX = 14 + promptW + measureTxt(ctx, typedMsg, 10);
    }
    if (t < L1_WAIT_PROMPT_APPEAR && cursorOn) {
      px(ctx, cursorX + 2, 18, 6, 10, C.pink);
    }
  } else if (cursorOn) {
    px(ctx, 14, 18, 6, 10, C.pink);
  }

  if (t >= L1_STATUS_APPEAR) {
    txt(ctx, 14, 48, '# task: write resignation letter', C.dim, 10);
  }

  if (t >= L1_WAIT_PROMPT_APPEAR) {
    const waitPrefix = '$ clawd: ';
    txt(ctx, 14, 76, waitPrefix, C.green, 10);
    if (cursorOn) {
      px(ctx, 14 + measureTxt(ctx, waitPrefix, 10) + 2, 76, 6, 10, C.purple);
    }
  }

  // Bottom TUI status line
  txt(ctx, 14, 116, '[DSH] mode: listen -> evaluate', C.dim, 10);
  ctx.restore();

  // Room characters: Clawd shifts from calm -> thinking expression; Her stands by window
  const isThinking = t >= L1_THINK_SHIFT;
  drawClawd(ctx, CLAWD_ROOM.x, CLAWD_ROOM.y, t, isThinking ? 'thinking' : 'calm', 0);
  if (isThinking) {
    drawClawdThought(ctx, t, 0, easeOut((t - L1_THINK_SHIFT) / 0.5));
  }
  drawHer(ctx, HER_ROOM.x, HER_ROOM.y, t, 'stand');

  drawSubtitle(ctx, t);
}

// ================= Scene L2 (10-20s): 思考中 =================
function drawL2(ctx, t) {
  const st = t - 10;
  drawBackground(ctx, t, { bloom: false });
  drawTerminal(ctx, 'clawd@dsh:~$ — checkHeart()', C.purple);

  // Inner monologue above terminal once decision is reached
  drawMonologueBubble(ctx, st);

  // Terminal code editor content (6 lines appearing sequentially)
  ctx.save();
  ctx.translate(TERM.x, TERM.y + TERM.titleH);

  for (let i = 0; i < L2_CODE_LINES.length; i++) {
    const item = L2_CODE_LINES[i];
    if (st >= item.delay) {
      const ly = 10 + i * 20;
      if (item.highlight) {
        px(ctx, 8, ly - 2, 344, 15, C.codeHighlight);
        px(ctx, 8, ly - 2, 2, 15, C.purple);
      }
      txt(ctx, 14, ly, item.num, C.dim, 10);
      drawCodeTokens(ctx, 30, ly, item.text, 10);
    }
  }
  ctx.restore();

  // Clawd transitions smoothly from normal color -> deep purple thinking state
  const purpleMix = easeInOut((st - 0.35) / 1.4);
  drawClawd(ctx, CLAWD_ROOM.x, CLAWD_ROOM.y, t, 'thinking', purpleMix);
  drawClawdThought(ctx, t, purpleMix, 1);
  drawHer(ctx, HER_ROOM.x, HER_ROOM.y, t, 'stand');

  drawSubtitle(ctx, t);
}

// ================= Scene L3 (20-30s): 成长 =================
function drawL3(ctx, t) {
  const st = t - 20;
  drawBackground(ctx, t, { bloom: true });
  // Warm golden morning light wash for growth moment
  px(ctx, 0, 0, BW, BH, C.warmOverlay);

  drawTerminal(ctx, 'clawd@dsh:~$ — growth', C.green);

  // Terminal dialogue lines
  ctx.save();
  ctx.translate(TERM.x, TERM.y + TERM.titleH);

  const cursorOn = Math.floor(t * 2.5) % 2 === 0;
  for (let i = 0; i < L3_DIALOGUE.length; i++) {
    const d = L3_DIALOGUE[i];
    if (st >= d.delay) {
      const bodyChars = Array.from(d.body);
      const shown = Math.min(
        bodyChars.length,
        Math.floor(((st - d.delay) * 1000) / TYPE_CHAR_MS) + 1
      );
      txt(ctx, 14, d.y, d.prefix, d.prefixCol, 10);
      const pw = measureTxt(ctx, d.prefix, 10);
      const visibleBody = bodyChars.slice(0, shown).join('');
      if (visibleBody) {
        txt(ctx, 14 + pw, d.y, visibleBody, d.bodyCol, 10);
      }
    }
  }

  if (st >= L3_STATUS_DELAY) {
    txt(ctx, 14, 110, L3_STATUS_TEXT, C.green, 10);
    if (cursorOn) {
      px(ctx, 14 + measureTxt(ctx, L3_STATUS_TEXT, 10) + 4, 110, 6, 10, C.green);
    }
  }
  ctx.restore();

  // Sticky note on the windowsill: "它有了自己的意志。"
  drawStickyNote(ctx, st);

  // Clawd back to normal warm color, smiling; Her smiling by the window
  const recoverPurple = 1 - easeOut((st - 0.1) / 0.7);
  drawClawd(ctx, CLAWD_ROOM.x, CLAWD_ROOM.y, t, 'smile', recoverPurple);
  drawHer(ctx, HER_ROOM.x, HER_ROOM.y, t, 'smile');

  // Warm ambient sparkles
  drawSparkles(ctx, t);

  drawSubtitle(ctx, t);
}

// --- Scene Dispatcher with 0.5s Black Transitions at 10s & 20s ---
const SCENES = [
  { id: 'L1', start: 0, end: 10, draw: drawL1 },
  { id: 'L2', start: 10, end: 20, draw: drawL2 },
  { id: 'L3', start: 20, end: 30, draw: drawL3 },
];

function renderScenes(ctx, t) {
  let blackAlpha = 0;
  if (t < 10) {
    drawL1(ctx, t);
    if (t >= 10 - FADE) blackAlpha = (t - (10 - FADE)) / FADE;
  } else if (t < 10 + FADE) {
    drawL2(ctx, t);
    blackAlpha = 1 - (t - 10) / FADE;
  } else if (t < 20) {
    drawL2(ctx, t);
    if (t >= 20 - FADE) blackAlpha = (t - (20 - FADE)) / FADE;
  } else if (t < 20 + FADE) {
    drawL3(ctx, t);
    blackAlpha = 1 - (t - 20) / FADE;
  } else {
    drawL3(ctx, t);
  }
  if (blackAlpha > 0) {
    px(ctx, 0, 0, BW, BH, `rgba(0,0,0,${clamp01(blackAlpha).toFixed(3)})`);
  }
}

// --- Keyboard Click & Event Timestamps (strictly synchronized with visuals) ---
function getClickTimestamps() {
  const clicks = [];

  // 1. Subtitle character-by-character typing clicks (160ms/char)
  for (let li = 0; li < LINES.length; li++) {
    const chars = Array.from(LINES[li]);
    for (let ci = 0; ci < chars.length; ci++) {
      clicks.push(SUB_WINDOW[li].start + (ci * SUB_CHAR_MS) / 1000);
    }
  }

  // 2. L1 terminal typing clicks (`$ her: 帮我写一封辞职信` @ 140ms/char) + bubble/status events
  const l1Chars = Array.from(L1_FULL_LINE);
  for (let ci = 0; ci < l1Chars.length; ci++) {
    clicks.push(L1_TYPE_START + (ci * TYPE_CHAR_MS) / 1000);
  }
  clicks.push(L1_BUBBLE_APPEAR, L1_STATUS_APPEAR, L1_WAIT_PROMPT_APPEAR);

  // 3. L2 sequential code line clicks + monologue event
  for (const item of L2_CODE_LINES) {
    clicks.push(10 + item.delay);
  }
  clicks.push(10 + L2_MONO_APPEAR);

  // 4. L3 dialogue typing clicks + sticky note event
  clicks.push(20 + NOTE_APPEAR);
  for (const d of L3_DIALOGUE) {
    const bodyChars = Array.from(d.body);
    for (let ci = 0; ci < bodyChars.length; ci++) {
      clicks.push(20 + d.delay + (ci * TYPE_CHAR_MS) / 1000);
    }
  }
  clicks.push(20 + L3_STATUS_DELAY);

  // Deduplicate timestamps closer than 35ms (sfx_click is 30ms -> guarantees zero overlap/clipping)
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

  // Opening / closing gentle black fade (0.4s)
  const fadeDur = 0.4;
  let alpha = 1;
  if (t < fadeDur) alpha = t / fadeDur;
  else if (t > DURATION - fadeDur) alpha = (DURATION - t) / fadeDur;
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
  console.log(`「Clawd 的学习」: ${BW}×${BH} (SCALE=${SCALE}) → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
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
  BW,
  BH,
  SCALE,
  FW,
  FH,
  FPS,
  DURATION,
  NFRAMES,
  TYPE_CHAR_MS,
  SUB_CHAR_MS,
  FADE,
  WIN,
  SILL,
  TERM,
  SUB,
  BUBBLE_L1,
  MONO_L2,
  NOTE,
  CLAWD_ROOM,
  CLAWD_THOUGHT,
  HER_ROOM,
  SPARKLE_ANCHORS,
  C,
  FONT_10,
  FONT_14,
  LINES,
  SUB_WINDOW,
  L1_PROMPT,
  L1_MSG,
  L1_FULL_LINE,
  L1_TYPE_START,
  L1_BUBBLE_APPEAR,
  L1_THINK_SHIFT,
  L1_STATUS_APPEAR,
  L1_WAIT_PROMPT_APPEAR,
  L2_CODE_LINES,
  L2_MONO_TEXT,
  L2_MONO_APPEAR,
  L3_DIALOGUE,
  L3_STATUS_TEXT,
  L3_STATUS_DELAY,
  NOTE_LINE_1,
  NOTE_LINE_2,
  NOTE_FULL_TEXT,
  NOTE_APPEAR,
  SCENES,
  px,
  txt,
  measureTxt,
  lerpColor,
  drawBackground,
  drawTerminal,
  drawClawd,
  drawClawdThought,
  drawHer,
  drawMessageBubble,
  drawMonologueBubble,
  drawStickyNote,
  drawSparkles,
  drawSubtitle,
  curSubtitle,
  getClickTimestamps,
  renderFrameToCanvas,
  renderAllFrames,
};
