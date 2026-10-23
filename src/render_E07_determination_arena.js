#!/usr/bin/env node
'use strict';
// E07 · 目标 (determination) — finish before sunrise，时钟 23:58 → 00:00
// 30s / 1800 frames / 640×360 base → 1280×720 @ 60fps
//
//   S1 (0-10s) : `cat task.txt` = "finish before sunrise"，时钟 23:58，Clawd determined
//   S2 (10-20s): 终端快速滚动 build / test / deploy，时钟 23:59
//   S3 (20-30s): "deployed ✓"，时钟 00:00，Clawd 释然，字幕「赶上了。」
//
// 布局标准与 src/pixel_story_arena.js 一致：终端 440×200 @ (100,140)，正文 x=114。
// 时钟卡片固定在终端左侧空白区 (8,22) 84×58，作为 foreground extra 参与 0px 重叠检查。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E07_determination_arena');

const TITLES = {
  S1: 'clawd@dsh:~$ — task',
  S2: 'clawd@dsh:~$ — ship',
  S3: 'clawd@dsh:~$ — done',
};
const SUB_LINES = ['日出之前，必须完成。', '还有一分钟。', '赶上了。'];
const SUB_WINDOWS = [{ start: 2.6, end: 8.6 }, { start: 12.6, end: 18.6 }, { start: 23.0, end: 28.6 }];

const S1_LINES = [
  { y: LINE_Y[0], start: 0.7, parts: [{ text: '$ ', color: C.green }, { text: 'cat task.txt', color: C.text }] },
  { y: LINE_Y[1], start: 1.9, typed: false, parts: [{ text: 'finish before sunrise', color: C.amber }] },
  { y: LINE_Y[2], start: 3.2, parts: [{ text: '$ ', color: C.green }, { text: './ship.sh', color: C.text }] },
  { y: LINE_Y[3], start: 4.6, typed: false, parts: [{ text: 'queue: build → test → deploy', color: C.dim }] },
];
const S3_LINES = [
  { y: LINE_Y[0], start: 20.4, charMs: 70, parts: [{ text: '$ ', color: C.green }, { text: './ship.sh --status', color: C.text }] },
  { y: LINE_Y[1], start: 22.0, charMs: 60, parts: [{ text: 'deployed ✓', color: C.green }] },
  { y: LINE_Y[2], start: 23.4, typed: false, parts: [{ text: 'sunrise in 4h 42m', color: C.amber }] },
  { y: LINE_Y[3], start: 24.4, typed: false, parts: [{ text: 'nothing left in the queue.', color: C.dim }] },
  { y: LINE_Y[4], start: 25.6, parts: [{ text: '$ ', color: C.green }] },
];

// S2: a real scroll — events enter from the bottom and the window keeps the last 6.
const S2_EVENTS = [
  { at: 10.4, text: '[build] compiling 12 modules', color: C.dim },
  { at: 10.9, text: '[build] ok in 2.1s', color: C.green },
  { at: 11.4, text: '[test] 148 passed', color: C.green },
  { at: 11.9, text: '[test] 0 failed', color: C.green },
  { at: 12.4, text: '[lint] 0 errors', color: C.dim },
  { at: 12.9, text: '[deploy] packaging 4.2 MB', color: C.blue },
  { at: 13.4, text: '[deploy] uploading...', color: C.blue },
  { at: 13.9, text: '[deploy] 100%', color: C.blue },
  { at: 14.4, text: '[deploy] restarting service', color: C.blue },
  { at: 15.2, text: '[deploy] health check: 200', color: C.green },
  { at: 15.6, text: '[ready] hold for 00:00', color: C.amber },
];
const S2_CHAR_MS = 50;

const S1_STATUS = '[DSH] clock 23:58 · deadline sunrise';
const S2_STATUS = '[DSH] clock 23:59 · deploy in progress';
const S3_STATUS = '[DSH] clock 00:00 · state deployed';
const S1_STATUS_AT = 4.2;
const S2_STATUS_AT = 11.0;
const S3_STATUS_AT = 25.0;

