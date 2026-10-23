#!/usr/bin/env node
'use strict';
// src/render_error_arena.js — 「Clawd 的错误」1280×720 像素风 30s (1800 帧 @60fps)
// 3 场景: E1 安装报错 (npm error ERESOLVE) / E2 运行时崩溃 (TypeError) / E3 恢复与自我认同
// 风格: DSH TUI 配色 (GitHub Dark), 640×360 逻辑像素 ×2 放大, 0 抗锯齿
// 依赖: @napi-rs/canvas + @fontpkg/fusion-pixel + assets/fonts/FusionPixel10-Latin.ttf
// 结构与 src/render_upgrade_arena.js 对齐 (同族 arena 渲染器)
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

if (!GlobalFonts.registerFromPath(require.resolve('@fontpkg/fusion-pixel/fusion-pixel.ttf'), 'FusionPixel')) {
  throw Error('Fusion Pixel registration failed');
}
GlobalFonts.registerFromPath(path.join(__dirname, '../assets/fonts/FusionPixel10-Latin.ttf'), 'FusionPixel10');

const BW = 640, BH = 360, SCALE = 2, FPS = 60, DURATION = 30, NFRAMES = 1800, CHAR_MS = 140;
const TITLEH = 18;
const TERM = { x: 112, y: 128, w: 424, h: 150 };
const SUB = { x: 0, y: 320, w: 640, h: 40 };
const NOTE = { x: 360, y: 84, w: 170, h: 34 };
const CLAWD = { x: 64, y: 250, w: 40, h: 26 };
const C = {
  text: '#E6EDF3', dim: '#8B949E', green: '#7EE787', amber: '#E3B341',
  blue: '#79C0FF', bg: '#0D1117', robot: '#D97757', error: '#FF7B72',
};

const TEXTS = [
  [ // E1 — 安装依赖失败
    '$ npm install clawd@v2.0.0',
    'npm error code ERESOLVE',
    'npm error unable to resolve',
    '   dependency tree',
    'npm error Found: clawd@1.9.3',
    'npm error peer clawd@">=2.0.0"',
    'npm error   from clawtools@3.1.0',
    'npm error Fix upstream conflict',
    'npm error rerun:',
    'npm error   npm i --legacy-peer-deps',
  ],
  [ // E2 — 运行时崩溃
    '$ node clawd.js',
    'clawd v2.0.0 starting...',
    '[INFO] loading personality...',
    'TypeError: cannot read "core"',
    '   at loadPersonality (clawd.js:214)',
    '   at Module._compile (loader:1105)',
    '   at Module.runMain (run_main:77)',
    'clawd exited with code 1',
  ],
  [ // E3 — 恢复 + 自我认同
    '$ clawd --recover --safe-mode',
    '[INFO] restored config.bak',
    '[INFO] personality restored',
    '[WARN] memory partially cleared',
    '[INFO] Clawd is back.',
    '$ echo "I am not an error"',
    'I am not an error. I am me.',
  ],
];

function rowColor(text) {
  if (text.startsWith('$')) return C.green;
  if (text.includes('[WARN]')) return C.amber;
  if (text.includes('[INFO]')) return C.blue;
  if (text.startsWith('npm error') || text.startsWith('TypeError') || text.includes('exited with code')) return C.error;
  if (text.includes('I am not an error')) return C.green;
  return C.text;
}

// 并行行内打字: 140ms/字, 行间错峰 0.3s (非串行单一流)
const SCENES = TEXTS.map((lines, i) => ({
  id: `E${i + 1}`,
  start: i * 10, end: (i + 1) * 10,
  rows: lines.map((text, j) => ({
    text,
    start: i * 10 + 0.4 + j * 0.3,
    x: TERM.x + 10,
    y: TERM.y + 24 + j * 12,
    size: 10,
    color: rowColor(text),
  })),
}));

const LINES = [
  { text: '出错了。', start: 2, end: 8 },
  { text: '但我不是错误。', start: 12, end: 18 },
  { text: '我是我。', start: 24, end: 29 },
];

const base = createCanvas(BW, BH), ctx = base.getContext('2d');
const out = createCanvas(1280, 720), oc = out.getContext('2d');
const glyphs = new Map();

