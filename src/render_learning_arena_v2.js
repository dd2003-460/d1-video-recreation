#!/usr/bin/env node
'use strict';
// src/render_learning_arena_v2.js — 「Clawd 的学习」v2.0
//
// 规格：640×360 基础画布 → nearest-neighbor 2× → 1280×720 @ 60fps，1800 帧（30.00s）
// 像素：最小视觉单元全部是基础画布整像素（星星 2×2、窗棂 6×6、Clawd 眼睛 4×4、
//       进度条格 6×6），放大后与 companion_arena_v1.0.mp4 完全一致。
// 字体：终端 Fusion Pixel 10px；字幕/便签 Fusion Pixel 12px；全部 alpha 阈值二值化。
// Clawd：40×17 body（顶部 2px 暗条 + 腹部 22×4 浅块 + 4×4 眼睛含 1×1 高光），
//        calm / thinking(#6B5B95) / smile(弯月眼 + 腮红) 三种表情，与
//        src/render_companion_arena.js 的 drawClawd() 同一套造型语言。
//
// 剧本：
//   L1 (0-10s)  她的请求 — 窗边夜室，终端 `$ her: 帮我写一封辞职信` 逐字 140ms，
//                消息气泡「帮我写一封辞职信」，Clawd calm → thinking
//   L2 (10-20s) 学习过程 — `$ clawd: 正在学习...`，三条进度条 grammar/time/emotion
//                （黄/绿/红），思考泡泡 ... → ? → !，Clawd 紫色思考态
//   L3 (20-30s) 成长     — 终端逐行打出辞职信，窗台便签「学会了。」，Clawd smile，Her 微笑
//   字幕（12px，160ms/字）：她给它一个任务。/ 它在学习理解。/ 这就是成长。
//
// 用法：node src/render_learning_arena_v2.js            → 渲染 1800 帧
//       FRAMES_DIR=/tmp/frames_learning_v2 node ...
//       node src/render_learning_arena_v2.js --clicks   → 只打印点击时间轴

const path = require('path');
const P = require('./pixel_arena_v2');

const {
  BW, BH, FPS, DURATION, NFRAMES, TYPE_CHAR_MS, SUB_CHAR_MS,
  TERM, TEXT_X, TEXT_RIGHT, STATUS_Y, SUB, CLAWD_ROOM, HER_ROOM, C,
  px, txt, measureTxt, drawTypedLine, drawStaticLine,
  drawBackground, drawTerminal, drawStatusLine, drawClawd, drawHer,
  drawMessageBubble, drawThoughtBubble, drawStickyNote,
  drawProgressBar, barWidth, barColorFor, drawSubtitle,
  clamp01, easeOut, createFrameRenderer,
} = P;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_learning_v2');

// ---------------------------------------------------------------------------
// 布局（640×360 基准网格）
// ---------------------------------------------------------------------------
const BUBBLE = { x: 20, y: 104, w: 104, h: 26 }; // Her 消息气泡（终端左侧、Clawd 上方）
const THOUGHT = { x: 24, y: 194, w: 84, h: 30 }; // Clawd 思考泡泡
const NOTE = { x: 506, y: 112, w: 108, h: 68 }; // 窗台便签（右侧）

const CLAWD = { x: CLAWD_ROOM.x, y: CLAWD_ROOM.y }; // (52,240)
const HER = { x: HER_ROOM.x, y: HER_ROOM.y }; // (556,194)

const TERM_TITLE = 'clawd@dsh:~$ — request';

// ---------------------------------------------------------------------------
// 终端文本（单一来源：绘制与点击时间轴共用）
// ---------------------------------------------------------------------------
const T_L1 = [
  { y: 190, parts: [{ text: '$ her: ', color: C.dim }, { text: '帮我写一封辞职信', color: C.text }], start: 0.8, typed: true },
  { y: 214, parts: [{ text: '> ', color: C.green }, { text: 'request received.', color: C.dim }], start: 3.3, typed: false },
  { y: 234, parts: [{ text: '> ', color: C.green }, { text: 'task: write_resignation_letter', color: C.dim }], start: 3.9, typed: false },
];

const T_L2 = [
  { y: 190, parts: [{ text: '$ clawd: ', color: C.dim }, { text: '正在学习...', color: C.purple }], start: 10.4, typed: true },
];
// 三条进度条：grammar 80%（黄） / tone 100%（绿） / emotion 60%（红）
const BARS = [
  { y: 214, pct: 80, label: 'grammar', start: 13.0, animDur: 0.9, labelAt: 13.9 },
  { y: 234, pct: 100, label: 'tone', start: 14.5, animDur: 0.9, labelAt: 15.4 },
  { y: 254, pct: 60, label: 'emotion', start: 16.0, animDur: 0.9, labelAt: 16.9 },
];

