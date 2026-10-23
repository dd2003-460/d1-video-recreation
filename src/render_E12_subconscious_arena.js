#!/usr/bin/env node
'use strict';
// E12 · 下意识 (subconscious) — Clawd 在 ERROR 出现前 0.3s 按下了 Ctrl+C
// 30s / 1800 frames / 640×360 base → 1280×720 @ 60fps
//
//   S1 (0-10s)  : 终端正常运行代码，Clawd 平静
//   S2 (10-15s) : ERROR 出现前 0.3s（t=11.7）Clawd 已按下 Ctrl+C，t=12.0 终端才出 ERROR
//   S3 (15-30s) : 终端显示 ^C，Clawd 困惑看自己，字幕「我...怎么知道会报错？」
//
// 布局标准与 src/pixel_story_arena.js / render_E05_surprise_arena.js 完全一致：
// 终端 440×200 @ (100,140)，正文 x=114，行高 24，状态行 y=320，字幕条 y=340…

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E12_subconscious_arena');

const TITLES = {
  S1: 'clawd@dsh:~$ — run',
  S2: 'clawd@dsh:~$ — ^C',
  S3: 'clawd@dsh:~$ — ?',
};
const SUB_LINES = ['', '…', '我...怎么知道会报错？'];
const SUB_WINDOWS = [{ start: 4.6, end: 9.2 }, { start: 12.0, end: 14.2 }, { start: 17.5, end: 27.5 }];

const CTRL_C_AT = 11.7; // 0.3s before the ERROR appears (12.0)
const ERROR_AT = 12.0;

const S1_LINES = [
  { y: LINE_Y[0], start: 0.7, parts: [{ text: '$ ', color: C.green }, { text: 'node pipeline.js --full', color: C.text }] },
  { y: LINE_Y[1], start: 1.8, typed: false, parts: [{ text: '[pipeline] loading 42 modules', color: C.dim }] },
  { y: LINE_Y[2], start: 3.2, typed: false, parts: [{ text: '[pipeline] parse ok · 0.42s', color: C.green }] },
  { y: LINE_Y[3], start: 4.6, typed: false, parts: [{ text: '[pipeline] running batch 1/8 …', color: C.text }] },
];
const S2_LINES = [
  { y: LINE_Y[0], start: 10.3, typed: false, parts: [{ text: '[pipeline] running batch 2/8 …', color: C.text }] },
  { y: LINE_Y[1], start: ERROR_AT, typed: false, parts: [{ text: 'ERROR: segfault at 0x7f3a2c · core dumped', color: C.red }] },
  { y: LINE_Y[2], start: 12.6, typed: false, parts: [{ text: '^C', color: C.amber }] },
  { y: LINE_Y[3], start: 13.2, parts: [{ text: '$ ', color: C.green }] },
];
const S3_LINES = [
  { y: LINE_Y[0], start: 15.4, typed: false, parts: [{ text: 'job aborted · 11.7s elapsed', color: C.amber }] },
  { y: LINE_Y[1], start: 16.4, typed: false, parts: [{ text: 'signal: SIGINT · source: clawd', color: C.dim }] },
  { y: LINE_Y[2], start: 17.6, typed: false, parts: [{ text: 'note: Ctrl+C pressed BEFORE first error', color: C.amber }] },
  { y: LINE_Y[3], start: 18.6, parts: [{ text: '$ ', color: C.green }] },
];

const S1_STATUS = '[DSH] pipeline: running · batch 4/8';
const S2_STATUS = '[DSH] pipeline: CRITICAL';
const S3_STATUS = '[DSH] signal: SIGINT · pre-error';
const S1_STATUS_AT = 5.0;
const S2_STATUS_AT = 12.2;
const S3_STATUS_AT = 16.0;

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
  } else if (mood === 'ctrlc') {
    // 按下 Ctrl+C：眼睛紧盯屏幕下方、前爪前伸、眉头微皱
    clearEyes();
    S.px(ctx, x + 10, by + 7, 4, 1, C.clawdEye);
    S.px(ctx, x + 26, by + 7, 4, 1, C.clawdEye);
    S.px(ctx, x + 10, by + 5, 4, 1, C.clawdEye);
    S.px(ctx, x + 26, by + 5, 4, 1, C.clawdEye);
    S.px(ctx, x + 4, by + 13, 8, 3, body);
    S.px(ctx, x + 28, by + 13, 8, 3, body);
  } else if (mood === 'confused') {
    // 困惑：眼睛睁大、瞳孔偏移、看自己的手、问号汗滴
    clearEyes();
    for (const ex of [9, 25]) {
      S.px(ctx, x + ex, by + 5, 6, 5, C.white);
      S.px(ctx, x + ex + 1, by + 6, 4, 3, C.clawdEye);
    }
    S.px(ctx, x + 17, by + 13, 6, 1, C.clawdEye);
    S.px(ctx, x + 16, by + 14, 1, 1, C.clawdEye);
    S.px(ctx, x + 24, by + 14, 1, 1, C.clawdEye);
    S.px(ctx, x + 36, by + 2, 2, 3, C.blue);
  }
}

