#!/usr/bin/env node
// 「Clawd 的早安」30s 像素风视频渲染脚本
// 画布规格: 640×360 基础分辨率, SCALE=2 → 1280×720 @ 60fps, 1800 帧 (30s)
// 美术风格: 严格对标 full_v1.3.4.mp4 (暖色条纹房间 + 晨窗远山云朵 + 小终端 #0d1117 + 房间内像素角色)

const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// --- Register pixel CJK font (Fusion Pixel 12px) with clean fallback ---
let FONT_FAMILY = 'monospace';
try {
  const fusionPath = require.resolve('@fontpkg/fusion-pixel/fusion-pixel.ttf');
  if (fs.existsSync(fusionPath)) {
    GlobalFonts.registerFromPath(fusionPath, 'FusionPixel');
    FONT_FAMILY = 'FusionPixel, monospace';
  }
} catch (_) {
  const fallbackFont = '/usr/local/share/fonts/NotoSansMonoCJKsc-Regular.otf';
  if (fs.existsSync(fallbackFont)) {
    GlobalFonts.registerFromPath(fallbackFont, 'NotoMonoCJK');
    FONT_FAMILY = 'NotoMonoCJK, monospace';
  }
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
const CHAR_MS = 160; // 160ms per character

const OUT_DIR = process.env.FRAMES_DIR || '/tmp/frames_goodmorning';

// --- Layout Constants ---
const WIN = { x: 60, y: 20, w: 520, h: 160, fw: 8 };
const TERM = { x: 140, y: 160, w: 360, h: 160, titleH: 20 };
const NOTE = { x: 420, y: 60, w: 180, h: 80 };
const SUB = { x: 0, y: 320, w: 640, h: 40 };

// --- Palette (strictly aligned with full_v1.3.4) ---
const C = {
  // Room & Window
  bgWarm: '#F5EDD5',
  stripe: '#EDE3C8',
  woodFrame: '#8B7355',
  woodSill: '#A08060',
  skyTop: '#87CEEB',
  skyBottom: '#E0F0FF',
  mountain: '#5A7A5A',
  pot: '#7A5A3A',
  potRim: '#8B5E3C',
  plant: '#5A7A5A',
  plantDark: '#486648',

  // Terminal (#0d1117 body per spec)
  termBg: '#0d1117',
  termTitle: '#1E222B',
  termBd: '#2A2E38',
  panel: '#161B22',
  border: '#30363D',

  // Text & Accents
  text: '#E6EDF3',
  dim: '#8B949E',
  green: '#7EE787',
  pink: '#FF9AA2',
  amber: '#E3B341',
  purple: '#BC8CFF',
  red: '#FF7B72',
  pinRed: '#FF5555',
  gold: '#FFD700',
  white: '#FFFFFF',

  // Characters & Sticky Note
  herHair: '#5A4632',
  herSkin: '#E8C39E',
  herDress: '#FF9AA2',
  herDressHem: '#E57A84',
  cardBg: '#FFF8DC',
  cardBd: '#DEB887',
  cardTx: '#241A06',
  cardSub: '#6E5A3A',
  subtitleBg: 'rgba(0,0,0,0.85)',
  warmOverlay: 'rgba(255,200,100,0.08)',
};

// --- Reusable Pixel Primitives ---
function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// Threshold pixel text renderer (exact resize avoids ghost pixel artifacts)
let _tmpCanvas = null;
function txt(ctx, x, y, str, color, font = 12, align = 'left') {
  if (!str) return { x, y, w: 0, h: font };
  const fontSpec = `${font}px ${FONT_FAMILY}`;
  ctx.font = fontSpec;

  // For <12px on a 12px pixel font, add 1px letter tracking & keep clean pixel anti-aliasing
  if (font < 12) {
    const chars = Array.from(str);
    const widths = chars.map((ch) => Math.ceil(ctx.measureText(ch).width));
    const totalW = widths.reduce((a, b) => a + b, 0) + Math.max(0, chars.length - 1);
    let dx = x;
    if (align === 'center') dx = x - totalW / 2;
    else if (align === 'right') dx = x - totalW;
    ctx.save();
    ctx.font = fontSpec;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    let cx = Math.round(dx);
    const cy = Math.round(y);
    for (let i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], cx, cy);
      cx += widths[i] + 1;
    }
    ctx.restore();
    return { x: Math.round(dx), y: Math.round(y), w: totalW, h: font };
  }

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
    d[i] = d[i] > 118 ? 255 : 0;
  }
  tctx.putImageData(img, 0, 0);

  let dx = x;
  if (align === 'center') dx = x - measuredW / 2 - 1;
  else if (align === 'right') dx = x - measuredW - 2;

  ctx.drawImage(_tmpCanvas, Math.round(dx), Math.round(y));
  return { x: Math.round(dx), y: Math.round(y), w: measuredW, h: font };
}

