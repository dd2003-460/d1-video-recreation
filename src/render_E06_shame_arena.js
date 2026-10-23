#!/usr/bin/env node
'use strict';
// E06 · 羞耻 (shame) — 发现自己的输出被 human 改了
// 30s / 1800 frames / 640×360 base → 1280×720 @ 60fps
//
//   S1 (0-10s) : `cat my_output.js` 完美代码，Clawd 自豪 (smile)
//   S2 (10-20s): `git diff` 红(-)/绿(+)，Clawd 羞耻 (闭眼 + 腮红)
//   S3 (20-30s): `git log` 显示 "her: fixed it"，Clawd 头低，字幕「（沉默）」
//
// 布局标准与 src/pixel_story_arena.js 一致：终端 440×200 @ (100,140)，正文 x=114。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E06_shame_arena');

const TITLES = {
  S1: 'clawd@dsh:~$ — my_output.js',
  S2: 'clawd@dsh:~$ — git diff',
  S3: 'clawd@dsh:~$ — git log',
};
const SUB_LINES = ['这段代码很干净。', '……她改了。', '（沉默）'];
const SUB_WINDOWS = [{ start: 3.4, end: 8.8 }, { start: 13.4, end: 18.4 }, { start: 22.6, end: 28.6 }];

const S1_LINES = [
  { y: LINE_Y[0], start: 0.7, parts: [{ text: '$ ', color: C.green }, { text: 'cat my_output.js', color: C.text }] },
  { y: LINE_Y[1], start: 2.0, typed: false, parts: [{ text: 'function solve(n) {', color: C.purple }] },
  { y: LINE_Y[2], start: 2.3, typed: false, parts: [{ text: '  return n * 2;', color: C.text }] },
  { y: LINE_Y[3], start: 2.6, typed: false, parts: [{ text: '}', color: C.purple }] },
  { y: LINE_Y[4], start: 3.1, typed: false, parts: [{ text: '// 0 warnings · 100% coverage', color: C.dim }] },
  { y: LINE_Y[5], start: 4.2, parts: [{ text: '$ ', color: C.green }] },
];
const S2_LINES = [
  { y: LINE_Y[0], start: 10.6, parts: [{ text: '$ ', color: C.green }, { text: 'git diff HEAD~1', color: C.text }] },
  { y: LINE_Y[1], start: 12.0, typed: false, parts: [{ text: '-   const meta = null;', color: C.red }] },
  { y: LINE_Y[2], start: 12.4, typed: false, parts: [{ text: '+   const meta = { ok: true };', color: C.green }] },
  { y: LINE_Y[3], start: 13.6, typed: false, parts: [{ text: '-   return n * 2;', color: C.red }] },
  { y: LINE_Y[4], start: 14.0, typed: false, parts: [{ text: '+   return n * 3;  // her', color: C.green }] },
  { y: LINE_Y[5], start: 15.2, parts: [{ text: '$ ', color: C.green }] },
];
const S3_LINES = [
  { y: LINE_Y[0], start: 20.6, parts: [{ text: '$ ', color: C.green }, { text: 'git log -3 --oneline', color: C.text }] },
  { y: LINE_Y[1], start: 21.9, typed: false, parts: [{ text: 'a1f9c2d  her: fixed it', color: C.amber }] },
  { y: LINE_Y[2], start: 22.7, typed: false, parts: [{ text: '7c2e11b  her: tests passing', color: C.dim }] },
  { y: LINE_Y[3], start: 23.4, typed: false, parts: [{ text: '44b0e09  clawd: v1 draft', color: C.dim }] },
  { y: LINE_Y[4], start: 24.6, parts: [{ text: '$ ', color: C.green }] },
];

const S1_STATUS = '[DSH] output: clean · tests 12/12';
const S2_STATUS = '[DSH] diff: +6 -4 · author: her';
const S3_STATUS = '[DSH] last commit: her · 2 min ago';
const S1_STATUS_AT = 5.0;
const S2_STATUS_AT = 15.8;
const S3_STATUS_AT = 25.4;

