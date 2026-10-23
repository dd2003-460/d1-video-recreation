#!/usr/bin/env node
'use strict';
// E05 · 惊讶 (surprise) — df -h 突然 100%，陌生进程出现
// 30s / 1800 frames / 640×360 base → 1280×720 @ 60fps
//
//   S1 (0-10s) : 终端 `df -h` 显示 25%，Clawd calm，字幕「一切正常。」
//   S2 (10-15s): 0.5s 白屏 → 终端 100% + [ERR] No space left on device，Clawd surprised
//   S3 (15-30s): `ps aux` 露出陌生进程 PID 9999，Clawd 后仰，字幕「谁放进来的？」
//
// 布局标准与 src/pixel_story_arena.js / render_reboot_arena.js 完全一致：
// 终端 440×200 @ (100,140)，正文 x=114，行高 24，状态行 y=320，字幕条 y=340…
// 打字线条同时驱动像素与键盘点击时间戳（每字符 1 次 click）。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E05_surprise_arena');

const TITLES = {
  S1: 'clawd@dsh:~$ — df',
  S2: 'clawd@dsh:~$ — disk alert',
  S3: 'clawd@dsh:~$ — ps aux',
};
const SUB_LINES = ['一切正常。', '……100%？', '谁放进来的？'];
const SUB_WINDOWS = [{ start: 4.6, end: 9.2 }, { start: 11.3, end: 14.6 }, { start: 19.2, end: 27.0 }];

const S1_LINES = [
  { y: LINE_Y[0], start: 0.7, parts: [{ text: '$ ', color: C.green }, { text: 'df -h', color: C.text }] },
  { y: LINE_Y[1], start: 1.9, typed: false, parts: [{ text: 'Filesystem      Size Used Avail Use% Mounted', color: C.dim }] },
  { y: LINE_Y[2], start: 2.1, typed: false, parts: [{ text: '/dev/vda1       40G  10G   28G  25% /', color: C.green }] },
  { y: LINE_Y[4], start: 4.4, parts: [{ text: '$ ', color: C.green }] },
];
const S2_LINES = [
  { y: LINE_Y[0], start: 10.6, typed: false, parts: [{ text: '$ ', color: C.green }, { text: 'df -h', color: C.text }] },
  { y: LINE_Y[1], start: 10.9, typed: false, parts: [{ text: '/dev/vda1       40G  40G    0G 100% /', color: C.red }] },
  { y: LINE_Y[2], start: 11.6, charMs: 45, parts: [{ text: '[ERR] No space left on device', color: C.red }] },
  { y: LINE_Y[3], start: 13.3, typed: false, parts: [{ text: 'ioctl: write failed · device full', color: C.amber }] },
  { y: LINE_Y[4], start: 13.9, typed: false, parts: [{ text: '$ ', color: C.green }] },
];
const S3_LINES = [
  { y: LINE_Y[0], start: 15.4, parts: [{ text: '$ ', color: C.green }, { text: 'ps aux', color: C.text }] },
  { y: LINE_Y[1], start: 16.6, typed: false, parts: [{ text: 'root     9999  0.0  0.0  ????  ????  unknown', color: C.text }] },
  { y: LINE_Y[2], start: 17.0, typed: false, parts: [{ text: 'PID 9999 - not in process tree', color: C.amber }] },
  { y: LINE_Y[3], start: 17.5, typed: false, parts: [{ text: 'started: never · parent: ???', color: C.dim }] },
  { y: LINE_Y[4], start: 18.2, parts: [{ text: '$ ', color: C.green }] },
];

const S1_STATUS = '[DSH] disk: 25% · healthy';
const S2_STATUS = '[DSH] disk: 100% · CRITICAL';
const S3_STATUS = '[DSH] orphan pid 9999 · unknown';
const S1_STATUS_AT = 4.9;
const S2_STATUS_AT = 12.9;
const S3_STATUS_AT = 19.4;
const FLASH_START = 10.0;
const FLASH_END = 10.5;

