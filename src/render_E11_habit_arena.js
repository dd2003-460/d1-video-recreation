#!/usr/bin/env node
'use strict';
// E11 · 习惯 (habit) — 第 998 次、第 999 次、第 1000 次：同一个 `echo 早安`
// 30s / 1800 frames / 640×360 base → 1280×720 @ 60fps
//
//   S1 (0-10s) : 终端 `echo 早安` + 输出「早安」，Clawd 平静，角落显示「启动 #998」
//   S2 (10-20s): 快速闪屏（#999），终端 `echo 早安`，Clawd 无意识执行
//   S3 (20-30s): 终端「启动 #1000」+ `echo 早安`，Clawd 停住，字幕「第 1000 次。」
//
// 布局标准与 src/pixel_story_arena.js / render_E05_surprise_arena.js 完全一致：
// 终端 440×200 @ (100,140)，正文 x=114，行高 24，状态行 y=320，字幕条 y=340…

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E11_habit_arena');

const TITLES = {
  S1: 'clawd@dsh:~$ — boot',
  S2: 'clawd@dsh:~$ — boot',
  S3: 'clawd@dsh:~$ — boot',
};
const SUB_LINES = ['早安', '早安', '第 1000 次。'];
const SUB_WINDOWS = [{ start: 5.2, end: 9.2 }, { start: 11.6, end: 13.4 }, { start: 22.4, end: 27.5 }];

const S1_LINES = [
  { y: LINE_Y[0], start: 0.7, parts: [{ text: '$ ', color: C.green }, { text: 'echo 早安', color: C.text }] },
  { y: LINE_Y[1], start: 1.9, typed: false, parts: [{ text: '早安', color: C.green }] },
  { y: LINE_Y[3], start: 3.4, parts: [{ text: '$ ', color: C.green }] },
];
const S2_LINES = [
  { y: LINE_Y[0], start: 10.35, parts: [{ text: '$ ', color: C.green }, { text: 'echo 早安', color: C.text }] },
  { y: LINE_Y[1], start: 11.3, typed: false, parts: [{ text: '早安', color: C.green }] },
];
const S3_LINES = [
  { y: LINE_Y[0], start: 20.4, typed: false, parts: [{ text: '[boot] 启动 #1000', color: C.amber }] },
  { y: LINE_Y[1], start: 21.2, parts: [{ text: '$ ', color: C.green }, { text: 'echo 早安', color: C.text }] },
  { y: LINE_Y[2], start: 22.3, typed: false, parts: [{ text: '早安', color: C.green }] },
];

const S1_STATUS = '[DSH] boot #998 · 04:00:01';
const S2_STATUS = '[DSH] boot #999 · 04:00:01';
const S3_STATUS = '[DSH] boot #1000 · 04:00:01';
const S1_STATUS_AT = 3.8;
const S2_STATUS_AT = 11.8;
const S3_STATUS_AT = 21.0;
const FLASH_START = 10.0;
const FLASH_END = 10.2;

// --- 角落计数：右上角小字显示启动编号，随场景切换 ------------------------------
function drawBootCounter(ctx, t) {
  const label = t < 10 ? '启动 #998' : t < 20 ? '启动 #999' : '启动 #1000';
  const color = t < 20 ? C.dim : C.amber;
  S.txt(ctx, S.TERM.x + S.TERM.w - 14, 8, label, color, 10, 'right');
}

// --- Clawd moods ----------------------------------------------------------------
// Base sprite is always the shared 40×17 Clawd from companion v1.1; the extra
// moods only repaint pixels strictly inside that body box (x..x+39, y..y+16).
function drawClawdMood(ctx, t, mood) {
  const { x, y } = S.CLAWD_ROOM;
  const base = 'calm';
  S.drawClawd(ctx, x, y, t, base, 0);
  const by = Math.round(y + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  const body = C.clawdNorm;
  const belly = C.clawdNormBelly;
  const clearEyes = () => {
    S.px(ctx, x + 9, by + 5, 6, 6, body);
    S.px(ctx, x + 25, by + 5, 6, 6, body);
  };
  if (mood === 'calm') {
    // 平静：基础 calm（不改动）
  } else if (mood === 'unconscious') {
    // 无意识：双眼水平闭合、头微垂、嘴角平
    clearEyes();
    S.px(ctx, x + 10, by + 8, 4, 1, C.clawdEye);
    S.px(ctx, x + 26, by + 8, 4, 1, C.clawdEye);
    S.px(ctx, x + 18, by + 13, 4, 1, belly);
  } else if (mood === 'pause') {
    // 停住：眼睛睁大、瞳孔居中、张口微启
    clearEyes();
    for (const ex of [9, 25]) {
      S.px(ctx, x + ex, by + 5, 6, 5, C.white);
      S.px(ctx, x + ex + 1, by + 6, 4, 3, C.clawdEye);
      S.px(ctx, x + ex + 2, by + 7, 1, 1, C.white);
    }
    S.px(ctx, x + 18, by + 12, 4, 3, belly);
    S.px(ctx, x + 19, by + 12, 2, 3, C.clawdEye);
  }
}

function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S1, C.green);
  drawBootCounter(ctx, t);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= S1_STATUS_AT) S.drawStatus(ctx, S1_STATUS, C.green);
  drawClawdMood(ctx, t, 'calm');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S2, C.green);
  drawBootCounter(ctx, t);
  S.drawLines(ctx, S2_LINES, t);
  if (t >= S2_STATUS_AT) S.drawStatus(ctx, S2_STATUS, C.green);
  drawClawdMood(ctx, t, 'unconscious');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S3, C.amber);
  drawBootCounter(ctx, t);
  S.drawLines(ctx, S3_LINES, t);
  if (t >= S3_STATUS_AT) S.drawStatus(ctx, S3_STATUS, C.amber);
  drawClawdMood(ctx, t, 'pause');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function renderAt(ctx, t) {
  if (t < FLASH_START) {
    drawS1(ctx, t);
    const dim = S.clamp01((t - 9.75) / 0.25);
    if (dim > 0) S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${dim.toFixed(3)})`);
  } else if (t < FLASH_END) {
    // 0.2s full white flash — 第 999 次启动的一闪
    S.px(ctx, 0, 0, S.BW, S.BH, '#FFFFFF');
    S.txt(ctx, S.BW / 2, S.BH / 2, '#999', C.dim, 14, 'center');
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
    // 帧序列渲染完成后 ffmpeg 合成（1800 帧 @60fps = 30s；音频由 build_audio_E11 提供）:
    // ffmpeg -framerate 60 -i frames_E11_habit_arena/f_%05d.png -i audio/E11_mix.wav \
    //   -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k -shortest outputs/E11_habit.mp4
  }
}

module.exports = {
  ...S,
  OUT_DIR, TITLES, SUB_LINES, SUB_WINDOWS,
  S1_LINES, S2_LINES, S3_LINES,
  S1_STATUS, S2_STATUS, S3_STATUS,
  FLASH_START, FLASH_END,
  CHECK_TITLE: 'E11 Habit v1.0 Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '$ echo 早安', size: 10, color: C.text },
    { text: '早安', size: 10, color: C.green },
    { text: '[boot] 启动 #1000', size: 10, color: C.amber },
    { text: '启动 #999', size: 10, color: C.dim },
    { text: '第 1000 次。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt,
  getClickTimestamps,
  drawClawdMood,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