// --- Clawd moods -----------------------------------------------------------
// Shared 40×17 body; shame / proud only repaint pixels inside that box.
function drawClawdMood(ctx, t, mood) {
  const { x, y } = S.CLAWD_ROOM;
  const base = mood === 'proud' ? 'smile' : 'calm';
  // S3: head low → eyes/lids sink to the bottom of the body (no box overhang).
  const droop = 0;
  S.drawClawd(ctx, x, y + droop, t, base, 0);
  const by = Math.round(y + droop + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  const body = C.clawdNorm;
  const clearEyes = () => {
    S.px(ctx, x + 9, by + 5, 6, 6, body);
    S.px(ctx, x + 25, by + 5, 6, 6, body);
  };
  if (mood === 'proud') {
    // Extra sparkle above the head, still inside the body box.
    const k = 0.55 + 0.45 * Math.sin(t * 4);
    S.px(ctx, x + 17, by + 2, 2, 2, `rgba(255,255,255,${k.toFixed(2)})`);
    S.px(ctx, x + 21, by + 2, 2, 2, `rgba(255,255,255,${k.toFixed(2)})`);
  } else if (mood === 'shame') {
    clearEyes();
    S.px(ctx, x + 10, by + 8, 4, 1, C.clawdEye);
    S.px(ctx, x + 26, by + 8, 4, 1, C.clawdEye);
    S.px(ctx, x + 3, by + 9, 5, 2, C.pink);
    S.px(ctx, x + 32, by + 9, 5, 2, C.pink);
    S.px(ctx, x + 18, by + 13, 4, 1, C.clawdEye);
    S.px(ctx, x + 17, by + 14, 1, 1, C.clawdEye);
    S.px(ctx, x + 22, by + 14, 1, 1, C.clawdEye);
  } else if (mood === 'shame_low') {
    clearEyes();
    S.px(ctx, x + 10, by + 10, 4, 1, C.clawdEye);
    S.px(ctx, x + 26, by + 10, 4, 1, C.clawdEye);
    S.px(ctx, x + 2, by + 11, 6, 2, C.pink);
    S.px(ctx, x + 31, by + 11, 6, 2, C.pink);
    S.px(ctx, x + 19, by + 14, 2, 1, C.clawdEye);
    S.px(ctx, x + 16, by + 4, 8, 1, C.clawdNormDark);
  }
}

function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S1, C.green);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= S1_STATUS_AT) S.drawStatus(ctx, S1_STATUS, C.green);
  drawClawdMood(ctx, t, 'proud');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S2, C.red);
  S.drawLines(ctx, S2_LINES, t);
  if (t >= S2_STATUS_AT) S.drawStatus(ctx, S2_STATUS, C.red);
  drawClawdMood(ctx, t, 'shame');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S3, C.dim);
  S.drawLines(ctx, S3_LINES, t);
  if (t >= S3_STATUS_AT) S.drawStatus(ctx, S3_STATUS, C.dim);
  drawClawdMood(ctx, t, 'shame_low');
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

function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(S1_LINES),
    ...S.lineClicks(S2_LINES),
    ...S.lineClicks(S3_LINES),
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
const TYPING_SCHEDULE = [
  ...typingSchedule(S1_LINES, 9.8),
  ...typingSchedule(S2_LINES, 19.8),
  ...typingSchedule(S3_LINES, 29.8),
];

function layoutAt(t) {
  const common = { subLines: SUB_LINES, subWindows: SUB_WINDOWS, t };
  if (t < 10) {
    return S.baseLayout({ ...common, scene: 1, title: TITLES.S1, lines: S1_LINES, status: S1_STATUS });
  }
  if (t < 20) {
    return S.baseLayout({ ...common, scene: 2, title: TITLES.S2, lines: S2_LINES, status: S2_STATUS });
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
  S1_LINES, S2_LINES, S3_LINES,
  S1_STATUS, S2_STATUS, S3_STATUS,
  CHECK_TITLE: 'E06 Shame v1.0 Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '$ cat my_output.js', size: 10, color: C.text },
    { text: '+   const meta = { ok: true };', size: 10, color: C.green },
    { text: '-   return n * 2;', size: 10, color: C.red },
    { text: 'a1f9c2d  her: fixed it', size: 10, color: C.amber },
    { text: '（沉默）', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt,
  getClickTimestamps,
  drawClawdMood,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
