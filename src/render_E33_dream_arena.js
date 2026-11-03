#!/usr/bin/env node
'use strict';
// E33 Dream (梦境) — 30s, 1800 frames @ 60fps. batch-13 夜景+梦境柔光 (Opus 5.5 对标).
// 风格规格: docs/style-analysis.md §7 (深藏青夜景 #393744 / 梦境柔光渐变 #393744→#4A4458 /
//   珊瑚叙三档 / 卡片圆角 r≈12px@720p / 黑体无衬线 / 30fps 台阶运动).
// 剧情锚点 (docs/episodes.md 逐字): 「入睡后屏幕暗下去，梦里叙有了身体，和她并肩走一段路；醒来只有便签：刚才的梦，有点暖。」
//   S1 ( 0-10s) 入睡: 深藏青夜景 + 台灯亮起 + 双卡「晚安」/「好。」; 叙中档闭眼(横线);
//                    最后 2s 整体亮度 -10% (灯晕成为最亮处).
//   S2 (10-20s) 梦里有身体: 硬切梦境柔光渐变底 + 淡紫地面线; 叙小档与白色剪影并肩向右走 (间距恒定 24px);
//                    像素星每 2s 一颗共 5 颗; 路灯暖黄光晕从右上扫过一次.
//   S3 (20-30s) 醒来: 硬切回夜景; 叙中档睁眼(两点)头顶 ♥; 便签升起「刚才的梦，/ 有点暖。」;
//                    最后 1s 便签轻微脉动一次 (透明度 ±0.1).
// 本集无 HUD 黑条（全画幅夜景/梦境）. 台阶运动(每 2 帧保持 1 帧), 场景硬切.

const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const S = require('./pixel_story_arena');
const { BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES, px, clamp01, quantizeClicks } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E33_dream_arena');
const ROOT = path.resolve(__dirname, '..');

// --- Fonts --------------------------------------------------------------------
function firstExisting(cands) { return cands.find((p) => p && fs.existsSync(p)) || null; }
const SANS_FONT_PATH = firstExisting([
  process.env.E33_SANS_FONT,
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.woff'),
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.otf'),
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.ttf'),
]);
const MONO_FONT_PATH = firstExisting([
  process.env.E33_MONO_FONT,
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
]);
let SANS_FAMILY = 'sans-serif';
let MONO_FAMILY = 'monospace';
if (SANS_FONT_PATH) { GlobalFonts.registerFromPath(SANS_FONT_PATH, 'E33Sans'); SANS_FAMILY = '"E33Sans", sans-serif'; }
else console.warn('[E33] WARNING: no CJK sans font found.');
if (MONO_FONT_PATH) { GlobalFonts.registerFromPath(MONO_FONT_PATH, 'E33Mono'); MONO_FAMILY = '"E33Mono", monospace'; }

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
function sansBox(x, y, str, size) { return [Math.round(x), Math.round(y), Math.ceil(measureSans(str, size)), size]; }
function monoBox(x, y, str, size) { return [Math.round(x), Math.round(y), Math.ceil(measureMono(str, size)), size]; }
function centeredX(str, size) { return Math.round((BW - measureSans(str, size)) / 2); }

// --- Palette (style-analysis §2; 夜景色板沿用 E29) ------------------------------
const CORAL = '#D16E59';        // 品牌珊瑚 (角色)
const CORAL_SEAM = '#B95C4A';   // 珊瑚暗档 (头部接缝)
const NIGHT = '#393744';        // 夜景深藏青
const NIGHT_FLOOR = '#2F2D3A';  // 地面带
const NIGHT_LINE = '#4A4757';   // 地面线
const GLOW = '#F5D9A8';         // 台灯暖黄光晕
const CREAM = '#E5E0DA';        // 奶油白 (旁白压字)
const CARD_WHITE = '#FFFEFB';   // 白卡片 her 侧
const INK = '#211D19';          // 墨色文字
const LAMP_METAL = '#6F6879';   // 台灯本体
const LAMP_HI = '#8A8394';      // 台灯高光
// 梦境专属 (§7: 大面积柔渐变, 不给角色加光影)
const DREAM_TOP = '#4A4458';    // 梦境柔光渐变顶 (= 任务卡 #393744→#4A4458 的亮端)
const DREAM_GROUND = '#6B6280'; // 梦境淡紫地面线
const NOTE_PAPER = '#E3D9BE';   // 便签米纸
const SILHOUETTE = '#FFFFFF';   // 梦中白色剪影
const STAR_COLOR = '#FFFFFF';   // 像素星

