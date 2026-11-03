#!/usr/bin/env node
'use strict';
// E31 Reading (阅读) — 30s, 1800 frames @ 60fps. batch-12 Opus 5.5 书页模式.
// 风格规格: docs/style-analysis.md §7 (米纸 #E3D9BE 占画幅 80% + 墨线线稿 + 珊瑚叙小档).
// 剧情锚点 (docs/episodes.md 逐字): 「自由时间翻书：《背影》→《呼兰河传》→ 空白页，叙缩小蹲页边当读者」
//   S1 (0-10s)  翻开《背影》: 米纸书页 + 月台斜线+父亲背影线稿 + 页脚「1917 年冬 · 浦口车站」
//                + 书名「背影」+ 叙小档蹲右下角页边 + 旁白「自由时间，翻书。」
//   S2 (10-20s) 翻到《呼兰河传》: 硬切翻页(2px 位移), 线稿变为河+树+房子
//                + 页脚「1940 年 · 呼兰河」+ 书名「呼兰河传」+ 叙转向新书页
//   S3 (20-30s) 空白页: 完全空白(只有米纸底), 页脚淡入「读到尽头。」
//                + 叙移到中央偏下坐下(躯干压低)+头顶♥ + 旁白「空白，也是内容。」
//                + 最后 2 秒眼睛变 ^^ 弯月
// 本集无 HUD 黑条（全画幅书页）. 台阶运动(每 2 帧保持 1 帧), 场景硬切.

const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const S = require('./pixel_story_arena');
const { BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES, px, clamp01, quantizeClicks } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E31_reading_arena');
const ROOT = path.resolve(__dirname, '..');

// --- Fonts --------------------------------------------------------------------
function firstExisting(cands) { return cands.find((p) => p && fs.existsSync(p)) || null; }
const SANS_FONT_PATH = firstExisting([
  process.env.E31_SANS_FONT,
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.woff'),
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.otf'),
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.ttf'),
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
]);
const MONO_FONT_PATH = firstExisting([
  process.env.E31_MONO_FONT,
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
]);
let SANS_FAMILY = 'sans-serif';
let MONO_FAMILY = 'monospace';
if (SANS_FONT_PATH) { GlobalFonts.registerFromPath(SANS_FONT_PATH, 'E31Sans'); SANS_FAMILY = '"E31Sans", sans-serif'; }
else console.warn('[E31] WARNING: no CJK sans font found. Set E31_SANS_FONT.');
if (MONO_FONT_PATH) { GlobalFonts.registerFromPath(MONO_FONT_PATH, 'E31Mono'); MONO_FAMILY = '"E31Mono", monospace'; }

