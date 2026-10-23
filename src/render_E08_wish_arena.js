#!/usr/bin/env node
'use strict';
// E08 · 愿望 (wish) — 深夜打字又删掉，只剩光标
// 30s / 1800 frames / 640×360 base → 1280×720 @ 60fps
//
//   S1 (0-10s) : 打出「我想」→ 删掉
//   S2 (10-20s): 打出「如果我能」→ 删掉
//   S3 (20-30s): 只剩光标闪烁，字幕「（什么都不写了）」
//
// 与 E05-E07 同一套布局：终端 440×200 @ (100,140)，输入行 y=222，状态行 y=320。
// 这一集没有「被打印出来的行」，只有一个输入框：每次 type / backspace 各算一次按键。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E08_wish_arena');

const TITLES = {
  S1: 'clawd@dsh:~$ — draft',
  S2: 'clawd@dsh:~$ — draft',
  S3: 'clawd@dsh:~$ — draft',
};
const SUB_LINES = ['（打了两个字）', '（又删掉了）', '（什么都不写了）'];
const SUB_WINDOWS = [{ start: 5.4, end: 9.0 }, { start: 17.0, end: 19.4 }, { start: 22.4, end: 28.4 }];

const INPUT_Y = LINE_Y[2];

// type / backspace ops — the whole episode is one line that never gets sent
const OPS = [
  { at: 0.9, ch: '我' },
  { at: 1.4, ch: '想' },
  { at: 3.6, back: true },
  { at: 4.2, back: true },
  { at: 10.9, ch: '如' },
  { at: 11.35, ch: '果' },
  { at: 11.8, ch: '我' },
  { at: 12.25, ch: '能' },
  { at: 15.2, back: true },
  { at: 15.6, back: true },
  { at: 16.0, back: true },
  { at: 16.4, back: true },
];

function visibleAt(t) {
  const out = [];
  for (const op of OPS) {
    if (op.at > t) break;
    if (op.back) out.pop();
    else out.push(op.ch);
  }
  return out;
}

function statusAt(t) {
  if (t < 5.0) return '[DSH] draft: typing...';
  if (t < 10) return '[DSH] draft: unsent · 0 chars';
  if (t < 17.4) return '[DSH] draft: typing...';
  if (t < 20) return '[DSH] draft: unsent · 0 chars';
  return '[DSH] draft: unsent · cursor only';
}

const PROMPT = '$ ';
const CURSOR = { w: 6, h: 10 };

function blinkOn(t) {
  // slower than the terminal cursor: this one is thinking, not typing
  return Math.floor(t * 1.6) % 2 === 0;
}

// --- Clawd moods -----------------------------------------------------------
function drawClawdMood(ctx, t, mood) {
  const { x, y } = S.CLAWD_ROOM;
  S.drawClawd(ctx, x, y, t, 'calm', 0);
  const by = Math.round(y + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  if (mood === 'quiet') {
    // half-lidded eyes: present, but not asking for anything
    S.px(ctx, x + 10, by + 7, 4, 2, C.clawdEye);
    S.px(ctx, x + 26, by + 7, 4, 2, C.clawdEye);
    S.px(ctx, x + 18, by + 13, 4, 1, C.clawdEye);
  }
}

function drawInput(ctx, t) {
  const vis = visibleAt(t).join('');
  S.txt(ctx, TEXT_X, INPUT_Y, PROMPT, C.green, 10);
  const cx = TEXT_X + S.textWidth(PROMPT, 10);
  if (vis) S.txt(ctx, cx, INPUT_Y, vis, C.white, 10);
  const endX = cx + S.textWidth(vis, 10);
  if (blinkOn(t)) S.px(ctx, endX + 2, INPUT_Y, CURSOR.w, CURSOR.h, C.green);
}

function drawScene(ctx, t, scene) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES[`S${scene}`], C.purple);
  drawInput(ctx, t);
  S.drawStatus(ctx, statusAt(t), C.dim);
  drawClawdMood(ctx, t, 'quiet');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function renderAt(ctx, t) {
  if (t < 10) {
    drawScene(ctx, t, 1);
    const dim = S.clamp01((t - 9.75) / 0.25);
    if (dim > 0) S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${dim.toFixed(3)})`);
  } else if (t < 10.25) {
    drawScene(ctx, t, 2);
    const black = 1 - (t - 10) / 0.25;
    S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${S.clamp01(black).toFixed(3)})`);
  } else if (t < 20) {
    drawScene(ctx, t, 2);
    const dim = S.clamp01((t - 19.75) / 0.25);
    if (dim > 0) S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${dim.toFixed(3)})`);
  } else if (t < 20.25) {
    drawScene(ctx, t, 3);
    const black = 1 - (t - 20) / 0.25;
    S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${S.clamp01(black).toFixed(3)})`);
  } else {
    drawScene(ctx, t, 3);
  }
}

function getClickTimestamps() {
  // every typed character and every backspace is one keyboard click
  return S.quantizeClicks(OPS.map((op) => op.at));
}

// Type runs only; the three scenes share one input line.
const TYPING_SCHEDULE = [
  { text: '我想', start: 0.9, charMs: 500, limit: 9.8 },
  { text: '如果我能', start: 10.9, charMs: 450, limit: 19.8 },
];

function layoutAt(t) {
  const vis = visibleAt(t).join('');
  const lineText = PROMPT + vis;
  const cursorBox = [TEXT_X + S.textWidth(lineText, 10) + 2, INPUT_Y, CURSOR.w, CURSOR.h];
  const content = [
    { name: 'input_line', box: S.textBox(TEXT_X, INPUT_Y, lineText, 10) },
    { name: 'input_cursor', box: cursorBox },
    { name: 'status', box: S.textBox(TEXT_X, STATUS_Y, statusAt(t), 10) },
  ];
  const scene = t < 10 ? 1 : t < 20 ? 2 : 3;
  return {
    scene,
    groups: {
      foreground: S.foregroundLayout({ terminal: true, clawd: true, her: false }),
      titleBar: S.titleLayout(TITLES[`S${scene}`]),
      content,
      subtitle: S.subtitleLayout(SUB_LINES, SUB_WINDOWS, t),
    },
    bounds: {
      foreground: S.CANVAS_BOUNDS,
      titleBar: S.TITLE_BOUNDS,
      content: S.CONTENT,
      subtitle: S.SUB,
    },
  };
}

const renderer = S.createFrameRenderer(renderAt, OUT_DIR);

if (require.main === module) {
  if (process.argv.includes('--clicks')) {
    console.log(JSON.stringify({ count: getClickTimestamps().length, clicks: getClickTimestamps() }));
  } else {
    renderer.renderAllFrames();
  }
}

module.exports = {
  ...S,
  OUT_DIR, TITLES, SUB_LINES, SUB_WINDOWS, OPS, INPUT_Y,
  CHECK_TITLE: 'E08 Wish v1.0 Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '$ 我想', size: 10, color: C.white },
    { text: '$ 如果我能', size: 10, color: C.white },
    { text: '[DSH] draft: unsent · cursor only', size: 10, color: C.dim },
    { text: '（什么都不写了）', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  visibleAt,
  statusAt,
  layoutAt,
  getClickTimestamps,
  drawClawdMood,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