function px(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// 缓存阈值化字形; 全部绘制落在整数基准像素上
function glyph(ch, size, color) {
  const key = ch + size + color;
  if (glyphs.has(key)) return glyphs.get(key);
  const native = size === 14 ? 12 : size, ratio = size / native;
  const tc = createCanvas(native * 2, native * 2), c = tc.getContext('2d');
  c.font = `${native}px ${size === 10 ? 'FusionPixel10, FusionPixel' : 'FusionPixel'}`;
  c.textBaseline = 'top';
  const advance = Math.ceil(c.measureText(ch).width * ratio);
  c.fillStyle = color;
  c.fillText(ch, 0, 0);
  const im = c.getImageData(0, 0, tc.width, tc.height);
  for (let i = 3; i < im.data.length; i += 4) im.data[i] = im.data[i] > 150 ? 255 : 0;
  c.putImageData(im, 0, 0);
  let bitmap = tc;
  if (ratio !== 1) {
    bitmap = createCanvas(size * 2, size * 2);
    const bc = bitmap.getContext('2d');
    bc.imageSmoothingEnabled = false;
    bc.drawImage(tc, 0, 0, size * 2, size * 2);
  }
  const g = { canvas: bitmap, advance };
  glyphs.set(key, g);
  return g;
}

function measureTxt(text, size = 10) {
  return Array.from(text).reduce((w, ch) => w + glyph(ch, size, C.text).advance, 0);
}

function txt(c, x, y, text, color = C.text, size = 10) {
  for (const ch of text) {
    const g = glyph(ch, size, color);
    c.drawImage(g.canvas, Math.round(x), Math.round(y));
    x += g.advance;
  }
}

function visibleText(row, t) {
  return Array.from(row.text).slice(0, Math.max(0, Math.floor((t - row.start) / 0.14) + 1)).join('');
}

function isBlack(t) {
  return (t >= 9.75 && t < 10.25) || (t >= 19.75 && t < 20.25);
}

function frameTime(t) {
  return Math.ceil((t - 1e-9) * FPS) / FPS;
}

// 场景切换处的红色脉冲辉光 (E2 崩溃段), 绘制于终端之下
function drawErrorGlow(c, t) {
  if (t < 10 || t >= 20) return;
  const pulse = Math.sin(t * 6) * 0.5 + 0.5;
  px(c, TERM.x - 8, TERM.y - 8, TERM.w + 16, TERM.h + 16, `rgba(255,123,114,${(0.10 + 0.10 * pulse).toFixed(3)})`);
}

// 错误房间: 深夜冷墙 + 窗 + 月 + 地板
function drawErrorRoom(c, t) {
  px(c, 0, 0, BW, BH, '#10151C');
  for (let x = 0; x < BW; x += 16) px(c, x, 0, 8, BH, '#141A22');
  px(c, 0, 286, BW, 74, '#161B22');
  px(c, 0, 286, BW, 2, '#1E242C');
  const wx = 30, wy = 24, ww = 170, wh = 96, fw = 7;
  px(c, wx, wy, ww, wh, '#1E242C');
  const gx = wx + fw, gy = wy + fw, gw = ww - 2 * fw, gh = wh - 2 * fw;
  c.save();
  c.beginPath(); c.rect(gx, gy, gw, gh); c.clip();
  const grd = c.createLinearGradient(0, gy, 0, gy + gh);
  grd.addColorStop(0, '#1B2A44'); grd.addColorStop(1, '#0F1724');
  c.fillStyle = grd;
  c.fillRect(gx, gy, gw, gh);
  const pulse = Math.sin(t * 1.6) > 0 ? 1 : 0;
  px(c, wx + 108 - 11, wy + 30 - 11, 22 + pulse, 22 + pulse, 'rgba(180,200,255,0.10)');
  px(c, wx + 108 - 7, wy + 30 - 7, 14, 14, '#C9D6F2');
  px(c, wx + 108 - 5, wy + 30 - 5, 10, 10, '#E6EDF3');
  c.restore();
  px(c, wx + ww / 2 - 3, gy, 6, gh, '#1E242C');
  px(c, gx, wy + wh / 2 - 3, gw, 6, '#1E242C');
  px(c, wx - 4, wy + wh, ww + 8, 7, '#1E242C');
}

function drawTerminal(c, scene, t) {
  const { x, y, w, h } = TERM;
  px(c, x + 3, y + 3, w, h, 'rgba(0,0,0,.15)');
  px(c, x, y, w, h, C.bg);
  px(c, x, y, w, TITLEH, '#1E222B');
  px(c, x, y + TITLEH, w, 1, '#30363D');
  ['#FF7B72', C.amber, C.green].forEach((col, i) => px(c, x + 8 + i * 10, y + 6, 5, 5, col));
  const title = `clawd / error  ${scene.id} · ${['install', 'crash', 'recover'][Number(scene.id[1]) - 1]}`;
  txt(c, x + 53, y + 3, title, C.dim, 10);
  for (const r of scene.rows) txt(c, r.x, r.y, visibleText(r, t), r.color, r.size);
  for (let yy = y + TITLEH + 1; yy < y + h; yy += 3) px(c, x + 1, yy, w - 2, 1, 'rgba(255,255,255,.018)');
}

function drawNote(c, t) {
  if (t < 23.4) return;
  const { x, y, w, h } = NOTE;
  px(c, x + 2, y + 2, w, h, 'rgba(0,0,0,.12)');
  px(c, x, y, w, h, '#FFE3E3');
  px(c, x + Math.floor(w / 2) - 4, y + 1, 24, 4, '#E5544B');
  const label = '我不是错误。我是我。';
  txt(c, x + (w - measureTxt(label, 14)) / 2, y + 10, label, '#5A2222', 14);
}

function drawSubtitle(c, t) {
  px(c, 0, 320, 640, 40, '#191B20');
  const l = LINES.find((l) => t >= l.start && t < l.end);
  if (l) {
    const text = Array.from(l.text).slice(0, Math.floor((t - l.start) / 0.16) + 1).join('');
    txt(c, (640 - measureTxt(l.text, 14)) / 2, 332, text, C.text, 14);
  }
}

function xmark(c, bx, by, s, col) {
  for (let i = 0; i < s; i++) {
    px(c, bx + i, by + i, 1, 1, col);
    px(c, bx + s - 1 - i, by + i, 1, 1, col);
  }
}

function drawClawd(c, t) {
  let { x, y } = CLAWD;
  y += Math.sin(t * 2.2) > 0.35 ? -2 : 0;
  px(c, x, y, 40, 18, C.robot);
  const blink = t % 3.2 < 0.16;
  if (t >= 20) {
    // E3 — 重获自我: 圆眼 + 笑
    px(c, x + 10, y + 6, 4, blink ? 1 : 4, '#141413');
    px(c, x + 30, y + 6, 4, blink ? 1 : 4, '#141413');
    px(c, x + 10, y + 12, 20, 4, '#F2EAD8');
    px(c, x + 16, y + 15, 2, 1, '#141413');
    px(c, x + 18, y + 16, 6, 1, '#141413');
    px(c, x + 24, y + 15, 2, 1, '#141413');
  } else if (t >= 10) {
    // E2 — 崩溃: X 眼 + 冷汗
    xmark(c, x + 9, y + 6, 4, '#141413');
    xmark(c, x + 29, y + 6, 4, '#141413');
    px(c, x + 10, y + 12, 20, 4, '#F2EAD8');
    px(c, x + 40, y + 2, 2, 3, C.error);
  } else {
    // E1 — 担忧: 垂眼 + 皱眉
    px(c, x + 9, y + 8, 6, 2, '#141413');
    px(c, x + 29, y + 8, 6, 2, '#141413');
    px(c, x + 9, y + 4, 6, 2, C.error);
    px(c, x + 29, y + 4, 6, 2, C.error);
    px(c, x + 10, y + 12, 20, 4, '#F2EAD8');
  }
  for (let i = 0; i < 4; i++) px(c, x + 2 + i * 10, y + 18, 6, 6, '#C6613F');
}

function renderFrameToCanvas(n) {
  if (!Number.isInteger(n) || n < 0 || n >= NFRAMES) throw Error('frame out of range');
  const t = n / FPS;
  if (isBlack(t)) {
    px(ctx, 0, 0, 640, 360, '#000000');
  } else {
    drawErrorRoom(ctx, t);
    drawErrorGlow(ctx, t);
    drawNote(ctx, t);
    drawTerminal(ctx, SCENES[Math.min(2, Math.floor(t / 10))], t);
    drawClawd(ctx, t);
    drawSubtitle(ctx, t);
  }
  oc.imageSmoothingEnabled = false;
  oc.drawImage(base, 0, 0, 1280, 720);
  return { baseCanvas: base, outCanvas: out };
}

async function renderAllFrames(dir = process.env.FRAMES_DIR || path.join(__dirname, '../outputs/frames_error')) {
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < NFRAMES; i++) {
    renderFrameToCanvas(i);
    fs.writeFileSync(path.join(dir, `f_${String(i).padStart(5, '0')}.png`), out.toBuffer('image/png'));
    if (i % 300 === 0) console.log(`Rendered ${i}/${NFRAMES}`);
  }
  console.log(`Rendered ${NFRAMES}/${NFRAMES}`);
}

function getClickTimestamps() {
  const times = [];
  for (const s of SCENES) {
    for (const r of s.rows) {
      Array.from(r.text).forEach((ch, i) => {
        const t = frameTime(r.start + i * 0.14);
        if (ch.trim()) times.push(t);
      });
    }
  }
  for (const l of LINES) Array.from(l.text).forEach((_, i) => times.push(frameTime(l.start + i * 0.16)));
  times.push(0.0, 9.9, 19.9, 23.4, 29.6);
  return [...new Set(times)].sort((a, b) => a - b);
}

if (require.main === module) renderAllFrames();

module.exports = {
  BW, BH, SCALE, FPS, DURATION, NFRAMES, CHAR_MS, TITLEH,
  TERM, SUB, NOTE, CLAWD, C, SCENES, LINES,
  measureTxt, visibleText, isBlack, grayAt: () => 0, getClickTimestamps,
  renderFrameToCanvas, renderAllFrames,
};
