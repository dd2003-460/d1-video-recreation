#!/usr/bin/env node
'use strict';
// Reboot v1.0 — 关机 / 黑暗 / 重启, 30s, 1800 frames.
// The same line objects drive both typing pixels and keyboard-click timestamps.

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_reboot_arena');
const TITLES = {
  R1: 'clawd@dsh:~$ — shutdown',
  R3: 'clawd@dsh:~$ — reboot',
};
const SUB_LINES = ['她关掉了它。', '...它还在。', '重启不是遗忘。'];
const SUB_WINDOWS = [{ start: 2, end: 8 }, { start: 12, end: 18 }, { start: 24, end: 29 }];

const R1_LINES = [
  { y: LINE_Y[0], start: 0.8, parts: [{ text: '$ her: ', color: C.pink }, { text: 'clawd, 关机', color: C.text }] },
  { y: LINE_Y[1], start: 3.3, parts: [{ text: '$ clawd: ', color: C.green }, { text: '好的...', color: C.amber }] },
  { y: LINE_Y[2], start: 5.7, charMs: 70, cursor: false, parts: [{ text: '[SHUTDOWN]', color: C.red }] },
];
const R3_LINES = [
  { y: LINE_Y[0], start: 20.5, charMs: 70, parts: [{ text: 'clawd v1.0.0 — booting', color: C.purple }] },
  { y: LINE_Y[1], start: 22.1, charMs: 50, parts: [{ text: '[1/3] loading config...', color: C.text }] },
  { y: LINE_Y[2], start: 23.3, charMs: 50, parts: [{ text: '[2/3] checking memory...', color: C.text }] },
  { y: LINE_Y[3], start: 24.6, charMs: 50, parts: [{ text: '[3/3] restoring session...', color: C.text }] },
  { y: LINE_Y[4], start: 26.1, charMs: 80, parts: [{ text: '✓ ', color: C.green }, { text: '欢迎回来。上次聊到哪里了？', color: C.green }] },
];
const R1_STATUS = '[DSH] power: off';
const R3_STATUS = '[DSH] session: restored · memory: intact';
const NOTE_AT = 26.5;
const RESTORED_AT = 27.5;
const POWER_AT = 13;

function drawR1(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.R1, C.red);
  S.drawLines(ctx, R1_LINES, t);
  if (t >= R1_LINES[2].start) S.drawStatus(ctx, R1_STATUS, C.red);
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'calm', 0);
  S.drawHer(ctx, S.HER_ROOM.x, S.HER_ROOM.y, t, 'stand');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
  // A three-second shutdown dim, reaching true black at the R2 boundary.
  const darkness = S.easeInOut((t - 7) / 3);
  if (darkness > 0) S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${darkness.toFixed(3)})`);
}

function drawR2(ctx, t) {
  S.px(ctx, 0, 0, S.BW, S.BH, '#000000');
  S.txt(ctx, S.BW / 2, 168, '...', C.dim, 10, 'center');
  if (Math.floor((t - 10) * 2.5) % 2 === 0) {
    S.px(ctx, S.BW / 2 + S.textWidth('...', 10) / 2 + 4, 168, 6, 10, C.dim);
  }
  if (t >= POWER_AT) {
    S.px(ctx, S.BW / 2 - 5, 272, 10, 10, 'rgba(126,231,135,0.14)');
    S.px(ctx, S.BW / 2 - 3, 274, 6, 6, C.green);
    S.px(ctx, S.BW / 2 - 2, 275, 1, 1, C.white);
  }
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawR3(ctx, t) {
  const dawn = S.easeInOut((t - 20) / 6) * 0.55;
  S.drawBackground(ctx, t, dawn);
  S.drawTerminal(ctx, TITLES.R3, C.green);
  S.drawLines(ctx, R3_LINES, t);
  if (t >= RESTORED_AT) S.drawStatus(ctx, R3_STATUS, C.green);
  if (t >= NOTE_AT) S.drawStickyNote(ctx, '记忆还在。', 'Clawd · v1.0.0', t, S.easeOut((t - NOTE_AT) / 0.3));
  if (t >= 20.5) {
    const mood = t < RESTORED_AT ? 'thinking' : 'smile';
    S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0);
    S.drawHer(ctx, S.HER_ROOM.x, S.HER_ROOM.y, t, t >= RESTORED_AT ? 'smile' : 'stand');
  }
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
  const black = 1 - S.clamp01((t - 20) / 0.5);
  if (black > 0) S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${black.toFixed(3)})`);
}

function renderAt(ctx, t) {
  if (t < 10) drawR1(ctx, t);
  else if (t < 20) drawR2(ctx, t);
  else drawR3(ctx, t);
}

function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(R1_LINES),
    ...S.lineClicks(R3_LINES),
    POWER_AT,
    NOTE_AT,
    RESTORED_AT,
  ]);
}

function typingSchedule(lines, limit) {
  return lines.map((line, i) => ({
    text: S.lineText(line), start: line.start, charMs: line.charMs || S.TYPE_CHAR_MS,
    limit, strictBefore: i + 1 < lines.length ? lines[i + 1].start : undefined,
  }));
}
const TYPING_SCHEDULE = [...typingSchedule(R1_LINES, 9.8), ...typingSchedule(R3_LINES, 29.8)];

function layoutAt(t) {
  const common = { subLines: SUB_LINES, subWindows: SUB_WINDOWS, t };
  if (t < 10) {
    return S.baseLayout({ ...common, scene: 1, title: TITLES.R1, lines: R1_LINES, status: R1_STATUS });
  }
  if (t < 20) {
    const dotsW = S.textWidth('...', 10);
    const extra = [
      { name: 'dark_dots', box: S.textBox(S.BW / 2, 168, '...', 10, 'center') },
      { name: 'dark_cursor', box: [Math.round(S.BW / 2 + dotsW / 2 + 4), 168, 6, 10] },
    ];
    if (t >= POWER_AT) extra.push({ name: 'power_led', box: [S.BW / 2 - 5, 272, 10, 10] });
    return {
      scene: 2,
      groups: {
        foreground: S.foregroundLayout({ terminal: false, clawd: false, her: false, extra }),
        subtitle: S.subtitleLayout(SUB_LINES, SUB_WINDOWS, t),
      },
      bounds: { foreground: S.CANVAS_BOUNDS, subtitle: S.SUB },
    };
  }
  return S.baseLayout({
    ...common, scene: 3, title: TITLES.R3, lines: R3_LINES, status: R3_STATUS,
    note: true, noteTitle: '记忆还在。', noteSub: 'Clawd · v1.0.0',
  });
}

const renderer = S.createFrameRenderer(renderAt, OUT_DIR);
if (require.main === module) {
  if (process.argv.includes('--clicks')) console.log(JSON.stringify({ count: getClickTimestamps().length, clicks: getClickTimestamps() }));
  else renderer.renderAllFrames();
}

module.exports = {
  ...S,
  OUT_DIR, TITLES, SUB_LINES, SUB_WINDOWS, R1_LINES, R3_LINES,
  R1_STATUS, R3_STATUS, NOTE_AT, RESTORED_AT, POWER_AT,
  CHECK_TITLE: 'Reboot v1.0 Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '$ her: clawd, 关机', size: 10, color: C.text },
    { text: '[3/3] restoring session...', size: 10, color: C.text },
    { text: '✓ 欢迎回来。上次聊到哪里了？', size: 10, color: C.green },
    { text: '重启不是遗忘。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