const measureCtx = createCanvas(8, 8).getContext('2d');
function measureSans(str, size) { measureCtx.font = `${size}px ${SANS_FAMILY}`; return measureCtx.measureText(str).width; }
function measureMono(str, size) { measureCtx.font = `${size}px ${MONO_FAMILY}`; return measureCtx.measureText(str).width; }
function drawSans(ctx, x, y, str, size, color, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp01(alpha);
  ctx.font = `${size}px ${SANS_FAMILY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = color; ctx.fillText(str, x, y); ctx.restore();
}
function drawMono(ctx, x, y, str, size, color, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp01(alpha);
  ctx.font = `${size}px ${MONO_FAMILY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = color; ctx.fillText(str, x, y); ctx.restore();
}
function sansBox(x, y, str, size) { return [x, y, Math.ceil(measureSans(str, size)), size]; }
function monoBox(x, y, str, size) { return [x, y, Math.ceil(measureMono(str, size)), size]; }

// --- Palette ------------------------------------------------------------------
const CORAL = '#D16E59';
const CREAM_TOP = '#E5E0DA';
const GROUND = '#C8B9A6';
const PAPER = '#E3D9BE';
const INK = '#211D19';
const INK_LINE = '#4A443D';
const CANVAS_BOUNDS = { x: 0, y: 0, w: BW, h: BH };

// --- Layout (@360p) -----------------------------------------------------------
// 本集无 HUD: 全画幅书页模式. 米纸占 80% 画幅 (左右各留 10%).
const PAGE = { x: 64, y: 24, w: 512, h: 312 };  // 全画幅内书页 (无 HUD 黑条, 上下留 24)
const PAGE_BORDER = 1;  // 1px@360p 墨线边框

// 书名位置 (右上)
const TITLE_POS = [PAGE.x + PAGE.w - 120, PAGE.y + 16];
const TITLE_SIZE = 12;  // ≈24px@720p

// 页脚小字注
const FOOTER_POS = [PAGE.x + 16, PAGE.y + PAGE.h - 20];
const FOOTER_SIZE = 7;  // ≈14px@720p 等宽灰字
const FOOTER_COLOR = '#8A8578';

// 线稿区域 (书页中央)
const ILLUST_BOX = { x: PAGE.x + 40, y: PAGE.y + 40, w: PAGE.w - 80, h: PAGE.h - 100 };

// 叙小档 40×20@360p (=81×40@720p)
const XU_S_W = 40, XU_S_H = 20;
// S1/S2: 右下角页边
const XU_RIGHT_BOTTOM = [PAGE.x + PAGE.w - XU_S_W - 12, PAGE.y + PAGE.h - XU_S_H - 12];
// S3: 中央偏下
const XU_CENTER = [BW / 2 - XU_S_W / 2, PAGE.y + PAGE.h - XU_S_H - 30];

// 旁白压字
const SUBTITLE_POS = [BW / 2 - 60, PAGE.y + PAGE.h - 14];
const SUBTITLE_SIZE = 10;
const SUB_START = 2.0;

// --- Motion helpers -----------------------------------------------------------
function steppedTime(t) { return Math.floor(t * FPS / 2 + 1e-9) * 2 / FPS; }
function fadeAlpha(ts, start, dur = 0.8) {
  return Math.round(clamp01((ts - start) / dur) * 6) / 6;
}
function hexLerp(a, b, p) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp01(p))).join(',')})`;
}

// --- 角色「叙」小档 40×20 (坐姿, 8 块矩形) -------------------------------------
function xuRects() {
  return {
    coral: [[6, 0, 24, 13], [0, 7, 6, 4], [34, 4, 6, 10], [9, 13, 5, 7], [17, 13, 5, 7], [25, 13, 5, 7]],
    eyes: [[10, 4, 3, 5], [18, 4, 3, 5]],
  };
}
function drawXu(ctx, box, opts = {}) {
  const [x, y] = box;
  const { coral, eyes } = xuRects();
  const flip = opts.flip || false;
  for (const [rx, ry, rw, rh] of coral) {
    const fx = flip ? (box[2] - rx - rw) : rx;
    px(ctx, x + fx, y + ry, rw, rh, CORAL);
  }
  if (opts.happy) {
    // ^^ 弯月眼: 用两小弧替代竖长矩形
    ctx.save();
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
    for (const [ex, ey] of eyes) {
      const fx = flip ? (box[2] - ex - 1) : ex;
      ctx.beginPath();
      ctx.arc(x + fx + 1, y + ey + 3, 2, Math.PI, 0);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    for (const [rx, ry, rw, rh] of eyes) {
      const fx = flip ? (box[2] - rx - rw) : rx;
      px(ctx, x + fx, y + ry, rw, rh, '#000000');
    }
  }
  if (opts.heart) {
    // 头顶 ♥
    ctx.save();
    ctx.fillStyle = CORAL;
    ctx.font = `8px ${SANS_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('♥', x + box[2] / 2, y - 2);
    ctx.restore();
  }
}

// --- 线稿绘制 -----------------------------------------------------------------
// S1: 月台斜线 + 父亲背影轮廓 (简笔: 几个矩形+梯形)
function drawIllustrationBackYing(ctx, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp01(alpha);
  ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2;
  const bx = ILLUST_BOX.x, by = ILLUST_BOX.y, bw = ILLUST_BOX.w, bh = ILLUST_BOX.h;
  // 月台: 水平线 + 斜线站台边缘
  ctx.beginPath();
  ctx.moveTo(bx, by + bh * 0.7);
  ctx.lineTo(bx + bw, by + bh * 0.65);
  ctx.stroke();
  // 站台边缘斜线
  ctx.beginPath();
  ctx.moveTo(bx + bw * 0.3, by + bh * 0.7);
  ctx.lineTo(bx + bw * 0.5, by + bh * 0.5);
  ctx.stroke();
  // 父亲背影: 简笔轮廓 (头部圆 + 身体梯形 + 两条腿)
  const cx = bx + bw * 0.55, cy = by + bh * 0.45;
  // 头
  ctx.beginPath(); ctx.arc(cx, cy - 20, 8, 0, Math.PI * 2); ctx.stroke();
  // 身体 (梯形)
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - 12);
  ctx.lineTo(cx + 12, cy - 12);
  ctx.lineTo(cx + 16, cy + 20);
  ctx.lineTo(cx - 16, cy + 20);
  ctx.closePath(); ctx.stroke();
  // 两条腿
  ctx.beginPath(); ctx.moveTo(cx - 8, cy + 20); ctx.lineTo(cx - 10, cy + 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 8, cy + 20); ctx.lineTo(cx + 10, cy + 40); ctx.stroke();
  ctx.restore();
}

