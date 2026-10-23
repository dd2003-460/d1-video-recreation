#!/usr/bin/env node
'use strict';
// src/pixel_arena_v2.js — 「Clawd 的学习 / 升级」v2.0 共用像素美术库
//
// 像素标准严格对标 outputs/companion_arena_v1.0.mp4（参考仓库 dd2003-460/d1-video-recreation）：
//   基础画布 640×360 → nearest-neighbor 2× → 1280×720 @ 60fps
//   所有最小视觉单元都是基础画布上的整数像素块，放大后即 2×（星星 2×2→4×4、
//   窗棂 6×6→12×12、Clawd 眼睛 4×4→8×8），保证与 companion 完全同一套像素网格。
//   字体：Fusion Pixel 10px（终端，原生 10px 点阵），Fusion Pixel 12px（字幕/便签，原生 12px 点阵）。
//         文本经 alpha 阈值二值化后按整像素绘制，无抗锯齿灰边。
//
// 说明：本文件只放可复用组件（房间 / 终端 / 角色 / 气泡 / 便签 / 进度条 / 文字 / 时间轴），
//       两个视频各自的剧本、布局表与时间线在 render_learning_arena_v2.js / render_upgrade_arena_v2.js。

const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 字体注册：优先原生 10px 点阵（@fontsource，woff），回退 12px 点阵（@fontpkg，ttf）
// ---------------------------------------------------------------------------
let FONT_10 = 'monospace';
let FONT_12 = 'monospace';

function registerFonts() {
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
      GlobalFonts.registerFromPath(fp12, 'FusionPixel12');
      FONT_12 = 'FusionPixel12, monospace';
      if (FONT_10 === 'monospace') FONT_10 = 'FusionPixel12, monospace';
    }
  } catch (_) {}

  if (FONT_10 === 'monospace' || FONT_12 === 'monospace') {
    const fallbacks = [
      '/usr/local/share/fonts/NotoSansMonoCJKsc-Regular.otf',
      '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
      '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
    ];
    for (const cand of fallbacks) {
      if (fs.existsSync(cand)) {
        GlobalFonts.registerFromPath(cand, 'FallbackMono');
        if (FONT_10 === 'monospace') FONT_10 = 'FallbackMono, monospace';
        if (FONT_12 === 'monospace') FONT_12 = 'FallbackMono, monospace';
        break;
      }
    }
  }
}
registerFonts();

// 10px 字形用于终端/状态栏，12px 字形用于字幕/便签（均为点阵原生尺寸，保证整像素）
function fontFamilyForSize(size) {
  return size <= 11 ? FONT_10 : FONT_12;
}

// ---------------------------------------------------------------------------
// 画布 / 时间常量
// ---------------------------------------------------------------------------
const BW = 640;
const BH = 360;
const SCALE = 2;
const FW = BW * SCALE; // 1280
const FH = BH * SCALE; // 720
const FPS = 60;
const DURATION = 30;
const NFRAMES = DURATION * FPS; // 1800

const TYPE_CHAR_MS = 140; // 终端打字 140ms/字（与 companion 一致）
const SUB_CHAR_MS = 160; // 字幕逐字 160ms/字
const FADE = 0.25; // 场景黑场 0.25s 出 + 0.25s 入
const FADE_IN = 0.4; // 片头淡入
const FADE_OUT = 0.8; // 片尾淡出

// ---------------------------------------------------------------------------
// 布局（640×360 基准网格，与 companion 同一套坐标）
// ---------------------------------------------------------------------------
const WIN = { x: 60, y: 20, w: 520, h: 160, fw: 8 }; // 木窗（8px 框）
const SILL = { x: 56, y: 180, w: 528, h: 8 }; // 窗台
const TERM = { x: 140, y: 160, w: 360, h: 160, titleH: 20 }; // 小终端 360×160
const CONTENT = { x: 142, y: 180, w: 356, h: 140 }; // 终端内容区（边框内）
const TEXT_X = 152; // 文本左起点（12px 内边距）
const TEXT_RIGHT = 488; // 文本右边界
const STATUS_Y = 302; // 终端底部状态行
const SUB = { x: 0, y: 320, w: 640, h: 40 }; // 字幕栏

// 角色站位（均在房间内、终端之外、字幕栏之上）
const CLAWD_ROOM = { x: 52, y: 240, w: 40, bodyH: 17, legH: 7 }; // 40×17 body + 7px 腿
const HER_ROOM = { x: 556, y: 194, w: 16, h: 28 }; // 16×28

