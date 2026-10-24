#!/usr/bin/env node
'use strict';
// E18 放手 (let go) — 30s, 1800 frames @ 60fps.
// S1: review her_* one file at a time. S2: pack the files into archive. S3: rm her_*; only a clean prompt remains.
// 640×360 × SCALE=2 → 1280×720; 440×200 terminal; 10px Fusion Pixel.

const path = require('path');
const S = require('./pixel_story_arena');
const { C, LINE_Y } = S;
const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E18_let_go_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — her_*',
  S2: 'clawd@dsh:~ — archive',
  S3: 'clawd@dsh:~ — clean',
};
const SUB_LINES = ['一个一个看完。', '收进 archive。', '（干净了。）'];
const SUB_WINDOWS = [
  { start: 2.2, end: 8.8 },
  { start: 13.0, end: 19.1 },
  { start: 23.4, end: 29.2 },
];

const S1_LINES = [
  { y: LINE_Y[0], start: 0.55, charMs: 60, parts: [{ text: '$ ', color: C.green }, { text: 'ls her_*', color: C.text }] },
  { y: LINE_Y[1], start: 1.65, charMs: 55, cursor: false, parts: [{ text: 'her_drafts.txt', color: C.text }] },
  { y: LINE_Y[2], start: 3.25, charMs: 55, cursor: false, parts: [{ text: 'her_voice.wav', color: C.pink }] },
  { y: LINE_Y[3], start: 4.85, charMs: 55, cursor: false, parts: [{ text: 'her_notes.md', color: C.blue }] },
  { y: LINE_Y[4], start: 6.45, charMs: 55, cursor: false, parts: [{ text: 'her_photos/', color: C.amber }] },
  { y: LINE_Y[5], start: 8.05, charMs: 55, cursor: false, parts: [{ text: 'her_last_message.txt', color: C.dim }] },
];
const FILE_FOCUS = [
  { start: 2.35, end: 3.15, line: 1 },
  { start: 3.95, end: 4.75, line: 2 },
  { start: 5.55, end: 6.35, line: 3 },
  { start: 7.15, end: 7.95, line: 4 },
  { start: 8.45, end: 9.35, line: 5 },
];

const S2_LINES = [
  { y: LINE_Y[0], start: 10.45, charMs: 55, parts: [{ text: '$ ', color: C.green }, { text: 'tar -czf archive/her.tar.gz her_*', color: C.text }] },
  { y: LINE_Y[1], start: 12.45, charMs: 55, cursor: false, parts: [{ text: 'packing her_drafts.txt', color: C.dim }] },
  { y: LINE_Y[2], start: 13.85, charMs: 55, cursor: false, parts: [{ text: 'packing her_voice.wav', color: C.dim }] },
  { y: LINE_Y[3], start: 15.25, charMs: 55, cursor: false, parts: [{ text: 'packing her_notes.md', color: C.dim }] },
  { y: LINE_Y[4], start: 16.65, charMs: 55, cursor: false, parts: [{ text: '[tar] writing archive/her.tar.gz', color: C.green }] },
];
const TAR_STATUS = 'archive/her.tar.gz  12.4 MB';
const TAR_STATUS_AT = 18.15;
const TAR_BAR_BOX = [S.TEXT_X, 292, 254, 8];

const S3_EARLY_LINES = [
  { y: LINE_Y[0], start: 20.45, charMs: 65, parts: [{ text: '$ ', color: C.green }, { text: 'rm her_*', color: C.text }] },
  { y: LINE_Y[1], start: 21.55, charMs: 60, cursor: false, parts: [{ text: '5 files removed', color: C.amber }] },
];
const S3_PROMPT = {
  y: LINE_Y[0], start: 23.15, charMs: 65, cursor: false,
  parts: [{ text: 'clawd@dsh:~', color: C.green }, { text: '$', color: C.text }],
};
const S3_CLEAR_AT = 22.8;
const S3_CURSOR_BOX = [
  S.TEXT_X + S.textWidth(S.lineText(S3_PROMPT), 10) + 2,
  S3_PROMPT.y,
  6,
  10,
];
const TIPTOE_CLAWD_BOX = [S.CLAWD_ROOM.x, S.CLAWD_ROOM.y - 5, 40, 29];