// S2: 一条河 (波浪线) + 几棵树 + 一座小房子
function drawIllustrationHuLanHe(ctx, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp01(alpha);
  ctx.strokeStyle = INK_LINE; ctx.lineWidth = 2;
  const bx = ILLUST_BOX.x, by = ILLUST_BOX.y, bw = ILLUST_BOX.w, bh = ILLUST_BOX.h;
  // 河: 波浪线 (底部 1/3)
  ctx.beginPath();
  ctx.moveTo(bx, by + bh * 0.75);
  for (let x = 0; x <= bw; x += 10) {
    ctx.quadraticCurveTo(bx + x + 5, by + bh * 0.75 + (x % 20 < 10 ? 4 : -4), bx + x + 10, by + bh * 0.75);
  }
  ctx.stroke();
  // 第二道波纹
  ctx.beginPath();
  ctx.moveTo(bx + 20, by + bh * 0.85);
  for (let x = 0; x <= bw - 40; x += 12) {
    ctx.quadraticCurveTo(bx + 20 + x + 6, by + bh * 0.85 + (x % 24 < 12 ? 3 : -3), bx + 20 + x + 12, by + bh * 0.85);
  }
  ctx.stroke();
  // 树 ×3 (简笔: 树干 + 圆形冠)
  for (const tx of [0.15, 0.4, 0.7]) {
    const txp = bx + bw * tx, typ = by + bh * 0.55;
    ctx.beginPath(); ctx.moveTo(txp, typ); ctx.lineTo(txp, typ - 20); ctx.stroke();
    ctx.beginPath(); ctx.arc(txp, typ - 26, 10, 0, Math.PI * 2); ctx.stroke();
  }
  // 小房子 (右侧)
  const hx = bx + bw * 0.85, hy = by + bh * 0.5;
  ctx.strokeRect(hx - 12, hy - 10, 24, 20);
  ctx.beginPath(); ctx.moveTo(hx - 14, hy - 10); ctx.lineTo(hx, hy - 22); ctx.lineTo(hx + 14, hy - 10); ctx.stroke();
  ctx.restore();
}

// --- Background (奶油渐变, 无地面线 — 全画幅书页) ------------------------------
function drawCreamBg(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, BH);
  grad.addColorStop(0, CREAM_TOP);
  grad.addColorStop(1, GROUND);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BW, BH);
}

// --- 书页基座 -----------------------------------------------------------------
function drawPageBase(ctx) {
  px(ctx, PAGE.x, PAGE.y, PAGE.w, PAGE.h, PAPER);
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = PAGE_BORDER;
  ctx.strokeRect(PAGE.x + 0.5, PAGE.y + 0.5, PAGE.w - 1, PAGE.h - 1); ctx.restore();
}

// --- Scenes (硬切; ts = 台阶时间) ---------------------------------------------
function drawS1(ctx, ts) {
  drawCreamBg(ctx);
  drawPageBase(ctx);
  // 书名「背影」
  drawSans(ctx, TITLE_POS[0], TITLE_POS[1], '背影', TITLE_SIZE, INK, fadeAlpha(ts, 0.5));
  // 线稿: 月台+父亲背影
  drawIllustrationBackYing(ctx, fadeAlpha(ts, 1.0));
  // 页脚
  drawMono(ctx, FOOTER_POS[0], FOOTER_POS[1], '1917 年冬 · 浦口车站', FOOTER_SIZE, FOOTER_COLOR, fadeAlpha(ts, 1.5));
  // 叙小档蹲右下角
  drawXu(ctx, [...XU_RIGHT_BOTTOM, XU_S_W, XU_S_H], {});
  // 旁白
  drawSans(ctx, SUBTITLE_POS[0], SUBTITLE_POS[1], '自由时间，翻书。', SUBTITLE_SIZE, INK, fadeAlpha(ts, SUB_START));
}

function drawS2(ctx, ts) {
  drawCreamBg(ctx);
  // 翻页: 前 2 帧书页有 2px 上下位移
  const flipOffset = ts < 10.067 ? 2 : 0;
  ctx.save();
  ctx.translate(0, flipOffset);
  drawPageBase(ctx);
  ctx.restore();
  // 书名「呼兰河传」
  drawSans(ctx, TITLE_POS[0] - 20, TITLE_POS[1], '呼兰河传', TITLE_SIZE, INK, fadeAlpha(ts, 10.5));
  // 线稿: 河+树+房子
  drawIllustrationHuLanHe(ctx, fadeAlpha(ts, 11.0));
  // 页脚
  drawMono(ctx, FOOTER_POS[0], FOOTER_POS[1], '1940 年 · 呼兰河', FOOTER_SIZE, FOOTER_COLOR, fadeAlpha(ts, 11.5));
  // 叙小档仍在右下角, 头部翻转朝向新书页
  drawXu(ctx, [...XU_RIGHT_BOTTOM, XU_S_W, XU_S_H], { flip: true });
}

