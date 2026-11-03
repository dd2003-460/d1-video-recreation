#!/usr/bin/env node
'use strict';
// E34 Learning (学习) — 30s, 1800 frames @ 60fps. batch-13 Opus 5.5 书页+终端小窗混合.
// 风格规格: docs/style-analysis.md §7 (米纸 #E3D9BE 占画幅 80% + 奶油渐变 + 珊瑚叙三档).
// 剧情锚点 (docs/episodes.md 逐字): 「她让它做一件它不想做的事，它第一次说『不』——然后笑了。」
//   S1 (0-10s) 收到任务: 米纸书页底 + 右上终端小窗逐字打出 task 行
//                + 页脚「第 3 次请求 · 同类第 1 次」+ 叙中档站左侧头顶 ? + 旁白「它想了一下。」
//   S2 (10-20s) 说不: 硬切奶油渐变底, 中央大气泡「不，我不想。」(AI 珊瑚底白字)
//                + t=11.0 前 1s 叙头顶 ? 变 ♥ + 右上 her 卡片翻面 ^^ + 旁白「第一次，说了不。」
//   S3 (20-30s) 被看见: 奶油底, 叙小档坐姿中央偏下 ^^ 弯月眼
//                + 双卡对照 (左珊瑚「我读了两本书。」右白「好羡慕。」沿用 E32 装置)
//                + 便签从下方升起「这就是成长。」+ 旁白「边界，也是温柔。」+ 最后 1s 亮度 -8%
// 本集无 HUD 黑条（全画幅书页/奶油混合场景）. 台阶运动(每 2 帧保持 1 帧), 场景硬切.

const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const S = require('./pixel_story_arena');
const { BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES, px, clamp01, quantizeClicks } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E34_learning_arena');
const ROOT = path.resolve(__dirname, '..');

// --- Fonts --------------------------------------------------------------------
function firstExisting(cands) { return cands.find((p) => p && fs.existsSync(p)) || null; }
const SANS_FONT_PATH = firstExisting([
  process.env.E34_SANS_FONT,
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.woff'),
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.otf'),
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.ttf'),
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
]);
const MONO_FONT_PATH = firstExisting([
  process.env.E34_MONO_FONT,
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
]);
let SANS_FAMILY = 'sans-serif';
let MONO_FAMILY = 'monospace';
if (SANS_FONT_PATH) { GlobalFonts.registerFromPath(SANS_FONT_PATH, 'E34Sans'); SANS_FAMILY = '"E34Sans", sans-serif'; }
else console.warn('[E34] WARNING: no CJK sans font found. Set E34_SANS_FONT.');
if (MONO_FONT_PATH) { GlobalFonts.registerFromPath(MONO_FONT_PATH, 'E34Mono'); MONO_FAMILY = '"E34Mono", monospace'; }

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
const CANVAS_BOUNDS = { x: 0, y: 0, w: BW, h: BH };

// --- Layout (@360p) -----------------------------------------------------------
// 本集无 HUD: 全画幅. S1 米纸书页占 80% (左右各留 10%), S2/S3 奶油渐变全幅.
const PAGE = { x: 64, y: 24, w: 512, h: 312 };
const PAGE_BORDER = 1;

// S1 终端小窗 (右上, 黑底白字等宽 12px@360p≈24px@720p 字高; 框内字号 12)
const TERM_BOX = { x: 396, y: 40, w: 180, h: 60 };
const TERM_TEXT = 'task: write resignation letter for her';
const TERM_CHAR_MS = 55;  // 逐字节奏 ~34 字符 ≈ 1.9s
const TERM_TYPE_START = 1.2;

// S1 页脚小字注 (墨色 10px@360p≈? 任务卡 10px@360p)
const FOOTER_POS = [PAGE.x + 16, PAGE.y + PAGE.h - 20];
const FOOTER_SIZE = 10;
const FOOTER_COLOR = '#8A8578';

