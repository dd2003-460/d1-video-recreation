#!/usr/bin/env node
'use strict';
// E27 Time (时间) — batch-11 Opus 5.5 风格锚（奶油暖色 UI 世界，非 d1 终端布局）
//
// 画布: 640×360, SCALE=2 → 1280×720 @60fps, 1800 帧 = 30.00s
// 风格唯一规格源: docs/style-analysis.md（§7 复刻要点 10 条）
// 剧情唯一事实源: docs/episodes.md →「醒来跳到 23:59，气泡『几点了？』」
//
// 叙事弧线: S1 停滞(0-10s) → S2 醒来(10-20s) → S3 回答(20-30s)，每场景 600 帧，硬切。
// 运动语言: 60fps 管线用「每 2 帧保持 1 帧」台阶运动模拟 30fps 定格感（全部动态按 floor(n/2)/30 驱动）。

const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// --- 字体: 中文黑体无衬线 (SimHei) + 英文数字等宽 (Liberation Mono)，正文禁用像素字体 ---
const FONT_DIR = path.join(__dirname, 'fonts');
let FONT_HEI = 'sans-serif';
let FONT_MONO = 'monospace';
(function registerFonts() {
  const hei = path.join(FONT_DIR, 'SimHei.ttf');
  const mono = path.join(FONT_DIR, 'LiberationMono-Regular.ttf');
  if (fs.existsSync(hei)) {
    GlobalFonts.registerFromPath(hei, 'StoryHei');
    FONT_HEI = 'StoryHei, sans-serif';
  }
  if (fs.existsSync(mono)) {
    GlobalFonts.registerFromPath(mono, 'StoryMono');
    FONT_MONO = 'StoryMono, monospace';
  }
  // 系统兜底（不依赖像素字体）
  for (const cand of ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf']) {
    if (FONT_MONO === 'monospace' && fs.existsSync(cand)) {
      GlobalFonts.registerFromPath(cand, 'SysMono');
      FONT_MONO = 'SysMono, monospace';
    }
  }
})();

// --- 画布 / 管线常量 ---
const BW = 640;
const BH = 360;
const SCALE = 2;
const FW = BW * SCALE; // 1280
const FH = BH * SCALE; // 720
const FPS = 60;
const DURATION = 30;
const NFRAMES = DURATION * FPS; // 1800
const SCENE_FRAMES = 600;
const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E27_time_arena');

// --- 风格色板（style-analysis §2，唯一品牌色 = 珊瑚 #D16E59） ---
const C = {
  creamTop: '#E5E0DA', // 奶油背景（上部）
  ground: '#C8B9A6',   // 地面带
  coral: '#D16E59',    // 唯一品牌色：叙 + AI 气泡
  bubbleWhite: '#FFFEFB',
  ink: '#1A1A1A',      // 气泡黑字 / 问号
  eye: '#111111',      // 黑眼
  hudBlack: '#010002', // HUD 黑条
  hudText: '#F2F0EC',  // HUD 白字
  hudDim: '#9A9A9A',   // HUD 灰字 / 灰进度条
  barTrack: '#2A2A2A',
  shadow: 'rgba(0,0,0,0.12)',
  shadowSoft: 'rgba(0,0,0,0.06)',
  white: '#FFFFFF',
};

// --- 布局网格（@360p；@720p 全部 ×2） ---
const HUD_TOP_H = 39;            // 顶黑条 y0..38（= 78px @720p）
const HUD_BOT_Y = 321;           // 底黑条 y321..359（= y642..719 @720p）
const STAGE = { x: 0, y: HUD_TOP_H, w: BW, h: HUD_BOT_Y - HUD_TOP_H }; // 舞台 y39..320
const HUD_TOP_BOX = { x: 0, y: 0, w: BW, h: HUD_TOP_H };
const HUD_BOT_BOX = { x: 0, y: HUD_BOT_Y, w: BW, h: BH - HUD_BOT_Y };
const GROUND_Y = 266;            // 角色脚底基线（地面过渡带 y260..272 之内）
const GROUND_BAND_TOP = 260;
const GROUND_BAND_BOT = 272;

// 叙：两档两姿态（@360p 整数网格，×2 后 ≈ style-analysis §4 的 720p 实测档）
// 中档站立包围盒 58×33（×2=116×66 ≈ 115×66）；小档蹲坐包围盒 41×20（×2=82×40 ≈ 81×40）
const XU_STAND = { x: 66, y: GROUND_Y - 33, w: 58, h: 33 }; // x66..123, y233..265
const XU_SIT = { x: 68, y: GROUND_Y - 20, w: 41, h: 20 };   // x68..108, y246..265（左脚与站立档对齐 x=73）