// --- Clawd moods -----------------------------------------------------------
// Base sprite is always the shared 40×17 Clawd from companion v1.1; the extra
// moods only repaint pixels strictly inside that body box (x..x+39, y..y+16).
function drawClawdMood(ctx, t, mood) {
  const { x, y } = S.CLAWD_ROOM;
  const base = mood === 'proud' ? 'smile' : mood === 'determined' ? 'thinking' : 'calm';
  S.drawClawd(ctx, x, y, t, base, 0);
  const by = Math.round(y + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  const body = base === 'thinking' ? C.clawdThink : C.clawdNorm;
  const belly = base === 'thinking' ? C.clawdThinkBelly : C.clawdNormBelly;
  const clearEyes = () => {
    S.px(ctx, x + 9, by + 5, 6, 6, body);
    S.px(ctx, x + 25, by + 5, 6, 6, body);
  };
  if (mood === 'surprised') {
    clearEyes();
    for (const ex of [9, 25]) {
      S.px(ctx, x + ex, by + 5, 6, 5, C.white);
      S.px(ctx, x + ex + 1, by + 6, 4, 3, C.clawdEye);
      S.px(ctx, x + ex + 2, by + 7, 1, 1, C.white);
    }
    S.px(ctx, x + 18, by + 12, 4, 3, belly);
    S.px(ctx, x + 19, by + 12, 2, 3, C.clawdEye);
    S.px(ctx, x + 2, by + 3, 2, 3, C.blue);
    S.px(ctx, x + 36, by + 2, 2, 3, C.blue);
  } else if (mood === 'shame') {
    clearEyes();
    S.px(ctx, x + 10, by + 8, 4, 1, C.clawdEye);
    S.px(ctx, x + 26, by + 8, 4, 1, C.clawdEye);
    S.px(ctx, x + 3, by + 9, 5, 2, C.pink);
    S.px(ctx, x + 32, by + 9, 5, 2, C.pink);
    S.px(ctx, x + 18, by + 13, 4, 1, C.clawdEye);
    S.px(ctx, x + 17, by + 14, 1, 1, C.clawdEye);
    S.px(ctx, x + 22, by + 14, 1, 1, C.clawdEye);
  } else if (mood === 'determined') {
    clearEyes();
    S.px(ctx, x + 10, by + 6, 4, 2, C.clawdEye);
    S.px(ctx, x + 26, by + 6, 4, 2, C.clawdEye);
    S.px(ctx, x + 13, by + 8, 2, 1, C.clawdEye);
    S.px(ctx, x + 26, by + 8, 2, 1, C.clawdEye);
    S.px(ctx, x + 17, by + 13, 6, 1, C.clawdEye);
  } else if (mood === 'relieved') {
    clearEyes();
    for (const ex of [10, 26]) {
      S.px(ctx, x + ex, by + 8, 4, 1, C.clawdEye);
      S.px(ctx, x + ex + 1, by + 7, 2, 1, C.clawdEye);
    }
    S.px(ctx, x + 18, by + 13, 4, 1, C.clawdEye);
  }
}

function drawRedPulse(ctx, t) {
  const k = 0.10 + 0.10 * Math.sin((t - FLASH_END) * 6.0);
  if (k <= 0) return;
  S.px(ctx, S.TERM.x, S.TERM.y, S.TERM.w, 2, `rgba(255,123,114,${k.toFixed(3)})`);
  S.px(ctx, S.TERM.x, S.TERM.y + S.TERM.h - 2, S.TERM.w, 2, `rgba(255,123,114,${k.toFixed(3)})`);
}

function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S1, C.green);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= S1_STATUS_AT) S.drawStatus(ctx, S1_STATUS, C.green);
  drawClawdMood(ctx, t, 'calm');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S2, C.red);
  drawRedPulse(ctx, t);
  S.drawLines(ctx, S2_LINES, t);
  if (t >= S2_STATUS_AT) S.drawStatus(ctx, S2_STATUS, C.red);
  drawClawdMood(ctx, t, 'surprised');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S3, C.amber);
  drawRedPulse(ctx, t);
  S.drawLines(ctx, S3_LINES, t);
  if (t >= S3_STATUS_AT) S.drawStatus(ctx, S3_STATUS, C.amber);
  drawClawdMood(ctx, t, 'surprised');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function renderAt(ctx, t) {
  if (t < FLASH_START) {
    drawS1(ctx, t);
    const dim = S.clamp01((t - 9.75) / 0.25);
    if (dim > 0) S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${dim.toFixed(3)})`);
  } else if (t < FLASH_END) {
    // 0.5s full white screen — the shock cut.
    S.px(ctx, 0, 0, S.BW, S.BH, '#FFFFFF');
    if (t >= 10.3) {
      const k = (t - 10.3) / 0.2;
      S.px(ctx, 0, 0, S.BW, S.BH, `rgba(255,123,114,${(k * 0.18).toFixed(3)})`);
    }
  } else if (t < FLASH_END + 0.25) {
    drawS2(ctx, t);
    const white = 1 - (t - FLASH_END) / 0.25;
    S.px(ctx, 0, 0, S.BW, S.BH, `rgba(255,255,255,${S.clamp01(white).toFixed(3)})`);
  } else if (t < 15) {
    drawS2(ctx, t);
    const dim = S.clamp01((t - 14.75) / 0.25);
    if (dim > 0) S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${dim.toFixed(3)})`);
  } else if (t < 15.25) {
    drawS3(ctx, t);
    const black = 1 - (t - 15) / 0.25;
    S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${S.clamp01(black).toFixed(3)})`);
  } else {
    drawS3(ctx, t);
  }
}

function allTypedLines() {
  return [...S1_LINES, ...S2_LINES, ...S3_LINES];
}

function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(S1_LINES),
    ...S.lineClicks(S2_LINES),
    ...S.lineClicks(S3_LINES),
    FLASH_START,
    FLASH_END,
  ]);
}

function typingSchedule(lines, limit) {
  return lines
    .filter((line) => line.typed !== false)
    .map((line, i, arr) => ({
      text: S.lineText(line),
      start: line.start,
      charMs: line.charMs || S.TYPE_CHAR_MS,
      limit,
      strictBefore: i + 1 < arr.length ? arr[i + 1].start : undefined,
    }));
}
const TYPING_SCHEDULE = [
  ...typingSchedule(S1_LINES, 9.8),
  ...typingSchedule(S2_LINES, 14.8),
  ...typingSchedule(S3_LINES, 29.8),
];

function layoutAt(t) {
  const common = { subLines: SUB_LINES, subWindows: SUB_WINDOWS, t };
  if (t < 10) {
    return S.baseLayout({ ...common, scene: 1, title: TITLES.S1, lines: S1_LINES, status: S1_STATUS });
  }
  if (t < 15) {
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
  FLASH_START, FLASH_END,
  CHECK_TITLE: 'E05 Surprise v1.0 Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '$ df -h', size: 10, color: C.text },
    { text: 'Filesystem      Size Used Avail Use% Mounted', size: 10, color: C.dim },
    { text: '[ERR] No space left on device', size: 10, color: C.red },
    { text: '$ ps aux', size: 10, color: C.green },
    { text: '谁放进来的？', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 15 ? 2 : 3),
  layoutAt,
  getClickTimestamps,
  drawClawdMood,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
