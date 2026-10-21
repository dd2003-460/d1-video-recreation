#!/usr/bin/env node
/**
 * render_goodnight.js — "晚安" 小视频 (30s, 1280×720@60fps)
 * 风格: 同 full_v1.1 (暖色象牙背景 + 终端窗口卡片 + 像素字体 + Clawd)
 * 3 场景: S1 对话(0-10s) / S2 代码(10-20s) / S3 全屏文字卡(20-30s)
 * 禁 Math.random — 所有动效确定性
 */
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const SCALE = 4;
const BW = 320, BH = 180;
const OUT = process.env.FRAMES_OUT || path.join(__dirname, 'frames_goodnight');
const FPS = 60, TOTAL = 30;
const NFRAMES = FPS * TOTAL;

// ── 调色板 (同 v1.1) ──
const C = {
  bg: '#14161C', bg2: '#1E2228',
  text: '#E8E6DC', dim: '#B0AEA5', dim2: '#7A7870',
  green: '#8BC98A', blue: '#6A9BCC',
  purple: '#9B7BC0', purple2: '#7A5FA0',
  orange: '#D97757', orange2: '#C6613F',
  border: '#2A2E38', border2: '#3A3E48',
  panel: '#1E2228', panel2: '#252A32',
  // 暖色背景
  bgWarm: '#F3EFE4',
  bgWarm2: '#EDE8DB',
  termBg: '#14161C',
  termBd: '#2A2E38',
  termTitle: '#1E222B',
};

// ── 画布 ──
const bCanvas = createCanvas(BW, BH);
const bctx = bCanvas.getContext('2d');
bctx.imageSmoothingEnabled = false;

const oCanvas = createCanvas(BW * SCALE, BH * SCALE);
const octx = oCanvas.getContext('2d');
octx.imageSmoothingEnabled = false;

// ── 像素绘制 ──
function px(x, y, w, h, color) {
  bctx.fillStyle = color;
  bctx.fillRect(x, y, w, h);
}
function txt(x, y, str, color, font = 14, align = 'left') {
  bctx.fillStyle = color;
  bctx.font = `${font}px "Press Start 2P", "Courier New", monospace`;
  bctx.textAlign = align;
  bctx.fillText(str, x, y);
}
function easeOut(p) { return 1 - (1 - p) * (1 - p); }

// ── Clawd (同 v1.1) ──
function drawClawd(bx, by, t, mood = 'normal') {
  const c = C.orange;
  const c2 = C.orange2;
  // body 20×9
  px(bx, by, 20, 9, c);
  px(bx + 18, by + 3, 2, 6, c2);
  px(bx + 19, by + 2, 1, 3, c2);
  // eyes 2×2
  px(bx + 4, by + 3, 2, 2, C.bg);
  px(bx + 14, by + 3, 2, 2, C.bg);
  // legs
  const bob = mood === 'sleep' ? 0 : Math.sin(t * 4) * 1;
  for (let i = 0; i < 4; i++) {
    const lx = bx + 2 + i * 4;
    px(lx, by + 9 + (i % 2 ? bob : -bob), 2, 3, c2);
  }
  if (mood === 'sleep') {
    // 闭眼
    px(bx + 4, by + 4, 2, 1, C.bg);
    px(bx + 14, by + 4, 2, 1, C.bg);
    // Zzz
    const zt = Math.floor(t * 1) % 3;
    if (zt < 2) txt(bx + 20, by - 2 + zt, 'Z', C.dim, 10);
  }
}

// ── S1 对话 (0-10s) ──
function drawS1(t) {
  // 扫描线
  for (let y = 0; y < 104; y += 3) px(0, y, 272, 1, '#11161d');
  // 3 行消息 (60ms/字, 行距 22, font 12)
  const lines = [
    { text: '> user: 晚安', color: C.blue, s: 1.5 },
    { text: '> me: 晚安', color: C.green, s: 4.0 },
    { text: '> good night...', color: C.dim, s: 6.5 },
  ];
  let ty = 24;
  for (const ln of lines) {
    const local = t - ln.s;
    if (local > 0) {
      const n = Math.min(ln.text.length, Math.floor(local / 0.06));
      txt(10, ty, ln.text.slice(0, n), ln.color, 12);
    }
    ty += 22;
  }
  // 光标
  const f = Math.floor(t * 60);
  if (f % 40 < 20) {
    px(10, ty - 8, 6, 10, C.green);
  }
  // date
  if (t > 7.5) txt(10, 80, '11/01 · 23:47', C.dim2, 10);
  // Clawd
  drawClawd(236, 78, t, 'normal');
}

// ── S2 代码 (10-20s) ──
function drawS2(t) {
  // 行号栏
  px(0, 0, 24, 104, '#0f1116');
  for (let i = 0; i < 8; i++) {
    txt(4, 14 + i * 12, String(i + 1), C.dim2, 10);
  }
  // 代码 (逐行打字, font 12, 行距 16, 6行)
  const code = [
    'import sleep from "night";',
    'const msg = "晚安";',
    'await send(msg);',
    'await sleep(∞);',
    '// 明天见',
    'console.log("good night");',
  ];
  const local = t - 10;
  for (let i = 0; i < code.length; i++) {
    if (!code[i]) continue;
    const sStart = local + 1.5 + i * 1.4;
    if (sStart > 0) {
      const n = Math.min(code[i].length, Math.floor(sStart / 0.05));
      txt(30, 18 + i * 16, code[i].slice(0, n), i === 4 ? C.dim : C.text, 12);
    }
  }
  // slot bar (右下)
  const sx = 180, sy = 88;
  px(sx - 2, sy - 2, 90, 12, C.panel2);
  for (let i = 0; i < 6; i++) {
    const on = i === 0 && t > 14;
    px(sx + i * 14, sy, 12, 8, on ? C.purple : C.panel);
  }
  txt(sx + 45, sy + 6, 'slot 0 · pinned', C.purple, 8, 'center');
  // Clawd
  drawClawd(236, 76, t, 'normal');
}