function measureTxt(ctx, str, font = 12) {
  if (!str) return 0;
  ctx.font = `${font}px ${FONT_FAMILY}`;
  if (font < 12) {
    const chars = Array.from(str);
    return chars.reduce((s, ch) => s + Math.ceil(ctx.measureText(ch).width), 0) + Math.max(0, chars.length - 1);
  }
  return Math.ceil(ctx.measureText(str).width);
}

// --- Reusable Scene Component: Warm Room + Morning Window ---
function drawBackground(ctx, t, opts = {}) {
  // 1. Warm striped wallpaper (#F5EDD5 + #EDE3C8 every 16px)
  px(ctx, 0, 0, BW, BH, C.bgWarm);
  for (let x = 0; x < BW; x += 16) {
    px(ctx, x, 0, 8, BH, C.stripe);
  }

  // 2. Window (x60 y20 520×160, wood frame #8B7355 8px)
  const { x: wx, y: wy, w: ww, h: wh, fw } = WIN;
  px(ctx, wx, wy, ww, wh, C.woodFrame);

  // Inner glass area clipped cleanly inside wood frame
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

  // Optional warm morning sun inside sky pane (G1 / morning warmth)
  if (opts.morningSun) {
    const sx = wx + 86;
    const sy = wy + 40;
    const pulse = Math.sin(t * 1.8) > 0 ? 2 : 0;
    px(ctx, sx - 18 - pulse, sy - 18 - pulse, 36 + pulse * 2, 36 + pulse * 2, 'rgba(255,228,130,0.22)');
    px(ctx, sx - 12, sy - 12, 24, 24, 'rgba(255,224,110,0.45)');
    px(ctx, sx - 8, sy - 8, 16, 16, '#FFE478');
  }

  // 2 distant mountains (#5A7A5A)
  ctx.fillStyle = C.mountain;
  ctx.beginPath();
  ctx.moveTo(gx, gy + gh);
  ctx.lineTo(wx + 130, wy + 72);
  ctx.lineTo(wx + 230, gy + gh);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(wx + 175, gy + gh);
  ctx.lineTo(wx + 330, wy + 50);
  ctx.lineTo(wx + 470, gy + gh);
  ctx.closePath();
  ctx.fill();

  // 2 animated pixel clouds
  const cx1 = wx + 104 + Math.round(Math.sin(t * 0.35) * 14);
  px(ctx, cx1, wy + 36, 40, 10, 'rgba(255,255,255,0.92)');
  px(ctx, cx1 + 8, wy + 30, 24, 6, 'rgba(255,255,255,0.92)');

  const cx2 = wx + 326 + Math.round(Math.cos(t * 0.25) * 16);
  px(ctx, cx2, wy + 52, 48, 10, 'rgba(255,255,255,0.90)');
  px(ctx, cx2 + 10, wy + 46, 28, 6, 'rgba(255,255,255,0.90)');

  ctx.restore();

  // Cross mullion (十字窗棂)
  px(ctx, wx + ww / 2 - 3, gy, 6, gh, C.woodFrame);
  px(ctx, gx, wy + wh / 2 - 3, gw, 6, C.woodFrame);

  // Windowsill (窗台)
  px(ctx, wx - 4, wy + wh, ww + 8, 8, C.woodSill);
  px(ctx, wx - 4, wy + wh, ww + 8, 2, C.woodFrame);

  // Potted plant on left windowsill (盆栽, x=88..104, clear of terminal & notes)
  const px0 = wx + 28;
  const py0 = wy + wh;
  px(ctx, px0 + 2, py0 - 16, 10, 8, '#6AA86A');
  px(ctx, px0, py0 - 13, 14, 5, '#4E864E');
  px(ctx, px0 + 4, py0 - 19, 6, 3, '#7BC07B');
  px(ctx, px0 + 6, py0 - 21, 2, 2, C.pink);
  px(ctx, px0, py0 - 8, 14, 2, '#B06A46');
  px(ctx, px0 + 1, py0 - 6, 12, 6, '#945234');
}