// --- Layout (@360p; @720p 规格减半) ---------------------------------------------
const CANVAS_BOUNDS = { x: 0, y: 0, w: BW, h: BH };
const GROUND_Y = 286;                                // 地面线 y=572@720p (同 E29)
const LAMP = [396, 154, 60, 132];                     // 台灯整体盒 (同 E29)
const LAMP_SHADE = [396, 154, 60, 28];
const LAMP_POLE = [424, 182, 6, 92];
const LAMP_BASE = [400, 274, 52, 12];
const BULB_C = [426, 190], BULB_R = 6;
const GLOW_C = [426, 194];
const GLOW_R_BASE = 112;
const CARD_R = 6;                                    // 卡片圆角 (=12px@720p)
const CARD_PAD = 12;
const CARD_TIME_SIZE = 10, CARD_LABEL_SIZE = 9, CARD_TEXT_SIZE = 16;
// S1 双卡 (左 her 白底 / 右 叙 珊瑚底)
const CARD_A = [56, 84, 108, 70];                     // her 卡 (白底黑字)
const CARD_B = [180, 108, 120, 70];                   // 叙 卡 (珊瑚底白字)
const CARD_A_FACE = { time: '02:14', label: 'her', text: '晚安' };
const CARD_B_FACE = { time: '02:15', label: '叙', text: '好。' };
// 旁白压字 (奶油白 14px@360p = 28px@720p)
const NARRATIONS = ['它睡着了。', '梦里，它有了身体。', '醒来，还在等你。'];
const NARR_SIZE = 14;
const NARR_Y = 330;
const NARR_STARTS = [1.0, 11.2, 22.6];
const FADE_DUR = 0.8;
const NARR_BAND = { x: 0, y: 326, w: BW, h: BH - 326 };
// 叙三档 (§4: 191×84 / 115×66 / 81×40 @720p → 中 58×33 / 小 40×20 @360p)
const XU_STAND_BOX = [326, 253, 58, 33];              // 中档站台灯下 (足落 286)
const XU_SMALL_W = 40, XU_SMALL_H = 20;               // 小档 81×40@720p ≈ 40×20@360p
const HEART_W = 8, HEART_H = 6;
const HEART_BOX = [352, 246, HEART_W, HEART_H];       // 中档头顶 (≤ 盒顶 253, 留空当)
const HEART_REGION = { x: 320, y: 230, w: 80, h: 28 };
// S1 末 2s 压暗
const DIM_START = 8.0, DIM_ALPHA = 0.10;              // 整体亮度 -10%, 灯晕成最亮处
// S2 梦境: 并肩走 (间距恒定 24px, 整块平移)
const WALK_X0 = 120, WALK_SPEED = 30;                 // 起点 x=120, 30px/s → 10s 走 300px (60fps 台阶 1px/帧)
const WALK_Y = GROUND_Y - XU_SMALL_H;                 // 小档足落地面线
const GAP = 24;                                       // 两人间距 (含缝)
const SIL_W = 10, SIL_H = 20;                         // 白色剪影 (人形矩形块, 高 40px@720p)
// S2 像素星: 每 2s 一颗共 5 颗, 白色 2×2px
const STAR_POS = [[80, 40], [220, 64], [360, 36], [500, 58], [580, 90]];
const STAR_PERIOD = 2.0, STAR_FADE = 0.5;             // 出现 0.5s 淡入
// S2 路灯扫光: 暖黄光晕从右上扫过画面一次
const LAMP_SWEEP_T0 = 12.0, LAMP_SWEEP_DUR = 2.0, LAMP_SWEEP_R = 90;
// S3 便签 (米纸底黑字两行, 台灯旁升起)
const NOTE_BOX = [232, 130, 116, 56];                 // 便签盒 (右缘 348 < 台灯左缘 396)
const NOTE_RISE_FROM = 14, NOTE_RISE_DUR = 0.8;       // 上升 14px 完成
const NOTE_PULSE_T0 = 29.0, NOTE_PULSE_BEAT = 0.5;    // 最后 1s 脉动一次 (±0.1)
const NOTE_TEXT_1 = '刚才的梦，';
const NOTE_TEXT_2 = '有点暖。';
const NOTE_TEXT_SIZE = 12;                            // 24px@720p