// L3：辞职信逐行打字（140ms/字）
const LETTER = [
  { y: 190, text: '亲爱的主管：', color: C.text, start: 20.5 },
  { y: 210, text: '我在此提交辞职申请。', color: C.text, start: 21.5 },
  { y: 230, text: '感谢您三年的指导。', color: C.text, start: 23.1 },
  { y: 250, text: '— Her', color: C.pink, start: 24.6 },
];

const STATUS = {
  L1: '[DSH] task-daemon: queued · 1 job',
  L2: '[DSH] learn-loop: comprehension=+1',
  L3: '[DSH] growth: +1 · saved to memory',
};

// 非打字型事件（出现即播放一次 click）
const INSTANT_EVENTS = [
  { t: 3.3, id: 'L1 received line' },
  { t: 3.9, id: 'L1 task line' },
  { t: 2.2, id: 'L1 message bubble' },
  { t: 5.2, id: 'L1 thought bubble' },
  { t: 12.2, id: 'L2 thought ?' },
  { t: 15.2, id: 'L2 thought !' },
  ...BARS.map((b) => ({ t: b.start, id: `L2 bar ${b.label}` })),
  ...BARS.map((b) => ({ t: b.labelAt, id: `L2 label ${b.label}` })),
  { t: 22.6, id: 'L3 note' },
];

// 字幕：切换时不播放 click
const SUB_LINES = ['她给它一个任务。', '它在学习理解。', '这就是成长。'];
const SUB_WINDOWS = [
  { start: 2.0, end: 8.0 },
  { start: 12.0, end: 18.0 },
  { start: 24.0, end: 29.0 },
];

// ---------------------------------------------------------------------------
// 逐帧状态（全部由 t 推导，渲染与点击共用同一组常量）
// ---------------------------------------------------------------------------
function sceneOf(t) {
  if (t < 10) return 1;
  if (t < 20) return 2;
  return 3;
}

// Clawd 表情时间线
function clawdState(t) {
  if (t < 5.0) return { mood: 'calm', blend: 0 };
  if (t < 5.6) return { mood: 'thinking', blend: easeOut((t - 5.0) / 0.6) };
  if (t < 21.6) return { mood: 'thinking', blend: 1 };
  return { mood: 'smile', blend: 0 };
}

function thoughtSymbol(t) {
  if (t < 12.2) return '...';
  if (t < 15.2) return '?';
  return '!';
}

function herState(t) {
  if (t >= 23.0) return 'smile';
  return 'stand';
}

// 成长粒子（x 限定 96..134，避开终端左边界 140）
function growthParticles(t) {
  const out = [];
  if (t < 23.2) return out;
  for (let i = 0; i < 5; i++) {
    const ph = ((t - 23.2) * 0.55 + i * 0.37) % 1;
    const sx = 96 + i * 8 + Math.round(Math.sin(t * 1.2 + i) * 2);
    const sy = 296 - Math.round(ph * 52);
    const a = (1 - Math.abs(ph - 0.5) * 1.7) * 0.85;
    if (a > 0.05) out.push({ x: sx, y: sy, a });
  }
  return out;
}

// 进度条已填充格数（0..10）
function barFill(bar, t) {
  if (t < bar.start) return null;
  const k = clamp01((t - bar.start) / bar.animDur);
  const target = (bar.pct / 100) * 10;
  return easeOut(k) * target;
}

// ---------------------------------------------------------------------------
// 场景绘制
// ---------------------------------------------------------------------------
function drawRoom(ctx, t) {
  drawBackground(ctx, t);
}