// ---------------------------------------------------------------------------
// 调色板（房间/终端沿用 companion；Clawd 用 v2.0 指定色）
// ---------------------------------------------------------------------------
const C = {
  // 暖色房间
  bgWarm: '#F5EDD5',
  stripe: '#EDE3C8',
  woodFrame: '#8B7355',
  woodLight: '#A08A6A',
  woodDark: '#6E5A44',
  woodSill: '#A08060',
  pot: '#7A5A3A',
  potRim: '#B06A46',
  plant: '#5A7A5A',
  plantLight: '#7BC07B',
  plantDark: '#4E864E',

  // 夜空（learning / upgrade 夜间场景）
  nightSkyTop: '#0A1224',
  nightSkyBottom: '#1D2E4F',
  mountainNight: '#16243A',
  mountainNight2: '#1D2C3F',
  starWarm: '#FFF6D8',
  moon: '#FFF4C4',

  // 终端（DSH TUI）
  termBg: '#14161C',
  termTitle: '#21262D',
  termBd: '#30363D',
  termCell: '#232833',
  scanline: 'rgba(255,255,255,0.025)',

  // 文本与强调色
  text: '#E6EDF3',
  dim: '#8B949E',
  green: '#7EE787',
  pink: '#FF9AA2',
  amber: '#E3B341',
  purple: '#BC8CFF',
  blue: '#79C0FF',
  red: '#FF7B72',
  white: '#FFFFFF',

  // Clawd v2.0：普通 #7B9E6B / thinking #6B5B95
  clawdBody: '#7B9E6B',
  clawdDark: '#5E7C50',
  clawdBelly: '#C6DCB7',
  clawdThink: '#6B5B95',
  clawdThinkDark: '#53456F',
  clawdThinkBelly: '#B7AAD4',
  clawdEye: '#141413',
  clawdBlush: '#FF9AA2',

  // Her
  herHair: '#5A4632',
  herSkin: '#E8C39E',
  herDress: '#FF9AA2',
  herDressHem: '#E57A84',

  // 卡片 / 气泡 / 便签
  bubbleBg: '#FFF8F9',
  bubbleBd: '#E57A84',
  bubbleTx: '#2E1E24',
  thoughtBg: '#FFFCEF',
  thoughtBd: '#C9B78E',
  thoughtTx: '#3A3220',
  cardBg: '#FFF8DC',
  cardBd: '#DEB887',
  cardTx: '#241A06',
  cardSub: '#6E5A3A',
  tape: 'rgba(255,255,255,0.55)',

  subtitleBg: 'rgba(0,0,0,0.76)',
  nightTint: 'rgba(12,20,42,0.07)',
};

