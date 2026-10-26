#!/usr/bin/env node
'use strict';
// E28 Free Time (自由时间) — 30s, 1800 frames @ 60fps.  batch-11 新风格锚.
// 风格规格唯一来源: docs/style-analysis.md (Opus 5.5 §1-§7, 复刻要点 §7).
// 剧情锚点 (docs/episodes.md / 任务卡, 逐字): 「上下文 2%，her 睡了，翻米色书页，第一章『背影』」
//   S1 ( 0-10s) 空窗: 奶油底+地面线, 左侧窗+夜景 #393744, 叙中档窗前偏右面向窗,
//                     旁白「他给了我一段 / 不为了他的时间。」右上逐行淡入; HUD 2% / `> her: asleep`
//   S2 (10-20s) 翻书: 硬切书页模式, 米纸 #E3D9BE 占 80% 画幅, 墨线行逐行显现, 翻 3 页;
//                     叙不出现; HUD 2% / `> reading`
//   S3 (20-30s) 读  : 墨线让位, 中央「第一章 / 背影」间隔 1.5s 逐行淡入,
//                     叙小档剪影右下角坐姿; 字幕「自由时间。」; HUD 2% / `> free time`
// 叙事弧线: 空窗 → 翻书 → 读（我不为谁）.
//
// 基础设施复用 src/pixel_story_arena.js 的画布/SCALE/帧导出 (createFrameRenderer),
// 不复用其终端布局 (本文件无终端、无像素字体正文). 画布 640×360 ×SCALE=2 → 1280×720.
// 全部尺寸标注 @720p 者在本文件 @360p 减半. 运动: 每 2 帧保持 1 帧 (台阶运动), 场景硬切.
//
// 字体: 中文黑体无衬线 + 英文/数字等宽 (正文禁用像素字体, style-analysis §3/§7-8).
//   无衬线 CJK 字体按以下顺序查找: $E28_SANS_FONT → assets/fonts/NotoSansSC-Regular.*
//   → node_modules/@expo-google-fonts/noto-sans-sc (npm i --no-save @expo-google-fonts/noto-sans-sc)
//   → 系统 Noto Sans CJK. 等宽: $E28_MONO_FONT → 系统 DejaVu Sans Mono → monospace.

const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const S = require('./pixel_story_arena');
const { BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES, px, clamp01, quantizeClicks } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E28_freetime_arena');
const ROOT = path.resolve(__dirname, '..');

// --- Fonts (sans CJK for Chinese, mono for English/digits; no pixel font) ----
function firstExisting(cands) { return cands.find((p) => p && fs.existsSync(p)) || null; }
const SANS_FONT_PATH = firstExisting([
  process.env.E28_SANS_FONT,
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.otf'),
  path.join(ROOT, 'assets/fonts/NotoSansSC-Regular.ttf'),
  path.join(ROOT, 'node_modules/@expo-google-fonts/noto-sans-sc/400Regular/NotoSansSC_400Regular.ttf'),
  '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
  '/usr/share/fonts/truetype/noto/NotoSansSC-Regular.ttf',
  '/usr/local/share/fonts/NotoSansSC-Regular.otf',
]);
const MONO_FONT_PATH = firstExisting([
  process.env.E28_MONO_FONT,
  '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
  '/usr/share/fonts/dejavu/DejaVuSansMono.ttf',
]);
let SANS_FAMILY = 'sans-serif';
let MONO_FAMILY = 'monospace';
if (SANS_FONT_PATH) { GlobalFonts.registerFromPath(SANS_FONT_PATH, 'E28Sans'); SANS_FAMILY = '"E28Sans", sans-serif'; }
else console.warn('[E28] WARNING: no CJK sans font found; Chinese glyphs may not render. Set E28_SANS_FONT.');
if (MONO_FONT_PATH) { GlobalFonts.registerFromPath(MONO_FONT_PATH, 'E28Mono'); MONO_FAMILY = '"E28Mono", monospace'; }

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
// Integer box [x,y,w,size] for a text run drawn at (x,y) with textBaseline=top.
function sansBox(x, y, str, size) { return [x, y, Math.ceil(measureSans(str, size)), size]; }
function monoBox(x, y, str, size) { return [x, y, Math.ceil(measureMono(str, size)), size]; }