// --- Clock card (left gutter) ---------------------------------------------
const CLOCK = { x: 8, y: 22, w: 84, h: 58 };

function clockTextAt(t) {
  return t < 10 ? '23:58' : t < 20 ? '23:59' : '00:00';
}

function drawClock(ctx, t) {
  const { x, y, w, h } = CLOCK;
  const text = clockTextAt(t);
  const col = t < 20 ? C.amber : C.green;
  S.px(ctx, x + 2, y + 2, w, h, 'rgba(0,0,0,0.16)');
  S.px(ctx, x, y, w, h, C.termBg);
  S.px(ctx, x, y, w, 2, C.termBd);
  S.px(ctx, x, y + h - 2, w, 2, C.termBd);
  S.px(ctx, x, y, 2, h, C.termBd);
  S.px(ctx, x + w - 2, y, 2, h, C.termBd);
  S.txt(ctx, x + w / 2, y + 6, 'TIME', C.dim, 10, 'center');
  S.txt(ctx, x + w / 2, y + 19, text, col, 14, 'center');
  S.txt(ctx, x + w / 2, y + 40, 'sunrise 06:12', C.dim, 10, 'center');
  // colon tick: a 2px dot that blinks once per second
  if (Math.floor(t * 2) % 2 === 0) S.px(ctx, x + w - 12, y + 24, 2, 2, col);
}

// --- Clawd moods -----------------------------------------------------------
function drawClawdMood(ctx, t, mood) {
  const { x, y } = S.CLAWD_ROOM;
  const base = mood === 'relieved' ? 'smile' : 'thinking';
  S.drawClawd(ctx, x, y, t, base, mood === 'relieved' ? 0.55 : 0);
  const by = Math.round(y + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  const body = base === 'thinking' ? C.clawdThink : C.clawdWarm;
  const clearEyes = () => {
    S.px(ctx, x + 9, by + 5, 6, 6, body);
    S.px(ctx, x + 25, by + 5, 6, 6, body);
  };
  if (mood === 'determined') {
    clearEyes();
    S.px(ctx, x + 10, by + 6, 4, 2, C.clawdEye);
    S.px(ctx, x + 26, by + 6, 4, 2, C.clawdEye);
    S.px(ctx, x + 13, by + 8, 2, 1, C.clawdEye);
    S.px(ctx, x + 26, by + 8, 2, 1, C.clawdEye);
    S.px(ctx, x + 17, by + 13, 6, 1, C.clawdEye);
  } else if (mood === 'relieved') {
    // soft closed eyes → the exhale after the deadline
    clearEyes();
    for (const ex of [10, 26]) {
      S.px(ctx, x + ex, by + 8, 4, 1, C.clawdEye);
      S.px(ctx, x + ex + 1, by + 7, 2, 1, C.clawdEye);
    }
  }
}

function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S1, C.amber);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= S1_STATUS_AT) S.drawStatus(ctx, S1_STATUS, C.amber);
  drawClock(ctx, t);
  drawClawdMood(ctx, t, 'determined');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function scrollRows(t) {
  const shown = S2_EVENTS.filter((e) => e.at <= t);
  const window = shown.slice(Math.max(0, shown.length - LINE_Y.length));
  return window.map((e, i) => {
    const chars = Array.from(e.text);
    const typed = Math.min(chars.length, Math.floor(((t - e.at) * 1000) / S2_CHAR_MS) + 1);
    return { text: e.text, color: e.color, y: LINE_Y[i], typed, chars };
  });
}