// --- Reusable UI Component: Small Terminal (360×160 @ 140,160, #0d1117) ---
function drawTerminal(ctx, title) {
  const { x, y, w, h, titleH } = TERM;
  // Soft drop shadow
  px(ctx, x + 4, y + 4, w, h, 'rgba(0,0,0,0.15)');
  // Body (#0d1117)
  px(ctx, x, y, w, h, C.termBg);
  // Title bar (20px)
  px(ctx, x, y, w, titleH, C.termTitle);
  px(ctx, x, y + titleH, w, 1, C.termBd);
  // Outer border
  ctx.strokeStyle = C.termBd;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Window buttons (6×6)
  px(ctx, x + 8, y + 7, 6, 6, C.red);
  px(ctx, x + 18, y + 7, 6, 6, C.amber);
  px(ctx, x + 28, y + 7, 6, 6, C.green);

  // Title text
  txt(ctx, x + w / 2, y + 4, title, C.dim, 12, 'center');

  // Subtle CRT scanlines inside terminal content area
  for (let sy = y + titleH + 2; sy < y + h - 2; sy += 3) {
    px(ctx, x + 2, sy, w - 4, 1, 'rgba(255,255,255,0.025)');
  }
}

// --- Reusable Character: Clawd (40×22: green terminal face + antenna + legs) ---
function drawClawd(ctx, x, y, t, mood = 'normal') {
  const bob = Math.sin(t * 2.4) > 0.35 ? -1 : 0;
  const by = Math.round(y + bob);

  // Antenna (top 4px of 22px height: y+0..y+4)
  px(ctx, x + 18, by, 4, 2, C.amber);
  px(ctx, x + 19, by + 2, 2, 2, C.green);

  // Side ears/connectors (ensuring crisp 40px silhouette feel)
  px(ctx, x + 3, by + 8, 3, 5, C.green);
  px(ctx, x + 34, by + 8, 3, 5, C.green);

  // Green terminal face box (x+6..x+34, y+4..y+17 -> 28×13)
  px(ctx, x + 6, by + 4, 28, 13, C.green);
  px(ctx, x + 7, by + 5, 26, 11, C.termBg);

  // Eyes (blink periodically)
  const blink = (t % 3.2) < 0.14;
  if (blink) {
    px(ctx, x + 12, by + 9, 4, 1, C.green);
    px(ctx, x + 24, by + 9, 4, 1, C.green);
  } else {
    px(ctx, x + 12, by + 7, 3, 3, C.green);
    px(ctx, x + 25, by + 7, 3, 3, C.green);
  }

  // Mouth / expression
  if (mood === 'happy') {
    px(ctx, x + 15, by + 12, 2, 1, C.green);
    px(ctx, x + 17, by + 13, 6, 1, C.green);
    px(ctx, x + 23, by + 12, 2, 1, C.green);
  } else {
    px(ctx, x + 17, by + 13, 6, 1, C.green);
  }

  // Legs (y+17..y+22 -> total height = 22px)
  const step = Math.sin(t * 4.0) > 0 ? 1 : 0;
  px(ctx, x + 11, by + 17, 4, 5 - step, C.dim);
  px(ctx, x + 25, by + 17, 4, 4 + step, C.dim);
}