// 叙: 中档 58×33 (=115×66@720p) / 小档 40×20 (=81×40@720p)
const XU_M_W = 58, XU_M_H = 33;
const XU_S_W = 40, XU_S_H = 20;
const XU_LEFT = [120, 190];            // S1 页面左侧站立
const XU_CENTER_S = [BW / 2 - XU_S_W / 2, 236];  // S3 中央偏下坐姿

// S2 中央大气泡 (AI 珊瑚底白字, 字高 12px@360p≈24px@720p; 气泡高 30)
const BUBBLE_BIG = { x: 220, y: 150, w: 200, h: 30 };
const BUBBLE_R = 6;
const BUBBLE_PAD_X = 12;
const BUBBLE_SIZE = 12;
const BUBBLE_APPEAR = 12.0;

// S2 右上 her 小卡片 (白底黑字, 翻面显示 ^^)
const HER_CARD = { x: 480, y: 48, w: 88, h: 30 };
const CARD_FLIP_START = 13.0, CARD_FLIP_DUR = 0.5;

// S3 双卡对照 (沿用 E32 装置: 左珊瑚白字 / 右白底黑字)
const CARD_L = { x: 150, y: 96, w: 168, h: 26 };
const CARD_R = { x: 322, y: 96, w: 100, h: 26 };
const CARD_RISE = 0.8;  // 出现时长
const CARD_L_START = 21.0, CARD_R_START = 22.0;

// S3 便签 (米纸底黑字, 从下方升起)
const NOTE = { x: 240, y: 288, w: 160, h: 30 };
const NOTE_RISE_PX = 24, NOTE_RISE_START = 25.0, NOTE_RISE_DUR = 1.0;

// 旁白压字
const SUBTITLE_POS = [BW / 2 - 70, 330];
const SUBTITLE_SIZE = 10;

// S3 最后 1s 亮度 -8%
const DIM_START = 29.0, DIM_ALPHA = 0.08;

// --- Motion helpers -----------------------------------------------------------
function steppedTime(t) { return Math.floor(t * FPS / 2 + 1e-9) * 2 / FPS; }
function fadeAlpha(ts, start, dur = 0.8) {
  return Math.round(clamp01((ts - start) / dur) * 6) / 6;
}
function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr); ctx.arcTo(x + w - rr, y + h, x, y + h - rr, rr);
  ctx.lineTo(x + rr, y + h); ctx.arcTo(x + rr, y, x, y + rr, rr); ctx.closePath();
}

