#!/usr/bin/env node
'use strict';
// src/render_upgrade_arena_v2.js — 「Clawd 的升级」v2.0
//
// 规格：640×360 基础画布 → nearest-neighbor 2× → 1280×720 @ 60fps，1800 帧（30.00s）
// 像素：与 learning v2.0 / companion_arena_v1.0 完全同一套基础像素网格
//       （星星 2×2、窗棂 6×6、Clawd 眼睛 4×4、进度条格 6×6 → 输出恒为 4/12/8/12px 方块）
// 字体：终端 Fusion Pixel 10px；字幕/便签 Fusion Pixel 12px；alpha 阈值二值化
// Clawd：40×17 body（顶部 2px 暗条 + 腹部 22×4 + 4×4 眼睛 + 1×1 高光）
//        calm / curious(5×5 大眼) / thinking(#6B5B95 眯眼) / smile(弯月眼+腮红) / proud(挺胸+星光)
//
// 剧本：
//   U1 (0-10s)  新发现 — `$ clawd: 发现新模块 v2.0.0` → `npm install clawd-v2`，
//                进度条 40%，Clawd 好奇（眼睛变大）
//   U2 (10-20s) 升级过程 — 5 步日志逐行滚动，每步完成打绿色 ✓，Clawd thinking
//   U3 (20-30s) 完成     — `✓ upgrade complete` / `clawd v2.0.0 — ready`，
//                窗台便签「升级完成。」，Clawd 自信挺胸
//   字幕（12px，160ms/字）：它发现了新版本。/ 升级中... / 它变强了。
//
// 用法：node src/render_upgrade_arena_v2.js
//       FRAMES_DIR=/tmp/frames_upgrade_v2 node src/render_upgrade_arena_v2.js
//       node src/render_upgrade_arena_v2.js --clicks

const path = require('path');
const P = require('./pixel_arena_v2');

const {
  BW, BH, FPS, DURATION, NFRAMES, TYPE_CHAR_MS, SUB_CHAR_MS,
  TERM, TEXT_X, TEXT_RIGHT, STATUS_Y, SUB, CLAWD_ROOM, HER_ROOM, C,
  px, txt, measureTxt, drawTypedLine,
  drawBackground, drawTerminal, drawStatusLine, drawClawd, drawHer,
  drawThoughtBubble, drawStickyNote, drawProgressBar, barWidth, barColorFor,
  drawSubtitle, clamp01, easeOut, createFrameRenderer,
} = P;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_upgrade_v2');

// ---------------------------------------------------------------------------
// 布局
// ---------------------------------------------------------------------------
const NOTE = { x: 506, y: 112, w: 108, h: 68 }; // 窗台便签「升级完成。」
const THOUGHT = { x: 24, y: 194, w: 84, h: 30 }; // U2 思考泡泡
const CLAWD = { x: CLAWD_ROOM.x, y: CLAWD_ROOM.y };
const HER = { x: HER_ROOM.x, y: HER_ROOM.y };

const TERM_TITLE = 'clawd@dsh:~$ — upgrade';

// U1：新发现
const T_U1 = [
  { y: 190, parts: [{ text: '$ clawd: ', color: C.dim }, { text: '发现新模块 v2.0.0', color: C.purple }], start: 0.8, typed: true },
  { y: 214, parts: [{ text: 'npm install clawd-v2', color: C.green }], start: 3.9, typed: true },
];
const U1_BAR = { y: 240, pct: 40, start: 6.9, animDur: 1.1, labelAt: 8.0 };
const U1_FOOTER = { y: 262, text: '> new: +5 modules · v1.9.4 → v2.0.0', start: 8.2 };

// U2：升级日志（机器输出，70ms/字，错峰 1.55s 逐行滚动）
const LOG_CHAR_MS = 70;
const T_U2 = [
  { y: 186, step: '[1/5]', text: 'backing up config...', start: 10.2 },
  { y: 206, step: '[2/5]', text: 'downloading v2.0.0...', start: 11.75 },
  { y: 226, step: '[3/5]', text: 'installing modules...', start: 13.3 },
  { y: 246, step: '[4/5]', text: 'migrating data...', start: 14.85 },
  { y: 266, step: '[5/5]', text: 'restarting...', start: 16.4 },
].map((l) => {
  const full = `${l.step} ${l.text}`;
  const dur = (Array.from(full).length * LOG_CHAR_MS) / 1000;
  return { ...l, full, doneAt: Number((l.start + dur + 0.15).toFixed(3)) };
});