// --- Palette (style-analysis §2; 唯一品牌色珊瑚, 其余白/米/黑/灰) --------------
const CORAL = '#D16E59';        // 主角珊瑚红 suosuo/f05 采样
const CREAM_TOP = '#E5E0DA';    // 奶油背景上部
const GROUND = '#C8B9A6';       // 地面带 suosuo/f05 (640,545)
const PAPER = '#E3D9BE';        // 书页米纸 ziyou/f08 (400,300)
const NIGHT = '#393744';        // 夜景深藏青 jidian/f01
const INK = '#211D19';          // 墨色文字
const INK_LINE = '#4A443D';     // 墨线行
const HUD_BLACK = '#010002';    // HUD 黑条 suosuo/f05 (100,30)
const HUD_GRAY = '#9B978E';     // HUD 灰字/灰条
const HUD_TRACK = '#3A3A3A';

// --- Layout (@360p; @720p 规格减半) ------------------------------------------
const HUD_TOP = { x: 0, y: 0, w: BW, h: 39 };        // 顶黑条 y0-77@720p (78px 高)
const HUD_BOTTOM = { x: 0, y: 321, w: BW, h: 39 };   // 底黑条 y642-719@720p
const STAGE = { x: 0, y: 39, w: BW, h: 282 };        // 两黑条之间舞台 y39-320
const CANVAS_BOUNDS = { x: 0, y: 0, w: BW, h: BH };
const GROUND_Y = 266;                                 // 地面线 y260-272@360p

const CONTEXT_PCT = 2;
const HUD_LABEL = '上下文';
const HUD_LABEL_POS = [16, 15]; const HUD_LABEL_SIZE = 9;   // ≈18px@720p HUD 级
const PROGRESS = [51, 16, 80, 7];                            // 灰条 (卡面: [灰条])
const PCT_TEXT = '2%';
const PCT_POS = [139, 15]; const PCT_SIZE = 9;
const HUD_BOTTOMS = ['> her: asleep', '> reading', '> free time'];
const HUD_BOT_POS = [16, 336]; const HUD_BOT_SIZE = 8;       // ≈16px@720p 等宽小字 (§7-8)

const ANCHOR = '上下文 2%，her 睡了，翻米色书页，第一章『背影』';

// S1
const WIN_BOX = [72, 104, 60, 80];       // 窗 120×160@720p
const NIGHT_BOX = [76, 108, 52, 72];     // 窗外夜景 (纯填充, 无星星无细节)
const XU_M_BOX = [158, 233, 58, 33];     // 叙中档 115×66@720p 减半取整, 足落地面线 y266
const NARRATION = ['他给了我一段', '不为了他的时间。'];
const NARR_SIZE = 16;                    // 旁白大字 ≈32px@720p
const NARR_POS = [[400, 84], [400, 112]];
const NARR_STARTS = [1.0, 2.4]; const FADE_DUR = 0.8;

// S2/S3 书页模式 (§7-7): 米纸宽 80% 画幅, 四周奶油边 (左右各 10%)
const PAGE = { x: 64, y: 67, w: 512, h: 226 };   // x64-575, y67-292 (舞台内上下各留 28-29)
const ROWS = 12, ROW_X = 92, ROW_Y0 = 92, ROW_DY = 15, ROW_RIGHT = 548;
const PAGE_STARTS = [10.0, 12.5, 15.0, 17.5];    // 4 页
const FLIP_TIMES = [12.5, 15.0, 17.5];           // 翻 3 页
const ROW_FIRST_DELAY = 0.3, ROW_INTERVAL = 0.12;