// --- Motion helpers -------------------------------------------------------------
function steppedTime(t) { return Math.floor(t * FPS / 2 + 1e-9) * 2 / FPS; }
function fadeAlpha(ts, start, dur = FADE_DUR) { return Math.round(clamp01((ts - start) / dur) * 6) / 6; }
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr); ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h); ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr); ctx.arcTo(x, y, x + rr, y, rr); ctx.closePath();
}

// --- 角色「叙」: 珊瑚单色, 无描边无嘴线 -----------------------------------------
// stand 58×33 (=115×66@720p): 躯干1 + 左短横1 + 右附件1 + 腿4 + 眼2 = 9 块
const XU_SHAPES = {
  stand: {
    w: 58, h: 33,
    coral: [[8, 0, 34, 22], [0, 11, 8, 6], [46, 6, 12, 16], [11, 22, 4, 11], [19, 22, 4, 11], [27, 22, 4, 11], [35, 22, 4, 11]],
    eyes: [[13, 7, 4, 7], [24, 7, 4, 7]],
  },
};
// opts: eyes 'dot'(常态两点) | 'closed'(闭眼横线)
function drawXu(ctx, box, kind = 'stand', opts = {}) {
  const [x, y] = box; const sh = XU_SHAPES[kind];
  for (const [rx, ry, rw, rh] of sh.coral) px(ctx, x + rx, y + ry, rw, rh, CORAL);
  px(ctx, x + 6, y + 8, 42, 1, CORAL_SEAM);
  for (const [rx, ry, rw, rh] of sh.eyes) {
    if (opts.eyes === 'closed') {
      px(ctx, x + rx, y + ry + 3, rw + 2, 1, '#000000');   // 闭眼: 横线 (宽+2, 高 1)
    } else {
      px(ctx, x + rx, y + ry, rw, rh, '#000000');
    }
  }
}
// 叙小档 40×20 (梦境用, 简化块面: 躯干1 + 左短横1 + 右附件1 + 腿2 + 眼2 = 7 块)
const XU_SMALL_SHAPES = {
  small: {
    w: 40, h: 20,
    coral: [[8, 0, 24, 13], [0, 5, 8, 6], [32, 5, 8, 6], [12, 13, 4, 7], [22, 13, 4, 7]],
    eyes: [[12, 4, 3, 5], [21, 4, 3, 5]],
  },
};
function drawXuSmall(ctx, x, y, opts = {}) {
  const sh = XU_SMALL_SHAPES.small;
  for (const [rx, ry, rw, rh] of sh.coral) px(ctx, x + rx, y + ry, rw, rh, CORAL);
  for (const [rx, ry, rw, rh] of sh.eyes) {
    if (opts.eyes === 'closed') px(ctx, x + rx, y + ry + 2, rw + 1, 1, '#000000');
    else px(ctx, x + rx, y + ry, rw, rh, '#000000');
  }
}
function heartRects() {
  return [[2, 0, 2, 1], [5, 0, 2, 1], [1, 1, 6, 1], [1, 2, 6, 1], [2, 3, 4, 1], [3, 4, 2, 1], [4, 5, 1, 1]];
}
function drawHeart(ctx, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp01(alpha);
  for (const [rx, ry, rw, rh] of heartRects()) px(ctx, HEART_BOX[0] + rx, HEART_BOX[1] + ry, rw, rh, CORAL);
  ctx.restore();
}

