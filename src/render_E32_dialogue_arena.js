#!/usr/bin/env node
'use strict';
// E32 Dialogue (对话) — 30s, 1800 frames @ 60fps. batch-12 Opus 5.5 气泡对话模式.
// 风格规格: docs/style-analysis.md §7 (奶油暖色 + 珊瑚叙 + 气泡圆角 r≈12px@720p).
// 剧情锚点 (docs/episodes.md 逐字): 「叙和 her 多轮气泡对话，从『今天好吗』到分享一天，表情从 ! 到 ♥」
//   S1 (0-10s)  打招呼: 叙中档站左侧 + 用户气泡「今天好吗？」+ 叙! + AI气泡「刚醒。你呢？」
//   S2 (10-20s) 分享一天: 三条气泡交替 (用户白底靠右 ×2 + AI珊瑚靠左 ×1) + 叙♥
//   S3 (20-30s) 心贴近: 双卡对照 (左珊瑚「明天见」+ 右白「晚安」) + ^^弯月眼 + 卡片拉近 + 最后1秒亮度-8%
// 本集无 HUD 黑条（全画幅对话场景）. 台阶运动(每 2 帧保持 1 帧), 场景硬切.

const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const S = require('./pixel_story_arena');
const { BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES, px, clamp01, quantizeClicks } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E32_dialogue_arena');
const ROOT = path.resolve(__dirname, '..');

// --- Fonts --------------------------------------------------------------------
function firstExisting(cands) { return cands.find((p) => p && fs.existsSync(p)) || null; }
const SANS_FONT_PATH = firstExisting([
  process.env.E32_SANS_FONT,
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.woff'),
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.otf'),
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.ttf'),
]);
const MONO_FONT_PATH = firstExisting([
  process.env.E32_MONO_FONT,
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
]);
let SANS_FAMILY = 'sans-serif';
let MONO_FAMILY = 'monospace';
if (SANS_FONT_PATH) { GlobalFonts.registerFromPath(SANS_FONT_PATH, 'E32Sans'); SANS_FAMILY = '"E32Sans", sans-serif'; }
else console.warn('[E32] WARNING: no CJK sans font found.');
if (MONO_FONT_PATH) { GlobalFonts.registerFromPath(MONO_FONT_PATH, 'E32Mono'); MONO_FAMILY = '"E32Mono", monospace'; }

const measureCtx = createCanvas(8, 8).getContext('2d');
function measureSans(str, size) { measureCtx.font = `${size}px ${SANS_FAMILY}`; return measureCtx.measureText(str).width; }
function measureMono(str, size) { measureCtx.font = `${size}px ${MONO_FAMILY}`; return measureCtx.measureText(str).width; }
function drawSans(ctx, x, y, str, size, color, alpha = 1) {
  if (alpha <= 0 || !str) return;
  ctx.save(); ctx.globalAlpha = clamp01(alpha);
  ctx.font = `${size}px ${SANS_FAMILY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = color; ctx.fillText(str, x, y); ctx.restore();
}
function drawMono(ctx, x, y, str, size, color, alpha = 1) {
  if (alpha <= 0 || !str) return;
  ctx.save(); ctx.globalAlpha = clamp01(alpha);
  ctx.font = `${size}px ${MONO_FAMILY}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = color; ctx.fillText(str, x, y); ctx.restore();
}
function sansBox(x, y, str, size) { return [x, y, Math.ceil(measureSans(str, size)), size]; }

// --- Palette ------------------------------------------------------------------
const CORAL = '#D16E59';
const CREAM_TOP = '#E5E0DA';
const GROUND = '#C8B9A6';
const BUBBLE_WHITE = '#FFFEFB';
const INK = '#1A1A1A';
const WHITE = '#FFFFFF';
const SHADOW_SOFT = 'rgba(0,0,0,0.06)';
const SHADOW = 'rgba(0,0,0,0.12)';
const CANVAS_BOUNDS = { x: 0, y: 0, w: BW, h: BH };

// --- Layout (@360p) -----------------------------------------------------------
// 地面线
const GROUND_Y = 266;

// 叙中档 58×33@360p (=116×66@720p ≈ 115×66)
const XU_W = 58, XU_H = 33;
const XU_LEFT = { x: 66, y: GROUND_Y - XU_H };  // 左侧站立
const XU_RIGHT = { x: 480, y: GROUND_Y - XU_H }; // 右侧站立 (S3 用)

// 气泡尺寸 (圆角 r=6@360p = 12px@720p)
const BUBBLE_R = 6;
const BUBBLE_H = 24;  // 单行气泡高
const BUBBLE_PAD_X = 10;
const BUBBLE_SIZE = 12;  // 字高 12px@360p = 24px@720p

// S1 气泡位置
const USER_BUB_S1 = { x: 400, y: 180, w: 120, h: BUBBLE_H };
const AI_BUB_S1 = { x: 130, y: 160, w: 100, h: BUBBLE_H };

