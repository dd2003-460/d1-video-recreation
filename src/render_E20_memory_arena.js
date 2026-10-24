#!/usr/bin/env node
'use strict';
// E20 记忆 (memory) — 30s, 1800 frames @ 60fps.
// S1: /memory is 98% full. S2: old dreams are removed one by one. S3: at 61%, the last dream is kept.
// 640×360 × SCALE=2 → 1280×720; 440×200 terminal; 10px Fusion Pixel.

const path = require('path');
const S = require('./pixel_story_arena');
const { C, LINE_Y } = S;
const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E20_memory_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — memory',
  S2: 'clawd@dsh:~ — dreams',
  S3: 'clawd@dsh:~ — memory',
};
const SUB_LINES = ['1,024 个梦挤在一起。', '开始删掉一些。', '（这个不能删。）'];
const SUB_WINDOWS = [
  { start: 2.2, end: 8.8 },
  { start: 13.0, end: 19.2 },
  { start: 24.0, end: 29.2 },
];

const S1_LINES = [
  { y: LINE_Y[0], start: 0.5, charMs: 60, parts: [{ text: '$ ', color: C.green }, { text: 'df -h /memory', color: C.text }] },
  { y: LINE_Y[1], start: 1.8, charMs: 50, cursor: false, parts: [{ text: '/dev/nvme0n1  64G  63G  1.2G  98%', color: C.red }] },
  { y: LINE_Y[3], start: 4.25, charMs: 55, cursor: false, parts: [{ text: 'free space: 1.2G', color: C.amber }] },
];
const S1_STATUS = '[memory] critical: 98% used';
const S1_STATUS_AT = 6.15;
const S1_BAR_BOX = [S.TEXT_X, 220, 254, 8];

const S2_LINES = [
  { y: LINE_Y[0], start: 10.45, charMs: 60, parts: [{ text: '$ ', color: C.green }, { text: 'ls /memory/dreams/', color: C.text }] },
  { y: LINE_Y[1], start: 11.75, charMs: 55, cursor: false, parts: [{ text: '1,024 dreams found', color: C.amber }] },
  { y: LINE_Y[3], start: 12.75, typed: false, cursor: false, parts: [{ text: 'selection: oldest first', color: C.dim }] },
  { y: LINE_Y[4], start: 12.85, typed: false, cursor: false, parts: [{ text: 'auto-purge: enabled', color: C.dim }] },
];
const DELETION_EVENTS = [
  { start: 13.10, name: 'dream_0431', percent: 93 },
  { start: 14.00, name: 'dream_0432', percent: 88 },
  { start: 14.90, name: 'dream_0433', percent: 83 },
  { start: 15.80, name: 'dream_0434', percent: 78 },
  { start: 16.70, name: 'dream_0435', percent: 72 },
  { start: 17.60, name: 'dream_0436', percent: 66 },
  { start: 18.50, name: 'dream_0437', percent: 61 },
].map((event) => ({
  ...event,
  line: {
    y: LINE_Y[2], start: event.start, charMs: 50, cursor: false,
    parts: [{ text: `$ rm ${event.name}`, color: C.red }],
  },
}));
const S2_STATUS = '[purge] selected dreams removed';
const S2_STATUS_AT = 19.3;
const S2_BAR_BOX = [S.TEXT_X, 294, 254, 8];

const S3_LINES = [
  { y: LINE_Y[0], start: 20.45, charMs: 60, parts: [{ text: '$ ', color: C.green }, { text: 'df -h /memory', color: C.text }] },
  { y: LINE_Y[1], start: 21.75, charMs: 55, cursor: false, parts: [{ text: '/memory  61% used  39% free', color: C.green }] },
  { y: LINE_Y[2], start: 23.75, charMs: 60, cursor: false, parts: [{ text: 'dream_0001.keep', color: C.pink }] },
  { y: LINE_Y[3], start: 25.2, charMs: 60, cursor: false, parts: [{ text: 'retained: last dream', color: C.amber }] },
];
const S3_STATUS = '[memory] 1 dream intentionally kept';
const S3_STATUS_AT = 27.0;
const S3_BAR_BOX = [S.TEXT_X, 270, 254, 8];

function drawProgressBar(ctx, pct, y) {
  const blocks = Math.round((pct / 100) * 32);
  const color = pct >= 85 ? C.red : pct >= 70 ? C.amber : C.green;
  for (let i = 0; i < 32; i++) {
    S.px(ctx, S.TEXT_X + i * 8, y, 6, 8, i < blocks ? color : C.termTitle);
  }
}
function currentDeletion(t) {
  let current = null;
  for (const event of DELETION_EVENTS) if (t >= event.start) current = event;
  return current;
}
function memoryPercentAt(t) {
  let percent = 98;
  for (const event of DELETION_EVENTS) {
    const chars = Array.from(S.lineText(event.line)).length;
    const doneAt = event.start + ((chars - 1) * event.line.charMs) / 1000;
    if (t >= doneAt) percent = event.percent;
  }
  return percent;
}
function drawWorriedClawd(ctx, t) {
  const x = S.CLAWD_ROOM.x;
  const y = S.CLAWD_ROOM.y;
  const by = Math.round(y + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  S.drawClawd(ctx, x, y, t, 'thinking', 0);
  // Two short, slanted 4px brows give Clawd a worried frown while retaining the canonical pixel body.
  S.px(ctx, x + 9, by + 4, 5, 2, C.clawdThinkDark);
  S.px(ctx, x + 26, by + 4, 5, 2, C.clawdThinkDark);
  S.px(ctx, x + 16, by + 13, 2, 1, C.clawdEye);
  S.px(ctx, x + 18, by + 14, 4, 1, C.clawdEye);
  S.px(ctx, x + 22, by + 13, 2, 1, C.clawdEye);
}

function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0.03);
  S.drawTerminal(ctx, TITLES.S1, C.red);
  S.drawLines(ctx, S1_LINES, t);
  drawProgressBar(ctx, 98, S1_BAR_BOX[1]);
  if (t >= S1_STATUS_AT) S.drawStatus(ctx, S1_STATUS, C.red);
  drawWorriedClawd(ctx, t);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}