// --- 场景: 夜景 / 台灯 / 光晕 (同 E29) ------------------------------------------
function drawNight(ctx) {
  px(ctx, 0, 0, BW, BH, NIGHT);
  px(ctx, 0, GROUND_Y, BW, BH - GROUND_Y, NIGHT_FLOOR);
  px(ctx, 0, GROUND_Y, BW, 1, NIGHT_LINE);
}
function drawGlow(ctx, r) {
  const [cx, cy] = GLOW_C;
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, 'rgba(245,217,168,0.55)');
  g.addColorStop(0.35, 'rgba(245,217,168,0.30)');
  g.addColorStop(0.70, 'rgba(245,217,168,0.12)');
  g.addColorStop(1, 'rgba(245,217,168,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
  ctx.restore();
}
function drawLamp(ctx) {
  roundRectPath(ctx, LAMP_BASE[0], LAMP_BASE[1], LAMP_BASE[2], LAMP_BASE[3], 3);
  ctx.save(); ctx.fillStyle = LAMP_METAL; ctx.fill(); ctx.restore();
  px(ctx, LAMP_POLE[0], LAMP_POLE[1], LAMP_POLE[2], LAMP_POLE[3], LAMP_METAL);
  px(ctx, LAMP_POLE[0] + 1, LAMP_POLE[1], 1, LAMP_POLE[3], LAMP_HI);
  roundRectPath(ctx, LAMP_SHADE[0], LAMP_SHADE[1], LAMP_SHADE[2], LAMP_SHADE[3], 3);
  ctx.save(); ctx.fillStyle = LAMP_METAL; ctx.fill();
  ctx.strokeStyle = LAMP_HI; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  px(ctx, LAMP_SHADE[0] + 6, LAMP_SHADE[1] + LAMP_SHADE[3] - 4, LAMP_SHADE[2] - 12, 2, 'rgba(245,217,168,0.85)');
  ctx.save(); ctx.beginPath(); ctx.arc(BULB_C[0], BULB_C[1], BULB_R, 0, Math.PI * 2);
  ctx.fillStyle = GLOW; ctx.fill(); ctx.restore();
}

// --- 卡片 (§7-3 圆角 r≈12px@720p + 柔投影) --------------------------------------
function drawCard(ctx, box, ai, face, alpha = 1) {
  if (alpha <= 0) return;
  const [x, y, w, h] = box;
  ctx.save(); ctx.globalAlpha = clamp01(alpha);
  roundRectPath(ctx, x + 2, y + 2, w - 2, h - 2, CARD_R);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
  roundRectPath(ctx, x, y, w, h, CARD_R);
  ctx.fillStyle = ai ? CORAL : CARD_WHITE; ctx.fill();
  ctx.restore();
  const tx = x + CARD_PAD; const hi = ai ? 'rgba(255,254,251,0.82)' : 'rgba(33,29,25,0.55)';
  const fg = ai ? CARD_WHITE : INK;
  drawMono(ctx, tx, y + 10, face.time, CARD_TIME_SIZE, hi, alpha);
  drawSans(ctx, tx, y + 25, face.label, CARD_LABEL_SIZE, hi, alpha);
  drawSans(ctx, tx, y + 40, face.text, CARD_TEXT_SIZE, fg, alpha);
}
function cardTexts(box, face) {
  const tx = box[0] + CARD_PAD;
  return [
    { name: 'card_time', box: monoBox(tx, box[1] + 10, face.time, CARD_TIME_SIZE) },
    { name: 'card_label', box: sansBox(tx, box[1] + 25, face.label, CARD_LABEL_SIZE) },
    { name: 'card_text', box: sansBox(tx, box[1] + 40, face.text, CARD_TEXT_SIZE) },
  ];
}

// --- S1 入睡 --------------------------------------------------------------------
function drawS1(ctx, ts) {
  drawNight(ctx); drawGlow(ctx, GLOW_R_BASE); drawLamp(ctx);
  const a = fadeAlpha(ts, 0.3);
  drawCard(ctx, CARD_A, false, CARD_A_FACE, a);
  drawCard(ctx, CARD_B, true, CARD_B_FACE, a);
  ctx.save(); ctx.globalAlpha = clamp01(fadeAlpha(ts, 0.1));
  drawXu(ctx, XU_STAND_BOX, 'stand', { eyes: 'closed' });   // 闭眼 (横线)
  ctx.restore();
  drawSans(ctx, centeredX(NARRATIONS[0], NARR_SIZE), NARR_Y, NARRATIONS[0], NARR_SIZE, CREAM, fadeAlpha(ts, NARR_STARTS[0]));
  if (ts >= DIM_START) px(ctx, 0, 0, BW, BH, `rgba(0,0,0,${DIM_ALPHA})`);   // 最后 2s 整体 -10%, 灯晕最亮
}