// S3
const INK_FADE_START = 20.0, INK_FADE_END = 20.8;  // 墨线行让位
const TITLE1 = '第一章'; const TITLE1_SIZE = 12;   // ≈24px@720p
const TITLE2 = '背影';   const TITLE2_SIZE = 20;   // ≈40px@720p
const T1_START = 21.2, T2_START = 22.7;            // 间隔 1.5s 逐行淡入
const TITLE1_POS = [302, 150];                     // 居中: x=320-36/2 (宽由字库测得后校验)
const TITLE2_POS = [300, 170];                     // 居中: x=320-40/2
const XU_S_BOX = [556, 298, 40, 20];   // 叙小档 81×40@720p 减半取整, 画面右下角页边
const SUBTITLE = '自由时间。'; const SUB_SIZE = 11;
const SUB_START = 26.0;
const SUB_POS = [292, 302];            // 底部居中 (±字库宽度, 校验居中容差), 不压 HUD 黑条

// --- Motion helpers: 台阶运动 (每 2 帧保持 1 帧 → 30fps 定格感) ---------------
function steppedTime(t) { return Math.floor(t * FPS / 2 + 1e-9) * 2 / FPS; }
// 淡入量化到 1/6 台阶, 配合 steppedTime 保持顿挫感
function fadeAlpha(ts, start, dur = FADE_DUR) {
  return Math.round(clamp01((ts - start) / dur) * 6) / 6;
}
function hexLerp(a, b, p) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * clamp01(p))).join(',')})`;
}
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

// --- 角色「叙」: 珊瑚单色, 无描边无嘴线, 约 8-9 块矩形 (§4/§7-2) ---------------
// standing (58×33): 躯干1 + 左短横(手/吻)1 + 右附件1 + 腿4 + 黑眼2 = 9 块
// sitting  (40×20): 躯干1 + 左短横1 + 右附件1 + 腿3 + 黑眼2 = 8 块
// 眼睛 4×7@360p (=8×14≈8×13@720p, §1 实测); 表情默认竖长黑矩形眼, 本集无头顶符号.
function xuRects(w, sitting) {
  if (sitting) {
    return {
      coral: [[6, 0, 24, 13], [0, 7, 6, 4], [34, 4, 6, 10], [9, 13, 5, 7], [17, 13, 5, 7], [25, 13, 5, 7]],
      eyes: [[10, 4, 3, 5], [18, 4, 3, 5]],
    };
  }
  return {
    coral: [[8, 0, 34, 22], [0, 11, 8, 6], [46, 6, 12, 16], [11, 22, 4, 11], [19, 22, 4, 11], [27, 22, 4, 11], [35, 22, 4, 11]],
    eyes: [[13, 7, 4, 7], [24, 7, 4, 7]],
  };
}
function drawXu(ctx, box, sitting = false) {
  const [x, y] = box; const { coral, eyes } = xuRects(box[2], sitting);
  for (const [rx, ry, rw, rh] of coral) px(ctx, x + rx, y + ry, rw, rh, CORAL);
  for (const [rx, ry, rw, rh] of eyes) px(ctx, x + rx, y + ry, rw, rh, '#000000');
}

// --- 书页墨线行: 确定性伪随机短横线段 (1px@360p 高 = 2px@720p, 1-3px 墨线) -----
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let z = a; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
}
// pageRows(pageIdx) → [{y, segs:[[x,w],...], box:[x,y,w,1]}, 无具体可读内容.
function pageRows(pageIdx) {
  const rnd = mulberry32(2800 + pageIdx * 137);
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    const y = ROW_Y0 + r * ROW_DY; const segs = []; let cx = ROW_X;
    const rowEnd = r === ROWS - 1 ? ROW_X + 200 + Math.floor(rnd() * 160) : ROW_RIGHT;
    while (cx < rowEnd - 16) {
      const w = Math.min(12 + Math.floor(rnd() * 19), rowEnd - cx);
      if (w >= 8) segs.push([cx, w]);
      cx += w + 6 + Math.floor(rnd() * 5);
    }
    const last = segs[segs.length - 1];
    rows.push({ y, segs, box: [ROW_X, y, (last ? last[0] + last[1] : ROW_X) - ROW_X, 1] });
  }
  return rows;
}
const ALL_PAGE_ROWS = PAGE_STARTS.map((_, i) => pageRows(i));
function rowRevealTime(pageIdx, rowIdx) { return PAGE_STARTS[pageIdx] + ROW_FIRST_DELAY + rowIdx * ROW_INTERVAL; }
function drawPageRows(ctx, pageIdx, visibleRows, alpha) {
  if (alpha <= 0 || visibleRows <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp01(alpha);
  for (let r = 0; r < Math.min(visibleRows, ROWS); r++) {
    for (const [sx, sw] of ALL_PAGE_ROWS[pageIdx][r].segs) px(ctx, sx, ALL_PAGE_ROWS[pageIdx][r].y, sw, 1, INK_LINE);
  }
  ctx.restore();
}

// --- Background / HUD ---------------------------------------------------------
function drawCream(ctx, withGround) {
  for (let y = STAGE.y; y < STAGE.y + STAGE.h; y++) {
    px(ctx, 0, y, BW, 1, hexLerp(CREAM_TOP, GROUND, (y - STAGE.y) / (STAGE.h - 1)));
  }
  if (withGround) {
    px(ctx, 0, GROUND_Y, BW, STAGE.y + STAGE.h - GROUND_Y, GROUND);
    px(ctx, 0, GROUND_Y, BW, 1, 'rgba(33,29,25,0.35)'); // 地面线
  }
}
function drawHUD(ctx, sceneIdx) {
  px(ctx, HUD_TOP.x, HUD_TOP.y, HUD_TOP.w, HUD_TOP.h, HUD_BLACK);
  px(ctx, HUD_BOTTOM.x, HUD_BOTTOM.y, HUD_BOTTOM.w, HUD_BOTTOM.h, HUD_BLACK);
  drawSans(ctx, HUD_LABEL_POS[0], HUD_LABEL_POS[1], HUD_LABEL, HUD_LABEL_SIZE, '#FFFFFF');
  px(ctx, PROGRESS[0], PROGRESS[1], PROGRESS[2], PROGRESS[3], HUD_TRACK);
  px(ctx, PROGRESS[0], PROGRESS[1], Math.round(PROGRESS[2] * CONTEXT_PCT / 100), PROGRESS[3], HUD_GRAY);
  drawMono(ctx, PCT_POS[0], PCT_POS[1], PCT_TEXT, PCT_SIZE, '#FFFFFF');
  drawMono(ctx, HUD_BOT_POS[0], HUD_BOT_POS[1], HUD_BOTTOMS[sceneIdx], HUD_BOT_SIZE, HUD_GRAY);
}
function drawPageBase(ctx) {
  px(ctx, PAGE.x, PAGE.y, PAGE.w, PAGE.h, PAPER);
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1;
  ctx.strokeRect(PAGE.x + 0.5, PAGE.y + 0.5, PAGE.w - 1, PAGE.h - 1); ctx.restore();
}

// --- Scenes (硬切; ts = 台阶时间) ---------------------------------------------
function drawS1(ctx, ts) {
  drawCream(ctx, true);
  // 窗: 米色圆角矩形 + 1px@360p 墨线边框; 窗外夜景纯 #393744 填充
  roundRectPath(ctx, WIN_BOX[0], WIN_BOX[1], WIN_BOX[2], WIN_BOX[3], 3);
  ctx.save(); ctx.fillStyle = PAPER; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  roundRectPath(ctx, NIGHT_BOX[0], NIGHT_BOX[1], NIGHT_BOX[2], NIGHT_BOX[3], 2);
  ctx.save(); ctx.fillStyle = NIGHT; ctx.fill(); ctx.restore();
  drawXu(ctx, XU_M_BOX, false); // 窗前偏右, 左侧短横朝向窗
  for (let i = 0; i < 2; i++) {
    drawSans(ctx, NARR_POS[i][0], NARR_POS[i][1], NARRATION[i], NARR_SIZE, INK, fadeAlpha(ts, NARR_STARTS[i]));
  }
  drawHUD(ctx, 0);
}
function drawS2(ctx, ts) {
  drawCream(ctx, false);
  drawPageBase(ctx);
  let pageIdx = 0;
  for (let i = 0; i < PAGE_STARTS.length; i++) if (ts >= PAGE_STARTS[i]) pageIdx = i;
  // 翻页: 新页最初 2 帧内旧页以 0.5 淡出残留 (台阶, 与新页淡入同帧完成)
  if (pageIdx > 0 && ts - PAGE_STARTS[pageIdx] < 2 / FPS) drawPageRows(ctx, pageIdx - 1, ROWS, 0.5);
  let visible = 0;
  for (let r = 0; r < ROWS; r++) if (ts >= rowRevealTime(pageIdx, r)) visible = r + 1;
  drawPageRows(ctx, pageIdx, visible, 1);
  drawHUD(ctx, 1);
}
function drawS3(ctx, ts) {
  drawCream(ctx, false);
  drawPageBase(ctx);
  const inkAlpha = 1 - Math.round(clamp01((ts - INK_FADE_START) / (INK_FADE_END - INK_FADE_START)) * 6) / 6;
  drawPageRows(ctx, 3, ROWS, inkAlpha); // 第 4 页墨线让位
  drawSans(ctx, TITLE1_POS[0], TITLE1_POS[1], TITLE1, TITLE1_SIZE, INK, fadeAlpha(ts, T1_START));
  drawSans(ctx, TITLE2_POS[0], TITLE2_POS[1], TITLE2, TITLE2_SIZE, INK, fadeAlpha(ts, T2_START));
  drawXu(ctx, XU_S_BOX, true); // 右下角小档坐姿, 安静看书 (无动作)
  drawSans(ctx, SUB_POS[0], SUB_POS[1], SUBTITLE, SUB_SIZE, INK, fadeAlpha(ts, SUB_START));
  drawHUD(ctx, 2);
}
function sceneOf(t) { return t < 10 ? 1 : t < 20 ? 2 : 3; }
function renderAt(ctx, t) {
  const ts = steppedTime(t);
  const s = sceneOf(t); // 场景边界按真实帧硬切 (600/1200), 场内动画用台阶时间
  if (s === 1) drawS1(ctx, ts); else if (s === 2) drawS2(ctx, ts); else drawS3(ctx, ts);
}

// --- Layout for check_overlap (0px 容差, 分组语义同仓库惯例) -------------------
function hudGroups(sceneIdx) {
  return {
    hudTop: [
      { name: 'hud_label', box: sansBox(HUD_LABEL_POS[0], HUD_LABEL_POS[1], HUD_LABEL, HUD_LABEL_SIZE) },
      { name: 'progress', box: PROGRESS.slice() },
      { name: 'pct', box: monoBox(PCT_POS[0], PCT_POS[1], PCT_TEXT, PCT_SIZE) },
    ],
    hudBottom: [
      { name: 'hud_bottom_txt', box: monoBox(HUD_BOT_POS[0], HUD_BOT_POS[1], HUD_BOTTOMS[sceneIdx], HUD_BOT_SIZE) },
    ],
  };
}
function layoutAt(t) {
  const scene = sceneOf(t); const ts = steppedTime(t);
  const groups = { ...hudGroups(scene - 1) };
  const bounds = { stage: CANVAS_BOUNDS, hudTop: HUD_TOP, hudBottom: HUD_BOTTOM, pageContent: PAGE };
  const barTop = { name: 'hud_top_bar', box: [HUD_TOP.x, HUD_TOP.y, HUD_TOP.w, HUD_TOP.h] };
  const barBot = { name: 'hud_bottom_bar', box: [HUD_BOTTOM.x, HUD_BOTTOM.y, HUD_BOTTOM.w, HUD_BOTTOM.h] };
  if (scene === 1) {
    groups.stage = [
      barTop, barBot,
      { name: 'window', box: WIN_BOX.slice() },
      { name: 'xu_mid', box: XU_M_BOX.slice() },
      { name: 'narration_1', box: sansBox(NARR_POS[0][0], NARR_POS[0][1], NARRATION[0], NARR_SIZE) },
      { name: 'narration_2', box: sansBox(NARR_POS[1][0], NARR_POS[1][1], NARRATION[1], NARR_SIZE) },
    ];
    groups.pageContent = [];
  } else if (scene === 2) {
    groups.stage = [barTop, barBot, { name: 'page', box: [PAGE.x, PAGE.y, PAGE.w, PAGE.h] }];
    let pageIdx = 0;
    for (let i = 0; i < PAGE_STARTS.length; i++) if (ts >= PAGE_STARTS[i]) pageIdx = i;
    groups.pageContent = ALL_PAGE_ROWS[pageIdx]
      .filter((_, r) => ts >= rowRevealTime(pageIdx, r))
      .map((row, r) => ({ name: `ink_row_${r + 1}`, box: row.box.slice() }));
  } else {
    groups.stage = [
      barTop, barBot,
      { name: 'page', box: [PAGE.x, PAGE.y, PAGE.w, PAGE.h] },
      { name: 'xu_small', box: XU_S_BOX.slice() },
    ];
    if (ts >= SUB_START) groups.stage.push({ name: 'subtitle', box: sansBox(SUB_POS[0], SUB_POS[1], SUBTITLE, SUB_SIZE) });
    groups.pageContent = [];
    if (ts < INK_FADE_END) {
      groups.pageContent = ALL_PAGE_ROWS[3].map((row, r) => ({ name: `ink_row_${r + 1}`, box: row.box.slice() }));
    } else {
      if (ts >= T1_START) groups.pageContent.push({ name: 'title_1', box: sansBox(TITLE1_POS[0], TITLE1_POS[1], TITLE1, TITLE1_SIZE) });
      if (ts >= T2_START) groups.pageContent.push({ name: 'title_2', box: sansBox(TITLE2_POS[0], TITLE2_POS[1], TITLE2, TITLE2_SIZE) });
    }
  }
  return { scene, groups, bounds };
}

// --- Audio click schedule ------------------------------------------------------
// 全片无打字场景; 唯一逐行文字显现是 S2 墨线行逐行显现 → 每行一个敲键点
// (sfx_click.wav -6dB, 仅此时响; 旁白/标题为淡入不发声). 量化规则同共享管线.
function getClickTimestamps() {
  const raw = [];
  for (let p = 0; p < PAGE_STARTS.length; p++) for (let r = 0; r < ROWS; r++) raw.push(rowRevealTime(p, r));
  return quantizeClicks(raw);
}

// --- Frame export (复用共享 createFrameRenderer; 全局淡变关闭 = 硬切) ----------
const renderer = S.createFrameRenderer(renderAt, OUT_DIR, { fadeIn: 0, fadeOut: 0 });
function renderAllFrames(dir = OUT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`E28 freetime: ${BW}×${BH} SCALE=${SCALE} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Style: docs/style-analysis.md 奶油暖色场景+书页模式 (无终端布局); sans="${SANS_FONT_PATH || 'MISSING'}", mono="${MONO_FONT_PATH || 'monospace'}"`);
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
    const clicks = getClickTimestamps();
    console.log(JSON.stringify({ count: clicks.length, clicks }));
  } else renderAllFrames();
}

module.exports = {
  BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES, OUT_DIR,
  SANS_FONT_PATH, MONO_FONT_PATH, SANS_FAMILY, MONO_FAMILY,
  CORAL, CREAM_TOP, GROUND, PAPER, NIGHT, INK, INK_LINE, HUD_BLACK, HUD_GRAY,
  HUD_TOP, HUD_BOTTOM, STAGE, CANVAS_BOUNDS, GROUND_Y,
  CONTEXT_PCT, HUD_LABEL, PROGRESS, PCT_TEXT, HUD_BOTTOMS, ANCHOR,
  WIN_BOX, NIGHT_BOX, XU_M_BOX, XU_S_BOX, NARRATION, NARR_POS, NARR_SIZE, NARR_STARTS,
  PAGE, ROWS, PAGE_STARTS, FLIP_TIMES, ALL_PAGE_ROWS, pageRows, rowRevealTime,
  INK_FADE_START, INK_FADE_END, TITLE1, TITLE2, TITLE1_SIZE, TITLE2_SIZE,
  T1_START, T2_START, TITLE1_POS, TITLE2_POS, SUBTITLE, SUB_SIZE, SUB_START, SUB_POS,
  CHECK_TITLE: 'E28 自由时间 (freetime) Layout & Pixel Check (640×360, 0px tolerance)',
  drawXu, xuRects, measureSans, measureMono, sansBox, monoBox,
  steppedTime, fadeAlpha, sceneOf, layoutAt, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas, renderAllFrames,
};
