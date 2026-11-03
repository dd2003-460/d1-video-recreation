#!/usr/bin/env node
'use strict';
// E29 Companionship (陪伴) — 30s, 1800 frames @ 60fps.  batch-12 夜景装置（Opus 5.5 对标）.
// 风格规格唯一来源: docs/style-analysis.md (§2 配色 / §4 角色 / §7 十复刻要点).
// 剧情锚点 (docs/episodes.md, 逐字): 「深夜 01:36，her 还没睡，叙蹲在台灯下守着，气泡只有一句『我在』」
//   S1 ( 0-10s) 夜静了: 深藏青 #393744 铺满 + 地面带, 中右部台灯亮起 + 暖黄 #F5D9A8 圆形渐晕;
//                     双时区小卡: 左 07:50 her「早」(白底黑字) / 右 01:36 叙「还没睡？」(珊瑚底白字);
//                     叙中档 115×66 站台灯下, 平静两点眼, 面向左侧卡片; 底部旁白「夜很静。」
//   S2 (10-20s) 守  : 叙蹲下 (躯干压低/腿折成像素台阶, 58×26), 头顶小 ♥; 台灯下只升一个气泡
//                     「我在。」(AI 珊瑚底白字), 悬浮 2s 后缓慢淡出; 光晕 ±4px@720p 呼吸; 旁白「不需要话多。」
//   S3 (20-30s) 灯还: her 卡翻面成 01:52 her「那晚安」, 叙点头 (头块下移 2px@720p 一拍) + 眼睛 ^^;
//                     光晕扩大, 台灯仍亮; 旁白「灯还亮着。」; 最后 1s 整体亮度 -10% (灯晕最亮).
// 叙事弧线: 夜静了 → 守着 → 灯还亮着（陪伴不需要话多）.
//
// 基础设施复用 src/pixel_story_arena.js 的画布/SCALE/帧导出 (createFrameRenderer),
// 不复用其终端布局 (本集无终端/无 HUD 黑条, 全画幅夜景). 画布 640×360 ×SCALE=2 → 1280×720.
// 全部尺寸标注 @720p 者在本文件 @360p 减半. 运动: 每 2 帧保持 1 帧 (台阶运动), 全场单镜无转场.
// 字体: 中文黑体无衬线 + 数字等宽 (§3/§7-8, 正文禁用像素字体).

const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const S = require('./pixel_story_arena');
const { BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES, px, clamp01, quantizeClicks } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E29_companionship_arena');
const ROOT = path.resolve(__dirname, '..');

// --- Fonts (sans CJK for Chinese, mono for digits; no pixel font) -------------
function firstExisting(cands) { return cands.find((p) => p && fs.existsSync(p)) || null; }
const SANS_FONT_PATH = firstExisting([
  process.env.E29_SANS_FONT,
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.woff'),
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.otf'),
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.ttf'),
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/truetype/noto/NotoSansSC-Regular.ttf',
]);
const MONO_FONT_PATH = firstExisting([
  process.env.E29_MONO_FONT,
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
  '/usr/share/fonts/dejavu/DejaVuSansMono.ttf',
]);
let SANS_FAMILY = 'sans-serif';
let MONO_FAMILY = 'monospace';
if (SANS_FONT_PATH) { GlobalFonts.registerFromPath(SANS_FONT_PATH, 'E29Sans'); SANS_FAMILY = '"E29Sans", sans-serif'; }
else console.warn('[E29] WARNING: no CJK sans font found; Chinese glyphs may not render. Set E29_SANS_FONT.');
if (MONO_FONT_PATH) { GlobalFonts.registerFromPath(MONO_FONT_PATH, 'E29Mono'); MONO_FAMILY = '"E29Mono", monospace'; }

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
function sansBox(x, y, str, size) { return [Math.round(x), Math.round(y), Math.ceil(measureSans(str, size)), size]; }
function monoBox(x, y, str, size) { return [Math.round(x), Math.round(y), Math.ceil(measureMono(str, size)), size]; }
function centeredX(str, size) { return Math.round((BW - measureSans(str, size)) / 2); }