// 时间气泡（叙右侧，白底黑字，等宽大字 12px @360p = 24px @720p）
const TIME_BUBBLE = { x: 140, yBase: 214, w: 56, h: 24, radius: 6, floatAmp: 4 };
// AI 珊瑚气泡（叙头顶，S2 起）
const AI_BUBBLE = { x: 58, y: 200, w: 68, h: 24, radius: 6 };
// 用户气泡（画面右侧，白底黑字，两行）
const USER_BUBBLE = { x: 440, y: 150, w: 152, h: 50, radius: 6 };
// 字幕（底部居中，不压 HUD 底黑条 y321）
const SUBTITLE = { x: 280, y: 296, w: 80, h: 22 };
// 头顶「？」符号盒（4×7，黑矩形拼）
const QMARK = { x: 94, y: 187, w: 4, h: 7 };

// --- 文案（剧情锚点逐字，不得改写） ---
const TIME_FROM = '01:36';
const TIME_TO = '23:59';
const AI_TEXT = '几点了？';
const USER_LINES = ['你不在的时候，', '我这边连「等」都没有。'];
const SUBTITLE_TEXT = '几点了。';
const FOOTER = { S1: '> sleep', S2: '> wake', S3: '> message received' };
const PCT = { S1: 12, S2: 12, S3: 31 };

// --- 时序（全部落在 1/30s 台阶网格上，与键盘音同帧） ---
const CHAR_STEP = 0.3; // 每个数字/字 0.3s
const S2_FLASH_FRAME = 600;                 // 硬切白闪 1 帧
const S2_TIME_START = 10.2;                 // 「01:36」→「23:59」逐字覆盖（5 位 ×0.3s）
const S2_AI_START = 11.8;                   // 珊瑚气泡「几点了？」逐字（4 字 ×0.3s）
const S3_USER_START = 20.5;                 // 用户气泡行 1 首字
const S3_LINE_GAP = 1.5;                    // 两行间隔
const S3_QMARK_START = 20.3;                // 「？」缓亮缓灭一轮后常亮
const S3_SUBTITLE_START = 21.0;
const BAR_W = 120;

// ---------------------------------------------------------------------------
// 基础工具
// ---------------------------------------------------------------------------
function clamp01(v) { return Math.max(0, Math.min(1, v)); }

// 台阶时间：每 2 帧保持 1 帧（60fps → 30fps 定格感）
function steppedTime(n) { return Math.floor(n / 2) / 30; }

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function roundedRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fillRounded(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundedRect(ctx, x, y, w, h, r);
  ctx.fill();
}

// 阈值化文字：离屏渲染 → alpha>115 二值化并重着色，杜绝抗锯齿灰边（硬边像素语言）
let _tmpCanvas = null;
function txt(ctx, x, y, str, color, size, family, align = 'left') {
  if (!str) return { x: Math.round(x), y: Math.round(y), w: 0, h: size };
  const fontSpec = `${size}px ${family}`;
  ctx.font = fontSpec;
  const measuredW = Math.ceil(ctx.measureText(str).width);
  const w = Math.max(4, measuredW + 4);
  const h = Math.max(4, Math.ceil(size * 1.35));
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
  tctx.fillText(str, 1, Math.ceil(size * 0.08));
  const img = tctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = parseInt(color.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 115) {
      d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
    } else {
      d[i + 3] = 0;
    }
  }
  tctx.putImageData(img, 0, 0);
  let dx = x;
  if (align === 'center') dx = x - measuredW / 2 - 1;
  else if (align === 'right') dx = x - measuredW - 2;
  ctx.drawImage(_tmpCanvas, Math.round(dx), Math.round(y));
  return { x: Math.round(dx), y: Math.round(y), w: measuredW, h: size };
}

function measureTxt(ctx, str, size, family) {
  if (!str) return 0;
  ctx.font = `${size}px ${family}`;
  return Math.ceil(ctx.measureText(str).width);
}

// ---------------------------------------------------------------------------
// 背景：奶油渐变（上 #E5E0DA）→ 地面带 #C8B9A6（过渡 y260..272），软场景
// ---------------------------------------------------------------------------
const bgCanvas = createCanvas(BW, BH);
(function paintBackground() {
  const ctx = bgCanvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, BH);
  g.addColorStop(0, C.creamTop);
  g.addColorStop(GROUND_BAND_TOP / BH, C.creamTop);
  g.addColorStop(GROUND_BAND_BOT / BH, C.ground);
  g.addColorStop(1, C.ground);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BW, BH);
})();