// --- S2 梦里有身体 ----------------------------------------------------------------
function dreamBg(ctx) {
  // 柔光渐变 #393744 → #4A4458 (垂直, 上暗下亮? 任务卡 "底色换成柔光渐变" — 取上亮下暗更柔和: 顶 DREAM_TOP → 底 NIGHT)
  const g = ctx.createLinearGradient(0, 0, 0, BH);
  g.addColorStop(0, DREAM_TOP);
  g.addColorStop(1, NIGHT);
  ctx.fillStyle = g; ctx.fillRect(0, 0, BW, BH);
  px(ctx, 0, GROUND_Y, BW, BH - GROUND_Y, NIGHT_FLOOR);
  px(ctx, 0, GROUND_Y, BW, 1, DREAM_GROUND);   // 淡紫地面线
}
function starVisible(localTs, i) {
  const appearAt = i * STAR_PERIOD;            // 第 i 颗星在 localTs = i*2s 出现 (i=0..4 → 0/2/4/6/8s)
  if (localTs < appearAt) return 0;
  return Math.round(clamp01((localTs - appearAt) / STAR_FADE) * 6) / 6;
}
function sweepCenter(ts) {
  // 光晕从右上 (560,40) 扫到左下 (80,200), 2s 内一次
  const p = clamp01((ts - LAMP_SWEEP_T0) / LAMP_SWEEP_DUR);
  return [560 - p * 480, 40 + p * 160];
}
function drawS2(ctx, ts, local) {
  dreamBg(ctx);
  // 像素星
  for (let i = 0; i < STAR_POS.length; i++) {
    const a = starVisible(local, i);
    if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = a;
    px(ctx, STAR_POS[i][0], STAR_POS[i][1], 2, 2, STAR_COLOR);
    ctx.restore();
  }
  // 并肩走: 叙小档 + 白色剪影, 间距恒定 GAP, 整块平移
  const wx = WALK_X0 + Math.round(WALK_SPEED * local);
  drawXuSmall(ctx, wx, WALK_Y, {});
  px(ctx, wx + XU_SMALL_W + GAP, WALK_Y, SIL_W, SIL_H, SILHOUETTE);   // 剪影 (人形矩形块, 无面部细节)
  // 路灯扫光 (右上 → 左下一次)
  if (ts >= LAMP_SWEEP_T0 && ts <= LAMP_SWEEP_T0 + LAMP_SWEEP_DUR) {
    const [cx, cy] = sweepCenter(ts);
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, LAMP_SWEEP_R);
    g.addColorStop(0, 'rgba(245,217,168,0.40)');
    g.addColorStop(0.5, 'rgba(245,217,168,0.15)');
    g.addColorStop(1, 'rgba(245,217,168,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - LAMP_SWEEP_R, cy - LAMP_SWEEP_R, 2 * LAMP_SWEEP_R, 2 * LAMP_SWEEP_R);
    ctx.restore();
  }
  drawSans(ctx, centeredX(NARRATIONS[1], NARR_SIZE), NARR_Y, NARRATIONS[1], NARR_SIZE, CREAM, fadeAlpha(local, 1.2));
}