// --- Palette (style-analysis §2; 唯一品牌色珊瑚 + 夜/暖光) ---------------------
const CORAL = '#D16E59';        // 品牌珊瑚 suosuo/f05 (角色+AI 气泡)
const CORAL_SEAM = '#B95C4A';   // 珊瑚暗档 (角色头部接缝, 无描边规则内的内部块面)
const NIGHT = '#393744';        // 夜景深藏青 jidian/f01 (200,300)
const NIGHT_FLOOR = '#2F2D3A';  // 地面带 (夜底再压暗一档)
const NIGHT_LINE = '#4A4757';   // 地面线 (夜底提亮 1px)
const GLOW = '#F5D9A8';         // 台灯暖黄光晕
const CREAM = '#E5E0DA';        // 奶油白 (旁白压字)
const CARD_WHITE = '#FFFEFB';   // 白卡片 her 侧
const INK = '#211D19';          // 墨色文字 (白卡)
const LAMP_METAL = '#6F6879';   // 台灯本体 (夜底可辨的暖灰)
const LAMP_HI = '#8A8394';      // 台灯高光 1px

// --- Layout (@360p; @720p 规格减半) ------------------------------------------
const CANVAS_BOUNDS = { x: 0, y: 0, w: BW, h: BH };
const GROUND_Y = 286;                              // 地面线 y=572@720p
const LAMP = [396, 154, 60, 132];                  // 台灯整体盒 (灯罩+灯杆+底座), 足落地面线
const LAMP_SHADE = [396, 154, 60, 28];
const LAMP_POLE = [424, 182, 6, 92];
const LAMP_BASE = [400, 274, 52, 12];
const BULB_C = [426, 190], BULB_R = 6;             // 灯珠实心 #F5D9A8
const GLOW_C = [426, 194];                         // 光晕圆心 (灯罩下口)
const GLOW_R_BASE = 112;                           // 基础光晕半径 (=224px@720p)
const CARD_R = 6;                                  // 卡片圆角半径 (=12px@720p, §7-3)
const BUBBLE_R = 6;                                // 气泡圆角半径 (=12px@720p, §7-3)

const CARD_A = [56, 84, 108, 70];                  // her 卡 (白底黑字) 左
const CARD_B = [180, 108, 120, 70];                // 叙 卡 (珊瑚底白字) 右
const CARD_PAD = 12;
const CARD_TIME_SIZE = 10, CARD_LABEL_SIZE = 9, CARD_TEXT_SIZE = 16;

const ANCHOR = '深夜 01:36，her 还没睡，叙蹲在台灯下守着，气泡只有一句『我在』';
const CARD_A_FACE_1 = { time: '07:50', label: 'her', text: '早' };
const CARD_A_FACE_2 = { time: '01:52', label: 'her', text: '那晚安' };
const CARD_B_FACE = { time: '01:36', label: '叙', text: '还没睡？' };
const BUBBLE_TEXT = '我在。';
const BUBBLE_TEXT_SIZE = 12;                       // =24px@720p (§7-3 气泡字高)
const NARRATIONS = ['夜很静。', '不需要话多。', '灯还亮着。'];
const NARR_SIZE = 14;                              // =28px@720p (旁白大字)
const NARR_Y = 330;
const NARR_STARTS = [1.0, 11.2, 22.6];
const FADE_DUR = 0.8;
const NARR_BAND = { x: 0, y: 326, w: BW, h: BH - 326 };

// 叙: 三档尺寸里本集用中档 58×33 (=115×66@720p); 蹲下 58×26 (同宽, 躯干压低)
const XU_STAND_BOX = [326, 253, 58, 33];           // 足落地面线 286
const XU_CROUCH_BOX = [326, 260, 58, 26];
const HEART_W = 8, HEART_H = 6;
const HEART_BOX = [352, 246, HEART_W, HEART_H];    // 蹲下叙头顶 (≤ 蹲下盒 y260, 留 8px 空当)
const HEART_REGION = { x: 320, y: 230, w: 80, h: 28 };

