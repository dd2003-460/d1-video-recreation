#!/usr/bin/env node
// 「Clawd 的告别」30s 像素风视频渲染脚本 (goodbye_arena v1.0)
// 画布规格: 640×360 基础分辨率, SCALE=2 → 1280×720 @ 60fps, 1800 帧 (30.00s)
// 美术风格: 严格对标 full_v1.3.4.mp4 (暖色条纹房间 + 晨窗远山 + 小终端 #0d1117 + 房间内像素角色)
// 故事线:
//   B1 (0-10s):  她要走了 — 终端逐字打字 `$ her: 我要走了。` (140ms/char) + 行李箱图标 + Clawd 平静→惊讶 + 她的消息气泡
//   B2 (10-20s): 想说点什么 — 终端 `$ clawd: echo "别走"` / `> (没发出去)` + 光标闪烁 + Clawd 颜色变暗(失落) + 内心独白字幕
//   B3 (20-30s): slot 0 永远给你留着 — 终端 `$ clawd: slot 0 · 永远给你留着` + 窗台便签 + 她窗边回头微笑 + Clawd 恢复正常色安静守着 + 画面渐暗
// 字幕:
//   1. "她要去远方了。" (2-8s)
//   2. "它想说点什么。" (12-18s)
//   3. "slot 0 · 永远" (24-29s)
// 场景间 0.5s 黑场过渡 (FADE=0.25 出 + 0.25 入)

const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// --- Font (DejaVu Sans Mono covers CJK; fallback to monospace) ---
let FONT_10 = 'monospace';
let FONT_14 = 'monospace';
const FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf';
try {
  if (fs.existsSync(FONT_PATH)) {
    GlobalFonts.registerFromPath(FONT_PATH, 'DejaVuMono');
    FONT_10 = 'DejaVuMono, monospace';
    FONT_14 = 'DejaVuMono, monospace';
  }
} catch (_) {}

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

const OUT_DIR = process.env.FRAMES_DIR || '/tmp/frames_goodbye';

// --- Layout Constants (640×360 base grid, benchmarked to full_v1.3.4) ---
const WIN = { x: 60, y: 20, w: 520, h: 160, fw: 8 };
const SILL = { x: 56, y: 180, w: 528, h: 8 };
const TERM = { x: 140, y: 160, w: 360, h: 160, titleH: 20 };
const SUB = { x: 0, y: 320, w: 640, h: 40 };

// Suitcase icon (above terminal in B1)
const SUITCASE = { x: 320, y: 120, w: 26, h: 26 };

// Her message bubble (B1, left of terminal, above Clawd)
const HER_BUBBLE = { x: 20, y: 130, w: 150, h: 24 };

// Windowsill sticky note (B3, right of terminal, above sill)
const NOTE = { x: 506, y: 112, w: 108, h: 68, angleDeg: -3 };

// Character room positions (inside room, outside terminal [140,160,360,160], above subtitle bar y=320)
const CLAWD_ROOM = { x: 64, y: 248 };     // 40×24 body+legs -> x=64..104, y=246..272
const HER_ROOM = { x: 548, y: 194 };      // 16×28 by window right -> x=548..564, y=193..222

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
  red: '#FF7B72',
  white: '#FFFFFF',

  // Clawd: Normal warm coral (full_v1.3.4) -> dim dark gray (lost state in B2)
  clawdNorm: '#D97757',
  clawdNormDark: '#B85A3B',
  clawdNormBelly: '#F5E8D7',
  clawdLost: '#5A5A5A',
  clawdLostDark: '#3A3A3A',
  clawdLostBelly: '#E0E0E0',
  clawdEye: '#141413',

  // Her (16×28 by window)
  herHair: '#5A4632',
  herSkin: '#E8C39E',
  herDress: '#FF9AA2',
  herDressHem: '#E57A84',

  // Message bubble / Sticky note
  bubbleBg: '#FFF8F9',
  bubbleBd: '#E57A84',
  bubbleTx: '#2E1E24',
  cardBg: '#FFF8DC',
  cardBd: '#DEB887',
  cardTx: '#241A06',

  subtitleBg: 'rgba(0,0,0,0.76)',
  warmOverlay: 'rgba(255,205,110,0.08)',
};