// ---------------------------------------------------------------------------
// 基础工具
// ---------------------------------------------------------------------------
function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
function easeOut(v) {
  return 1 - Math.pow(1 - clamp01(v), 3);
}
function easeInOut(v) {
  const x = clamp01(v);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lerpColor(a, b, t) {
  const k = clamp01(t);
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * k)},${Math.round(g1 + (g2 - g1) * k)},${Math.round(b1 + (b2 - b1) * k)})`;
}

// 整像素矩形
function px(ctx, x, y, w, h, color) {
  if (w <= 0 || h <= 0) return;
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// 像素圆点（6×6 去四角，读作圆点又保持像素块）
function dot(ctx, x, y, size, color) {
  const s = size;
  px(ctx, x + 1, y, s - 2, 1, color);
  px(ctx, x, y + 1, s, s - 2, color);
  px(ctx, x + 1, y + s - 1, s - 2, 1, color);
}

// ---------------------------------------------------------------------------
// 阈值化点阵文字：逐字形缓存，按整像素绘制（无灰边）
// ---------------------------------------------------------------------------
const _glyphCache = new Map(); // `${size}|${color}` -> Map<ch, {cv,w}>
const _measureCtx = createCanvas(8, 8).getContext('2d');
const _measureCache = new Map(); // `${size}|${ch}` -> w

function charWidth(ch, size) {
  const key = `${size}|${ch}`;
  let w = _measureCache.get(key);
  if (w === undefined) {
    _measureCtx.font = `${size}px ${fontFamilyForSize(size)}`;
    w = Math.round(_measureCtx.measureText(ch).width);
    _measureCache.set(key, w);
  }
  return w;
}

function glyph(ch, size, color) {
  let bucket = _glyphCache.get(`${size}|${color}`);
  if (!bucket) {
    bucket = new Map();
    _glyphCache.set(`${size}|${color}`, bucket);
  }
  let g = bucket.get(ch);
  if (g) return g;

  const w = Math.max(1, charWidth(ch, size)) + 2;
  const h = Math.ceil(size * 1.5) + 2;
  const cv = createCanvas(w, h);
  const cx = cv.getContext('2d');
  cx.font = `${size}px ${fontFamilyForSize(size)}`;
  cx.textAlign = 'left';
  cx.textBaseline = 'top';
  cx.fillStyle = '#FFFFFF';
  cx.fillText(ch, 1, 1);

  // alpha 阈值二值化 → 纯像素，然后染色
  const img = cx.getImageData(0, 0, w, h);
  const d = img.data;
  const [r, gg, b] = hexToRgb(color);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 128) {
      d[i] = r;
      d[i + 1] = gg;
      d[i + 2] = b;
      d[i + 3] = 255;
    } else {
      d[i + 3] = 0;
    }
  }
  cx.putImageData(img, 0, 0);
  g = { cv, w };
  bucket.set(ch, g);
  return g;
}

function measureTxt(str, size = 10) {
  if (!str) return 0;
  let w = 0;
  for (const ch of Array.from(str)) w += charWidth(ch, size);
  return w;
}

// 绘制一行文字，返回包围盒；y 为文字顶部
function txt(ctx, x, y, str, color, size = 10, align = 'left') {
  if (!str) return { x: Math.round(x), y: Math.round(y), w: 0, h: size };
  const chars = Array.from(str);
  const width = measureTxt(str, size);
  let cx = Math.round(x);
  if (align === 'center') cx = Math.round(x - width / 2);
  else if (align === 'right') cx = Math.round(x - width);
  const cy = Math.round(y);
  for (const ch of chars) {
    const g = glyph(ch, size, color);
    ctx.drawImage(g.cv, cx, cy);
    cx += charWidth(ch, size);
  }
  return { x: align === 'center' ? Math.round(x - width / 2) : cx - width, y: cy, w: width, h: size };
}

// 打字机：返回已显示字符数
function typedCount(t, startT, totalChars, charMs = TYPE_CHAR_MS) {
  if (t < startT) return 0;
  return Math.min(totalChars, Math.floor(((t - startT) * 1000) / charMs) + 1);
}

// 画打字中的一行（支持多段不同颜色 + 光标），返回已打字数与结束 x
function drawTypedLine(ctx, x, y, parts, startT, t, opts = {}) {
  const size = opts.size || 10;
  const total = parts.reduce((s, p) => s + Array.from(p.text).length, 0);
  const n = typedCount(t, startT, total, opts.charMs || TYPE_CHAR_MS);
  let remaining = n;
  let cx = x;
  let lastColor = parts[0].color;
  for (const p of parts) {
    if (remaining <= 0) break;
    const chars = Array.from(p.text);
    const take = Math.min(chars.length, remaining);
    if (take > 0) {
      const shown = chars.slice(0, take).join('');
      txt(ctx, cx, y, shown, p.color, size);
      cx += measureTxt(shown, size);
    }
    remaining -= take;
    lastColor = p.color;
  }
  if (opts.cursor !== false && n < total) {
    const on = Math.floor(t * 2.5) % 2 === 0;
    if (on) px(ctx, cx + 1, y, 5, 9, lastColor);
  }
  return { typed: n, total, x: cx };
}

// 已完整显示的一行 + 光标
function drawStaticLine(ctx, x, y, str, color, size, t, cursor = false) {
  const box = txt(ctx, x, y, str, color, size);
  if (cursor) {
    const on = Math.floor(t * 2.5) % 2 === 0;
    if (on) px(ctx, box.x + box.w + 1, y, 5, 9, color);
  }
  return box;
}

// ---------------------------------------------------------------------------
// 场景背景：暖色条纹墙 + 夜间木窗（星星 / 月亮 / 远山 / 云）+ 窗台盆栽
// ---------------------------------------------------------------------------
const NIGHT_STARS = [
  { dx: 30, dy: 24, s: 2 }, { dx: 68, dy: 40, s: 2 }, { dx: 112, dy: 18, s: 2 },
  { dx: 150, dy: 54, s: 2 }, { dx: 196, dy: 30, s: 2 }, { dx: 238, dy: 16, s: 2 },
  { dx: 268, dy: 46, s: 2 }, { dx: 306, dy: 24, s: 2 }, { dx: 342, dy: 58, s: 2 },
  { dx: 386, dy: 20, s: 2 }, { dx: 420, dy: 44, s: 2 }, { dx: 452, dy: 26, s: 2 },
  { dx: 470, dy: 62, s: 2 }, { dx: 246, dy: 70, s: 2 }, { dx: 96, dy: 66, s: 2 },
];

function drawBackground(ctx, t) {
  // 1. 暖色条纹墙（16px 周期，8px 亮 + 8px 暗）
  px(ctx, 0, 0, BW, BH, C.bgWarm);
  for (let x = 0; x < BW; x += 16) px(ctx, x, 0, 8, BH, C.stripe);
  px(ctx, 0, 0, BW, BH, C.nightTint);

  // 2. 木窗（8px 框 + 2px 立体边）
  const { x: wx, y: wy, w: ww, h: wh, fw } = WIN;
  px(ctx, wx, wy, ww, wh, C.woodFrame);
  px(ctx, wx, wy, ww, 2, C.woodLight);
  px(ctx, wx, wy, 2, wh, C.woodLight);
  px(ctx, wx, wy + wh - 2, ww, 2, C.woodDark);
  px(ctx, wx + ww - 2, wy, 2, wh, C.woodDark);

  const gx = wx + fw;
  const gy = wy + fw;
  const gw = ww - 2 * fw;
  const gh = wh - 2 * fw;

  ctx.save();
  ctx.beginPath();
  ctx.rect(gx, gy, gw, gh);
  ctx.clip();

  // 夜空渐变
  const grd = ctx.createLinearGradient(0, gy, 0, gy + gh);
  grd.addColorStop(0, C.nightSkyTop);
  grd.addColorStop(1, C.nightSkyBottom);
  ctx.fillStyle = grd;
  ctx.fillRect(gx, gy, gw, gh);

  // 星星（2×2 基础像素 → 放大 4×4）
  for (let i = 0; i < NIGHT_STARS.length; i++) {
    const s = NIGHT_STARS[i];
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.8 + i * 1.7));
    px(ctx, wx + s.dx, wy + s.dy, s.s, s.s, `rgba(255,246,216,${tw.toFixed(3)})`);
    if (s.s === 2 && tw > 0.85) {
      // 亮星的十字辉光（各 1 像素）
      px(ctx, wx + s.dx - 1, wy + s.dy + 1, 1, 1, `rgba(255,246,216,${(tw * 0.6).toFixed(3)})`);
      px(ctx, wx + s.dx + 2, wy + s.dy + 1, 1, 1, `rgba(255,246,216,${(tw * 0.6).toFixed(3)})`);
    }
  }

  // 弯月（12×12 挖出 9×9 → 像素月牙）
  const moonX = wx + 436;
  const moonY = wy + 22;
  px(ctx, moonX, moonY, 12, 12, C.moon);
  px(ctx, moonX + 4, moonY + 1, 9, 10, C.nightSkyTop);

  // 远山两层剪影
  ctx.fillStyle = C.mountainNight;
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
  ctx.fillStyle = C.mountainNight2;
  ctx.beginPath();
  ctx.moveTo(wx + 300, gy + gh);
  ctx.lineTo(wx + 392, wy + 88);
  ctx.lineTo(wx + 500, gy + gh);
  ctx.closePath();
  ctx.fill();

  // 薄云（4px 方块组成，缓慢漂移）
  const c1x = wx + 118 + Math.round(Math.sin(t * 0.32) * 10);
  px(ctx, c1x, wy + 40, 38, 5, 'rgba(220,232,255,0.13)');
  px(ctx, c1x + 8, wy + 35, 22, 5, 'rgba(220,232,255,0.13)');
  const c2x = wx + 330 + Math.round(Math.cos(t * 0.24) * 12);
  px(ctx, c2x, wy + 56, 44, 5, 'rgba(220,232,255,0.10)');
  px(ctx, c2x + 10, wy + 51, 24, 5, 'rgba(220,232,255,0.10)');

  ctx.restore();

  // 十字窗棂（6px，与 companion 一致）
  px(ctx, wx + ww / 2 - 3, gy, 6, gh, C.woodFrame);
  px(ctx, gx, wy + wh / 2 - 3, gw, 6, C.woodFrame);
  px(ctx, wx + ww / 2 - 3, gy, 1, gh, C.woodLight);
  px(ctx, gx, wy + wh / 2 - 3, gw, 1, C.woodLight);

  // 窗台
  px(ctx, SILL.x, SILL.y, SILL.w, SILL.h, C.woodSill);
  px(ctx, SILL.x, SILL.y, SILL.w, 2, C.woodFrame);
  px(ctx, SILL.x, SILL.y + SILL.h - 1, SILL.w, 1, C.woodDark);

  // 窗台盆栽（左下角，不进入终端区域）
  const px0 = wx + 28;
  const py0 = wy + wh;
  px(ctx, px0 + 2, py0 - 16, 10, 8, C.plantLight);
  px(ctx, px0, py0 - 13, 14, 5, C.plantDark);
  px(ctx, px0 + 4, py0 - 19, 6, 3, C.plant);
  px(ctx, px0 + 6, py0 - 21, 2, 2, C.pink);
  px(ctx, px0, py0 - 8, 14, 2, C.potRim);
  px(ctx, px0 + 1, py0 - 6, 12, 6, C.pot);
}

// ---------------------------------------------------------------------------
// 终端 360×160 @ (140,160)：标题栏 20px + 红黄绿圆点 + 内容区
// ---------------------------------------------------------------------------
function drawTerminal(ctx, title, accentColor = C.green) {
  const { x, y, w, h, titleH } = TERM;
  px(ctx, x + 4, y + 4, w, h, 'rgba(0,0,0,0.16)'); // 投影
  px(ctx, x, y, w, h, C.termBg);
  px(ctx, x, y, w, titleH, C.termTitle);
  px(ctx, x, y + titleH - 1, w, 1, accentColor);
  // 2px 边框（纯像素，不用 stroke 以免半像素）
  px(ctx, x, y, w, 2, C.termBd);
  px(ctx, x, y + h - 2, w, 2, C.termBd);
  px(ctx, x, y, 2, h, C.termBd);
  px(ctx, x + w - 2, y, 2, h, C.termBd);

  // 红黄绿圆点（6×6，去四角 → 圆点；位置与 companion 一致）
  dot(ctx, x + 8, y + 7, 6, C.red);
  dot(ctx, x + 18, y + 7, 6, C.amber);
  dot(ctx, x + 28, y + 7, 6, C.green);

  txt(ctx, x + w / 2, y + 5, title, C.dim, 10, 'center');

  // CRT 扫描线
  for (let sy = y + titleH + 3; sy < y + h - 3; sy += 3) {
    px(ctx, x + 2, sy, w - 4, 1, C.scanline);
  }
}

// 终端底部状态行（chrome，不产生点击音）
function drawStatusLine(ctx, text, color = C.dim) {
  txt(ctx, TEXT_X, STATUS_Y, text, color, 10);
}

// ---------------------------------------------------------------------------
// Clawd：40×17 body（顶部 2px 暗条 + 腹部 22×4 浅块 + 4×4 眼睛 + 1px 高光）
// mood: calm | thinking | smile | curious | proud
// 颜色：正常/微笑 #7B9E6B，thinking #6B5B95
// ---------------------------------------------------------------------------
function drawClawd(ctx, x, y, t, mood = 'calm', thinkBlend = null) {
  // thinkBlend: 0..1 在 绿色 ↔ 紫色 之间过渡（null 时按 mood 取极值）
  const thinking = mood === 'thinking';
  const k = clamp01(thinkBlend === null ? (thinking ? 1 : 0) : thinkBlend);
  const body = k > 0 ? lerpColor(C.clawdBody, C.clawdThink, k) : C.clawdBody;
  const dark = k > 0 ? lerpColor(C.clawdDark, C.clawdThinkDark, k) : C.clawdDark;
  const belly = k > 0 ? lerpColor(C.clawdBelly, C.clawdThinkBelly, k) : C.clawdBelly;

  const phase = x * 0.01; // 让两个角色不同步
  const bob = Math.sin(t * 2.2 + phase) > 0.45 ? -1 : 0;
  const proud = mood === 'proud';
  const by = Math.round(y + bob + (proud ? -1 : 0));

  // 身体 40×17
  px(ctx, x, by, 40, 17, body);
  // 顶部 2px 暗条（质感）
  px(ctx, x, by, 40, 2, dark);
  // 腹部 22×4 浅色块
  px(ctx, x + 9, by + 11, 22, 4, belly);

  const blink = (t % 3.4) < 0.14;
  const eyeY = by + 6;

  const roundEyes = (highlight) => {
    px(ctx, x + 10, eyeY, 4, 4, C.clawdEye);
    px(ctx, x + 26, eyeY, 4, 4, C.clawdEye);
    px(ctx, x + 11, eyeY + 1, highlight, highlight, C.white);
    px(ctx, x + 27, eyeY + 1, highlight, highlight, C.white);
  };
  const closedEyes = () => {
    px(ctx, x + 10, by + 8, 4, 1, C.clawdEye);
    px(ctx, x + 26, by + 8, 4, 1, C.clawdEye);
  };

  if (mood === 'thinking') {
    // 眯眼 4×2
    px(ctx, x + 10, by + 7, 4, 2, C.clawdEye);
    px(ctx, x + 26, by + 7, 4, 2, C.clawdEye);
    px(ctx, x + 10, by + 9, 4, 1, body);
    px(ctx, x + 26, by + 9, 4, 1, body);
    // 平嘴
    px(ctx, x + 17, by + 13, 6, 1, C.clawdEye);
  } else if (mood === 'smile' || mood === 'proud') {
    if (blink) closedEyes();
    else {
      // 弯月眼：2×1 阶梯
      px(ctx, x + 9, by + 6, 2, 1, C.clawdEye);
      px(ctx, x + 11, by + 5, 2, 1, C.clawdEye);
      px(ctx, x + 13, by + 6, 2, 1, C.clawdEye);
      px(ctx, x + 25, by + 6, 2, 1, C.clawdEye);
      px(ctx, x + 27, by + 5, 2, 1, C.clawdEye);
      px(ctx, x + 29, by + 6, 2, 1, C.clawdEye);
    }
    // 微笑弧
    px(ctx, x + 16, by + 12, 2, 1, C.clawdEye);
    px(ctx, x + 18, by + 13, 4, 1, C.clawdEye);
    px(ctx, x + 22, by + 12, 2, 1, C.clawdEye);
    // 粉色腮红
    px(ctx, x + 5, by + 8, 3, 2, C.clawdBlush);
    px(ctx, x + 32, by + 8, 3, 2, C.clawdBlush);
  } else if (mood === 'curious') {
    if (blink) closedEyes();
    else {
      // 眼睛变大 5×5 + 2×2 高光
      px(ctx, x + 9, by + 5, 5, 5, C.clawdEye);
      px(ctx, x + 26, by + 5, 5, 5, C.clawdEye);
      px(ctx, x + 10, by + 6, 2, 2, C.white);
      px(ctx, x + 27, by + 6, 2, 2, C.white);
    }
    px(ctx, x + 18, by + 12, 3, 3, C.clawdEye); // 小圆嘴（惊讶）
  } else {
    // calm
    if (blink) closedEyes();
    else roundEyes(1);
    px(ctx, x + 17, by + 12, 6, 1, C.clawdEye);
  }

  // 腿 4×6×7（与 companion 一致；proud 时身体整体上抬 1px 挺胸，四腿并齐）
  const legH = 7 - (proud ? 0 : Math.sin(t * 3.0) > 0.6 ? 1 : 0);
  px(ctx, x + 3, by + 17, 6, legH, dark);
  px(ctx, x + 13, by + 17, 6, 7, dark);
  px(ctx, x + 21, by + 17, 6, 7, dark);
  px(ctx, x + 31, by + 17, 6, legH, dark);

  // proud：身体两侧 2×2 星光（画在头顶上方，不遮挡身体）
  if (proud) {
    const tw = Math.sin(t * 3.4) > 0 ? 1 : 0;
    px(ctx, x - 6, by - 4, 2, 2, tw ? C.amber : C.white);
    px(ctx, x + 44, by - 3, 2, 2, tw ? C.white : C.amber);
  }
}

// ---------------------------------------------------------------------------
// Her：16×28（粉色裙子，与 companion 一致）
// pose: stand | smile | wave | stretch_smile
// ---------------------------------------------------------------------------
function drawHer(ctx, x, y, t, pose = 'stand') {
  const bob = Math.sin(t * 1.8 + 0.8) > 0.45 ? -1 : 0;
  const by = Math.round(y + bob);

  // 头发 + 头
  px(ctx, x + 3, by, 10, 3, C.herHair);
  px(ctx, x + 10, by + 2, 4, 6, C.herHair);
  px(ctx, x + 3, by + 3, 8, 6, C.herSkin);

  if (pose === 'smile' || pose === 'stretch_smile') {
    px(ctx, x + 5, by + 5, 2, 1, C.cardTx);
    px(ctx, x + 8, by + 6, 2, 1, C.herDressHem);
    px(ctx, x + 5, by + 7, 3, 1, '#C45A65');
  } else {
    px(ctx, x + 5, by + 5, 1, 2, C.cardTx);
  }

  // 裙子
  px(ctx, x + 4, by + 9, 8, 6, C.herDress);
  px(ctx, x + 2, by + 15, 12, 6, C.herDress);
  px(ctx, x + 2, by + 20, 12, 1, C.herDressHem);

  // 手臂
  if (pose === 'wave') {
    const dy = Math.sin(t * 5.0) > 0 ? -2 : 0;
    px(ctx, x + 12, by + 9 + dy, 2, 3, C.herDress);
    px(ctx, x + 13, by + 6 + dy, 3, 2, C.herSkin);
  } else if (pose === 'stretch_smile') {
    const dy = Math.sin(t * 3.0) > 0 ? -2 : -1;
    px(ctx, x + 1, by + 6 + dy, 2, 5, C.herSkin);
    px(ctx, x + 13, by + 6 + dy, 2, 5, C.herSkin);
  } else if (pose === 'smile') {
    px(ctx, x + 2, by + 10, 2, 4, C.herSkin);
    px(ctx, x + 12, by + 13, 2, 2, C.herSkin); // 手放身前
    px(ctx, x + 11, by + 14, 3, 2, C.herSkin);
  } else {
    px(ctx, x + 2, by + 10, 2, 4, C.herSkin);
    px(ctx, x + 12, by + 10, 2, 4, C.herSkin);
  }

  // 腿 & 鞋
  px(ctx, x + 5, by + 21, 2, 5, C.herSkin);
  px(ctx, x + 9, by + 21, 2, 5, C.herSkin);
  px(ctx, x + 4, by + 26, 3, 2, C.herHair);
  px(ctx, x + 9, by + 26, 3, 2, C.herHair);
}

// ---------------------------------------------------------------------------
// 消息气泡（her 的请求）：白底 + 粉边 + 尾巴
// ---------------------------------------------------------------------------
function drawMessageBubble(ctx, box, text, appear) {
  if (appear <= 0) return;
  const { x, y, w, h } = box;
  const grow = appear < 1 ? 1 : 0;
  const bx = x + grow;
  const bw = w - grow * 2;

  px(ctx, bx + 3, y + 3, bw, h, 'rgba(0,0,0,0.10)');
  px(ctx, bx, y, bw, h, C.bubbleBg);
  // 2px 边框
  px(ctx, bx, y, bw, 2, C.bubbleBd);
  px(ctx, bx, y + h - 2, bw, 2, C.bubbleBd);
  px(ctx, bx, y, 2, h, C.bubbleBd);
  px(ctx, bx + bw - 2, y, 2, h, C.bubbleBd);
  // 尾巴（指向下方）
  px(ctx, bx + bw - 18, y + h, 8, 2, C.bubbleBd);
  px(ctx, bx + bw - 16, y + h + 2, 5, 2, C.bubbleBd);
  px(ctx, bx + bw - 14, y + h + 4, 3, 2, C.bubbleBd);

  txt(ctx, bx + bw / 2, y + Math.round((h - 10) / 2), text, C.bubbleTx, 10, 'center');
}

// ---------------------------------------------------------------------------
// 思考泡泡：奶油底 + 2px 描边 + 阶梯尾巴 + 符号（... / ? / !）
// ---------------------------------------------------------------------------
function drawThoughtBubble(ctx, box, symbol, t, appear = 1) {
  if (appear <= 0) return;
  const { x, y, w, h } = box;
  const grow = appear < 1 ? 1 : 0;
  const bx = x + grow;
  const by = y + grow;
  const bw = w - grow * 2;
  const bh = h - grow * 2;

  px(ctx, bx + 2, by + 2, bw, bh, 'rgba(0,0,0,0.10)');
  px(ctx, bx, by, bw, bh, C.thoughtBg);
  px(ctx, bx, by, bw, 2, C.thoughtBd);
  px(ctx, bx, by + bh - 2, bw, 2, C.thoughtBd);
  px(ctx, bx, by, 2, bh, C.thoughtBd);
  px(ctx, bx + bw - 2, by, 2, bh, C.thoughtBd);
  // 尾巴：向右下指向 Clawd 头顶的阶梯圆点
  px(ctx, bx + bw - 26, by + bh, 4, 4, C.thoughtBd);
  px(ctx, bx + bw - 21, by + bh + 4, 3, 3, C.thoughtBd);
  px(ctx, bx + bw - 16, by + bh + 7, 2, 2, C.thoughtBd);

  const bob = Math.sin(t * 2.0) > 0.3 ? -1 : 0;
  txt(ctx, bx + bw / 2, by + Math.round(bh / 2) - 7 + bob, symbol, C.thoughtTx, 12, 'center');
}

// ---------------------------------------------------------------------------
// 便签（便签纸 + 胶带 + 标题 + 副标题）
// ---------------------------------------------------------------------------
function drawStickyNote(ctx, box, title, sub, t, appear = 1) {
  if (appear <= 0) return;
  const { x, y, w, h } = box;
  const grow = appear < 1 ? 2 : 0;
  const bx = x + grow;
  const by = y + grow;
  const bw = w - grow * 2;
  const bh = h - grow * 2;

  px(ctx, bx + 2, by + 3, bw, bh, 'rgba(0,0,0,0.12)');
  px(ctx, bx, by, bw, bh, C.cardBg);
  px(ctx, bx, by, bw, 2, C.cardBd);
  px(ctx, bx, by + bh - 2, bw, 2, C.cardBd);
  px(ctx, bx, by, 2, bh, C.cardBd);
  px(ctx, bx + bw - 2, by, 2, bh, C.cardBd);
  // 顶部胶带
  px(ctx, bx + bw / 2 - 9, by - 3, 18, 6, C.tape);
  px(ctx, bx + bw / 2 - 9, by - 3, 18, 1, 'rgba(255,255,255,0.30)');

  txt(ctx, bx + bw / 2, by + 12, title, C.cardTx, 12, 'center');
  if (sub) txt(ctx, bx + bw / 2, by + 32, sub, C.cardSub, 10, 'center');

  // 右下角折角
  px(ctx, bx + bw - 6, by + bh - 6, 4, 4, C.cardBd);
}

// ---------------------------------------------------------------------------
// 进度条：10 格 × 6px（+1px 间隙），像素块大小与窗棂/星星同一体系
// ---------------------------------------------------------------------------
const BAR = { cells: 10, cellW: 6, gap: 1, cellH: 6 };

function barWidth() {
  return BAR.cells * BAR.cellW + (BAR.cells - 1) * BAR.gap;
}

function barColorFor(pct) {
  if (pct >= 100) return C.green;
  if (pct >= 75) return C.amber;
  return C.red;
}

// filled: 0..10 的格数（可为小数，按整格向下取整绘制）
function drawProgressBar(ctx, x, y, filled, color) {
  const { cells, cellW, gap, cellH } = BAR;
  const n = Math.max(0, Math.min(cells, Math.floor(filled + 1e-6)));
  // 括号
  px(ctx, x, y, 2, cellH, C.dim);
  px(ctx, x + 1, y - 1, 1, 1, C.dim);
  px(ctx, x + 1, y + cellH, 1, 1, C.dim);
  const bx = x + 4;
  for (let i = 0; i < cells; i++) {
    const cx = bx + i * (cellW + gap);
    if (i < n) {
      px(ctx, cx, y, cellW, cellH, color);
    } else {
      px(ctx, cx, y + 1, cellW, cellH - 2, C.termCell);
      px(ctx, cx, y, 1, cellH, 'rgba(48,54,61,0.9)');
      px(ctx, cx + cellW - 1, y, 1, cellH, 'rgba(48,54,61,0.9)');
    }
  }
  const rx = bx + cells * (cellW + gap) - gap;
  px(ctx, rx, y, 2, cellH, C.dim);
  px(ctx, rx + 1, y - 1, 1, 1, C.dim);
  px(ctx, rx + 1, y + cellH, 1, 1, C.dim);
  return rx + 4 - x;
}

// ---------------------------------------------------------------------------
// 字幕栏（640×40 黑色条 + 12px 点阵白字逐字显示）
// ---------------------------------------------------------------------------
function drawSubtitle(ctx, lines, windows, t) {
  px(ctx, SUB.x, SUB.y, SUB.w, SUB.h, C.subtitleBg);
  px(ctx, SUB.x, SUB.y, SUB.w, 1, 'rgba(255,255,255,0.14)');
  for (let i = 0; i < lines.length; i++) {
    const w = windows[i];
    if (t >= w.start && t < w.end) {
      const chars = Array.from(lines[i]);
      const shown = Math.min(chars.length, Math.floor(((t - w.start) * 1000) / SUB_CHAR_MS) + 1);
      const visible = chars.slice(0, shown).join('');
      if (visible) txt(ctx, BW / 2, SUB.y + 13, visible, C.white, 12, 'center');
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// 时间轴：三场景 + 黑场转场 + 片头/片尾淡入淡出
// ---------------------------------------------------------------------------
function renderScenes(ctx, t, scenes) {
  let blackAlpha = 0;
  const [s0, s1, s2] = scenes;
  if (t < s1.start) {
    s0.draw(ctx, t);
    if (t >= s1.start - FADE) blackAlpha = (t - (s1.start - FADE)) / FADE;
  } else if (t < s1.start + FADE) {
    s1.draw(ctx, t);
    blackAlpha = 1 - (t - s1.start) / FADE;
  } else if (t < s2.start) {
    s1.draw(ctx, t);
    if (t >= s2.start - FADE) blackAlpha = (t - (s2.start - FADE)) / FADE;
  } else if (t < s2.start + FADE) {
    s2.draw(ctx, t);
    blackAlpha = 1 - (t - s2.start) / FADE;
  } else {
    s2.draw(ctx, t);
  }
  if (blackAlpha > 0) px(ctx, 0, 0, BW, BH, `rgba(0,0,0,${clamp01(blackAlpha).toFixed(3)})`);
}

function createFrameRenderer(scenes, outDir) {
  const baseCanvas = createCanvas(BW, BH);
  const baseCtx = baseCanvas.getContext('2d');
  const outCanvas = createCanvas(FW, FH);
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;

  function renderFrameToCanvas(n) {
    const t = n / FPS;
    baseCtx.clearRect(0, 0, BW, BH);
    renderScenes(baseCtx, t, scenes);

    // 片头淡入 / 片尾淡出
    let alpha = 1;
    if (t < FADE_IN) alpha = t / FADE_IN;
    else if (t > DURATION - FADE_OUT) alpha = (DURATION - t) / FADE_OUT;
    if (alpha < 1) px(baseCtx, 0, 0, BW, BH, `rgba(0,0,0,${(1 - clamp01(alpha)).toFixed(3)})`);

    outCtx.clearRect(0, 0, FW, FH);
    outCtx.imageSmoothingEnabled = false;
    outCtx.drawImage(baseCanvas, 0, 0, FW, FH);
    return { baseCanvas, outCanvas };
  }

  function renderAllFrames(dir = outDir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    console.log(`「pixel_arena_v2」: ${BW}×${BH} (SCALE=${SCALE}) → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
    console.log(`Fonts: FONT_10="${FONT_10}" | FONT_12="${FONT_12}"`);
    console.log(`Frames directory: ${dir}`);
    const t0 = Date.now();
    for (let i = 0; i < NFRAMES; i++) {
      renderFrameToCanvas(i);
      const fp = path.join(dir, `f_${String(i).padStart(5, '0')}.png`);
      fs.writeFileSync(fp, outCanvas.toBuffer('image/png'));
      if (i % 300 === 0 || i === NFRAMES - 1) {
        const elapsed = (Date.now() - t0) / 1000;
        const eta = (elapsed / (i + 1)) * (NFRAMES - i - 1);
        console.log(`  frame ${i}/${NFRAMES} (${(((i + 1) / NFRAMES) * 100).toFixed(1)}%) elapsed=${elapsed.toFixed(1)}s eta=${eta.toFixed(1)}s`);
      }
    }
    console.log(`Rendered ${NFRAMES} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  }

  return { baseCanvas, baseCtx, outCanvas, outCtx, renderFrameToCanvas, renderAllFrames };
}

module.exports = {
  BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES,
  TYPE_CHAR_MS, SUB_CHAR_MS, FADE, FADE_IN, FADE_OUT,
  WIN, SILL, TERM, CONTENT, TEXT_X, TEXT_RIGHT, STATUS_Y, SUB,
  CLAWD_ROOM, HER_ROOM, BAR,
  C,
  FONT_10, FONT_12, fontFamilyForSize,
  clamp01, easeOut, easeInOut, lerpColor, px, dot,
  txt, measureTxt, charWidth, typedCount, drawTypedLine, drawStaticLine,
  drawBackground, drawTerminal, drawStatusLine, drawClawd, drawHer,
  drawMessageBubble, drawThoughtBubble, drawStickyNote,
  drawProgressBar, barWidth, barColorFor, drawSubtitle,
  renderScenes, createFrameRenderer,
};