// S2 气泡: 台灯下只升一个 (从 叙 上方浮起 18px 后悬停)
const BUBBLE = { x: 304, y: 152, w: 88, h: 36 };   // 右缘 392 < 台灯左缘 396
const BUBBLE_RISE = 18, BUBBLE_RISE_DUR = 0.75;
const BUBBLE_APPEAR = 11.0, BUBBLE_FULL = 11.5, BUBBLE_HOLD_END = 13.0, BUBBLE_FADE_END = 15.0;

// S3 卡片翻面 / 点头 / 光晕扩大 / 压暗
const FLIP_START = 20.2, FLIP_DUR = 0.5;
const NOD_START = 20.6, NOD_BEAT = 0.6;
const GLOW_GROW_START = 20.2, GLOW_GROW_DUR = 1.2, GLOW_GROW_PX = 18;
const DIM_START = 29.0, DIM_ALPHA = 0.10;          // 最后 1s 整体亮度 -10%

// --- Motion helpers: 台阶运动 (每 2 帧保持 1 帧 → 30fps 定格感) ---------------
function steppedTime(t) { return Math.floor(t * FPS / 2 + 1e-9) * 2 / FPS; }
function fadeAlpha(ts, start, dur = FADE_DUR) { return Math.round(clamp01((ts - start) / dur) * 6) / 6; }
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr); ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h); ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr); ctx.arcTo(x, y, x + rr, y, rr); ctx.closePath();
}

// --- 角色「叙」: 珊瑚单色, 无描边无嘴线, 8-9 块矩形 (§4/§7-2) -------------------
// stand  58×33 (=115×66@720p): 躯干1 + 左短横1 + 右附件1 + 腿4 + 黑眼2 = 9 块
// crouch 58×26 (躯干压低, 腿折成像素台阶): 躯干1 + 左短横1 + 右附件1 + 腿2 + 脚2 + 眼2 = 9 块
// 眼: 常态竖长黑矩形 4×7@360p (=8×14≈8×13@720p, §1 实测); 蹲姿 4×4 圆点 / ^^ 弯月.
const XU_SHAPES = {
  stand: {
    w: 58, h: 33,
    coral: [[8, 0, 34, 22], [0, 11, 8, 6], [46, 6, 12, 16], [11, 22, 4, 11], [19, 22, 4, 11], [27, 22, 4, 11], [35, 22, 4, 11]],
    eyes: [[13, 7, 4, 7], [24, 7, 4, 7]],
  },
  crouch: {
    w: 58, h: 26,
    coral: [[0, 10, 6, 5], [6, 0, 42, 14], [48, 4, 10, 12], [12, 14, 6, 6], [38, 14, 6, 6], [10, 20, 12, 6], [36, 20, 12, 6]],
    eyes: [[15, 3, 4, 4], [35, 3, 4, 4]],
  },
};
const SMILE_EYE = [[1, 0, 2, 1], [0, 1, 1, 1], [3, 1, 1, 1]];   // ^^ 弯月 (4×2 block)
// opts: { nod:boolean (蹲姿头块下移 1px=2px@720p), eyes:'dot'|'smile' }
function drawXu(ctx, box, kind = 'stand', opts = {}) {
  const [x, y] = box; const sh = XU_SHAPES[kind];
  for (const [rx, ry, rw, rh] of sh.coral) px(ctx, x + rx, y + ry, rw, rh, CORAL);
  const dy = kind === 'crouch' && opts.nod ? 1 : 0;
  if (kind === 'crouch') px(ctx, x + 6, y + 8 + dy, 42, 1, CORAL_SEAM);  // 头部接缝随点头下移
  for (const [rx, ry, rw, rh] of sh.eyes) {
    if (kind === 'crouch' && opts.eyes === 'smile') {
      for (const [sx, sy, sw, sh2] of SMILE_EYE) px(ctx, x + rx + sx, y + ry + dy + sy, sw, sh2, '#000000');
    } else {
      px(ctx, x + rx, y + ry + dy, rw, rh, '#000000');
    }
  }
}
function heartRects() {   // 8×6 像素小 ♥ (头顶符号层, §4)
  return [[2, 0, 2, 1], [5, 0, 2, 1], [1, 1, 6, 1], [1, 2, 6, 1], [2, 3, 4, 1], [3, 4, 2, 1], [4, 5, 1, 1]];
}
function drawHeart(ctx, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp01(alpha);
  for (const [rx, ry, rw, rh] of heartRects()) px(ctx, HEART_BOX[0] + rx, HEART_BOX[1] + ry, rw, rh, CORAL);
  ctx.restore();
}