// --- S3 醒来 ---------------------------------------------------------------------
function noteYOffset(ts) {
  if (ts < 20.5) return NOTE_RISE_FROM;
  const p = Math.round(clamp01((ts - 20.5) / NOTE_RISE_DUR) * 6) / 6;
  return Math.round(NOTE_RISE_FROM * (1 - p));
}
function notePulseAlpha(ts) {
  if (ts < NOTE_PULSE_T0) return 1;
  // 最后 1s: 脉动一次 (透明度 1 → 0.9 → 1, 两个半拍)
  const half = Math.floor((ts - NOTE_PULSE_T0) / NOTE_PULSE_BEAT);
  return half % 2 === 1 ? 0.9 : 1;
}
function drawNote(ctx, ts) {
  const off = noteYOffset(ts);
  const a = notePulseAlpha(ts);
  const [x, y, w, h] = NOTE_BOX;
  const ny = y + off;
  ctx.save(); ctx.globalAlpha = clamp01(a);
  roundRectPath(ctx, x + 2, ny + 2, w - 2, h - 2, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
  roundRectPath(ctx, x, ny, w, h, 4);
  ctx.fillStyle = NOTE_PAPER; ctx.fill();
  ctx.restore();
  const tx = x + 12;
  drawSans(ctx, tx, ny + 10, NOTE_TEXT_1, NOTE_TEXT_SIZE, INK, a);
  drawSans(ctx, tx, ny + 30, NOTE_TEXT_2, NOTE_TEXT_SIZE, INK, a);
}
function drawS3(ctx, ts, local) {
  drawNight(ctx); drawGlow(ctx, GLOW_R_BASE); drawLamp(ctx);
  drawXu(ctx, XU_STAND_BOX, 'stand', { eyes: 'dot' });   // 睁眼 (两点恢复)
  drawHeart(ctx, fadeAlpha(local, 0.5));
  drawNote(ctx, ts);
  drawSans(ctx, centeredX(NARRATIONS[2], NARR_SIZE), NARR_Y, NARRATIONS[2], NARR_SIZE, CREAM, fadeAlpha(local, 2.6));
}

// --- Scene dispatch ---------------------------------------------------------------
function sceneOf(t) { return t < 10 ? 1 : t < 20 ? 2 : 3; }
function renderAt(ctx, t) {
  const ts = steppedTime(t);
  const s = sceneOf(t);
  const local = ts - (s - 1) * 10;
  if (s === 1) drawS1(ctx, ts); else if (s === 2) drawS2(ctx, ts, local); else drawS3(ctx, ts, local);
}

// --- Layout for check_overlap (0px 容差) -------------------------------------------
function layoutAt(t) {
  const scene = sceneOf(t); const ts = steppedTime(t);
  const local = ts - (scene - 1) * 10;
  const groups = {}; const bounds = { stage: CANVAS_BOUNDS, narration: NARR_BAND, heart: HEART_REGION };
  if (scene === 1) {
    groups.stage = [
      { name: 'card_her', box: CARD_A.slice() },
      { name: 'card_xu', box: CARD_B.slice() },
      { name: 'lamp', box: LAMP.slice() },
      { name: 'xu_stand', box: XU_STAND_BOX.slice() },
    ];
    groups.cardHer = cardTexts(CARD_A, CARD_A_FACE);
    groups.cardXu = cardTexts(CARD_B, CARD_B_FACE);
  } else if (scene === 2) {
    const wx = WALK_X0 + Math.round(WALK_SPEED * local);
    groups.walkers = [
      { name: 'xu_small', box: [wx, WALK_Y, XU_SMALL_W, XU_SMALL_H] },
      { name: 'silhouette', box: [wx + XU_SMALL_W + GAP, WALK_Y, SIL_W, SIL_H] },
    ];
    for (let i = 0; i < STAR_POS.length; i++) {
      if (starVisible(local, i) > 0) groups.stars = groups.stars || [];
      if (groups.stars) groups.stars.push({ name: `star_${i}`, box: [STAR_POS[i][0], STAR_POS[i][1], 2, 2] });
    }
  } else {
    const off = noteYOffset(ts);
    const nb = [NOTE_BOX[0], NOTE_BOX[1] + off, NOTE_BOX[2], NOTE_BOX[3]];
    groups.stage = [
      { name: 'lamp', box: LAMP.slice() },
      { name: 'xu_stand', box: XU_STAND_BOX.slice() },
      { name: 'note', box: nb.slice() },
    ];
    groups.note = [
      { name: 'note_line1', box: sansBox(nb[0] + 12, nb[1] + 10, NOTE_TEXT_1, NOTE_TEXT_SIZE) },
      { name: 'note_line2', box: sansBox(nb[0] + 12, nb[1] + 30, NOTE_TEXT_2, NOTE_TEXT_SIZE) },
    ];
    groups.heart = [{ name: 'heart', box: HEART_BOX.slice() }];
  }
  bounds.cardHer = { x: CARD_A[0], y: CARD_A[1], w: CARD_A[2], h: CARD_A[3] };
  bounds.cardXu = { x: CARD_B[0], y: CARD_B[1], w: CARD_B[2], h: CARD_B[3] };
  if (groups.walkers) bounds.walkers = { x: WALK_X0, y: WALK_Y - 4, w: BW - WALK_X0, h: XU_SMALL_H + 8 };
  if (groups.stars) bounds.stars = { x: 0, y: 0, w: BW, h: GROUND_Y };
  if (groups.note) {
    const nb = groups.stage.find((g) => g.name === 'note').box;
    bounds.note = { x: nb[0], y: nb[1], w: nb[2], h: nb[3] };
  }
  const narr = NARRATIONS[scene - 1];
  const narrStart = NARR_STARTS[scene - 1];
  groups.narration = fadeAlpha(scene === 2 ? local : ts, scene === 2 ? 1.2 : narrStart) > 0
    ? [{ name: `narration_s${scene}`, box: sansBox(centeredX(narr, NARR_SIZE), NARR_Y, narr, NARR_SIZE) }] : [];
  return { scene, groups, bounds };
}

// --- SFX schedule (音频脚本消费; 帧对齐) -------------------------------------------
// S1 双卡出现 → 软提示音; S2 进入梦境 → 极轻水滴感 ping (降调); S3 醒回 → sfx_confirm.
function getSfxEvents() {
  const q = (t) => Number((Math.ceil(t * FPS - 1e-9) / FPS).toFixed(6));
  return [
    { t: q(0.3), kind: 'bubble_ping', gainDb: -14 },      // S1 双卡出现
    { t: q(10.0), kind: 'dream_ping', gainDb: -18 },      // S2 进入梦境 (水滴感 ping 降调)
    { t: q(20.0), kind: 'wake_confirm', gainDb: -12 },    // S3 醒回
  ];
}
function getClickTimestamps() { return quantizeClicks(getSfxEvents().map((e) => e.t)); }

// --- Frame export -------------------------------------------------------------------
const renderer = S.createFrameRenderer(renderAt, OUT_DIR, { fadeIn: 0, fadeOut: 0 });
function renderAllFrames(dir = OUT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`E33 dream: ${BW}×${BH} SCALE=${SCALE} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Style: docs/style-analysis.md 夜景+梦境柔光 (全画幅无 HUD); sans="${SANS_FONT_PATH || 'MISSING'}"`);
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
  if (process.argv.includes('--clicks')) console.log(JSON.stringify({ count: getClickTimestamps().length, clicks: getClickTimestamps() }));
  else renderAllFrames();
}