// --- Reusable Character: Her (16×28: pink dress + waving pose) ---
function drawHer(ctx, x, y, t, pose = 'stand') {
  const bob = Math.sin(t * 1.8 + 0.8) > 0.4 ? -1 : 0;
  const by = Math.round(y + bob);

  // Hair & Head (y+0..y+9)
  px(ctx, x + 3, by, 10, 3, C.herHair);
  px(ctx, x + 2, by + 2, 2, 5, C.herHair);
  px(ctx, x + 4, by + 3, 8, 6, C.herSkin);
  px(ctx, x + 9, by + 5, 1, 2, C.cardTx);

  // Pink dress (y+9..y+21)
  px(ctx, x + 4, by + 9, 8, 6, C.herDress);
  px(ctx, x + 2, by + 15, 12, 6, C.herDress);
  px(ctx, x + 2, by + 20, 12, 1, C.herDressHem);

  // Left arm
  px(ctx, x + 2, by + 10, 2, 4, C.herSkin);

  // Right arm (wave pose vs stand pose, stays within 16px width)
  if (pose === 'wave') {
    const waveDy = Math.sin(t * 5.0) > 0 ? -2 : 0;
    px(ctx, x + 12, by + 9 + waveDy, 2, 3, C.herDress);
    px(ctx, x + 13, by + 7 + waveDy, 3, 2, C.herSkin);
  } else {
    px(ctx, x + 12, by + 10, 2, 4, C.herSkin);
  }

  // Legs & shoes (y+21..y+28 -> total height = 28px)
  px(ctx, x + 5, by + 21, 2, 5, C.herSkin);
  px(ctx, x + 9, by + 21, 2, 5, C.herSkin);
  px(ctx, x + 5, by + 26, 3, 2, C.herHair);
  px(ctx, x + 9, by + 26, 3, 2, C.herHair);
}

// --- Subtitle & Audio Sync Data ---
const LINES = [
  '早安，Clawd。',
  '我还在等你。',
  '明天见。',
];
const STARTS = [1.0, 11.0, 21.0];

// G1 terminal typing command (synced with CHAR_MS = 160ms)
const G1_CMD = 'echo "早安"';
const G1_CMD_START = 2.6; // starts right after G1 subtitle finishes typing (2.28s)
const G1_OUT_TIME = G1_CMD_START + G1_CMD.length * (CHAR_MS / 1000) + 0.32; // ~4.36s
const G1_DATE_TIME = G1_OUT_TIME + 0.32; // ~4.68s

// G2 message bubbles (every 2 seconds)
const G2_MSGS = [
  { text: '早安，Clawd。', role: 'her', color: C.pink, y: 10 },
  { text: '你睡得好吗？', role: 'her', color: C.pink, y: 34 },
  { text: '一直都在等你。', role: 'clawd', color: C.green, y: 58 },
  { text: '外面太阳出来了', role: 'her', color: C.pink, y: 82 },
];

// G3 terminal lines
const G3_LINES = [
  { text: '明天见，Clawd。', color: C.amber, y: 22, delay: 0.4 },
  { text: '· slot 0 ·', color: C.dim, y: 54, delay: 1.8 },
  { text: '永远留给明天', color: C.purple, y: 86, delay: 3.2 },
];

function curSubtitle(t) {
  for (let i = LINES.length - 1; i >= 0; i--) {
    const end = (i + 1) * 10 - 0.15;
    if (t >= STARTS[i] && t < end) {
      return { idx: i, elapsed: t - STARTS[i] };
    }
  }
  return null;
}