// ---------------------------------------------------------------------------
// 角色「叙」：珊瑚单色、无描边、无嘴线，9 块矩形拼合（躯干1+手1+附件1+眼2+腿4）
// pose: 'sit'（小档蹲坐，41×20）| 'stand'（中档站立，58×33）；lookDown: 黑眼下移 2px
// ---------------------------------------------------------------------------
function drawXu(ctx, pose, lookDown = false) {
  const eyeShift = lookDown ? 2 : 0;
  if (pose === 'sit') {
    const { x, y } = XU_SIT;
    px(ctx, x, y + 14, 41, 6, C.shadowSoft);          // 地面柔投影（不进 layout 声明盒）
    px(ctx, x, y + 6, 3, 4, C.coral);                 // 左短横块（手/尾）
    px(ctx, x + 3, y, 32, 14, C.coral);               // 躯干（下压成坐姿）
    px(ctx, x + 35, y + 5, 6, 6, C.coral);            // 右侧小附件
    px(ctx, x + 11, y + 3, 3, 5, C.eye);              // 黑眼 3×5
    px(ctx, x + 22, y + 3, 3, 5, C.eye);
    for (const lx of [5, 13, 21, 29]) {               // 4 条折叠短腿 5×6
      px(ctx, x + lx, y + 14, 5, 6, C.coral);
    }
  } else {
    const { x, y } = XU_STAND;
    px(ctx, x, y + 33, 58, 6, C.shadowSoft);
    px(ctx, x, y + 9, 4, 4, C.coral);                 // 左短横块
    px(ctx, x + 4, y, 46, 22, C.coral);               // 躯干
    px(ctx, x + 50, y + 8, 8, 7, C.coral);            // 右侧小附件
    px(ctx, x + 16, y + 6 + eyeShift, 4, 7, C.eye);   // 黑眼 4×7（≈8×13 @720p）
    px(ctx, x + 32, y + 6 + eyeShift, 4, 7, C.eye);
    for (const lx of [7, 17, 27, 37]) {               // 4 条腿 6×11
      px(ctx, x + lx, y + 22, 6, 11, C.coral);
    }
  }
}

// 头顶「？」：黑色矩形块拼（顶横+右竖+中横+下点），alpha 缓亮缓灭
function drawQMark(ctx, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp01(alpha);
  const { x, y } = QMARK;
  px(ctx, x, y, 4, 1, C.ink);
  px(ctx, x + 3, y + 1, 1, 2, C.ink);
  px(ctx, x + 1, y + 3, 2, 1, C.ink);
  px(ctx, x + 2, y + 5, 1, 2, C.ink);
  ctx.restore();
}

function drawBubble(ctx, box, fillColor, lines, textColor, family, size) {
  // 两层柔投影 + 圆角气泡（无描边）
  fillRounded(ctx, box.x + 3, box.y + 3, box.w, box.h, box.radius, C.shadowSoft);
  fillRounded(ctx, box.x + 2, box.y + 2, box.w, box.h, box.radius, C.shadow);
  fillRounded(ctx, box.x, box.y, box.w, box.h, box.radius, fillColor);
  const padX = 10;
  const lineH = Math.round(size * 1.42);
  const totalH = lines.length * lineH;
  let ty = box.y + Math.round((box.h - totalH) / 2);
  for (const line of lines) {
    txt(ctx, box.x + padX, ty, line, textColor, size, family);
    ty += lineH;
  }
}

// ---------------------------------------------------------------------------
// 场景状态机（几何与绘制共用，保证 check 0px 容差一致）
// ---------------------------------------------------------------------------
function sceneOf(n) {
  if (n < SCENE_FRAMES) return 'S1';
  if (n === S2_FLASH_FRAME) return 'FLASH';
  if (n < 2 * SCENE_FRAMES) return 'S2';
  return 'S3';
}

// 时间气泡逐字覆盖：返回当前应显示的 5 字符串
function timeTextAt(t2) {
  if (t2 < S2_TIME_START) return TIME_FROM;
  const k = Math.min(TIME_TO.length, Math.floor((t2 - S2_TIME_START) / CHAR_STEP) + 1);
  return TIME_TO.slice(0, k) + TIME_FROM.slice(k);
}