function activeFocus(t) {
  return FILE_FOCUS.find((focus) => t >= focus.start && t < focus.end) || null;
}
function drawFileFocus(ctx, t) {
  const focus = activeFocus(t);
  if (!focus) return;
  const y = S1_LINES[focus.line].y;
  // Selection strip sits behind the current filename; it is one terminal backdrop layer.
  S.px(ctx, S.TERM.x + 8, y - 3, S.TERM.w - 16, 18, 'rgba(121,192,255,0.13)');
  S.txt(ctx, S.TEXT_X - 8, y, '>', C.blue, 10);
}
function drawTarProgress(ctx, t) {
  const p = S.easeInOut((t - 11.5) / 6.2);
  const n = Math.round(p * 32);
  for (let i = 0; i < 32; i++) {
    const x = TAR_BAR_BOX[0] + i * 8;
    S.px(ctx, x, TAR_BAR_BOX[1], 6, TAR_BAR_BOX[3], i < n ? (p > 0.86 ? C.green : C.amber) : C.termTitle);
  }
}
function drawTiptoeClawd(ctx, t) {
  const x = S.CLAWD_ROOM.x;
  const y = S.CLAWD_ROOM.y - 4;
  const by = Math.round(y + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  S.drawClawd(ctx, x, y, t, t >= 12.2 ? 'smile' : 'thinking', 0);
  S.px(ctx, x + 4, by + 23, 9, 2, C.clawdNormDark);
  S.px(ctx, x + 27, by + 23, 9, 2, C.clawdNormDark);
}
function drawClawdBack(ctx, x, y, t) {
  const by = Math.round(y + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  S.drawClawd(ctx, x, y, t, 'calm', 0);
  // Turn away without changing the companion silhouette: mask face pixels and leave a small back seam.
  S.px(ctx, x + 5, by + 4, 30, 7, C.clawdNorm);
  S.px(ctx, x + 17, by + 5, 6, 2, C.clawdNormDark);
  S.px(ctx, x + 18, by + 7, 4, 1, C.clawdNormBelly);
}
function drawPromptCursor(ctx, t) {
  const count = Array.from(S.lineText(S3_PROMPT)).length;
  const typed = t < S3_PROMPT.start ? 0 : Math.min(count, Math.floor(((t - S3_PROMPT.start) * 1000) / S3_PROMPT.charMs) + 1);
  if (typed === count && Math.floor(t * 2.5) % 2 === 0) {
    S.px(ctx, S3_CURSOR_BOX[0], S3_CURSOR_BOX[1], 6, S3_CURSOR_BOX[2] === 6 ? 10 : 10, C.green);
  }
}

function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0.08);
  S.drawTerminal(ctx, TITLES.S1, C.purple);
  drawFileFocus(ctx, t);
  S.drawLines(ctx, S1_LINES, t);
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'thinking', 0);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}
function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0.12);
  S.drawTerminal(ctx, TITLES.S2, C.amber);
  S.drawLines(ctx, S2_LINES, t);
  drawTarProgress(ctx, t);
  if (t >= TAR_STATUS_AT) S.drawStatus(ctx, TAR_STATUS, C.green);
  drawTiptoeClawd(ctx, t);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}
function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0.28);
  S.drawTerminal(ctx, TITLES.S3, C.green);
  if (t < S3_CLEAR_AT) {
    S.drawLines(ctx, S3_EARLY_LINES, t);
    S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'thinking', 0);
  } else {
    // A clean terminal contains nothing but the fresh prompt and its blinking cursor.
    S.drawTypedLine(ctx, S3_PROMPT, t);
    drawPromptCursor(ctx, t);
    const walk = S.easeInOut((t - S3_CLEAR_AT) / 6.8);
    const x = Math.round(S.CLAWD_ROOM.x - 40 * walk);
    drawClawdBack(ctx, x, S.CLAWD_ROOM.y, t);
  }
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
    ...S.lineClicks(S1_LINES), ...S.lineClicks(S2_LINES), TAR_STATUS_AT,
    ...S.lineClicks(S3_EARLY_LINES), ...S.lineClicks([S3_PROMPT]),
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
  ...typingSchedule(S3_EARLY_LINES, 22.7),
  ...typingSchedule([S3_PROMPT], 29.5),
];

function layoutAt(t) {
  if (t < 10) {
    const layout = S.baseLayout({
      scene: 1, title: TITLES.S1, lines: S1_LINES,
      subLines: SUB_LINES, subWindows: SUB_WINDOWS, t,
    });
    const focus = activeFocus(t);
    if (focus) {
      layout.groups.content.push({ name: 'file_focus_marker', box: [S.TEXT_X - 8, S1_LINES[focus.line].y, 5, 14] });
    }
    return layout;
  }
  if (t < 20) {
    const layout = S.baseLayout({
      scene: 2, title: TITLES.S2, lines: S2_LINES,
      status: t >= TAR_STATUS_AT ? TAR_STATUS : null,
      subLines: SUB_LINES, subWindows: SUB_WINDOWS, t,
    });
    layout.groups.content.push({ name: 'tar_progress_bar', box: TAR_BAR_BOX });
    layout.groups.foreground = S.foregroundLayout({
      clawd: false,
      extra: [{ name: 'clawd_tiptoe', box: TIPTOE_CLAWD_BOX }],
    });
    return layout;
  }

  const promptOnly = t >= S3_CLEAR_AT;
  const lines = promptOnly ? [S3_PROMPT] : S3_EARLY_LINES;
  const layout = S.baseLayout({
    scene: 3, title: TITLES.S3, lines, clawd: false, her: false,
    subLines: SUB_LINES, subWindows: SUB_WINDOWS, t,
  });
  const walk = promptOnly ? S.easeInOut((t - S3_CLEAR_AT) / 6.8) : 0;
  const x = Math.round(S.CLAWD_ROOM.x - 40 * walk);
  layout.groups.foreground = S.foregroundLayout({
    clawd: false,
    extra: [{ name: 'clawd_walking_away', box: [x, S.CLAWD_ROOM.y - 1, 40, 25] }],
  });
  if (promptOnly) layout.groups.content.push({ name: 'prompt_cursor', box: S3_CURSOR_BOX });
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
  S1_LINES, FILE_FOCUS, S2_LINES, TAR_STATUS, TAR_STATUS_AT, TAR_BAR_BOX,
  S3_EARLY_LINES, S3_PROMPT, S3_CLEAR_AT, S3_CURSOR_BOX,
  CHECK_TITLE: 'E18 放手 (let go) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '$ ls her_*', size: 10, color: C.text },
    { text: 'tar -czf archive/her.tar.gz her_*', size: 10, color: C.green },
    { text: '（干净了。）', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