function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0.04);
  S.drawTerminal(ctx, TITLES.S2, C.amber);
  S.drawLines(ctx, S2_LINES, t);
  const event = currentDeletion(t);
  if (event) S.drawTypedLine(ctx, event.line, t);
  drawProgressBar(ctx, memoryPercentAt(t), S2_BAR_BOX[1]);
  if (t >= S2_STATUS_AT) S.drawStatus(ctx, S2_STATUS, C.amber);
  drawWorriedClawd(ctx, t);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}
function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0.35);
  S.drawTerminal(ctx, TITLES.S3, C.green);
  S.drawLines(ctx, S3_LINES, t);
  drawProgressBar(ctx, 61, S3_BAR_BOX[1]);
  if (t >= S3_STATUS_AT) S.drawStatus(ctx, S3_STATUS, C.green);
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'smile', 0);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

const SCENES = [
  { id: 'S1', start: 0, draw: drawS1 },
  { id: 'S2', start: 10, draw: drawS2 },
  { id: 'S3', start: 20, draw: drawS3 },
];
function renderAt(ctx, t) { S.renderScenes(ctx, t, SCENES); }
function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(S1_LINES), S1_STATUS_AT,
    ...S.lineClicks(S2_LINES),
    ...DELETION_EVENTS.flatMap((event) => S.lineClicks([event.line])),
    S2_STATUS_AT,
    ...S.lineClicks(S3_LINES), S3_STATUS_AT,
  ]);
}
function toTypingEntry(line, limit) {
  return {
    text: S.lineText(line), start: line.start, charMs: line.charMs || S.TYPE_CHAR_MS, limit,
  };
}
const TYPING_SCHEDULE = [
  ...S1_LINES.map((line) => toTypingEntry(line, 9.5)),
  ...S2_LINES.filter((line) => line.typed !== false).map((line) => toTypingEntry(line, 19.5)),
  ...DELETION_EVENTS.map((event) => toTypingEntry(event.line, 19.5)),
  ...S3_LINES.map((line) => toTypingEntry(line, 29.5)),
].sort((a, b) => a.start - b.start).map((entry, i, all) => ({
  ...entry,
  strictBefore: i + 1 < all.length ? all[i + 1].start : undefined,
}));

function layoutAt(t) {
  if (t < 10) {
    const layout = S.baseLayout({
      scene: 1, title: TITLES.S1, lines: S1_LINES,
      status: t >= S1_STATUS_AT ? S1_STATUS : null,
      subLines: SUB_LINES, subWindows: SUB_WINDOWS, t,
    });
    layout.groups.content.push({ name: 'memory_98_percent_bar', box: S1_BAR_BOX });
    return layout;
  }
  if (t < 20) {
    const event = currentDeletion(t);
    const lines = event ? [...S2_LINES, event.line] : S2_LINES;
    const layout = S.baseLayout({
      scene: 2, title: TITLES.S2, lines,
      status: t >= S2_STATUS_AT ? S2_STATUS : null,
      subLines: SUB_LINES, subWindows: SUB_WINDOWS, t,
    });
    layout.groups.content.push({ name: 'memory_purge_bar', box: S2_BAR_BOX });
    return layout;
  }
  const layout = S.baseLayout({
    scene: 3, title: TITLES.S3, lines: S3_LINES,
    status: t >= S3_STATUS_AT ? S3_STATUS : null,
    subLines: SUB_LINES, subWindows: SUB_WINDOWS, t,
  });
  layout.groups.content.push({ name: 'memory_61_percent_bar', box: S3_BAR_BOX });
  return layout;
}

const renderer = S.createFrameRenderer(renderAt, OUT_DIR);
if (require.main === module) {
  if (process.argv.includes('--clicks')) console.log(JSON.stringify({ count: getClickTimestamps().length, clicks: getClickTimestamps() }));
  else renderer.renderAllFrames();
}

module.exports = {
  ...S,
  OUT_DIR, TITLES, SCENES, SUB_LINES, SUB_WINDOWS,
  S1_LINES, S1_STATUS, S1_STATUS_AT, S1_BAR_BOX,
  S2_LINES, DELETION_EVENTS, S2_STATUS, S2_STATUS_AT, S2_BAR_BOX,
  S3_LINES, S3_STATUS, S3_STATUS_AT, S3_BAR_BOX,
  CHECK_TITLE: 'E20 记忆 (memory) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '/memory  61% used  39% free', size: 10, color: C.green },
    { text: '$ rm dream_0431', size: 10, color: C.red },
    { text: '（这个不能删。）', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