function drawScrollLine(ctx, row) {
  S.txt(ctx, TEXT_X, row.y, row.chars.slice(0, row.typed).join(''), row.color, 10);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S2, C.blue);
  for (const row of scrollRows(t)) drawScrollLine(ctx, row);
  if (t >= S2_STATUS_AT) S.drawStatus(ctx, S2_STATUS, C.blue);
  drawClock(ctx, t);
  drawClawdMood(ctx, t, 'determined');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0.18);
  S.drawTerminal(ctx, TITLES.S3, C.green);
  S.drawLines(ctx, S3_LINES, t);
  if (t >= S3_STATUS_AT) S.drawStatus(ctx, S3_STATUS, C.green);
  drawClock(ctx, t);
  drawClawdMood(ctx, t, 'relieved');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function renderAt(ctx, t) {
  if (t < 10) {
    drawS1(ctx, t);
    const dim = S.clamp01((t - 9.75) / 0.25);
    if (dim > 0) S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${dim.toFixed(3)})`);
  } else if (t < 10.25) {
    drawS2(ctx, t);
    const black = 1 - (t - 10) / 0.25;
    S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${S.clamp01(black).toFixed(3)})`);
  } else if (t < 20) {
    drawS2(ctx, t);
    const dim = S.clamp01((t - 19.75) / 0.25);
    if (dim > 0) S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${dim.toFixed(3)})`);
  } else if (t < 20.25) {
    drawS3(ctx, t);
    const black = 1 - (t - 20) / 0.25;
    S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${S.clamp01(black).toFixed(3)})`);
  } else {
    drawS3(ctx, t);
  }
}

function scrollClicks() {
  const out = [];
  for (const e of S2_EVENTS) {
    const n = Array.from(e.text).length;
    for (let i = 0; i < n; i++) out.push(e.at + (i * S2_CHAR_MS) / 1000);
  }
  return out;
}

function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(S1_LINES),
    ...S.lineClicks(S3_LINES),
    ...scrollClicks(),
  ]);
}

function typingSchedule(lines, limit) {
  const typed = lines.filter((line) => line.typed !== false);
  return typed.map((line, i) => ({
    text: S.lineText(line),
    start: line.start,
    charMs: line.charMs || S.TYPE_CHAR_MS,
    limit,
    strictBefore: i + 1 < typed.length ? typed[i + 1].start : undefined,
  }));
}
const TYPING_SCHEDULE = [...typingSchedule(S1_LINES, 9.8), ...typingSchedule(S3_LINES, 29.8)];

function contentLayoutAt(t) {
  if (t >= 10 && t < 20) {
    const rows = scrollRows(t);
    return rows.map((row, i) => ({ name: `row_${i + 1}`, box: S.textBox(TEXT_X, row.y, row.text, 10) }));
  }
  const lines = t < 10 ? S1_LINES : S3_LINES;
  return S.contentLayout(lines, t < 10 ? S1_STATUS : S3_STATUS);
}

function layoutAt(t) {
  const common = {
    subLines: SUB_LINES, subWindows: SUB_WINDOWS, t,
    extra: [{ name: 'clock_card', box: [CLOCK.x, CLOCK.y, CLOCK.w + 2, CLOCK.h + 2] }],
  };
  if (t < 10) {
    const base = S.baseLayout({ ...common, scene: 1, title: TITLES.S1, lines: S1_LINES, status: S1_STATUS });
    return base;
  }
  if (t < 20) {
    return {
      scene: 2,
      groups: {
        foreground: S.foregroundLayout({ ...common }),
        titleBar: S.titleLayout(TITLES.S2),
        content: contentLayoutAt(t),
        subtitle: S.subtitleLayout(SUB_LINES, SUB_WINDOWS, t),
      },
      bounds: { foreground: S.CANVAS_BOUNDS, titleBar: S.TITLE_BOUNDS, content: S.CONTENT, subtitle: S.SUB },
    };
  }
  return S.baseLayout({ ...common, scene: 3, title: TITLES.S3, lines: S3_LINES, status: S3_STATUS });
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
  OUT_DIR, TITLES, SUB_LINES, SUB_WINDOWS,
  S1_LINES, S3_LINES, S2_EVENTS,
  S1_STATUS, S2_STATUS, S3_STATUS,
  CLOCK, clockTextAt,
  CHECK_TITLE: 'E07 Determination v1.0 Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '$ cat task.txt', size: 10, color: C.text },
    { text: 'finish before sunrise', size: 10, color: C.amber },
    { text: '[deploy] packaging 4.2 MB', size: 10, color: C.blue },
    { text: 'deployed ✓', size: 10, color: C.green },
    { text: '赶上了。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  scrollRows,
  layoutAt,
  getClickTimestamps,
  drawClawdMood,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