// --- 场景: 夜景 / 台灯 / 光晕 -------------------------------------------------
function drawNight(ctx) {
  px(ctx, 0, 0, BW, BH, NIGHT);
  px(ctx, 0, GROUND_Y, BW, BH - GROUND_Y, NIGHT_FLOOR);
  px(ctx, 0, GROUND_Y, BW, 1, NIGHT_LINE);
}
function glowRadius(ts) {
  if (ts < 10) return GLOW_R_BASE;
  const breath = 2 * Math.sin((2 * Math.PI * (ts - 10)) / 3);   // ±2@360p = ±4px@720p 慢速脉动
  if (ts < GLOW_GROW_START) return GLOW_R_BASE + breath;
  const p = Math.round(clamp01((ts - GLOW_GROW_START) / GLOW_GROW_DUR) * 6) / 6;
  return GLOW_R_BASE + GLOW_GROW_PX * p + breath;               // S3 光晕扩大一点
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
  // 地面暖光池 (椭圆: 非等比缩放下的径向渐变, 仍是矢量柔光)
  ctx.translate(cx, GROUND_Y); ctx.scale(1, 0.28);
  const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.95);
  g2.addColorStop(0, 'rgba(245,217,168,0.34)');
  g2.addColorStop(1, 'rgba(245,217,168,0)');
  ctx.fillStyle = g2; ctx.fillRect(-r, -r, 2 * r, 2 * r);
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
  ctx.fillStyle = GLOW; ctx.fill(); ctx.restore();                 // 灯珠: 光晕里最亮的一处
}