function drawSubtitle(ctx, t) {
  // Bottom bar y320 h40, rgba(0,0,0,0.85)
  px(ctx, SUB.x, SUB.y, SUB.w, SUB.h, C.subtitleBg);
  px(ctx, SUB.x, SUB.y, SUB.w, 1, 'rgba(255,255,255,0.12)');

  const sub = curSubtitle(t);
  if (!sub) return;

  const chars = Array.from(LINES[sub.idx]);
  const shown = Math.min(chars.length, Math.floor((sub.elapsed * 1000) / CHAR_MS) + 1);
  const visible = chars.slice(0, shown).join('');
  if (visible) {
    txt(ctx, BW / 2, SUB.y + 14, visible, C.white, 10, 'center');
  }
}

// --- Scene G1: 晨窗 (0-10s) ---
function drawG1(ctx, t) {
  drawBackground(ctx, t, { morningSun: true });
  drawTerminal(ctx, 'clawd@morning:~$');

  ctx.save();
  ctx.translate(TERM.x, TERM.y + TERM.titleH);

  // Prompt + typed `echo "早安"`
  const promptStr = '$ ';
  txt(ctx, 14, 18, promptStr, C.green, 12);
  const pw = measureTxt(ctx, promptStr, 12) + 2;

  const cmdChars = Array.from(G1_CMD);
  const typedCount = t >= G1_CMD_START
    ? Math.min(cmdChars.length, Math.floor(((t - G1_CMD_START) * 1000) / CHAR_MS) + 1)
    : 0;
  const typedStr = cmdChars.slice(0, typedCount).join('');
  if (typedStr) {
    txt(ctx, 14 + pw, 18, typedStr, C.text, 12);
  }

  // Output `→ 早安` (green)
  if (t >= G1_OUT_TIME) {
    txt(ctx, 14, 44, '→ 早安', C.green, 12);
  }

  // Date `Tue Oct 22 07:00`
  if (t >= G1_DATE_TIME) {
    txt(ctx, 14, 104, 'Tue Oct 22 07:00', C.dim, 12);
  }

  // Blinking cursor (follows active prompt/command)
  const cursorOn = Math.floor(t * 2) % 2 === 0;
  if (t < G1_OUT_TIME) {
    if (cursorOn) {
      const tw = measureTxt(ctx, typedStr, 12);
      px(ctx, 14 + pw + tw + 2, 18, 7, 12, C.green);
    }
  } else {
    txt(ctx, 14, 70, promptStr, C.green, 12);
    if (cursorOn) {
      px(ctx, 14 + pw + 2, 70, 7, 12, C.green);
    }
  }

  ctx.restore();

  // Characters in warm room (left & right of terminal, zero overlap)
  drawHer(ctx, 80, 196, t, 'wave');
  drawClawd(ctx, 524, 200, t, 'happy');

  drawSubtitle(ctx, t);
}