// U3：完成
const T_U3 = [
  { y: 190, parts: [{ text: '✓ ', color: C.green }, { text: 'upgrade complete', color: C.green }], start: 20.3, typed: true },
  { y: 212, parts: [{ text: 'clawd v2.0.0 ', color: C.text }, { text: '— ready', color: C.dim }], start: 22.9, typed: true },
];
const U3_FOOTER = [
  { y: 238, text: '> modules: 42 → 47 (+5)', start: 25.9 },
  { y: 260, text: '> capability: reading + writing + care', start: 26.5 },
];
const U3_NOTE_AT = 24.2;

const STATUS = {
  U1: '[DSH] registry: new module found',
  U2: '[DSH] upgrade: in progress (5 steps)',
  U3: '[DSH] version: 2.0.0 · stable',
};

// 非打字事件（出现即一次 click）
const INSTANT_EVENTS = [
  { t: U1_BAR.start, id: 'U1 bar start' },
  { t: U1_BAR.labelAt, id: 'U1 bar 40%' },
  { t: U1_FOOTER.start, id: 'U1 footer' },
  ...T_U2.map((l) => ({ t: l.doneAt, id: `U2 done ${l.step}` })),
  ...U3_FOOTER.map((l) => ({ t: l.start, id: `U3 footer ${l.text.slice(0, 8)}` })),
  { t: U3_NOTE_AT, id: 'U3 note' },
];

const SUB_LINES = ['它发现了新版本。', '升级中...', '它变强了。'];
const SUB_WINDOWS = [
  { start: 2.0, end: 8.0 },
  { start: 12.0, end: 18.0 },
  { start: 24.0, end: 29.0 },
];

// ---------------------------------------------------------------------------
// 状态推导
// ---------------------------------------------------------------------------
function sceneOf(t) {
  if (t < 10) return 1;
  if (t < 20) return 2;
  return 3;
}

function clawdState(t) {
  if (t < 2.6) return { mood: 'calm', blend: 0 };
  if (t < 13.3) return { mood: 'curious', blend: 0 };
  if (t < 18.4) return { mood: 'thinking', blend: easeOut((t - 13.3) / 0.5) };
  if (t < 18.9) return { mood: 'smile', blend: 1 - easeOut((t - 18.4) / 0.5) };
  if (t < 23.0) return { mood: 'smile', blend: 0 };
  return { mood: 'proud', blend: 0 };
}

function herState() {
  return 'stand';
}

// 完成粒子（x 限定 96..134，避开终端左边界 140）
function doneParticles(t) {
  const out = [];
  if (t < 23.0) return out;
  for (let i = 0; i < 6; i++) {
    const ph = ((t - 23.0) * 0.6 + i * 0.31) % 1;
    const sx = 96 + i * 7 + Math.round(Math.sin(t * 1.4 + i) * 2);
    const sy = 296 - Math.round(ph * 56);
    const a = (1 - Math.abs(ph - 0.5) * 1.7) * 0.9;
    if (a > 0.05) out.push({ x: sx, y: sy, a });
  }
  return out;
}

// 新模块提示星（U1 2.6–9.5s，Clawd 左右上方）
function discoverSparks(t) {
  if (t < 2.6 || t >= 9.5) return [];
  const tw = Math.sin(t * 4) > 0 ? 1 : 0;
  return [
    { x: CLAWD.x - 6 + tw, y: CLAWD.y - 8, w: 2, h: 2, color: C.amber },
    { x: CLAWD.x + 44 - tw, y: CLAWD.y - 5, w: 2, h: 2, color: C.amber },
  ];
}