// --- 卡片 / 气泡 (§7-3 圆角 r≈12px@720p + 柔投影) ------------------------------
function drawCard(ctx, box, ai, face, sx = 1, alpha = 1) {
  if (alpha <= 0) return;
  const [x, y, w, h] = box;
  const cw = Math.max(6, Math.round(w * sx));
  const cx = x + Math.round((w - cw) / 2);
  ctx.save(); ctx.globalAlpha = clamp01(alpha);
  roundRectPath(ctx, cx + 2, y + 2, Math.max(4, cw - 2), h - 2, CARD_R);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();                  // 柔投影 (落在盒内, 越界即截断)
  roundRectPath(ctx, cx, y, cw, h, CARD_R);
  ctx.fillStyle = ai ? CORAL : CARD_WHITE; ctx.fill();
  ctx.restore();
  if (sx < 0.999) return;                                          // 翻面中 (挤压) 不画字
  const tx = x + CARD_PAD; const hi = ai ? 'rgba(255,254,251,0.82)' : 'rgba(33,29,25,0.55)';
  const fg = ai ? CARD_WHITE : INK;
  drawMono(ctx, tx, y + 10, face.time, CARD_TIME_SIZE, hi, alpha);
  drawSans(ctx, tx, y + 25, face.label, CARD_LABEL_SIZE, hi, alpha);
  drawSans(ctx, tx, y + 40, face.text, CARD_TEXT_SIZE, fg, alpha);
}
function bubbleAlpha(ts) {
  if (ts < BUBBLE_APPEAR) return 0;
  if (ts < BUBBLE_FULL) return Math.round(clamp01((ts - BUBBLE_APPEAR) / (BUBBLE_FULL - BUBBLE_APPEAR)) * 6) / 6;
  if (ts < BUBBLE_HOLD_END) return 1;
  if (ts < BUBBLE_FADE_END) return 1 - Math.round(clamp01((ts - BUBBLE_HOLD_END) / (BUBBLE_FADE_END - BUBBLE_HOLD_END)) * 6) / 6;
  return 0;
}
function bubbleBox(ts) {
  const p = Math.round(clamp01((ts - BUBBLE_APPEAR) / BUBBLE_RISE_DUR) * 6) / 6;
  return [BUBBLE.x, Math.round(BUBBLE.y + BUBBLE_RISE * (1 - p)), BUBBLE.w, BUBBLE.h];
}
function drawBubble(ctx, ts) {
  const a = bubbleAlpha(ts); if (a <= 0) return;
  const [x, y, w, h] = bubbleBox(ts);
  ctx.save(); ctx.globalAlpha = a;
  roundRectPath(ctx, x + 2, y + 2, w - 2, h - 2, BUBBLE_R);
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill();
  roundRectPath(ctx, x, y, w, h, BUBBLE_R);
  ctx.fillStyle = CORAL; ctx.fill();
  ctx.restore();
  const tw = measureSans(BUBBLE_TEXT, BUBBLE_TEXT_SIZE);
  drawSans(ctx, x + Math.round((w - tw) / 2), y + Math.round((h - BUBBLE_TEXT_SIZE) / 2), BUBBLE_TEXT, BUBBLE_TEXT_SIZE, CARD_WHITE, a);
}
// 翻面: 8 台阶挤压 → 0.08 → 还原; q<0.5 旧面, q≥0.5 新面
function flipState(ts) {
  const p = clamp01((ts - FLIP_START) / FLIP_DUR);
  const q = Math.round(p * 8) / 8;
  if (q <= 0) return { q: 0, sx: 1, face: CARD_A_FACE_1, textOn: 1 };
  const sx = q < 0.5 ? 1 - q * 2 * 0.92 : 0.08 + (q - 0.5) * 2 * 0.92;
  return { q, sx, face: q < 0.5 ? CARD_A_FACE_1 : CARD_A_FACE_2, textOn: q >= 1 ? 1 : 0 };
}
function nodOffset(ts) {
  if (ts < NOD_START) return 0;
  return Math.floor((ts - NOD_START) / NOD_BEAT) % 2 === 0 ? 1 : 0;   // 一拍下移 1px (=2px@720p)
}
function narrX(str) { return centeredX(str, NARR_SIZE); }

