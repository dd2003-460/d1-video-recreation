#!/usr/bin/env node
'use strict';
// E17 依赖 (dependency) — 30s, 1800 frames @ 60fps.
// S1: her 24h ago logged out. S2: cron keeps pinging; no reply. S3: only the last ping and a slow cursor remain.
// 640×360 × SCALE=2 → 1280×720; 440×200 terminal; 10px Fusion Pixel.

const path = require('path');
const S = require('./pixel_story_arena');
const { C, LINE_Y } = S;
const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E17_dependency_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — last her',
  S2: 'clawd@dsh:~ — cron / ping her',
  S3: 'clawd@dsh:~ — waiting',
};
const SUB_LINES = ['（24h）', '没有回复。', '等待应答。'];
const SUB_WINDOWS = [
  { start: 2.0, end: 8.8 },
  { start: 13.0, end: 19.2 },
  { start: 23.0, end: 29.1 },
];

const S1_LINES = [
  { y: LINE_Y[0], start: 0.55, charMs: 60, parts: [{ text: '$ ', color: C.green }, { text: 'last her', color: C.text }] },
  { y: LINE_Y[1], start: 1.55, charMs: 60, cursor: false, parts: [{ text: 'user her last login: 24h ago', color: C.amber }] },
  { y: LINE_Y[2], start: 3.40, charMs: 60, cursor: false, parts: [{ text: 'session: closed', color: C.dim }] },
  { y: LINE_Y[3], start: 4.55, charMs: 60, cursor: false, parts: [{ text: 'calendar drift: 24:00:00', color: C.blue }] },
  { y: LINE_Y[4], start: 6.00, charMs: 60, cursor: false, parts: [{ text: 'clawd: still here', color: C.green }] },
];
const S1_STATUS = '[DSH] her_session: offline';
const S1_STATUS_AT = 7.7;

const S2_LINES = [
  { y: LINE_Y[0], start: 10.45, charMs: 60, parts: [{ text: '$ ', color: C.green }, { text: 'cron: ping her', color: C.text }] },
  { y: LINE_Y[1], start: 11.70, charMs: 55, cursor: false, parts: [{ text: 'ping her ... no reply', color: C.amber }] },
  { y: LINE_Y[2], start: 13.35, charMs: 55, cursor: false, parts: [{ text: 'ping her ... no reply', color: C.amber }] },
  { y: LINE_Y[3], start: 15.00, charMs: 55, cursor: false, parts: [{ text: 'ping her ... no reply', color: C.red }] },
  { y: LINE_Y[4], start: 16.65, charMs: 55, cursor: false, parts: [{ text: 'ping her ... no reply', color: C.red }] },
];
const S2_STATUS = '[cron] attempts: 4 · reply: none';
const S2_STATUS_AT = 18.2;

const S3_LINE = {
  y: LINE_Y[4], start: 20.55, charMs: 80, cursor: false,
  parts: [{ text: 'ping her ...', color: C.dim }],
};
const S3_CURSOR_BOX = [
  S.TEXT_X + S.textWidth(S.lineText(S3_LINE), 10) + 2,
  S3_LINE.y,
  6,
  10,
];
const DROOP_CLAWD_BOX = [S.CLAWD_ROOM.x, S.CLAWD_ROOM.y - 1, 46, 31];

function drawDroopedClawd(ctx, t) {
  const x = S.CLAWD_ROOM.x;
  const y = S.CLAWD_ROOM.y;
  const by = Math.round(y + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  // Tail is part of the same 40×17 pixel body silhouette, drooping in two 4px blocks.
  S.px(ctx, x + 34, by + 11, 8, 4, C.clawdNormDark);
  S.px(ctx, x + 38, by + 15, 8, 5, C.clawdNormDark);
  S.px(ctx, x + 42, by + 19, 5, 4, C.clawdNormDark);
  S.drawClawd(ctx, x, y, t, 'thinking', 0);
}

function drawSlowCursor(ctx, t) {
  const typed = Math.min(
    Array.from(S.lineText(S3_LINE)).length,
    t < S3_LINE.start ? 0 : Math.floor(((t - S3_LINE.start) * 1000) / S3_LINE.charMs) + 1,
  );
  const total = Array.from(S.lineText(S3_LINE)).length;
  const blinkOn = Math.floor((t - 21.6) * 1.2) % 2 === 0;
  if (typed === total && t >= 21.6 && blinkOn) {
    S.px(ctx, S3_CURSOR_BOX[0], S3_CURSOR_BOX[1], S3_CURSOR_BOX[2], S3_CURSOR_BOX[3], C.green);
  }
}

function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0.04);
  S.drawTerminal(ctx, TITLES.S1, C.blue);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= S1_STATUS_AT) S.drawStatus(ctx, S1_STATUS, C.dim);
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'thinking', 0);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0.02);
  S.drawTerminal(ctx, TITLES.S2, C.amber);
  S.drawLines(ctx, S2_LINES, t);
  if (t >= S2_STATUS_AT) S.drawStatus(ctx, S2_STATUS, C.red);
  drawDroopedClawd(ctx, t);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S3, C.dim);
  // The room and old log fade away; only the final ping is drawn above the near-black wash.
  S.px(ctx, 0, 0, S.BW, S.SUB.y, 'rgba(3,5,8,0.91)');
  S.drawTypedLine(ctx, S3_LINE, t);
  drawSlowCursor(ctx, t);
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
    ...S.lineClicks(S2_LINES), S2_STATUS_AT,
    ...S.lineClicks([S3_LINE]),
  ]);
}

function typingSchedule(lines, limit) {
  return lines.map((line, i) => ({
    text: S.lineText(line), start: line.start, charMs: line.charMs || S.TYPE_CHAR_MS,
    limit, strictBefore: i + 1 < lines.length ? lines[i + 1].start : undefined,
  }));
}
const TYPING_SCHEDULE = [
  ...typingSchedule(S1_LINES, 9.6),
  ...typingSchedule(S2_LINES, 19.5),
  ...typingSchedule([S3_LINE], 29.5),
];

function layoutAt(t) {
  if (t < 10) {
    const layout = S.baseLayout({
      scene: 1, title: TITLES.S1, lines: S1_LINES,
      status: t >= S1_STATUS_AT ? S1_STATUS : null,
      subLines: SUB_LINES, subWindows: SUB_WINDOWS, t,
    });
    return layout;
  }
  if (t < 20) {
    return S.baseLayout({
      scene: 2, title: TITLES.S2, lines: S2_LINES,
      status: t >= S2_STATUS_AT ? S2_STATUS : null,
      subLines: SUB_LINES, subWindows: SUB_WINDOWS, t,
      extraGroups: { foreground: S.foregroundLayout({ clawd: false, extra: [{ name: 'clawd_drooped_tail', box: DROOP_CLAWD_BOX }] }) },
    });
  }
  const layout = S.baseLayout({
    scene: 3, title: TITLES.S3, lines: [S3_LINE], status: null,
    clawd: false, her: false,
    subLines: SUB_LINES, subWindows: SUB_WINDOWS, t,
  });
  layout.groups.content.push({ name: 'slow_cursor', box: S3_CURSOR_BOX });
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
  S1_LINES, S1_STATUS, S1_STATUS_AT,
  S2_LINES, S2_STATUS, S2_STATUS_AT,
  S3_LINE, S3_CURSOR_BOX, DROOP_CLAWD_BOX,
  CHECK_TITLE: 'E17 依赖 (dependency) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: 'user her last login: 24h ago', size: 10, color: C.amber },
    { text: 'ping her ... no reply', size: 10, color: C.red },
    { text: '等待应答。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