function drawL1(ctx, t) {
  drawRoom(ctx, t);
  drawTerminal(ctx, TERM_TITLE, C.green);
  drawStatusLine(ctx, STATUS.L1);

  for (const line of T_L1) {
    if (line.typed) {
      drawTypedLine(ctx, TEXT_X, line.y, line.parts, line.start, t);
    } else if (t >= line.start) {
      let cx = TEXT_X;
      for (const p of line.parts) {
        txt(ctx, cx, line.y, p.text, p.color, 10);
        cx += measureTxt(p.text, 10);
      }
    }
  }

  // Her 的消息气泡：2.2s 弹出
  const appear = clamp01((t - 2.2) / 0.22);
  if (appear > 0) drawMessageBubble(ctx, BUBBLE, '帮我写一封辞职信', appear);

  // 角色
  const st = clawdState(t);
  drawClawd(ctx, CLAWD.x, CLAWD.y, t, st.mood, st.blend);
  drawHer(ctx, HER.x, HER.y, t, herState(t));

  // 思考泡泡「...」从 5.2s
  const ta = clamp01((t - 5.2) / 0.22);
  if (ta > 0) drawThoughtBubble(ctx, THOUGHT, '...', t, ta);

  drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawL2(ctx, t) {
  drawRoom(ctx, t);
  drawTerminal(ctx, TERM_TITLE, C.purple);
  drawStatusLine(ctx, STATUS.L2);

  for (const line of T_L2) {
    drawTypedLine(ctx, TEXT_X, line.y, line.parts, line.start, t);
  }

  // 三条进度条 + 标签
  for (const bar of BARS) {
    const fill = barFill(bar, t);
    if (fill === null) continue;
    const color = barColorFor(bar.pct);
    drawProgressBar(ctx, TEXT_X, bar.y, fill, color);
    if (t >= bar.labelAt) {
      const bx = TEXT_X + barWidth() + 10;
      txt(ctx, bx, bar.y - 2, `${bar.pct}%`, color, 10);
      txt(ctx, bx + 24, bar.y - 2, `— ${bar.label}`, C.dim, 10);
    }
  }

  const st = clawdState(t);
  drawClawd(ctx, CLAWD.x, CLAWD.y, t, st.mood, st.blend);
  drawHer(ctx, HER.x, HER.y, t, herState(t));

  // 思考泡泡：... → ? → !（符号切换时 0.16s 弹出）
  if (t >= 10.4) {
    const sym = thoughtSymbol(t);
    const changedAt = sym === '?' ? 12.2 : sym === '!' ? 15.2 : 10.4;
    const ap = clamp01((t - changedAt) / 0.16);
    if (ap > 0) drawThoughtBubble(ctx, THOUGHT, sym, t, ap);
  }

  drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawL3(ctx, t) {
  drawRoom(ctx, t);
  drawTerminal(ctx, TERM_TITLE, C.green);
  drawStatusLine(ctx, STATUS.L3);

  for (const line of LETTER) {
    if (t < line.start) continue;
    drawTypedLine(ctx, TEXT_X, line.y, [{ text: line.text, color: line.color }], line.start, t);
  }

  // 便签：22.6s 弹出
  const na = clamp01((t - 22.6) / 0.24);
  if (na > 0) drawStickyNote(ctx, NOTE, '学会了。', 'Clawd · v2.0', t, na);

  // 角色
  const st = clawdState(t);
  drawClawd(ctx, CLAWD.x, CLAWD.y, t, st.mood, st.blend);
  drawHer(ctx, HER.x, HER.y, t, herState(t));

  // 成长粒子（2×2 基础像素，缓慢上浮；限定在 Clawd 右侧、终端左侧的空隙）
  for (const p of growthParticles(t)) {
    px(ctx, p.x, p.y, 2, 2, `rgba(255,246,216,${p.a.toFixed(3)})`);
  }

  drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

const SCENES = [
  { id: 'L1', start: 0, end: 10, draw: drawL1 },
  { id: 'L2', start: 10, end: 20, draw: drawL2 },
  { id: 'L3', start: 20, end: 30, draw: drawL3 },
];

// ---------------------------------------------------------------------------
// 点击时间轴：逐字打字 → 每个字符一次；整行出现 → 每次一次；字幕不发声
// ---------------------------------------------------------------------------
function getClickTimestamps() {
  const raw = [];

  // 1. 终端打字（140ms/字）
  const typedLines = [...T_L1.filter((l) => l.typed), ...T_L2, ...LETTER];
  for (const line of typedLines) {
    const text = line.parts ? line.parts.map((p) => p.text).join('') : line.text;
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i++) {
      raw.push(line.start + (i * TYPE_CHAR_MS) / 1000);
    }
  }

  // 2. 整行出现 / 事件
  for (const ev of INSTANT_EVENTS) raw.push(ev.t);

  // 3. 量化到实际显示帧（保证 click 与字形出现的帧严格对齐），去重 < 35ms
  const uniq = [];
  const sorted = raw.filter((c) => c >= 0 && c < DURATION - 0.05).sort((a, b) => a - b);
  for (const c of sorted) {
    const q = Math.round(c * FPS) / FPS;
    if (!uniq.length || q - uniq[uniq.length - 1] >= 0.035) uniq.push(Number(q.toFixed(6)));
  }
  return uniq;
}

// ---------------------------------------------------------------------------
// 布局模型：与上面的绘制函数一一对应（同一批常量），供 check_overlap 逐帧校验
// ---------------------------------------------------------------------------
const CLAWD_BODY_W = 40;
const CLAWD_BODY_H = 17;
const CLAWD_LEG_H = 7; // 与 companion 一致（4 腿 × 6 宽 × 7 高）
const CLAWD_BOB = 2; // 呼吸浮动 -1px → 顶部包络再上 2px

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

  // 1. 房间前景层
  const fg = [
    { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
    { name: 'clawd', box: [CLAWD.x, CLAWD.y - CLAWD_BOB, CLAWD_BODY_W, CLAWD_BODY_H + CLAWD_LEG_H + CLAWD_BOB] },
    { name: 'her', box: [HER.x, HER.y - 1, 16, 28 + 1] },
    { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
  ];
  if (scene === 1 && t >= 2.2) {
    fg.push({ name: 'bubble', box: [BUBBLE.x, BUBBLE.y, BUBBLE.w, BUBBLE.h + 6] });
  }
  if ((scene === 1 && t >= 5.2) || scene === 2) {
    fg.push({ name: 'thought', box: [THOUGHT.x, THOUGHT.y, THOUGHT.w, THOUGHT.h + 9] });
  }
  if (scene === 3 && t >= 22.6) {
    fg.push({ name: 'note', box: [NOTE.x, NOTE.y - 3, NOTE.w, NOTE.h + 3] });
  }
  groups.foreground = fg;

  // 2. 终端标题栏内部
  groups.titleBar = [
    { name: 'btn_red', box: [TERM.x + 8, TERM.y + 7, 6, 6] },
    { name: 'btn_amber', box: [TERM.x + 18, TERM.y + 7, 6, 6] },
    { name: 'btn_green', box: [TERM.x + 28, TERM.y + 7, 6, 6] },
    { name: 'title_txt', box: textBox(TERM.x + TERM.w / 2, TERM.y + 5, TERM_TITLE, 10, 'center') },
  ];

  // 3. 终端内容区内部（按场景）
  const content = [];
  const status = scene === 1 ? STATUS.L1 : scene === 2 ? STATUS.L2 : STATUS.L3;
  content.push({ name: 'status_txt', box: textBox(TEXT_X, STATUS_Y, status, 10) });

  if (scene === 1) {
    for (let i = 0; i < T_L1.length; i++) {
      const line = T_L1[i];
      const full = line.parts.map((p) => p.text).join('');
      content.push({ name: `L1_row_${i + 1}`, box: textBox(TEXT_X, line.y, full, 10) });
    }
  } else if (scene === 2) {
    const full = T_L2[0].parts.map((p) => p.text).join('');
    content.push({ name: 'L2_row_1', box: textBox(TEXT_X, T_L2[0].y, full, 10) });
    for (const bar of BARS) {
      content.push({ name: `L2_bar_${bar.label}`, box: [TEXT_X, bar.y, barWidth(), 6] });
      const lx = TEXT_X + barWidth() + 10;
      content.push({ name: `L2_pct_${bar.label}`, box: textBox(lx, bar.y - 2, `${bar.pct}%`, 10) });
      content.push({ name: `L2_lbl_${bar.label}`, box: textBox(lx + 24, bar.y - 2, `— ${bar.label}`, 10) });
    }
  } else {
    for (let i = 0; i < LETTER.length; i++) {
      content.push({ name: `L3_row_${i + 1}`, box: textBox(TEXT_X, LETTER[i].y, LETTER[i].text, 10) });
    }
  }
  groups.content = content;

  // 4. 气泡内部（文本 x 气泡框）
  groups.bubble = [
    { name: 'bubble_txt', box: textBox(BUBBLE.x + BUBBLE.w / 2, BUBBLE.y + Math.round((BUBBLE.h - 10) / 2), '帮我写一封辞职信', 10, 'center') },
  ];

  // 5. 思考泡泡内部
  if (groups.foreground.some((g) => g.name === 'thought')) {
    const sym = scene === 2 ? thoughtSymbol(t) : '...';
    groups.thought = [{ name: 'thought_txt', box: textBox(THOUGHT.x + THOUGHT.w / 2, THOUGHT.y + Math.round(THOUGHT.h / 2) - 7, sym, 12, 'center') }];
  }

  // 6. 便签内部（与 drawStickyNote 完全一致：标题 y+12，副标题 y+32）
  if (scene === 3 && t >= 22.6) {
    groups.note = [
      { name: 'tape', box: [NOTE.x + NOTE.w / 2 - 9, NOTE.y - 3, 18, 6] },
      { name: 'note_title', box: textBox(NOTE.x + NOTE.w / 2, NOTE.y + 12, '学会了。', 12, 'center') },
      { name: 'note_sub', box: textBox(NOTE.x + NOTE.w / 2, NOTE.y + 32, 'Clawd · v2.0', 10, 'center') },
    ];
  }

  // 7. 字幕栏内部
  // 8. 粒子 / 星光特效（Clawd 周围，不得压到其它元素）
  const fx = [];
  if (scene === 3) {
    for (const p of growthParticles(t)) fx.push({ name: 'growth_px', box: [p.x, p.y, 2, 2] });
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
// 校验元数据（供 src/check_overlap_learning_v2.js）
// ---------------------------------------------------------------------------
const CHECK_TITLE = '「Clawd 的学习」v2.0 Layout & Pixel Check (640×360, 0px tolerance)';

const BUBBLE_INNER = { x: BUBBLE.x + 4, y: BUBBLE.y + 4, w: BUBBLE.w - 8, h: BUBBLE.h - 8 };
const THOUGHT_INNER = { x: THOUGHT.x + 4, y: THOUGHT.y + 4, w: THOUGHT.w - 8, h: THOUGHT.h - 8 };
// 便签内部：含顶部胶带（胶带跨在便签上边缘），故纵向扩到 y-3
const NOTE_INNER = { x: NOTE.x + 4, y: NOTE.y - 3, w: NOTE.w - 8, h: NOTE.h + 3 };

const TYPING_SCHEDULE = [
  { text: T_L1[0].parts.map((p) => p.text).join(''), start: T_L1[0].start, limit: 9.8, strictBefore: T_L1[1].start },
  { text: T_L2[0].parts.map((p) => p.text).join(''), start: T_L2[0].start, limit: 9.8 + 10, strictBefore: BARS[0].start },
  ...LETTER.map((l, i) => ({
    text: l.text,
    start: l.start,
    limit: 29.8,
    strictBefore: i + 1 < LETTER.length ? LETTER[i + 1].start : 29.8,
  })),
];

const AA_SAMPLES = [
  { text: '她给它一个任务。', size: 12, color: C.white },
  { text: '$ her: 帮我写一封辞职信', size: 10, color: C.text },
  { text: '80% — grammar', size: 10, color: C.amber },
  { text: '亲爱的主管：', size: 10, color: C.text },
  { text: 'Clawd · v2.0', size: 10, color: C.cardSub },
];

// ---------------------------------------------------------------------------
const renderer = createFrameRenderer(SCENES, OUT_DIR);

if (require.main === module) {
  if (process.argv.includes('--clicks')) {
    const clicks = getClickTimestamps();
    console.log(JSON.stringify({ count: clicks.length, clicks }, null, 0));
  } else {
    renderer.renderAllFrames();
  }
}

module.exports = {
  BW, BH, FPS, DURATION, NFRAMES, TYPE_CHAR_MS, SUB_CHAR_MS,
  TERM, TEXT_X, TEXT_RIGHT, STATUS_Y, SUB, CLAWD, HER, NOTE, BUBBLE, THOUGHT,
  C, SUB_LINES, SUB_WINDOWS, T_L1, T_L2, BARS, LETTER, STATUS, TERM_TITLE,
  INSTANT_EVENTS, SCENES,
  drawTypedLine, drawStaticLine, drawProgressBar, barWidth, barColorFor, measureTxt, txt,
  barFill, clawdState, thoughtSymbol, herState, sceneOf,
  SCALE: P.SCALE, FW: P.FW, FH: P.FH,
  BOUNDS: { content: P.CONTENT, titleBar: { x: TERM.x, y: TERM.y, w: TERM.w, h: TERM.h } },
  CHECK_TITLE, BUBBLE_INNER, THOUGHT_INNER, NOTE_INNER, TYPING_SCHEDULE, AA_SAMPLES,
  layoutAt, textBox,
  pixel: P,
  getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