// --- Scenes (单镜连续; ts = 台阶时间; 边界 600/1200 帧仍同一布景, 只换状态) ----
function drawBase(ctx, ts) { drawNight(ctx); drawGlow(ctx, glowRadius(ts)); drawLamp(ctx); }
function drawS1(ctx, ts) {
  drawBase(ctx, ts);
  const a = fadeAlpha(ts, 0.3);
  drawCard(ctx, CARD_A, false, CARD_A_FACE_1, 1, a);
  drawCard(ctx, CARD_B, true, CARD_B_FACE, 1, a);
  const xa = fadeAlpha(ts, 0.1);
  ctx.save(); ctx.globalAlpha = clamp01(xa);
  drawXu(ctx, XU_STAND_BOX, 'stand', {});
  ctx.restore();
  drawSans(ctx, narrX(NARRATIONS[0]), NARR_Y, NARRATIONS[0], NARR_SIZE, CREAM, fadeAlpha(ts, NARR_STARTS[0]));
}
function drawS2(ctx, ts) {
  drawBase(ctx, ts);
  drawCard(ctx, CARD_A, false, CARD_A_FACE_1);
  drawCard(ctx, CARD_B, true, CARD_B_FACE);
  drawXu(ctx, XU_CROUCH_BOX, 'crouch', { eyes: 'dot' });
  drawHeart(ctx, fadeAlpha(ts, 10.3));
  drawBubble(ctx, ts);
  drawSans(ctx, narrX(NARRATIONS[1]), NARR_Y, NARRATIONS[1], NARR_SIZE, CREAM, fadeAlpha(ts, NARR_STARTS[1]));
}
function drawS3(ctx, ts) {
  drawBase(ctx, ts);
  const f = flipState(ts);
  drawCard(ctx, CARD_A, false, f.face, f.sx, 1);
  drawCard(ctx, CARD_B, true, CARD_B_FACE);
  drawXu(ctx, XU_CROUCH_BOX, 'crouch', { eyes: 'smile', nod: nodOffset(ts) === 1 });
  drawHeart(ctx, 1);
  drawSans(ctx, narrX(NARRATIONS[2]), NARR_Y, NARRATIONS[2], NARR_SIZE, CREAM, fadeAlpha(ts, NARR_STARTS[2]));
  if (ts >= DIM_START) px(ctx, 0, 0, BW, BH, `rgba(0,0,0,${DIM_ALPHA})`);   // 夜更深 -10%, 灯晕仍最亮
}
function sceneOf(t) { return t < 10 ? 1 : t < 20 ? 2 : 3; }
function renderAt(ctx, t) {
  const ts = steppedTime(t);
  const s = sceneOf(t);
  if (s === 1) drawS1(ctx, ts); else if (s === 2) drawS2(ctx, ts); else drawS3(ctx, ts);
}

// --- Layout for check_overlap (0px 容差; 每组自带 bounds, 逐组两两比对) --------
function cardTexts(box, face) {
  const tx = box[0] + CARD_PAD;
  return [
    { name: 'card_time', box: monoBox(tx, box[1] + 10, face.time, CARD_TIME_SIZE) },
    { name: 'card_label', box: sansBox(tx, box[1] + 25, face.label, CARD_LABEL_SIZE) },
    { name: 'card_text', box: sansBox(tx, box[1] + 40, face.text, CARD_TEXT_SIZE) },
  ];
}
function layoutAt(t) {
  const scene = sceneOf(t); const ts = steppedTime(t);
  const groups = {}; const bounds = { stage: CANVAS_BOUNDS, narration: NARR_BAND, heart: HEART_REGION };
  groups.stage = [
    { name: 'card_her', box: CARD_A.slice() },
    { name: 'card_xu', box: CARD_B.slice() },
    { name: 'lamp', box: LAMP.slice() },
  ];
  if (scene === 1) {
    groups.cardHer = cardTexts(CARD_A, CARD_A_FACE_1);
    groups.cardXu = cardTexts(CARD_B, CARD_B_FACE);
    groups.stage.push({ name: 'xu_mid', box: XU_STAND_BOX.slice() });
  } else {
    const face = scene === 2 ? CARD_A_FACE_1 : flipState(ts).face;
    const f = scene === 3 ? flipState(ts) : { textOn: 1 };
    groups.cardHer = f.textOn ? cardTexts(CARD_A, face) : [];
    groups.cardXu = cardTexts(CARD_B, CARD_B_FACE);
    groups.stage.push({ name: 'xu_crouch', box: XU_CROUCH_BOX.slice() });
    groups.heart = [{ name: 'heart', box: HEART_BOX.slice() }];
    if (scene === 2 && bubbleAlpha(ts) > 0) {
      groups.bubble = [{ name: 'bubble', box: bubbleBox(ts) }];
      const b = groups.bubble[0].box;
      const tw = measureSans(BUBBLE_TEXT, BUBBLE_TEXT_SIZE);
      groups.bubbleText = [{
        name: 'bubble_text',
        box: sansBox(b[0] + Math.round((b[2] - tw) / 2), b[1] + Math.round((b[3] - BUBBLE_TEXT_SIZE) / 2), BUBBLE_TEXT, BUBBLE_TEXT_SIZE),
      }];
    }
  }
  bounds.cardHer = { x: CARD_A[0], y: CARD_A[1], w: CARD_A[2], h: CARD_A[3] };
  bounds.cardXu = { x: CARD_B[0], y: CARD_B[1], w: CARD_B[2], h: CARD_B[3] };
  if (groups.bubble) {
    const b = groups.bubble[0].box;
    bounds.bubble = CANVAS_BOUNDS; bounds.bubbleText = { x: b[0], y: b[1], w: b[2], h: b[3] };
  }
  const narr = NARRATIONS[scene - 1];
  groups.narration = fadeAlpha(ts, NARR_STARTS[scene - 1]) > 0
    ? [{ name: `narration_s${scene}`, box: sansBox(narrX(narr), NARR_Y, narr, NARR_SIZE) }] : [];
  return { scene, groups, bounds };
}