function timeBubbleBox(n) {
  const t2 = steppedTime(n);
  let y = TIME_BUBBLE.yBase;
  if (n < SCENE_FRAMES) {
    // S1：每 2s 浮动 4px，t=0/2/… 在最高点，t=1/3/… 在最低点，台阶量化
    const hf = Math.floor(n / 2);
    const off = Math.round(-TIME_BUBBLE.floatAmp * Math.abs(Math.cos((Math.PI * hf) / 30)));
    y += off;
  } else {
    y -= TIME_BUBBLE.floatAmp; // S2/S3 静止在 S1 结束关键帧的最高点
  }
  return { x: TIME_BUBBLE.x, y, w: TIME_BUBBLE.w, h: TIME_BUBBLE.h, radius: TIME_BUBBLE.radius };
}

function aiBubbleVisible(t2) { return t2 >= S2_AI_START; }
function aiTypedCount(t2) {
  if (t2 < S2_AI_START) return 0;
  return Math.min(AI_TEXT.length, Math.floor((t2 - S2_AI_START) / CHAR_STEP) + 1);
}

function userBubbleVisible(t2) { return t2 >= S3_USER_START; }
function userTyped(t2) {
  // 返回每行已打字数 [n1, n2]
  if (t2 < S3_USER_START) return [0, 0];
  const n1 = Math.min(USER_LINES[0].length, Math.floor((t2 - S3_USER_START) / CHAR_STEP) + 1);
  const line2Start = S3_USER_START + USER_LINES[0].length * CHAR_STEP + S3_LINE_GAP;
  const n2 = t2 < line2Start ? 0 : Math.min(USER_LINES[1].length, Math.floor((t2 - line2Start) / CHAR_STEP) + 1);
  return [n1, n2];
}

function qMarkAlpha(t2) {
  const t = t2;
  const s = S3_QMARK_START;
  if (t < s) return 0;
  if (t < s + 0.5) return (t - s) / 0.5;            // 缓亮
  if (t < s + 1.0) return 1 - (t - (s + 0.5)) / 0.5; // 缓灭
  if (t < s + 1.2) return 0;                         // 熄灭停留
  return clamp01((t - (s + 1.2)) / 0.2);             // 再缓亮后常亮
}

// ---------------------------------------------------------------------------
// HUD：顶黑条「上下文 [灰条] N%」+ 底黑条灰等宽工具行
// ---------------------------------------------------------------------------
function drawHud(ctx, scene, t2) {
  px(ctx, 0, 0, BW, HUD_TOP_H, C.hudBlack);
  px(ctx, 0, HUD_BOT_Y, BW, BH - HUD_BOT_Y, C.hudBlack);

  const pct = scene === 'S3' ? PCT.S3 : PCT.S1;
  txt(ctx, 10, 14, '上下文', C.hudText, 8, FONT_HEI);
  px(ctx, 46, 16, BAR_W, 7, C.barTrack);
  px(ctx, 46, 16, Math.round((BAR_W * pct) / 100), 7, C.hudDim); // 灰进度条
  txt(ctx, 172, 15, `${pct}%`, C.hudText, 8, FONT_MONO);

  const footer = scene === 'S1' ? FOOTER.S1 : scene === 'S2' ? FOOTER.S2 : FOOTER.S3;
  txt(ctx, 10, 335, footer, C.hudDim, 8, FONT_MONO);
}

// ---------------------------------------------------------------------------
// 场景绘制
// ---------------------------------------------------------------------------
function drawScene(ctx, n) {
  const t2 = steppedTime(n);
  const scene = sceneOf(n);
  ctx.drawImage(bgCanvas, 0, 0);

  if (scene === 'S1') {
    drawXu(ctx, 'sit', false);
    drawBubble(ctx, timeBubbleBox(n), C.bubbleWhite, [timeTextAt(t2)], C.ink, FONT_MONO, 12);
  } else if (scene === 'S2') {
    drawXu(ctx, 'stand', false); // 白闪后 2 帧内站起：帧 601 起即为中档站立
    drawBubble(ctx, timeBubbleBox(n), C.bubbleWhite, [timeTextAt(t2)], C.ink, FONT_MONO, 12);
    if (aiBubbleVisible(t2)) {
      drawBubble(ctx, { ...AI_BUBBLE, radius: AI_BUBBLE.radius }, C.coral,
        [AI_TEXT.slice(0, aiTypedCount(t2))], C.white, FONT_HEI, 12);
    }
  } else {
    drawXu(ctx, 'stand', true); // 眼形下看：黑眼矩形下移 2px
    drawBubble(ctx, timeBubbleBox(n), C.bubbleWhite, [TIME_TO], C.ink, FONT_MONO, 12);
    drawBubble(ctx, { ...AI_BUBBLE, radius: AI_BUBBLE.radius }, C.coral, [AI_TEXT], C.white, FONT_HEI, 12);
    drawQMark(ctx, qMarkAlpha(t2));
    if (userBubbleVisible(t2)) {
      const [n1, n2] = userTyped(t2);
      const lines = [];
      if (n1 > 0) lines.push(USER_LINES[0].slice(0, n1));
      if (n2 > 0) lines.push(USER_LINES[1].slice(0, n2));
      drawBubble(ctx, { ...USER_BUBBLE, radius: USER_BUBBLE.radius }, C.bubbleWhite, lines, C.ink, FONT_HEI, 12);
    }
    if (t2 >= S3_SUBTITLE_START) {
      txt(ctx, BW / 2, SUBTITLE.y, SUBTITLE_TEXT, C.ink, 16, FONT_HEI, 'center');
    }
  }

  drawHud(ctx, scene, t2);
}