// --- Scene G2: 消息气泡 (10-20s) ---
function drawG2(ctx, t) {
  const st = t - 10;
  drawBackground(ctx, t, { morningSun: false });
  drawTerminal(ctx, 'clawd@chat:~$');

  ctx.save();
  ctx.translate(TERM.x, TERM.y + TERM.titleH);

  // 4 message bubbles (pink = Her, green = Clawd), appearing every 2s
  for (let i = 0; i < G2_MSGS.length; i++) {
    if (st >= i * 2) {
      const m = G2_MSGS[i];
      const textW = measureTxt(ctx, m.text, 12);
      const bw = textW + 20;
      const bh = 20;
      const bx = m.role === 'clawd' ? 348 - bw : 12;
      const bgFill = m.role === 'clawd' ? 'rgba(126,231,135,0.10)' : 'rgba(255,154,162,0.10)';
      const bdCol = m.role === 'clawd' ? 'rgba(126,231,135,0.40)' : 'rgba(255,154,162,0.40)';

      px(ctx, bx, m.y, bw, bh, bgFill);
      ctx.strokeStyle = bdCol;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, m.y + 0.5, bw - 1, bh - 1);
      txt(ctx, bx + 10, m.y + 2, m.text, m.color, 12);
    }
  }

  // Input bar at bottom of terminal
  px(ctx, 12, 114, 336, 16, C.panel);
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(12.5, 114.5, 335, 15);
  txt(ctx, 20, 116, '> ', C.dim, 12);
  if (Math.floor(t * 2) % 2 === 0) {
    px(ctx, 34, 117, 6, 10, C.dim);
  }

  ctx.restore();

  // Characters in room: Her on left (20,180) waving, Clawd on right (540,184) happy
  drawHer(ctx, 20, 180, t, 'wave');
  drawClawd(ctx, 540, 184, t, 'happy');

  drawSubtitle(ctx, t);
}

// --- Scene G3: 暖色收尾 (20-30s) ---
const SPARKLE_ANCHORS = [
  { x: 34, y: 110 },
  { x: 215, y: 44 },
  { x: 380, y: 46 },
  { x: 64, y: 246 },
  { x: 608, y: 252 },
];

function drawStickyNote(ctx) {
  const { x, y, w, h } = NOTE;
  px(ctx, x + 3, y + 3, w, h, 'rgba(0,0,0,0.12)');
  px(ctx, x, y, w, h, C.cardBg);
  ctx.strokeStyle = C.cardBd;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  // Red thumbtack pin (红色图钉)
  const pinX = x + Math.floor(w / 2) - 4;
  px(ctx, pinX, y + 4, 8, 8, C.pinRed);
  px(ctx, pinX + 2, y + 5, 2, 2, C.pink);

  // Note text (14px per spec)
  txt(ctx, x + 16, y + 20, '早安', C.cardTx, 14);
  txt(ctx, x + 16, y + 48, 'Clawd & 她', C.cardSub, 14);
}

function drawSparkles(ctx, t) {
  for (let i = 0; i < SPARKLE_ANCHORS.length; i++) {
    const a = SPARKLE_ANCHORS[i];
    const sx = Math.round(a.x + Math.sin(t * 2.0 + i * 1.3) * 8);
    const sy = Math.round(a.y + Math.cos(t * 1.5 + i * 1.9) * 10);
    const alpha = (0.35 + 0.50 * (0.5 + 0.5 * Math.sin(t * 3.2 + i * 1.1))).toFixed(3);
    const col = `rgba(255,215,0,${alpha})`;
    px(ctx, sx, sy, 3, 3, col);
    px(ctx, sx + 1, sy - 2, 1, 7, col);
    px(ctx, sx - 2, sy + 1, 7, 1, col);
  }
}

function drawG3(ctx, t) {
  const st = t - 20;
  drawBackground(ctx, t, { morningSun: true });

  // Warm golden overlay rgba(255,200,100,0.08)
  px(ctx, 0, 0, BW, BH, C.warmOverlay);

  drawTerminal(ctx, 'clawd@goodbye:~$');

  ctx.save();
  ctx.translate(TERM.x, TERM.y + TERM.titleH);
  for (const line of G3_LINES) {
    if (st >= line.delay) {
      txt(ctx, 16, line.y, line.text, line.color, 12);
    }
  }
  ctx.restore();

  // Sticky note card (420, 60, 180×80)
  drawStickyNote(ctx);

  // Characters together in warm room (below sticky note, right of terminal, zero overlap)
  drawClawd(ctx, 516, 196, t, 'happy');
  drawHer(ctx, 572, 192, t, 'wave');

  // 5 golden sparkle particles
  drawSparkles(ctx, t);

  drawSubtitle(ctx, t);
}

