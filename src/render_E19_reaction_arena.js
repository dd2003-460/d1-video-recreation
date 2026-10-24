#!/usr/bin/env node
'use strict';
// E19 反应 (reaction) — 30s, 1800 frames @ 60fps.
// ERROR: segfault and Clawd's turn begin on the same display frame; the remaining stack log arrives later.
// 640×360 × SCALE=2 → 1280×720; 440×200 terminal; 10px Fusion Pixel.

const path = require('path');
const S = require('./pixel_story_arena');
const { C, LINE_Y } = S;
const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E19_reaction_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — service.log',
  S2: 'clawd@dsh:~ — fault detected',
  S3: 'clawd@dsh:~ — error.log',
};
const SUB_LINES = ['日志平稳地滚动。', '错误出现，它先转头。', '（比你快。）'];
const SUB_WINDOWS = [
  { start: 2.1, end: 8.7 },
  { start: 12.2, end: 19.2 },
  { start: 24.0, end: 29.2 },
];

const S1_LINES = [
  { y: LINE_Y[0], start: 0.45, charMs: 60, parts: [{ text: '$ ', color: C.green }, { text: './service --watch', color: C.text }] },
  { y: LINE_Y[1], start: 2.00, charMs: 50, cursor: false, parts: [{ text: '[00:14:02] INFO worker ready', color: C.dim }] },
  { y: LINE_Y[2], start: 3.70, charMs: 50, cursor: false, parts: [{ text: '[00:14:03] INFO queue depth: 0', color: C.green }] },
  { y: LINE_Y[3], start: 5.50, charMs: 50, cursor: false, parts: [{ text: '[00:14:04] INFO heartbeat: ok', color: C.dim }] },
  { y: LINE_Y[4], start: 7.20, charMs: 50, cursor: false, parts: [{ text: '[00:14:05] INFO idle', color: C.green }] },
];

const ERROR_AT = 10 + 16 / 60; // first un-faded frame of S2; exactly frame 616
const S2_LINES = [
  { y: LINE_Y[0], start: ERROR_AT, typed: false, cursor: false, parts: [{ text: 'ERROR: segfault', color: C.red }] },
  { y: LINE_Y[1], start: 11.0, charMs: 50, cursor: false, parts: [{ text: 'pid 431 received SIGSEGV', color: C.amber }] },
  { y: LINE_Y[2], start: 12.45, charMs: 50, cursor: false, parts: [{ text: 'worker.js:431 invalid memory access', color: C.red }] },
  { y: LINE_Y[3], start: 14.45, charMs: 50, cursor: false, parts: [{ text: 'stack trace: render_worker()', color: C.dim }] },
];
const ERROR_STATUS = '[DSH] response: first-frame interrupt';
const ERROR_STATUS_AT = 17.4;
const ERROR_MARKER_BOX = [106, LINE_Y[0], 4, 14];
const CLAWD_BOX = [S.CLAWD_ROOM.x, S.CLAWD_ROOM.y - 1, 40, 25];

const S3_LINES = [
  { y: LINE_Y[0], start: 20.45, charMs: 55, parts: [{ text: '$ ', color: C.green }, { text: 'cat /var/log/error.log', color: C.text }] },
  { y: LINE_Y[1], start: 21.95, charMs: 50, cursor: false, parts: [{ text: 'root cause: null write in worker.js:431', color: C.amber }] },
  { y: LINE_Y[2], start: 24.15, charMs: 50, cursor: false, parts: [{ text: 'fix: guard missing job before render', color: C.green }] },
  { y: LINE_Y[3], start: 26.25, charMs: 50, cursor: false, parts: [{ text: 'status: ready for restart', color: C.dim }] },
];