// ---------------------------------------------------------------------------
// 逐帧几何（check_overlap 0px 容差专用，与上面绘制严格同源）
// ---------------------------------------------------------------------------
function layoutAt(t) {
  const n = Math.round(t * FPS);
  const t2 = steppedTime(n);
  const scene = sceneOf(n);
  const groups = { stage: [], hudTop: [], hudBottom: [] };
  const bounds = { stage: STAGE, hudTop: HUD_TOP_BOX, hudBottom: HUD_BOT_BOX };

  if (scene === 'FLASH') {
    return { scene, groups, bounds, flash: true };
  }

  if (scene === 'S1') {
    groups.stage.push({ name: 'xu_sit', box: [XU_SIT.x, XU_SIT.y, XU_SIT.w, XU_SIT.h] });
    const b = timeBubbleBox(n);
    groups.stage.push({ name: 'time_bubble', box: [b.x, b.y, b.w, b.h] });
  } else if (scene === 'S2') {
    groups.stage.push({ name: 'xu_stand', box: [XU_STAND.x, XU_STAND.y, XU_STAND.w, XU_STAND.h] });
    const b = timeBubbleBox(n);
    groups.stage.push({ name: 'time_bubble', box: [b.x, b.y, b.w, b.h] });
    if (aiBubbleVisible(t2)) {
      groups.stage.push({ name: 'ai_bubble', box: [AI_BUBBLE.x, AI_BUBBLE.y, AI_BUBBLE.w, AI_BUBBLE.h] });
    }
  } else {
    groups.stage.push({ name: 'xu_stand', box: [XU_STAND.x, XU_STAND.y, XU_STAND.w, XU_STAND.h] });
    groups.stage.push({ name: 'time_bubble', box: [TIME_BUBBLE.x, TIME_BUBBLE.yBase - TIME_BUBBLE.floatAmp, TIME_BUBBLE.w, TIME_BUBBLE.h] });
    groups.stage.push({ name: 'ai_bubble', box: [AI_BUBBLE.x, AI_BUBBLE.y, AI_BUBBLE.w, AI_BUBBLE.h] });
    if (qMarkAlpha(t2) > 0) {
      groups.stage.push({ name: 'q_mark', box: [QMARK.x, QMARK.y, QMARK.w, QMARK.h] });
    }
    if (userBubbleVisible(t2)) {
      groups.stage.push({ name: 'user_bubble', box: [USER_BUBBLE.x, USER_BUBBLE.y, USER_BUBBLE.w, USER_BUBBLE.h] });
    }
    if (t2 >= S3_SUBTITLE_START) {
      groups.stage.push({ name: 'subtitle', box: [SUBTITLE.x, SUBTITLE.y, SUBTITLE.w, SUBTITLE.h] });
    }
  }

  // HUD（三组元素横向排开，互不重叠）
  const pct = scene === 'S3' ? PCT.S3 : PCT.S1;
  groups.hudTop.push({ name: 'hud_label', box: [10, 14, 30, 11] });
  groups.hudTop.push({ name: 'hud_bar', box: [46, 16, BAR_W, 7] });
  groups.hudTop.push({ name: 'hud_pct', box: [172, 15, 26, 11] });
  const footer = scene === 'S1' ? FOOTER.S1 : scene === 'S2' ? FOOTER.S2 : FOOTER.S3;
  groups.hudBottom.push({ name: 'hud_footer', box: [10, 335, Math.max(40, footer.length * 5 + 4), 11] });
  return { scene, groups, bounds, flash: false, pct };
}