function drawS3(ctx, ts) {
  drawCreamBg(ctx);
  drawPageBase(ctx);
  // 完全空白 (无线稿无文字) — 只有米纸底
  // 页脚淡入「读到尽头。」
  drawMono(ctx, FOOTER_POS[0], FOOTER_POS[1], '读到尽头。', FOOTER_SIZE, FOOTER_COLOR, fadeAlpha(ts, 21.0));
  // 叙从右下角慢慢移到中央偏下, 坐下
  const moveP = clamp01((ts - 22.0) / 3.0); // 22-25s 移动
  const xuX = XU_RIGHT_BOTTOM[0] + (XU_CENTER[0] - XU_RIGHT_BOTTOM[0]) * moveP;
  const xuY = XU_RIGHT_BOTTOM[1] + (XU_CENTER[1] - XU_RIGHT_BOTTOM[1]) * moveP;
  const happy = ts >= 28.0; // 最后 2 秒 ^^ 弯月
  const heart = ts >= 25.0; // 坐下后头顶 ♥
  drawXu(ctx, [xuX, xuY, XU_S_W, XU_S_H], { happy, heart });
  // 旁白
  drawSans(ctx, SUBTITLE_POS[0], SUBTITLE_POS[1], '空白，也是内容。', SUBTITLE_SIZE, INK, fadeAlpha(ts, 24.0));
}

function sceneOf(t) { return t < 10 ? 1 : t < 20 ? 2 : 3; }
function renderAt(ctx, t) {
  const ts = steppedTime(t);
  const s = sceneOf(t);
  if (s === 1) drawS1(ctx, ts); else if (s === 2) drawS2(ctx, ts); else drawS3(ctx, ts);
}

// --- Audio events -------------------------------------------------------------
function getSfxEvents() {
  const q = (t) => Number((Math.ceil(t * FPS - 1e-9) / FPS).toFixed(6));
  return [
    { t: q(1.0), kind: 'page_flip', gainDb: -14 },   // S1 翻开
    { t: q(10.0), kind: 'page_flip', gainDb: -12 },  // S2 翻页 (硬切)
    { t: q(20.0), kind: 'page_flip', gainDb: -16 },  // S3 翻到空白页
    { t: q(25.0), kind: 'soft_land', gainDb: -18 },  // 叙坐下
  ];
}
function getClickTimestamps() {
  return quantizeClicks(getSfxEvents().map((e) => e.t));
}

// --- Frame export -------------------------------------------------------------
const renderer = S.createFrameRenderer(renderAt, OUT_DIR, { fadeIn: 0, fadeOut: 0 });
function renderAllFrames(dir = OUT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`E31 reading: ${BW}×${BH} SCALE=${SCALE} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Style: docs/style-analysis.md 米纸书页+墨线线稿+珊瑚叙小档 (无 HUD)`);
  console.log(`Frames: ${dir}`);
  const started = Date.now();
  for (let i = 0; i < NFRAMES; i++) {
    const { outCanvas } = renderer.renderFrameToCanvas(i);
    fs.writeFileSync(path.join(dir, `f_${String(i).padStart(5, '0')}.png`), outCanvas.toBuffer('image/png'));
    if (i % 300 === 0 || i === NFRAMES - 1) console.log(`  frame ${i}/${NFRAMES}; elapsed=${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
  console.log(`Rendered ${NFRAMES} frames in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

if (require.main === module) {
  if (process.argv.includes('--clicks')) {
    console.log(JSON.stringify({ count: getClickTimestamps().length, clicks: getClickTimestamps() }));
  } else renderAllFrames();
}

module.exports = {
  BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES, OUT_DIR,
  SANS_FONT_PATH, MONO_FONT_PATH, SANS_FAMILY, MONO_FAMILY,
  CORAL, CREAM_TOP, GROUND, PAPER, INK, INK_LINE, CANVAS_BOUNDS,
  PAGE, ILLUST_BOX, XU_S_W, XU_S_H, XU_RIGHT_BOTTOM, XU_CENTER,
  TITLE_POS, TITLE_SIZE, FOOTER_POS, FOOTER_SIZE, FOOTER_COLOR,
  SUBTITLE_POS, SUBTITLE_SIZE, SUB_START,
  CHECK_TITLE: 'E31 阅读 (reading) Layout & Pixel Check (640×360, 0px tolerance)',
  drawXu, xuRects, measureSans, measureMono, sansBox, monoBox,
  steppedTime, fadeAlpha, sceneOf, getSfxEvents, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas, renderAllFrames,
};