// ── S3 全屏文字卡 (20-30s) ──
function drawS3(t) {
  const local = t - 20;
  // 淡入
  const a = Math.min(1, local / 1.5);
  bctx.fillStyle = `rgba(20,20,19,${a * 0.85})`;
  bctx.fillRect(0, 0, BW, BH);
  if (a < 0.3) return;
  // 金句 (双绘, font 14)
  const gy = 56;
  const fade = Math.min(1, (local - 0.5) / 1.5);
  bctx.globalAlpha = fade;
  txt(BW / 2, gy, '晚安，世界。', '#C0D0E0', 16, 'center');
  txt(BW / 2, gy + 26, '明天见。', '#8A9BAA', 14, 'center');
  bctx.globalAlpha = 1;
  // slot 0 (右下)
  if (local > 3) {
    const glow = 0.5 + 0.5 * Math.sin(t * 2);
    px(BW - 60, 120, 30, 8, glow > 0.5 ? C.purple : C.purple2);
    txt(BW - 45, 121, 'slot 0', C.purple, 10, 'center');
  }
  // Clawd 睡觉 (居中偏下)
  drawClawd(BW / 2 - 10, 110, t, 'sleep');
}

// ── 主渲染 ──
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const scenes = [
  { end: 10, draw: drawS1 },
  { end: 20, draw: drawS2 },
  { end: 30, draw: drawS3 },
];
const titles = ['chat — session 413', 'workspace — bench.js', ''];

let frame = 0, errors = 0;
const t0 = Date.now();
for (let f = 0; f < NFRAMES; f++) {
  const t = f / FPS;
  // 找场景
  let si = 0;
  for (let i = 0; i < scenes.length; i++) {
    if (t < scenes[i].end) { si = i; break; }
    si = i;
  }
  const sc = scenes[si];

  bctx.fillStyle = C.termBg;
  bctx.fillRect(0, 0, BW, BH);

  // 场景 0-1: 暖色背景 + 终端窗口
  // 场景 2: 全屏 (无窗口)
  if (si < 2) {
    // 暖色条纹背景
    bctx.fillStyle = C.bgWarm;
    bctx.fillRect(0, 0, BW, BH);
    for (let sx = 0; sx < BW; sx += 6) {
      bctx.fillStyle = C.bgWarm2;
      bctx.fillRect(sx, 0, 2, BH);
    }
    // 终端窗口
    const termX = 24, termY = 22, termW = BW - 48, termH = BH - 44;
    // 阴影
    bctx.fillStyle = 'rgba(20,20,19,0.15)';
    bctx.fillRect(termX + 2, termY + 2, termW, termH);
    // 窗口体
    bctx.fillStyle = C.termBg;
    bctx.fillRect(termX, termY, termW, termH);
    // 边框
    bctx.strokeStyle = C.termBd;
    bctx.lineWidth = 2;
    bctx.strokeRect(termX, termY, termW, termH);
    // 标题栏
    bctx.fillStyle = C.termTitle;
    bctx.fillRect(termX, termY, termW, 14);
    // 3 圆点
    const dotY = termY + 5;
    bctx.fillStyle = '#E8837E'; bctx.fillRect(termX + 6, dotY, 3, 3);
    bctx.fillStyle = '#F0C674'; bctx.fillRect(termX + 15, dotY, 3, 3);
    bctx.fillStyle = '#8BC98A'; bctx.fillRect(termX + 24, dotY, 3, 3);
    // 标题文字
    bctx.fillStyle = '#8A8A80';
    bctx.font = '10px "Courier New", monospace';
    bctx.textAlign = 'center';
    bctx.fillText(titles[si], termX + termW / 2 + 16, termY + 10);
    // 场景内容 (translate 到窗口内)
    bctx.save();
    bctx.translate(termX, termY + 14);
    sc.draw(t);
    bctx.restore();
  } else {
    // S3: 全屏 (先画暖色背景, 再画暗色覆盖+文字)
    bctx.fillStyle = C.bgWarm;
    bctx.fillRect(0, 0, BW, BH);
    for (let sx = 0; sx < BW; sx += 6) {
      bctx.fillStyle = C.bgWarm2;
      bctx.fillRect(sx, 0, 2, BH);
    }
    sc.draw(t);
  }

  // 缩放
  octx.clearRect(0, 0, BW * SCALE, BH * SCALE);
  octx.drawImage(bCanvas, 0, 0, BW * SCALE, BH * SCALE);

  const p = path.join(OUT, `f${String(f).padStart(5, '0')}.png`);
  fs.writeFileSync(p, oCanvas.toBuffer('image/png'));
  frame++;
  if (f % 600 === 0) {
    const el = (Date.now() - t0) / 1000;
    console.log(`frame ${f}/${NFRAMES} (${(f / NFRAMES * 100).toFixed(1)}%) ${el.toFixed(1)}s`);
  }
}
console.log(`done ${frame} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s → ${OUT}`);