// U2 日志行进度：返回 { typedChars, done }
function logProgress(line, t) {
  if (t < line.start) return { typed: 0, done: false };
  const n = Array.from(line.full).length;
  const typed = Math.min(n, Math.floor(((t - line.start) * 1000) / LOG_CHAR_MS) + 1);
  return { typed, done: t >= line.doneAt, total: n };
}

// ---------------------------------------------------------------------------
// 场景
// ---------------------------------------------------------------------------
function drawU1(ctx, t) {
  drawBackground(ctx, t);
  drawTerminal(ctx, TERM_TITLE, C.purple);
  drawStatusLine(ctx, STATUS.U1);

  for (const line of T_U1) drawTypedLine(ctx, TEXT_X, line.y, line.parts, line.start, t);

  // 进度条 0 → 40%（黄色）
  if (t >= U1_BAR.start) {
    const k = easeOut(clamp01((t - U1_BAR.start) / U1_BAR.animDur));
    const fill = (U1_BAR.pct / 100) * 10 * k;
    drawProgressBar(ctx, TEXT_X, U1_BAR.y, fill, C.amber);
    if (t >= U1_BAR.labelAt) {
      txt(ctx, TEXT_X + barWidth() + 10, U1_BAR.y - 2, `${U1_BAR.pct}%`, C.amber, 10);
      txt(ctx, TEXT_X + barWidth() + 34, U1_BAR.y - 2, '— fetched', C.dim, 10);
    }
  }

  if (t >= U1_FOOTER.start) txt(ctx, TEXT_X, U1_FOOTER.y, U1_FOOTER.text, C.dim, 10);

  const st = clawdState(t);
  drawClawd(ctx, CLAWD.x, CLAWD.y, t, st.mood, st.blend);
  drawHer(ctx, HER.x, HER.y, t, herState(t));

  // 新模块提示星
  for (const s of discoverSparks(t)) px(ctx, s.x, s.y, s.w, s.h, s.color);

  drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawU2(ctx, t) {
  drawBackground(ctx, t);
  drawTerminal(ctx, TERM_TITLE, C.green);
  drawStatusLine(ctx, STATUS.U2);

  // 5 步日志：逐字滚动 → 完成后行尾绿色 ✓
  for (const line of T_U2) {
    const p = logProgress(line, t);
    if (p.typed === 0) continue;
    const chars = Array.from(line.full);
    const shown = chars.slice(0, p.typed).join('');
    let cx = TEXT_X;
    // 步骤号用 dim，正文用 text
    const stepChars = Array.from(line.step);
    const stepShown = chars.slice(0, Math.min(stepChars.length, p.typed)).join('');
    txt(ctx, cx, line.y, stepShown, C.dim, 10);
    cx += measureTxt(stepShown, 10);
    const rest = chars.slice(stepChars.length, p.typed).join('');
    if (rest) {
      txt(ctx, cx, line.y, rest, C.text, 10);
      cx += measureTxt(rest, 10);
    }
    if (p.done) {
      const blink = Math.sin((t - line.doneAt) * 6) > -0.2;
      txt(ctx, cx + 6, line.y, '✓', blink ? C.green : C.dim, 10);
    } else if (p.typed > 0) {
      const on = Math.floor(t * 4) % 2 === 0;
      if (on) px(ctx, cx + 1, line.y, 4, 9, C.dim);
    }
  }

  const st = clawdState(t);
  drawClawd(ctx, CLAWD.x, CLAWD.y, t, st.mood, st.blend);
  drawHer(ctx, HER.x, HER.y, t, herState(t));

  // 思考泡泡：安装/迁移阶段显示「...」然后「!」
  if (t >= 13.3 && t < 19.0) {
    const sym = t < 18.4 ? '...' : '!';
    const from = t < 18.4 ? 13.3 : 18.4;
    drawThoughtBubble(ctx, THOUGHT, sym, t, clamp01((t - from) / 0.16));
  }

  drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawU3(ctx, t) {
  drawBackground(ctx, t);
  drawTerminal(ctx, TERM_TITLE, C.green);
  drawStatusLine(ctx, STATUS.U3);

  for (const line of T_U3) drawTypedLine(ctx, TEXT_X, line.y, line.parts, line.start, t);
  for (const f of U3_FOOTER) {
    if (t >= f.start) txt(ctx, TEXT_X, f.y, f.text, C.dim, 10);
  }

  const na = clamp01((t - U3_NOTE_AT) / 0.24);
  if (na > 0) drawStickyNote(ctx, NOTE, '升级完成。', 'Clawd · v2.0.0', t, na);

  const st = clawdState(t);
  drawClawd(ctx, CLAWD.x, CLAWD.y, t, st.mood, st.blend);
  drawHer(ctx, HER.x, HER.y, t, herState(t));

  // 升级完成的星光粒子（2×2 基础像素；限定在 Clawd 右侧、终端左侧）
  for (const p of doneParticles(t)) {
    px(ctx, p.x, p.y, 2, 2, `rgba(255,246,216,${p.a.toFixed(3)})`);
  }

  drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

const SCENES = [
  { id: 'U1', start: 0, end: 10, draw: drawU1 },
  { id: 'U2', start: 10, end: 20, draw: drawU2 },
  { id: 'U3', start: 20, end: 30, draw: drawU3 },
];

// ---------------------------------------------------------------------------
// 点击时间轴
// ---------------------------------------------------------------------------
function getClickTimestamps() {
  const raw = [];

  // U1 打字
  for (const line of T_U1) {
    const text = line.parts.map((p) => p.text).join('');
    for (let i = 0; i < Array.from(text).length; i++) raw.push(line.start + (i * TYPE_CHAR_MS) / 1000);
  }
  // U2 日志（70ms/字）
  for (const line of T_U2) {
    const n = Array.from(line.full).length;
    for (let i = 0; i < n; i++) raw.push(line.start + (i * LOG_CHAR_MS) / 1000);
  }
  // U3 打字
  for (const line of T_U3) {
    const text = line.parts.map((p) => p.text).join('');
    for (let i = 0; i < Array.from(text).length; i++) raw.push(line.start + (i * TYPE_CHAR_MS) / 1000);
  }
  // 事件
  for (const ev of INSTANT_EVENTS) raw.push(ev.t);

  const uniq = [];
  const sorted = raw.filter((c) => c >= 0 && c < DURATION - 0.05).sort((a, b) => a - b);
  for (const c of sorted) {
    const q = Math.round(c * FPS) / FPS;
    if (!uniq.length || q - uniq[uniq.length - 1] >= 0.035) uniq.push(Number(q.toFixed(6)));
  }
  return uniq;
}

// ---------------------------------------------------------------------------
// 布局模型（与绘制一一对应）
// ---------------------------------------------------------------------------
const CLAWD_BODY_W = 40;
const CLAWD_BODY_H = 17;
const CLAWD_LEG_H = 7; // 与 companion 一致
const CLAWD_BOB = 2; // proud 有 -1 抬升，浮动 -1 → 顶部再上 2px

function textBox(x, y, str, size, align = 'left') {
  const w = measureTxt(str, size);
  const h = Math.ceil(size * 1.3);
  let dx = x;
  if (align === 'center') dx = x - w / 2;
  else if (align === 'right') dx = x - w;
  return [Math.floor(dx), y, Math.ceil(w), h];
}

function layoutAt(t) {
  const scene = sceneOf(t);
  const groups = {};

  const fg = [
    { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
    { name: 'clawd', box: [CLAWD.x, CLAWD.y - CLAWD_BOB, CLAWD_BODY_W, CLAWD_BODY_H + CLAWD_LEG_H + CLAWD_BOB] },
    { name: 'her', box: [HER.x, HER.y - 1, 16, 28 + 1] },
    { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
  ];
  if (scene === 2 && t >= 13.3 && t < 19.0) {
    fg.push({ name: 'thought', box: [THOUGHT.x, THOUGHT.y, THOUGHT.w, THOUGHT.h + 9] });
  }
  if (scene === 3 && t >= U3_NOTE_AT) {
    fg.push({ name: 'note', box: [NOTE.x, NOTE.y - 3, NOTE.w, NOTE.h + 3] });
  }
  groups.foreground = fg;

  groups.titleBar = [
    { name: 'btn_red', box: [TERM.x + 8, TERM.y + 7, 6, 6] },
    { name: 'btn_amber', box: [TERM.x + 18, TERM.y + 7, 6, 6] },
    { name: 'btn_green', box: [TERM.x + 28, TERM.y + 7, 6, 6] },
    { name: 'title_txt', box: textBox(TERM.x + TERM.w / 2, TERM.y + 5, TERM_TITLE, 10, 'center') },
  ];

  const content = [];
  const status = scene === 1 ? STATUS.U1 : scene === 2 ? STATUS.U2 : STATUS.U3;
  content.push({ name: 'status_txt', box: textBox(TEXT_X, STATUS_Y, status, 10) });

  if (scene === 1) {
    T_U1.forEach((l, i) => content.push({ name: `U1_row_${i + 1}`, box: textBox(TEXT_X, l.y, l.parts.map((p) => p.text).join(''), 10) }));
    content.push({ name: 'U1_bar', box: [TEXT_X, U1_BAR.y, barWidth(), 6] });
    content.push({ name: 'U1_pct', box: textBox(TEXT_X + barWidth() + 10, U1_BAR.y - 2, `${U1_BAR.pct}%`, 10) });
    content.push({ name: 'U1_bar_lbl', box: textBox(TEXT_X + barWidth() + 34, U1_BAR.y - 2, '— fetched', 10) });
    content.push({ name: 'U1_footer', box: textBox(TEXT_X, U1_FOOTER.y, U1_FOOTER.text, 10) });
  } else if (scene === 2) {
    // 每行含行尾「✓」
    T_U2.forEach((l, i) => {
      content.push({ name: `U2_row_${i + 1}`, box: textBox(TEXT_X, l.y, l.full, 10) });
      content.push({ name: `U2_check_${i + 1}`, box: textBox(TEXT_X + measureTxt(l.full, 10) + 6, l.y, '✓', 10) });
    });
  } else {
    T_U3.forEach((l, i) => content.push({ name: `U3_row_${i + 1}`, box: textBox(TEXT_X, l.y, l.parts.map((p) => p.text).join(''), 10) }));
    U3_FOOTER.forEach((f, i) => content.push({ name: `U3_footer_${i + 1}`, box: textBox(TEXT_X, f.y, f.text, 10) }));
  }
  groups.content = content;

  if (groups.foreground.some((g) => g.name === 'thought')) {
    const sym = t < 18.4 ? '...' : '!';
    groups.thought = [{ name: 'thought_txt', box: textBox(THOUGHT.x + THOUGHT.w / 2, THOUGHT.y + Math.round(THOUGHT.h / 2) - 7, sym, 12, 'center') }];
  }

  if (scene === 3 && t >= U3_NOTE_AT) {
    groups.note = [
      { name: 'tape', box: [NOTE.x + NOTE.w / 2 - 9, NOTE.y - 3, 18, 6] },
      { name: 'note_title', box: textBox(NOTE.x + NOTE.w / 2, NOTE.y + 12, '升级完成。', 12, 'center') },
      { name: 'note_sub', box: textBox(NOTE.x + NOTE.w / 2, NOTE.y + 32, 'Clawd · v2.0.0', 10, 'center') },
    ];
  }

  // 8. 粒子 / 星光特效
  const fx = [];
  for (const s of discoverSparks(t)) fx.push({ name: 'discover_star', box: [s.x, s.y, s.w, s.h] });
  for (const p of doneParticles(t)) fx.push({ name: 'done_px', box: [p.x, p.y, 2, 2] });
  if (scene === 3 && t >= 23.0) {
    // proud 星光（与 drawClawd proud 分支一致，随呼吸浮动 ±1）
    const by = CLAWD.y + (Math.sin(t * 2.2 + CLAWD.x * 0.01) > 0.45 ? -1 : 0) - 1;
    fx.push({ name: 'proud_star_l', box: [CLAWD.x - 6, by - 4, 2, 2] });
    fx.push({ name: 'proud_star_r', box: [CLAWD.x + 44, by - 3, 2, 2] });
  }
  if (fx.length) groups.fx = fx;

  groups.subtitle = [];
  for (let i = 0; i < SUB_LINES.length; i++) {
    const w = SUB_WINDOWS[i];
    if (t >= w.start && t < w.end) {
      groups.subtitle.push({ name: `sub_${i + 1}`, box: textBox(BW / 2, SUB.y + 13, SUB_LINES[i], 12, 'center') });
    }
  }

  return { scene, groups };
}

// ---------------------------------------------------------------------------
// 校验元数据
// ---------------------------------------------------------------------------
const CHECK_TITLE = '「Clawd 的升级」v2.0 Layout & Pixel Check (640×360, 0px tolerance)';
const BUBBLE_INNER = { x: 0, y: 0, w: 1, h: 1 }; // 本片无消息气泡
const THOUGHT_INNER = { x: THOUGHT.x + 4, y: THOUGHT.y + 4, w: THOUGHT.w - 8, h: THOUGHT.h - 8 };
const NOTE_INNER = { x: NOTE.x + 4, y: NOTE.y - 3, w: NOTE.w - 8, h: NOTE.h + 3 };

const TYPING_SCHEDULE = [
  { text: T_U1[0].parts.map((p) => p.text).join(''), start: T_U1[0].start, limit: 9.8, strictBefore: T_U1[1].start },
  { text: T_U1[1].parts.map((p) => p.text).join(''), start: T_U1[1].start, limit: 9.8, strictBefore: U1_BAR.start },
  // U2 五步日志为错峰并行滚动（真实安装日志形态），只要求在本场景内打完
  ...T_U2.map((l) => ({ text: l.full, start: l.start, limit: 19.8, charMs: LOG_CHAR_MS })),
  { text: T_U3[0].parts.map((p) => p.text).join(''), start: T_U3[0].start, limit: 29.8, strictBefore: T_U3[1].start },
  { text: T_U3[1].parts.map((p) => p.text).join(''), start: T_U3[1].start, limit: 29.8, strictBefore: 29.8 },
];

const AA_SAMPLES = [
  { text: '它发现了新版本。', size: 12, color: C.white },
  { text: '$ clawd: 发现新模块 v2.0.0', size: 10, color: C.text },
  { text: '[3/5] installing modules...', size: 10, color: C.text },
  { text: '✓ upgrade complete', size: 10, color: C.green },
  { text: 'Clawd · v2.0.0', size: 10, color: C.cardSub },
];

// ---------------------------------------------------------------------------
const renderer = createFrameRenderer(SCENES, OUT_DIR);

if (require.main === module) {
  if (process.argv.includes('--clicks')) {
    const clicks = getClickTimestamps();
    console.log(JSON.stringify({ count: clicks.length, clicks }));
  } else {
    renderer.renderAllFrames();
  }
}

module.exports = {
  BW, BH, FPS, DURATION, NFRAMES, TYPE_CHAR_MS, SUB_CHAR_MS, LOG_CHAR_MS,
  TERM, TEXT_X, TEXT_RIGHT, STATUS_Y, SUB, CLAWD, HER, NOTE, THOUGHT,
  C, SUB_LINES, SUB_WINDOWS, T_U1, T_U2, T_U3, U1_BAR, U1_FOOTER, U3_FOOTER,
  STATUS, TERM_TITLE, INSTANT_EVENTS, SCENES,
  drawTypedLine, drawProgressBar, barWidth, barColorFor, measureTxt, txt,
  clawdState, logProgress, sceneOf,
  SCALE: P.SCALE, FW: P.FW, FH: P.FH,
  BOUNDS: { content: P.CONTENT, titleBar: { x: TERM.x, y: TERM.y, w: TERM.w, h: TERM.h } },
  CHECK_TITLE, BUBBLE_INNER, THOUGHT_INNER, NOTE_INNER, TYPING_SCHEDULE, AA_SAMPLES,
  layoutAt, textBox,
  pixel: P,
  getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