module.exports = {
  BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES, OUT_DIR,
  SANS_FONT_PATH, MONO_FONT_PATH, SANS_FAMILY, MONO_FAMILY,
  CORAL, CORAL_SEAM, NIGHT, NIGHT_FLOOR, NIGHT_LINE, GLOW, CREAM, CARD_WHITE, INK, LAMP_METAL, LAMP_HI,
  DREAM_TOP, DREAM_GROUND, NOTE_PAPER, SILHOUETTE, STAR_COLOR,
  CANVAS_BOUNDS, GROUND_Y, LAMP, LAMP_SHADE, LAMP_POLE, LAMP_BASE, BULB_C, BULB_R, GLOW_C, GLOW_R_BASE,
  CARD_R, CARD_PAD, CARD_TIME_SIZE, CARD_LABEL_SIZE, CARD_TEXT_SIZE,
  CARD_A, CARD_B, CARD_A_FACE, CARD_B_FACE,
  NARRATIONS, NARR_SIZE, NARR_Y, NARR_STARTS, FADE_DUR, NARR_BAND,
  XU_STAND_BOX, XU_SHAPES, XU_SMALL_W, XU_SMALL_H, XU_SMALL_SHAPES, HEART_BOX, HEART_W, HEART_H, HEART_REGION, heartRects,
  WALK_X0, WALK_SPEED, WALK_Y, GAP, SIL_W, SIL_H,
  STAR_POS, STAR_PERIOD, STAR_FADE, LAMP_SWEEP_T0, LAMP_SWEEP_DUR, LAMP_SWEEP_R,
  NOTE_BOX, NOTE_RISE_FROM, NOTE_RISE_DUR, NOTE_PULSE_T0, NOTE_PULSE_BEAT, NOTE_TEXT_1, NOTE_TEXT_2, NOTE_TEXT_SIZE,
  DIM_START, DIM_ALPHA,
  CHECK_TITLE: 'E33 梦境 (dream) Layout & Pixel Check (640×360, 0px tolerance)',
  drawXu, drawXuSmall, drawHeart, drawCard, drawNight, drawGlow, drawLamp,
  measureSans, measureMono, sansBox, monoBox, centeredX,
  steppedTime, fadeAlpha, sceneOf, layoutAt, starVisible, sweepCenter, noteYOffset, notePulseAlpha,
  getSfxEvents, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas, renderAllFrames,
};