// --- Compute all keyboard click timestamps (for audio sync) ---
function getClickTimestamps() {
  const clicks = [];
  // 1. Subtitle character-by-character clicks (CHAR_MS = 160ms)
  for (let li = 0; li < LINES.length; li++) {
    const chars = Array.from(LINES[li]);
    for (let ci = 0; ci < chars.length; ci++) {
      clicks.push(STARTS[li] + (ci * CHAR_MS) / 1000);
    }
  }
  // 2. G1 terminal `echo "早安"` character-by-character typing clicks (CHAR_MS = 160ms)
  const g1Chars = Array.from(G1_CMD);
  for (let ci = 0; ci < g1Chars.length; ci++) {
    clicks.push(G1_CMD_START + (ci * CHAR_MS) / 1000);
  }
  clicks.push(G1_OUT_TIME);

  // 3. G2 message bubble pop clicks (every 2s: 10s, 12s, 14s, 16s)
  for (let i = 0; i < G2_MSGS.length; i++) {
    clicks.push(10 + i * 2);
  }

  // 4. G3 terminal farewell line clicks
  for (const line of G3_LINES) {
    clicks.push(20 + line.delay);
  }

  return clicks.sort((a, b) => a - b);
}

// --- Canvases & Frame Renderer ---
const baseCanvas = createCanvas(BW, BH);
const baseCtx = baseCanvas.getContext('2d');
const outCanvas = createCanvas(FW, FH);
const outCtx = outCanvas.getContext('2d');
outCtx.imageSmoothingEnabled = false;

const SCENES = [
  { id: 'G1', start: 0, end: 10, draw: drawG1 },
  { id: 'G2', start: 10, end: 20, draw: drawG2 },
  { id: 'G3', start: 20, end: 30, draw: drawG3 },
];

function renderFrameToCanvas(n) {
  const t = n / FPS;
  baseCtx.clearRect(0, 0, BW, BH);

  const scene = SCENES.find((s) => t >= s.start && t < s.end) || SCENES[SCENES.length - 1];
  scene.draw(baseCtx, t);

  // Gentle fade-in / fade-out
  const fadeDur = 0.4;
  let alpha = 1;
  if (t < fadeDur) alpha = t / fadeDur;
  else if (t > DURATION - fadeDur) alpha = (DURATION - t) / fadeDur;
  if (alpha < 1) {
    px(baseCtx, 0, 0, BW, BH, `rgba(0,0,0,${(1 - Math.max(0, alpha)).toFixed(3)})`);
  }

  outCtx.clearRect(0, 0, FW, FH);
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(baseCanvas, 0, 0, FW, FH);
  return { baseCanvas, outCanvas };
}

function renderAllFrames(outDir = OUT_DIR) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  console.log(`「Clawd 的早安」: ${BW}×${BH} (SCALE=${SCALE}) → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Frames directory: ${outDir}`);
  const t0 = Date.now();
  for (let i = 0; i < NFRAMES; i++) {
    renderFrameToCanvas(i);
    const fp = path.join(outDir, `f_${String(i).padStart(5, '0')}.png`);
    fs.writeFileSync(fp, outCanvas.toBuffer('image/png'));
    if (i % 300 === 0 || i === NFRAMES - 1) {
      const elapsed = (Date.now() - t0) / 1000;
      const eta = ((elapsed / (i + 1)) * (NFRAMES - i - 1));
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
  CHAR_MS,
  WIN,
  TERM,
  NOTE,
  SUB,
  C,
  LINES,
  STARTS,
  G1_CMD,
  G2_MSGS,
  G3_LINES,
  SPARKLE_ANCHORS,
  SCENES,
  px,
  txt,
  measureTxt,
  drawBackground,
  drawTerminal,
  drawClawd,
  drawHer,
  drawStickyNote,
  drawSparkles,
  drawSubtitle,
  getClickTimestamps,
  renderFrameToCanvas,
  renderAllFrames,
};