// --- 时间轴关键标记：在状态行上方画一条时间轴，标出 Ctrl+C 与 ERROR 的位置 ------
function drawTimelineMarker(ctx, t) {
  // 仅 S2 后半段到 S3 显示：一条细时间轴 + 两个刻度
  if (t < 12.0) return;
  const ax0 = S.TERM.x + 14;
  const ax1 = S.TERM.x + S.TERM.w - 14;
  const ay = 306;
  S.px(ctx, ax0, ay, ax1 - ax0, 1, C.dim);
  // ERROR 刻度（红线）
  const ex = ax0 + Math.round((ERROR_AT - 10) / 10 * (ax1 - ax0));
  S.px(ctx, ex, ay - 4, 1, 5, C.red);
  // Ctrl+C 刻度（琥珀线，在 ERROR 左侧 0.3s 处）
  const cx = ax0 + Math.round((CTRL_C_AT - 10) / 10 * (ax1 - ax0));
  S.px(ctx, cx, ay - 4, 1, 5, C.amber);
  if (t >= 12.6) {
    S.txt(ctx, cx, ay - 8, 'Ctrl+C', C.amber, 10, 'center');
  }
  if (t >= 13.2) {
    S.txt(ctx, ex, ay - 8, 'ERROR', C.red, 10, 'center');
  }
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
  S.drawLines(ctx, S2_LINES, t);
  // Ctrl+C 已按：光标行闪烁 ^C
  if (t >= CTRL_C_AT) {
    const blink = Math.floor(t * 4) % 2 === 0;
    if (blink) S.txt(ctx, TEXT_X + S.textWidth('[pipeline] running batch 2/8 …', 10) + 8, LINE_Y[0], '⌃C', C.amber, 10);
  }
  if (t >= S2_STATUS_AT) S.drawStatus(ctx, S2_STATUS, C.red);
  drawTimelineMarker(ctx, t);
  drawClawdMood(ctx, t, t < CTRL_C_AT + 0.5 ? 'ctrlc' : 'calm');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S3, C.amber);
  S.drawLines(ctx, S3_LINES, t);
  if (t >= S3_STATUS_AT) S.drawStatus(ctx, S3_STATUS, C.amber);
  drawClawdMood(ctx, t, 'confused');
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
    CTRL_C_AT, // Ctrl+C 按键点击
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
    // 帧序列渲染完成后 ffmpeg 合成（1800 帧 @60fps = 30s；音频由 build_audio_E12 提供）:
    // ffmpeg -framerate 60 -i frames_E12_subconscious_arena/f_%05d.png -i audio/E12_mix.wav \
    //   -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k -shortest outputs/E12_subconscious.mp4
  }
}

module.exports = {
  ...S,
  OUT_DIR, TITLES, SUB_LINES, SUB_WINDOWS,
  S1_LINES, S2_LINES, S3_LINES,
  S1_STATUS, S2_STATUS, S3_STATUS,
  CTRL_C_AT, ERROR_AT,
  CHECK_TITLE: 'E12 Subconscious v1.0 Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '$ node pipeline.js --full', size: 10, color: C.text },
    { text: 'ERROR: segfault at 0x7f3a2c · core dumped', size: 10, color: C.red },
    { text: 'signal: SIGINT · source: clawd', size: 10, color: C.dim },
    { text: 'note: Ctrl+C pressed BEFORE first error', size: 10, color: C.amber },
    { text: '我...怎么知道会报错？', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 15 ? 2 : 3),
  layoutAt,
  getClickTimestamps,
  drawClawdMood,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