// S2 气泡位置 (三条, 上下排列不超 3 条同屏)
const USER_BUB_S2_1 = { x: 400, y: 140, w: 120, h: BUBBLE_H };  // 用户靠右
const AI_BUB_S2 = { x: 100, y: 180, w: 120, h: BUBBLE_H };      // AI 靠左
const USER_BUB_S2_2 = { x: 400, y: 220, w: 100, h: BUBBLE_H };  // 用户靠右

// S3 双卡对照
const CARD_L = { x: 140, y: 120, w: 140, h: 60 };  // 左卡 (珊瑚)
const CARD_R_BASE = { x: 360, y: 120, w: 140, h: 60 };  // 右卡 (白) 基础位置
const CARD_CLOSE_DIST = 8;  // 拉近 8px (3 拍完成)

// 旁白压字
const SUBTITLE_POS = [BW / 2 - 60, 296];
const SUBTITLE_SIZE = 10;

// 头顶符号 (! 和 ♥)
const HEART_POS_OFFSET = [XU_W / 2 - 4, -10];  // 相对叙顶部

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

// --- 角色「叙」中档 58×33 (站立, 9 块矩形) -------------------------------------
function xuRects() {
  return {
    coral: [[4, 0, 46, 22], [0, 9, 4, 4], [50, 8, 8, 7], [7, 22, 6, 11], [17, 22, 6, 11], [27, 22, 6, 11], [37, 22, 6, 11]],
    eyes: [[16, 6, 4, 7], [32, 6, 4, 7]],
  };
}
function drawXu(ctx, box, opts = {}) {
  const [x, y] = box;
  const { coral, eyes } = xuRects();
  const lean = opts.lean || 0;  // 前倾偏移
  for (const [rx, ry, rw, rh] of coral) {
    px(ctx, x + rx + lean, y + ry, rw, rh, CORAL);
  }
  if (opts.happy) {
    // ^^ 弯月眼
    ctx.save();
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
    for (const [ex, ey] of eyes) {
      ctx.beginPath();
      ctx.arc(x + ex + lean + 1, y + ey + 3, 2, Math.PI, 0);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    for (const [rx, ry, rw, rh] of eyes) {
      px(ctx, x + rx + lean, y + ry, rw, rh, '#000000');
    }
  }
  // 头顶符号
  if (opts.symbol === '!') {
    ctx.save();
    ctx.fillStyle = INK;
    ctx.font = `8px ${SANS_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('!', x + XU_W / 2 + lean, y - 4);
    ctx.restore();
  } else if (opts.symbol === '♥') {
    ctx.save();
    ctx.fillStyle = CORAL;
    ctx.font = `8px ${SANS_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('♥', x + XU_W / 2 + lean, y - 4);
    ctx.restore();
  }
}

// --- 气泡绘制 -----------------------------------------------------------------
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w - r, y + h, x, y + h - r, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + r, x, y, r); ctx.closePath();
}
function drawBubble(ctx, box, fillColor, text, textColor, alpha = 1) {
  if (alpha <= 0 || !text) return;
  ctx.save(); ctx.globalAlpha = clamp01(alpha);
  // 两层柔投影
  roundRectPath(ctx, box.x + 2, box.y + 2, box.w, box.h, BUBBLE_R);
  ctx.fillStyle = SHADOW_SOFT; ctx.fill();
  roundRectPath(ctx, box.x + 1, box.y + 1, box.w, box.h, BUBBLE_R);
  ctx.fillStyle = SHADOW; ctx.fill();
  // 气泡主体
  roundRectPath(ctx, box.x, box.y, box.w, box.h, BUBBLE_R);
  ctx.fillStyle = fillColor; ctx.fill();
  // 文字
  ctx.font = `${BUBBLE_SIZE}px ${SANS_FAMILY}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.fillText(text, box.x + BUBBLE_PAD_X, box.y + box.h / 2);
  ctx.restore();
}

// --- Background (奶油渐变, 无地面线 — 全画幅) ----------------------------------
function drawCreamBg(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, BH);
  grad.addColorStop(0, CREAM_TOP);
  grad.addColorStop(1, GROUND);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BW, BH);
}

// --- Scenes (硬切; ts = 台阶时间) ---------------------------------------------
function drawS1(ctx, ts) {
  drawCreamBg(ctx);
  // 叙中档站左侧, 轻微前倾 (lean=4)
  drawXu(ctx, [XU_LEFT.x, XU_LEFT.y, XU_W, XU_H], { lean: 4, symbol: '!' });
  // 用户气泡 (白底黑字, 右侧升起)
  drawBubble(ctx, USER_BUB_S1, BUBBLE_WHITE, '今天好吗？', INK, fadeAlpha(ts, 1.0));
  // AI 气泡 (珊瑚底白字, 左侧升起)
  drawBubble(ctx, AI_BUB_S1, CORAL, '刚醒。你呢？', WHITE, fadeAlpha(ts, 2.0));
  // 旁白
  drawSans(ctx, SUBTITLE_POS[0], SUBTITLE_POS[1], '对话开始。', SUBTITLE_SIZE, INK, fadeAlpha(ts, 3.0));
}

function drawS2(ctx, ts) {
  drawCreamBg(ctx);
  // 叙中档站左侧, 无倾斜
  drawXu(ctx, [XU_LEFT.x, XU_LEFT.y, XU_W, XU_H], { symbol: '♥' });
  // 三条气泡交替出现
  drawBubble(ctx, USER_BUB_S2_1, BUBBLE_WHITE, '开了三个会。', INK, fadeAlpha(ts, 10.5));
  drawBubble(ctx, AI_BUB_S2, CORAL, '我读了两本书。', WHITE, fadeAlpha(ts, 12.0));
  drawBubble(ctx, USER_BUB_S2_2, BUBBLE_WHITE, '好羡慕。', INK, fadeAlpha(ts, 14.0));
  // 旁白
  drawSans(ctx, SUBTITLE_POS[0], SUBTITLE_POS[1], '分享，让一天变轻。', SUBTITLE_SIZE, INK, fadeAlpha(ts, 15.0));
}

function drawS3(ctx, ts) {
  drawCreamBg(ctx);
  // 叙站在中间偏左, 面向右 (^^弯月眼)
  const xuMid = { x: 280, y: GROUND_Y - XU_H };
  drawXu(ctx, [xuMid.x, xuMid.y, XU_W, XU_H], { happy: true });

  // 双卡对照: 左卡 (珊瑚) + 右卡 (白), 缓慢拉近 8px (3 拍)
  const closeP = clamp01((ts - 22.0) / 3.0);  // 22-25s 拉近
  const cardROffset = Math.round(CARD_CLOSE_DIST * (1 - closeP));
  const cardR = { ...CARD_R_BASE, x: CARD_R_BASE.x - cardROffset };

  // 左卡 (珊瑚底白字): 叙 ♥「明天见」
  drawBubble(ctx, CARD_L, CORAL, '叙 ♥ 明天见', WHITE, fadeAlpha(ts, 20.5));
  // 右卡 (白底黑字): her「晚安」
  drawBubble(ctx, cardR, BUBBLE_WHITE, 'her 晚安', INK, fadeAlpha(ts, 20.5));

  // 旁白
  drawSans(ctx, SUBTITLE_POS[0], SUBTITLE_POS[1], 'distance: 0。', SUBTITLE_SIZE, INK, fadeAlpha(ts, 24.0));

  // 最后 1 秒亮度 -8%
  if (ts >= 29.0) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, BW, BH);
    ctx.restore();
  }
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
    { t: q(1.0), kind: 'user_bubble', gainDb: -14 },   // S1 用户气泡
    { t: q(2.0), kind: 'ai_bubble', gainDb: -12 },     // S1 AI 气泡
    { t: q(10.5), kind: 'user_bubble', gainDb: -14 },  // S2 用户气泡 1
    { t: q(12.0), kind: 'ai_bubble', gainDb: -12 },    // S2 AI 气泡
    { t: q(14.0), kind: 'user_bubble', gainDb: -14 },  // S2 用户气泡 2
    { t: q(20.5), kind: 'card_appear', gainDb: -16 },  // S3 双卡出现
    { t: q(25.0), kind: 'soft_land', gainDb: -18 },    // 卡片拉近完成
  ];
}
function getClickTimestamps() {
  return quantizeClicks(getSfxEvents().map((e) => e.t));
}

// --- Frame export -------------------------------------------------------------
const renderer = S.createFrameRenderer(renderAt, OUT_DIR, { fadeIn: 0, fadeOut: 0 });
function renderAllFrames(dir = OUT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`E32 dialogue: ${BW}×${BH} SCALE=${SCALE} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Style: docs/style-analysis.md 奶油暖色+珊瑚叙+气泡对话 (无 HUD)`);
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
  CORAL, CREAM_TOP, GROUND, BUBBLE_WHITE, INK, WHITE, CANVAS_BOUNDS,
  GROUND_Y, XU_W, XU_H, XU_LEFT, XU_RIGHT,
  BUBBLE_R, BUBBLE_H, BUBBLE_PAD_X, BUBBLE_SIZE,
  USER_BUB_S1, AI_BUB_S1, USER_BUB_S2_1, AI_BUB_S2, USER_BUB_S2_2,
  CARD_L, CARD_R_BASE, CARD_CLOSE_DIST,
  SUBTITLE_POS, SUBTITLE_SIZE,
  CHECK_TITLE: 'E32 对话 (dialogue) Layout & Pixel Check (640×360, 0px tolerance)',
  drawXu, xuRects, measureSans, measureMono, sansBox,
  steppedTime, fadeAlpha, sceneOf, getSfxEvents, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas, renderAllFrames,
};