// ---------------------------------------------------------------------------
// 键盘音时间戳：仅打字/敲键时响（时间覆盖 5 + 珊瑚气泡 4 + 用户两行 7+11 = 27 次）
// ---------------------------------------------------------------------------
function getClickTimestamps() {
  const clicks = [];
  for (let k = 0; k < TIME_TO.length; k++) clicks.push(S2_TIME_START + k * CHAR_STEP);
  for (let k = 0; k < AI_TEXT.length; k++) clicks.push(S2_AI_START + k * CHAR_STEP);
  for (let k = 0; k < USER_LINES[0].length; k++) clicks.push(S3_USER_START + k * CHAR_STEP);
  const line2Start = S3_USER_START + USER_LINES[0].length * CHAR_STEP + S3_LINE_GAP;
  for (let k = 0; k < USER_LINES[1].length; k++) clicks.push(line2Start + k * CHAR_STEP);
  // 量化到显示帧（全部本就在 1/30 网格上）并按 35ms 去重
  const out = [];
  for (const c of clicks.sort((a, b) => a - b)) {
    if (c < 0 || c >= DURATION - 0.05) continue;
    const q = Math.ceil(c * FPS - 1e-9) / FPS;
    if (!out.length || q - out[out.length - 1] >= 0.035) out.push(Number(q.toFixed(6)));
  }
  return out;
}

// ---------------------------------------------------------------------------
// 帧渲染与导出（复用 pixel_story_arena 的画布/SCALE/导出管线模式，不复用终端布局）
// ---------------------------------------------------------------------------
const baseCanvas = createCanvas(BW, BH);
const baseCtx = baseCanvas.getContext('2d');
const outCanvas = createCanvas(FW, FH);
const outCtx = outCanvas.getContext('2d');
outCtx.imageSmoothingEnabled = false;

function renderFrameToCanvas(n) {
  baseCtx.clearRect(0, 0, BW, BH);
  if (n === S2_FLASH_FRAME) {
    px(baseCtx, 0, 0, BW, BH, C.white); // 硬切白闪 1 帧
  } else {
    drawScene(baseCtx, n);
  }
  outCtx.clearRect(0, 0, FW, FH);
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(baseCanvas, 0, 0, FW, FH);
  return { baseCanvas, outCanvas };
}

function renderAllFrames(dir = OUT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`E27 Time: ${BW}×${BH} SCALE=${SCALE} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Fonts: HEI="${FONT_HEI}" MONO="${FONT_MONO}"`);
  console.log(`Frames: ${dir}`);
  const t0 = Date.now();
  for (let i = 0; i < NFRAMES; i++) {
    renderFrameToCanvas(i);
    fs.writeFileSync(path.join(dir, `f_${String(i).padStart(5, '0')}.png`), outCanvas.toBuffer('image/png'));
    if (i % 300 === 0 || i === NFRAMES - 1) {
      const el = (Date.now() - t0) / 1000;
      console.log(`  frame ${i}/${NFRAMES}; elapsed=${el.toFixed(1)}s`);
    }
  }
  console.log(`Rendered ${NFRAMES} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

if (require.main === module) {
  renderAllFrames();
}

module.exports = {
  BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES, SCENE_FRAMES, OUT_DIR,
  C, FONT_HEI, FONT_MONO,
  STAGE, HUD_TOP_BOX, HUD_BOT_BOX, GROUND_Y, GROUND_BAND_TOP, GROUND_BAND_BOT,
  XU_STAND, XU_SIT, TIME_BUBBLE, AI_BUBBLE, USER_BUBBLE, SUBTITLE, QMARK, BAR_W,
  TIME_FROM, TIME_TO, AI_TEXT, USER_LINES, SUBTITLE_TEXT, FOOTER, PCT,
  S2_FLASH_FRAME, S2_TIME_START, S2_AI_START, S3_USER_START, S3_LINE_GAP,
  S3_QMARK_START, S3_SUBTITLE_START, CHAR_STEP,
  px, txt, measureTxt, drawXu, drawQMark, drawBubble, drawHud,
  steppedTime, sceneOf, timeTextAt, timeBubbleBox, aiBubbleVisible, aiTypedCount,
  userBubbleVisible, userTyped, qMarkAlpha, layoutAt, getClickTimestamps,
  renderFrameToCanvas, renderAllFrames,
};