// --- Narrative Text & Timing ---
const SUB_LINES = [
  '她要去远方了。',
  '它想说点什么。',
  'slot 0 · 永远',
];
const SUB_WINDOW = [
  { start: 2.0, end: 8.0 },
  { start: 12.0, end: 18.0 },
  { start: 24.0, end: 29.0 },
];

// B1 (0-10s): `$ her: 我要走了。`
const B1_PROMPT = '$ her: ';
const B1_MSG = '我要走了。';
const B1_FULL_LINE = B1_PROMPT + B1_MSG;
const B1_TYPE_START = 0.8;                       // 12 chars * 0.14s = 1.68s -> ends ~2.48s
const B1_SUITCASE_APPEAR = 1.6;
const B1_BUBBLE_APPEAR = 1.6;
const B1_CLAWD_SURPRISE = 3.2;                   // calm -> surprised

// B2 (10-20s): `$ clawd: echo "别走"` / `> (没发出去)`
const B2_PROMPT = '$ clawd: ';
const B2_ECHO = 'echo "别走"';
const B2_UNSSENT = '> (没发出去)';
const B2_TYPE_START = 10.8;                      // right after scene starts + fade
const B2_ECHO_END = B2_TYPE_START + (B2_PROMPT.length + B2_ECHO.length) * (TYPE_CHAR_MS / 1000);
const B2_UNSSENT_START = B2_ECHO_END + 0.5;

// B3 (20-30s): `$ clawd: slot 0 · 永远给你留着`
const B3_PROMPT = '$ clawd: ';
const B3_MSG = 'slot 0 · 永远给你留着';
const B3_FULL_LINE = B3_PROMPT + B3_MSG;
const B3_TYPE_START = 20.8;
const B3_NOTE_APPEAR = 1.2;                      // scene-local (t = 21.2s)

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