function drawGazeClawd(ctx, t) {
  const x = S.CLAWD_ROOM.x;
  const y = S.CLAWD_ROOM.y;
  const by = Math.round(y + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  S.drawClawd(ctx, x, y, t, 'calm', 0);
  // Keep the 4×4 eyes intact; move their 1×1 highlights to the right toward the ERROR row.
  S.px(ctx, x + 11, by + 7, 1, 1, C.clawdEye);
  S.px(ctx, x + 13, by + 7, 1, 1, C.white);
  S.px(ctx, x + 27, by + 7, 1, 1, C.clawdEye);
  S.px(ctx, x + 29, by + 7, 1, 1, C.white);
}
function drawErrorMarker(ctx, t) {
  if (t >= ERROR_AT) S.px(ctx, ERROR_MARKER_BOX[0], ERROR_MARKER_BOX[1], ERROR_MARKER_BOX[2], ERROR_MARKER_BOX[3], C.red);
}
function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0.08);
  S.drawTerminal(ctx, TITLES.S1, C.green);
  S.drawLines(ctx, S1_LINES, t);
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'calm', 0);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}
function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0.02);
  S.drawTerminal(ctx, TITLES.S2, C.red);
  if (t >= ERROR_AT && t < ERROR_AT + 0.55) {
    S.px(ctx, S.TEXT_X - 3, LINE_Y[0] - 3, S.TERM.w - 24, 17, 'rgba(255,123,114,0.12)');
  }
  drawErrorMarker(ctx, t);
  S.drawLines(ctx, S2_LINES, t);
  if (t >= ERROR_STATUS_AT) S.drawStatus(ctx, ERROR_STATUS, C.red);
  if (t >= ERROR_AT) drawGazeClawd(ctx, t);
  else S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'calm', 0);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}
function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0.42);
  S.drawTerminal(ctx, TITLES.S3, C.amber);
  S.drawLines(ctx, S3_LINES, t);
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, t >= 24.2 ? 'smile' : 'thinking', 0);
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
    ...S.lineClicks(S1_LINES),
    ...S.lineClicks(S2_LINES), ERROR_STATUS_AT,
    ...S.lineClicks(S3_LINES),
  ]);
}
function typingSchedule(lines, limit) {
  return lines.filter((line) => line.typed !== false).map((line, i, all) => ({
    text: S.lineText(line), start: line.start, charMs: line.charMs || S.TYPE_CHAR_MS,
    limit,
    strictBefore: i + 1 < all.length ? all[i + 1].start : undefined,
  }));
}
const TYPING_SCHEDULE = [
  ...typingSchedule(S1_LINES, 9.5),
  ...typingSchedule(S2_LINES, 19.4),
  ...typingSchedule(S3_LINES, 29.5),
];

function layoutAt(t) {
  if (t < 10) {
    return S.baseLayout({ scene: 1, title: TITLES.S1, lines: S1_LINES,
      subLines: SUB_LINES, subWindows: SUB_WINDOWS, t });
  }
  if (t < 20) {
    const layout = S.baseLayout({ scene: 2, title: TITLES.S2, lines: S2_LINES,
      status: t >= ERROR_STATUS_AT ? ERROR_STATUS : null,
      subLines: SUB_LINES, subWindows: SUB_WINDOWS, t });
    if (t >= ERROR_AT) layout.groups.content.push({ name: 'error_row_marker', box: ERROR_MARKER_BOX });
    layout.groups.foreground = S.foregroundLayout({ clawd: false, extra: [{ name: 'clawd_reaction', box: CLAWD_BOX }] });
    return layout;
  }
  return S.baseLayout({ scene: 3, title: TITLES.S3, lines: S3_LINES,
    clawd: true, subLines: SUB_LINES, subWindows: SUB_WINDOWS, t });
}

const renderer = S.createFrameRenderer(renderAt, OUT_DIR);
if (require.main === module) {
  if (process.argv.includes('--clicks')) console.log(JSON.stringify({ count: getClickTimestamps().length, clicks: getClickTimestamps() }));
  else renderer.renderAllFrames();
}

module.exports = {
  ...S,
  OUT_DIR, TITLES, SCENES, SUB_LINES, SUB_WINDOWS,
  S1_LINES, S2_LINES, S3_LINES,
  ERROR_AT, ERROR_STATUS, ERROR_STATUS_AT, ERROR_MARKER_BOX, CLAWD_BOX,
  CHECK_TITLE: 'E19 反应 (reaction) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: 'ERROR: segfault', size: 10, color: C.red },
    { text: 'worker.js:431 invalid memory access', size: 10, color: C.amber },
    { text: '（比你快。）', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