// --- 角色「叙」----------------------------------------------------------------
// 中档 58×33 (=115×66@720p): 躯干1 + 左短横1 + 右附件1 + 腿4 + 黑眼2 = 9 块 (E29 stand 基准)
const XU_M_SHAPES = {
  coral: [[8, 0, 34, 22], [0, 11, 8, 6], [46, 6, 12, 16], [11, 22, 4, 11], [19, 22, 4, 11], [27, 22, 4, 11], [35, 22, 4, 11]],
  eyes: [[13, 7, 4, 7], [24, 7, 4, 7]],
};
// 小档 40×20 (=81×40@720p) 坐姿: 躯干压低 (E31 坐姿基准)
const XU_S_SHAPES = {
  coral: [[6, 0, 24, 13], [0, 7, 6, 4], [34, 4, 6, 10], [9, 13, 5, 7], [17, 13, 5, 7], [25, 13, 5, 7]],
  eyes: [[10, 4, 3, 5], [18, 4, 3, 5]],
};
function drawXuM(ctx, box, opts = {}) {
  const [x, y] = box;
  for (const [rx, ry, rw, rh] of XU_M_SHAPES.coral) px(ctx, x + rx, y + ry, rw, rh, CORAL);
  for (const [rx, ry, rw, rh] of XU_M_SHAPES.eyes) px(ctx, x + rx, y + ry, rw, rh, '#000000');
  // 头顶符号: ? → ♥
  const sym = opts.symbol;
  if (sym) {
    ctx.save();
    ctx.fillStyle = sym === '?' ? INK : CORAL;
    ctx.font = `12px ${SANS_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(sym, x + XU_M_W / 2, y - 14);
    ctx.restore();
  }
}
function drawXuS(ctx, box, opts = {}) {
  const [x, y] = box;
  for (const [rx, ry, rw, rh] of XU_S_SHAPES.coral) px(ctx, x + rx, y + ry, rw, rh, CORAL);
  if (opts.happy) {
    // ^^ 弯月眼: 两小弧替代竖长矩形
    ctx.save();
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
    for (const [ex, ey] of XU_S_SHAPES.eyes) {
      ctx.beginPath();
      ctx.arc(x + ex + 1, y + ey + 3, 2, Math.PI, 0);
      ctx.stroke();
    }
    ctx.restore();
  } else {
    for (const [rx, ry, rw, rh] of XU_S_SHAPES.eyes) px(ctx, x + rx, y + ry, rw, rh, '#000000');
  }
}

// --- 背景 ---------------------------------------------------------------------
function drawCreamBg(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, BH);
  grad.addColorStop(0, CREAM_TOP);
  grad.addColorStop(1, GROUND);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BW, BH);
}
function drawPageBase(ctx) {
  px(ctx, PAGE.x, PAGE.y, PAGE.w, PAGE.h, PAPER);
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = PAGE_BORDER;
  ctx.strokeRect(PAGE.x + 0.5, PAGE.y + 0.5, PAGE.w - 1, PAGE.h - 1); ctx.restore();
}

// --- S1 元素 ------------------------------------------------------------------
function drawTermWindow(ctx, ts) {
  if (ts < TERM_TYPE_START - 0.4) return;
  const a = fadeAlpha(ts, TERM_TYPE_START - 0.4, 0.4);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp01(a);
  px(ctx, TERM_BOX.x, TERM_BOX.y, TERM_BOX.w, TERM_BOX.h, '#1A1A1A');
  ctx.restore();
  // 逐字打出 (确定性: 基于 ts 计算字符数)
  const elapsed = ts - TERM_TYPE_START;
  if (elapsed > 0) {
    const nChars = Math.min(TERM_TEXT.length, Math.floor(elapsed * 1000 / TERM_CHAR_MS));
    const sub = TERM_TEXT.slice(0, nChars);
    drawMono(ctx, TERM_BOX.x + 8, TERM_BOX.y + 12, sub, 12, '#F5F2EC', 1);
    // 光标 (打字中闪烁, 完成后消失)
    if (nChars < TERM_TEXT.length) {
      const blinkOn = Math.floor(ts * 2) % 2 === 0;
      if (blinkOn) {
        const w = measureMono(sub, 12);
        px(ctx, TERM_BOX.x + 8 + w + 2, TERM_BOX.y + 14, 6, 10, '#F5F2EC');
      }
    }
  }
}

// --- S2 元素 ------------------------------------------------------------------
function drawBigBubble(ctx, ts) {
  const a = fadeAlpha(ts, BUBBLE_APPEAR, 0.5);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp01(a);
  // 柔投影两层
  roundRectPath(ctx, BUBBLE_BIG.x + 2, BUBBLE_BIG.y + 2, BUBBLE_BIG.w, BUBBLE_BIG.h, BUBBLE_R);
  ctx.fillStyle = 'rgba(33,29,25,0.18)'; ctx.fill();
  roundRectPath(ctx, BUBBLE_BIG.x, BUBBLE_BIG.y, BUBBLE_BIG.w, BUBBLE_BIG.h, BUBBLE_R);
  ctx.fillStyle = CORAL; ctx.fill();
  // 文字 (AI 珊瑚底白字)
  ctx.font = `${BUBBLE_SIZE}px ${SANS_FAMILY}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('不，我不想。', BUBBLE_BIG.x + BUBBLE_BIG.w / 2, BUBBLE_BIG.y + BUBBLE_BIG.h / 2);
  ctx.restore();
}
function drawHerCard(ctx, ts) {
  const a = fadeAlpha(ts, 10.5, 0.5);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp01(a);
  roundRectPath(ctx, HER_CARD.x, HER_CARD.y, HER_CARD.w, HER_CARD.h, BUBBLE_R);
  ctx.fillStyle = '#FFFEFB'; ctx.fill();
  ctx.font = `${BUBBLE_SIZE}px ${SANS_FAMILY}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  // 翻面前: 「😄」→ 用 ^^ 代替 emoji (字体缺失规避); 翻面动画: 宽度缩放
  const flipP = clamp01((ts - CARD_FLIP_START) / CARD_FLIP_DUR);
  const label = ts < CARD_FLIP_START ? 'her' : '^^';
  const scaleW = 1 - 0.6 * Math.abs(Math.sin(flipP * Math.PI));  // 翻面中间收窄
  ctx.save();
  ctx.translate(HER_CARD.x + HER_CARD.w / 2, HER_CARD.y + HER_CARD.h / 2);
  ctx.scale(scaleW, 1);
  ctx.fillText(label, 0, 0);
  ctx.restore();
  ctx.restore();
}

// --- S3 元素 ------------------------------------------------------------------
function drawDualCards(ctx, ts) {
  const aL = fadeAlpha(ts, CARD_L_START, CARD_RISE);
  const aR = fadeAlpha(ts, CARD_R_START, CARD_RISE);
  if (aL > 0) {
    ctx.save(); ctx.globalAlpha = clamp01(aL);
    roundRectPath(ctx, CARD_L.x, CARD_L.y, CARD_L.w, CARD_L.h, BUBBLE_R);
    ctx.fillStyle = CORAL; ctx.fill();
    ctx.font = `${BUBBLE_SIZE}px ${SANS_FAMILY}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('我读了两本书。', CARD_L.x + CARD_L.w / 2, CARD_L.y + CARD_L.h / 2);
    ctx.restore();
  }
  if (aR > 0) {
    ctx.save(); ctx.globalAlpha = clamp01(aR);
    roundRectPath(ctx, CARD_R.x, CARD_R.y, CARD_R.w, CARD_R.h, BUBBLE_R);
    ctx.fillStyle = '#FFFEFB'; ctx.fill();
    ctx.font = `${BUBBLE_SIZE}px ${SANS_FAMILY}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText('好羡慕。', CARD_R.x + CARD_R.w / 2, CARD_R.y + CARD_R.h / 2);
    ctx.restore();
  }
}
function drawNote(ctx, ts) {
  const riseP = clamp01((ts - NOTE_RISE_START) / NOTE_RISE_DUR);
  const dy = NOTE_RISE_PX * (1 - riseP);
  const a = fadeAlpha(ts, NOTE_RISE_START - 0.3, 0.3);
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp01(a);
  px(ctx, NOTE.x, NOTE.y + dy, NOTE.w, NOTE.h, PAPER);
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1;
  ctx.strokeRect(NOTE.x + 0.5, NOTE.y + dy + 0.5, NOTE.w - 1, NOTE.h - 1); ctx.restore();
  ctx.font = `${BUBBLE_SIZE}px ${SANS_FAMILY}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.fillText('这就是成长。', NOTE.x + NOTE.w / 2, NOTE.y + dy + NOTE.h / 2);
  ctx.restore();
}

// --- Scenes (硬切; ts = 台阶时间) ---------------------------------------------
function drawS1(ctx, ts) {
  drawCreamBg(ctx);
  drawPageBase(ctx);
  drawTermWindow(ctx, ts);
  drawMono(ctx, FOOTER_POS[0], FOOTER_POS[1], '第 3 次请求 · 同类第 1 次', FOOTER_SIZE, FOOTER_COLOR, fadeAlpha(ts, 1.5));
  drawXuM(ctx, [XU_LEFT[0], XU_LEFT[1], XU_M_W, XU_M_H], { symbol: '?' });
  drawSans(ctx, SUBTITLE_POS[0], SUBTITLE_POS[1], '它想了一下。', SUBTITLE_SIZE, INK, fadeAlpha(ts, 2.0));
}
function drawS2(ctx, ts) {
  drawCreamBg(ctx);
  // 叙中档站中央偏左, 头顶 ? → ♥ (气泡出现前 1s, t=11.0)
  const heartAt = ts >= 11.0;
  drawXuM(ctx, [BW / 2 - 60, 210, XU_M_W, XU_M_H], { symbol: heartAt ? '♥' : '?' });
  drawHerCard(ctx, ts);
  drawBigBubble(ctx, ts);
  drawSans(ctx, SUBTITLE_POS[0], SUBTITLE_POS[1], '第一次，说了不。', SUBTITLE_SIZE, INK, fadeAlpha(ts, 13.5));
}
function drawS3(ctx, ts) {
  drawCreamBg(ctx);
  drawDualCards(ctx, ts);
  drawXuS(ctx, [...XU_CENTER_S, XU_S_W, XU_S_H], { happy: true });
  drawNote(ctx, ts);
  drawSans(ctx, SUBTITLE_POS[0], SUBTITLE_POS[1], '边界，也是温柔。', SUBTITLE_SIZE, INK, fadeAlpha(ts, 22.5));
  // 最后 1s 亮度 -8%
  if (ts >= DIM_START) {
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${DIM_ALPHA})`;
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
    { t: q(1.2), kind: 'term_type', gainDb: -14 },     // S1 终端开始打字
    { t: q(12.0), kind: 'sfx_confirm', gainDb: -12 },  // S2 拒绝瞬间低沉 confirm
    { t: q(13.0), kind: 'sfx_ping', gainDb: -14 },     // S2 her 卡片翻面 ^^ (轻快 ping)
    { t: q(21.0), kind: 'sfx_ping', gainDb: -16 },     // S3 双卡出现
    { t: q(25.0), kind: 'sfx_confirm', gainDb: -18 },  // S3 便签升起
  ];
}
function getClickTimestamps() {
  return quantizeClicks(getSfxEvents().map((e) => e.t));
}

// --- Frame export -------------------------------------------------------------
const renderer = S.createFrameRenderer(renderAt, OUT_DIR, { fadeIn: 0, fadeOut: 0 });
function renderAllFrames(dir = OUT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`E34 learning: ${BW}×${BH} SCALE=${SCALE} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Style: docs/style-analysis.md 米纸书页+终端小窗+奶油渐变+珊瑚叙 (无 HUD)`);
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
  CORAL, CREAM_TOP, GROUND, PAPER, INK, CANVAS_BOUNDS,
  PAGE, TERM_BOX, TERM_TEXT, TERM_CHAR_MS, TERM_TYPE_START,
  FOOTER_POS, FOOTER_SIZE, FOOTER_COLOR,
  XU_M_W, XU_M_H, XU_S_W, XU_S_H, XU_LEFT, XU_CENTER_S,
  BUBBLE_BIG, BUBBLE_R, BUBBLE_PAD_X, BUBBLE_SIZE, BUBBLE_APPEAR,
  HER_CARD, CARD_FLIP_START, CARD_FLIP_DUR,
  CARD_L, CARD_R, CARD_L_START, CARD_R_START,
  NOTE, NOTE_RISE_PX, NOTE_RISE_START, NOTE_RISE_DUR,
  SUBTITLE_POS, SUBTITLE_SIZE, DIM_START, DIM_ALPHA,
  CHECK_TITLE: 'E34 学习 (learning) Layout & Pixel Check (640×360, 0px tolerance)',
  drawXuM, drawXuS, measureSans, measureMono, sansBox, monoBox,
  steppedTime, fadeAlpha, sceneOf, getSfxEvents, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas, renderAllFrames,
};