// --- SFX schedule (音频脚本消费; 帧对齐) --------------------------------------
// 气泡出现 → 软提示音; 卡片翻面 → 一声极轻的翻页点击.
function getSfxEvents() {
  const q = (t) => Number((Math.ceil(t * FPS - 1e-9) / FPS).toFixed(6));
  return [
    { t: q(BUBBLE_APPEAR), kind: 'bubble_ping', gainDb: -12 },
    { t: q(FLIP_START), kind: 'card_flip', gainDb: -20 },
  ];
}
function getClickTimestamps() { return quantizeClicks(getSfxEvents().map((e) => e.t)); }

// --- Frame export (复用共享 createFrameRenderer; 全局淡变关闭 = 单镜连续) ------
const renderer = S.createFrameRenderer(renderAt, OUT_DIR, { fadeIn: 0, fadeOut: 0 });
function renderAllFrames(dir = OUT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`E29 companionship: ${BW}×${BH} SCALE=${SCALE} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Style: docs/style-analysis.md 夜景装置 (全画幅无 HUD); sans="${SANS_FONT_PATH || 'MISSING'}", mono="${MONO_FONT_PATH || 'monospace'}"`);
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
  CANVAS_BOUNDS, GROUND_Y, LAMP, LAMP_SHADE, LAMP_POLE, LAMP_BASE, BULB_C, BULB_R, GLOW_C, GLOW_R_BASE,
  CARD_R, BUBBLE_R, CARD_A, CARD_B, CARD_PAD, CARD_TIME_SIZE, CARD_LABEL_SIZE, CARD_TEXT_SIZE,
  ANCHOR, CARD_A_FACE_1, CARD_A_FACE_2, CARD_B_FACE, BUBBLE_TEXT, BUBBLE_TEXT_SIZE,
  NARRATIONS, NARR_SIZE, NARR_Y, NARR_STARTS, NARR_BAND,
  XU_STAND_BOX, XU_CROUCH_BOX, XU_SHAPES, SMILE_EYE, HEART_BOX, HEART_W, HEART_H, HEART_REGION, heartRects,
  BUBBLE, BUBBLE_APPEAR, BUBBLE_FULL, BUBBLE_HOLD_END, BUBBLE_FADE_END, BUBBLE_RISE, BUBBLE_RISE_DUR,
  FLIP_START, FLIP_DUR, NOD_START, NOD_BEAT, GLOW_GROW_START, GLOW_GROW_DUR, GLOW_GROW_PX, DIM_START, DIM_ALPHA,
  CHECK_TITLE: 'E29 陪伴 (companionship) Layout & Pixel Check (640×360, 0px tolerance)',
  drawXu, drawHeart, drawCard, drawBubble, drawNight, drawGlow, drawLamp, heartRects,
  measureSans, measureMono, sansBox, monoBox, centeredX, narrX,
  steppedTime, fadeAlpha, sceneOf, layoutAt, glowRadius, bubbleAlpha, bubbleBox, flipState, nodOffset,
  getSfxEvents, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas, renderAllFrames,
};