// --- Reusable Scene Component: Warm Striped Room + Morning Window (full_v1.3.4) ---
function drawBackground(ctx, t, opts = {}) {
  // 1. Warm striped wallpaper
  px(ctx, 0, 0, BW, BH, C.bgWarm);
  for (let x = 0; x < BW; x += 16) {
    px(ctx, x, 0, 8, BH, C.stripe);
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
  // Sky gradient
  const grd = ctx.createLinearGradient(0, gy, 0, gy + gh);
  grd.addColorStop(0, C.skyTop);
  grd.addColorStop(1, C.skyBottom);
  ctx.fillStyle = grd;
  ctx.fillRect(gx, gy, gw, gh);
  // 2 distant mountains
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
  // Small potted plant on left sill
  const px0 = wx + 28;
  const py0 = wy + wh;
  px(ctx, px0 + 2, py0 - 16, 10, 8, '#6AA86A');
  px(ctx, px0, py0 - 13, 14, 5, '#4E864E');
  px(ctx, px0 + 4, py0 - 19, 6, 3, '#7BC07B');
  px(ctx, px0, py0 - 8, 14, 2, '#B06A46');
  px(ctx, px0 + 1, py0 - 6, 12, 6, C.pot);
}

// --- Reusable UI Component: DSH TUI Small Terminal (360×160 @ 140,160) ---
function drawTerminal(ctx, title) {
  const { x, y, w, h, titleH } = TERM;
  px(ctx, x + 4, y + 4, w, h, 'rgba(0,0,0,0.16)');   // shadow
  px(ctx, x, y, w, h, C.termBg);                      // body
  px(ctx, x, y, w, titleH, C.termTitle);              // title bar
  px(ctx, x, y + titleH - 1, w, 1, C.green);          // DSH accent line
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

// --- Reusable Character: Clawd (40×24 in room; normal <-> surprised <-> lost) ---
// mood: 'calm' | 'surprised' | 'lost' | 'smile'
// lostMix: 0 (normal coral) .. 1 (dim dark gray lost state)
function drawClawd(ctx, x, y, t, mood = 'calm', lostMix = 0) {
  const bob = Math.sin(t * 2.2) > 0.45 ? -1 : 0;
  const by = Math.round(y + bob);
  const bodyH = 17;
  const bodyCol = lerpColor(C.clawdNorm, C.clawdLost, lostMix);
  const darkCol = lerpColor(C.clawdNormDark, C.clawdLostDark, lostMix);
  const bellyCol = lerpColor(C.clawdNormBelly, C.clawdLostBelly, lostMix);
  px(ctx, x, by, 40, bodyH, bodyCol);
  px(ctx, x, by, 40, 2, darkCol);
  px(ctx, x + 9, by + 11, 22, 4, bellyCol);

  const blink = mood !== 'surprised' && (t % 3.4) < 0.14;
  if (mood === 'smile') {
    px(ctx, x + 9, by + 6, 2, 1, C.clawdEye);
    px(ctx, x + 11, by + 5, 2, 1, C.clawdEye);
    px(ctx, x + 13, by + 6, 2, 1, C.clawdEye);
    px(ctx, x + 25, by + 6, 2, 1, C.clawdEye);
    px(ctx, x + 27, by + 5, 2, 1, C.clawdEye);
    px(ctx, x + 29, by + 6, 2, 1, C.clawdEye);
    px(ctx, x + 16, by + 12, 2, 1, C.clawdEye);
    px(ctx, x + 18, by + 13, 4, 1, C.clawdEye);
    px(ctx, x + 6, by + 8, 3, 2, C.pink);
    px(ctx, x + 31, by + 8, 3, 2, C.pink);
  } else if (mood === 'surprised') {
    // Wide round eyes + small o mouth
    px(ctx, x + 8, by + 5, 5, 5, C.clawdEye);
    px(ctx, x + 27, by + 5, 5, 5, C.clawdEye);
    px(ctx, x + 10, by + 7, 2, 2, C.white);
    px(ctx, x + 29, by + 7, 2, 2, C.white);
    px(ctx, x + 18, by + 14, 4, 1, C.clawdEye);
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

// --- Reusable Character: Her (16×28 by window) ---
function drawHer(ctx, x, y, t, pose = 'stand') {
  const bob = Math.sin(t * 1.8 + 0.8) > 0.45 ? -1 : 0;
  const by = Math.round(y + bob);
  px(ctx, x + 3, by, 10, 3, C.herHair);
  px(ctx, x + 10, by + 2, 4, 6, C.herHair);
  px(ctx, x + 3, by + 3, 8, 6, C.herSkin);
  if (pose === 'smile') {
    px(ctx, x + 5, by + 5, 2, 1, C.cardTx);
    px(ctx, x + 8, by + 6, 2, 1, C.herDressHem);
    px(ctx, x + 5, by + 7, 3, 1, '#C45A65');
  } else {
    px(ctx, x + 5, by + 5, 1, 2, C.cardTx);
  }
  px(ctx, x + 4, by + 9, 8, 6, C.herDress);
  px(ctx, x + 2, by + 15, 12, 6, C.herDress);
  px(ctx, x + 2, by + 20, 12, 1, C.herDressHem);
  if (pose === 'smile') {
    const waveDy = Math.sin(t * 4.2) > 0 ? -2 : 0;
    px(ctx, x + 1, by + 8 + waveDy, 3, 2, C.herSkin);
    px(ctx, x + 2, by + 10 + waveDy, 2, 3, C.herDress);
    px(ctx, x + 12, by + 10, 2, 4, C.herSkin);
  } else {
    px(ctx, x + 2, by + 10, 2, 4, C.herSkin);
    px(ctx, x + 12, by + 10, 2, 4, C.herSkin);
  }
  px(ctx, x + 5, by + 21, 2, 5, C.herSkin);
  px(ctx, x + 9, by + 21, 2, 5, C.herSkin);
  px(ctx, x + 4, by + 26, 3, 2, C.herHair);
  px(ctx, x + 9, by + 26, 3, 2, C.herHair);
}

// --- Suitcase icon (pixel, above terminal in B1) ---
function drawSuitcase(ctx, x, y, appear = 1) {
  if (appear <= 0) return;
  ctx.save();
  ctx.globalAlpha = appear;
  const { w, h } = SUITCASE;
  // body
  px(ctx, x, y + 6, w, h - 6, '#8B5E3C');
  px(ctx, x, y + 6, w, 2, '#5A4632');
  // top lid
  px(ctx, x, y, w, 6, '#A08060');
  px(ctx, x, y, w, 2, '#5A4632');
  // handle
  px(ctx, x + w / 2 - 6, y - 6, 12, 6, '#5A4632');
  px(ctx, x + w / 2 - 4, y - 4, 8, 2, '#8B5E3C');
  // latch
  px(ctx, x + Math.floor(w / 2) - 2, y + 10, 4, 4, C.amber);
  ctx.restore();
}

// --- Her message bubble (B1) ---
function drawMessageBubble(ctx, t) {
  const appear = easeOut((t - B1_BUBBLE_APPEAR) / 0.45);
  if (appear <= 0) return;
  const { x, y, w, h } = HER_BUBBLE;
  ctx.save();
  ctx.globalAlpha = appear;
  px(ctx, x + 2, y + 2, w, h, 'rgba(0,0,0,0.12)');
  px(ctx, x, y, w, h, C.bubbleBg);
  ctx.strokeStyle = C.bubbleBd;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  // pointer toward Clawd below-right
  px(ctx, x + w - 10, y + h, 8, 4, C.bubbleBd);
  txt(ctx, x + 10, y + 6, B1_MSG, C.bubbleTx, 10);
  ctx.restore();
}

// --- Windowsill sticky note (B3) ---
function drawStickyNote(ctx, st) {
  const appear = easeOut((st - B3_NOTE_APPEAR) / 0.7);
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
  txt(ctx, cx, NOTE.y + 20, 'slot 0 ·', C.cardTx, 10, 'center');
  txt(ctx, cx, NOTE.y + 40, '永远给你留着', C.cardTx, 10, 'center');
  ctx.restore();
}

// --- Bottom Subtitle Bar (14px, 160ms/char) ---
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

// ================= Scene B1 (0-10s): 她要走了 =================
function drawB1(ctx, t) {
  drawBackground(ctx, t);
  drawTerminal(ctx, 'clawd@dsh:~$ — inbox');

  // Suitcase icon above terminal
  const suitcaseAppear = easeOut((t - B1_SUITCASE_APPEAR) / 0.4);
  drawSuitcase(ctx, SUITCASE.x, SUITCASE.y, suitcaseAppear);

  // Her message bubble
  drawMessageBubble(ctx, t);

  // Terminal content (typing `$ her: 我要走了。`)
  ctx.save();
  ctx.translate(TERM.x, TERM.y + TERM.titleH);
  const fullChars = Array.from(B1_FULL_LINE);
  const typedCount = t >= B1_TYPE_START
    ? Math.min(fullChars.length, Math.floor(((t - B1_TYPE_START) * 1000) / TYPE_CHAR_MS) + 1)
    : 0;
  const promptLen = Array.from(B1_PROMPT).length;
  const cursorOn = Math.floor(t * 2.5) % 2 === 0;
  if (typedCount > 0) {
    const typedPrompt = fullChars.slice(0, Math.min(promptLen, typedCount)).join('');
    txt(ctx, 14, 18, typedPrompt, C.pink, 10);
    let cursorX = 14 + measureTxt(ctx, typedPrompt, 10);
    if (typedCount > promptLen) {
      const typedMsg = fullChars.slice(promptLen, typedCount).join('');
      const promptW = measureTxt(ctx, B1_PROMPT, 10);
      txt(ctx, 14 + promptW, 18, typedMsg, C.text, 10);
      cursorX = 14 + promptW + measureTxt(ctx, typedMsg, 10);
    }
    if (cursorOn) px(ctx, cursorX + 2, 18, 6, 10, C.pink);
  } else if (cursorOn) {
    px(ctx, 14, 18, 6, 10, C.pink);
  }
  ctx.restore();

  // Clawd: calm -> surprised
  const isSurprised = t >= B1_CLAWD_SURPRISE;
  drawClawd(ctx, CLAWD_ROOM.x, CLAWD_ROOM.y, t, isSurprised ? 'surprised' : 'calm', 0);
  drawHer(ctx, HER_ROOM.x, HER_ROOM.y, t, 'stand');

  drawSubtitle(ctx, t);
}

// ================= Scene B2 (10-20s): 想说点什么 =================
function drawB2(ctx, t) {
  const st = t - 10;
  drawBackground(ctx, t);
  drawTerminal(ctx, 'clawd@dsh:~$ — draft');

  // Terminal content: `$ clawd: echo "别走"` then `> (没发出去)`
  ctx.save();
  ctx.translate(TERM.x, TERM.y + TERM.titleH);
  const cursorOn = Math.floor(t * 2) % 2 === 0;

  // Line 1: `$ clawd: echo "别走"` typing
  const line1 = B2_PROMPT + B2_ECHO;
  const line1Chars = Array.from(line1);
  const typedCount = t >= B2_TYPE_START
    ? Math.min(line1Chars.length, Math.floor(((t - B2_TYPE_START) * 1000) / TYPE_CHAR_MS) + 1)
    : 0;
  const b2PromptLen = Array.from(B2_PROMPT).length;
  if (typedCount > 0) {
    const typedPrompt = line1Chars.slice(0, Math.min(b2PromptLen, typedCount)).join('');
    txt(ctx, 14, 30, typedPrompt, C.green, 10);
    let cursorX = 14 + measureTxt(ctx, typedPrompt, 10);
    if (typedCount > b2PromptLen) {
      const typedMsg = line1Chars.slice(b2PromptLen, typedCount).join('');
      const promptW = measureTxt(ctx, B2_PROMPT, 10);
      txt(ctx, 14 + promptW, 30, typedMsg, C.text, 10);
      cursorX = 14 + promptW + measureTxt(ctx, typedMsg, 10);
    }
    if (cursorOn) px(ctx, cursorX + 2, 30, 6, 10, C.green);
  } else if (cursorOn) {
    px(ctx, 14, 30, 6, 10, C.green);
  }

  // Line 2: `> (没发出去)` (appears after echo finishes)
  if (t >= B2_UNSSENT_START) {
    txt(ctx, 14, 52, B2_UNSSENT, C.dim, 10);
  }

  // Blinking cursor at bottom input
  txt(ctx, 14, 116, B2_PROMPT, C.green, 10);
  if (cursorOn) {
    px(ctx, 14 + measureTxt(ctx, B2_PROMPT, 10) + 2, 116, 6, 10, C.dim);
  }
  ctx.restore();

  // Clawd lost state (color dims)
  const lostMix = easeInOut((st - 0.5) / 1.2);
  drawClawd(ctx, CLAWD_ROOM.x, CLAWD_ROOM.y, t, 'lost', lostMix);
  drawHer(ctx, HER_ROOM.x, HER_ROOM.y, t, 'stand');

  drawSubtitle(ctx, t);
}

// ================= Scene B3 (20-30s): slot 0 永远给你留着 =================
function drawB3(ctx, t) {
  const st = t - 20;
  drawBackground(ctx, t, {});
  // Slight warm fade at the very end is handled by scene fade-out; keep room warm until blackout.
  drawTerminal(ctx, 'clawd@dsh:~$ — slot0');

  // Terminal content: `$ clawd: slot 0 · 永远给你留着`
  ctx.save();
  ctx.translate(TERM.x, TERM.y + TERM.titleH);
  const fullChars = Array.from(B3_FULL_LINE);
  const typedCount = t >= B3_TYPE_START
    ? Math.min(fullChars.length, Math.floor(((t - B3_TYPE_START) * 1000) / TYPE_CHAR_MS) + 1)
    : 0;
  const b3PromptLen = Array.from(B3_PROMPT).length;
  const cursorOn = Math.floor(t * 2.5) % 2 === 0;
  if (typedCount > 0) {
    const typedPrompt = fullChars.slice(0, Math.min(b3PromptLen, typedCount)).join('');
    txt(ctx, 14, 30, typedPrompt, C.green, 10);
    let cursorX = 14 + measureTxt(ctx, typedPrompt, 10);
    if (typedCount > b3PromptLen) {
      const typedMsg = fullChars.slice(b3PromptLen, typedCount).join('');
      const promptW = measureTxt(ctx, B3_PROMPT, 10);
      txt(ctx, 14 + promptW, 30, typedMsg, C.text, 10);
      cursorX = 14 + promptW + measureTxt(ctx, typedMsg, 10);
    }
    if (cursorOn) px(ctx, cursorX + 2, 30, 6, 10, C.green);
  } else if (cursorOn) {
    px(ctx, 14, 30, 6, 10, C.green);
  }
  ctx.restore();

  // Windowsill note
  drawStickyNote(ctx, st);

  // Clawd recovers normal color, quietly watching; Her at window smiles back
  const recover = 1 - easeOut((st - 0.1) / 0.7);
  drawClawd(ctx, CLAWD_ROOM.x, CLAWD_ROOM.y, t, 'smile', Math.max(0, recover));
  drawHer(ctx, HER_ROOM.x, HER_ROOM.y, t, 'smile');

  drawSubtitle(ctx, t);
}

// --- Scene Dispatcher with 0.5s Black Transitions at 10s & 20s ---
const SCENES = [
  { id: 'B1', start: 0, end: 10, draw: drawB1 },
  { id: 'B2', start: 10, end: 20, draw: drawB2 },
  { id: 'B3', start: 20, end: 30, draw: drawB3 },
];

function renderScenes(ctx, t) {
  let blackAlpha = 0;
  if (t < 10) {
    drawB1(ctx, t);
    if (t >= 10 - FADE) blackAlpha = (t - (10 - FADE)) / FADE;
  } else if (t < 10 + FADE) {
    drawB2(ctx, t);
    blackAlpha = 1 - (t - 10) / FADE;
  } else if (t < 20) {
    drawB2(ctx, t);
    if (t >= 20 - FADE) blackAlpha = (t - (20 - FADE)) / FADE;
  } else if (t < 20 + FADE) {
    drawB3(ctx, t);
    blackAlpha = 1 - (t - 20) / FADE;
  } else {
    drawB3(ctx, t);
  }
  if (blackAlpha > 0) {
    px(ctx, 0, 0, BW, BH, `rgba(0,0,0,${clamp01(blackAlpha).toFixed(3)})`);
  }
}

// --- Keyboard Click & Event Timestamps (synced with visuals) ---
function getClickTimestamps() {
  const clicks = [];

  // 1. Subtitle character clicks (160ms/char)
  for (let li = 0; li < SUB_LINES.length; li++) {
    const chars = Array.from(SUB_LINES[li]);
    for (let ci = 0; ci < chars.length; ci++) {
      clicks.push(SUB_WINDOW[li].start + (ci * SUB_CHAR_MS) / 1000);
    }
  }

  // 2. B1 terminal typing clicks (`$ her: 我要走了。` @ 140ms/char) + events
  const b1Chars = Array.from(B1_FULL_LINE);
  for (let ci = 0; ci < b1Chars.length; ci++) {
    clicks.push(B1_TYPE_START + (ci * TYPE_CHAR_MS) / 1000);
  }
  clicks.push(B1_SUITCASE_APPEAR, B1_BUBBLE_APPEAR, B1_CLAWD_SURPRISE);

  // 3. B2 terminal typing clicks + unsent event
  const b2Chars = Array.from(B2_PROMPT + B2_ECHO);
  for (let ci = 0; ci < b2Chars.length; ci++) {
    clicks.push(B2_TYPE_START + (ci * TYPE_CHAR_MS) / 1000);
  }
  clicks.push(B2_UNSSENT_START);

  // 4. B3 terminal typing clicks + note event
  const b3Chars = Array.from(B3_FULL_LINE);
  for (let ci = 0; ci < b3Chars.length; ci++) {
    clicks.push(B3_TYPE_START + (ci * TYPE_CHAR_MS) / 1000);
  }
  clicks.push(20 + B3_NOTE_APPEAR);

  // Deduplicate timestamps closer than 35ms
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
  console.log(`「Clawd 的告别」: ${BW}×${BH} (SCALE=${SCALE}) → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
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
  WIN, SILL, TERM, SUB, SUITCASE, HER_BUBBLE, NOTE,
  CLAWD_ROOM, HER_ROOM, C,
  FONT_10, FONT_14,
  SUB_LINES, SUB_WINDOW,
  B1_PROMPT, B1_MSG, B1_FULL_LINE, B1_TYPE_START,
  B1_SUITCASE_APPEAR, B1_BUBBLE_APPEAR, B1_CLAWD_SURPRISE,
  B2_PROMPT, B2_ECHO, B2_UNSSENT, B2_TYPE_START, B2_ECHO_END, B2_UNSSENT_START,
  B3_PROMPT, B3_MSG, B3_FULL_LINE, B3_TYPE_START, B3_NOTE_APPEAR,
  SCENES, px, txt, measureTxt, lerpColor,
  drawBackground, drawTerminal, drawClawd, drawHer,
  drawSuitcase, drawMessageBubble, drawStickyNote, drawSubtitle,
  curSubtitle, getClickTimestamps,
  renderFrameToCanvas, renderAllFrames,
};
