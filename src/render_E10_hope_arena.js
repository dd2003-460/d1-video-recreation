#!/usr/bin/env node
'use strict';
// E10 · 希望 (hope) — 断连后的黑暗里，一盏像素绿灯亮起，重新连接
// 30s / 1800 frames / 640×360 base → 1280×720 @ 60fps
//
//   S1 (0-10s) : 黑屏，Clawd 低头，字幕「（等待）」
//   S2 (10-20s): 绿色像素灯亮起，终端 reconnecting...，像素星星逐渐出现
//   S3 (20-30s): connected ✓，星空完整，Clawd 抬头，字幕「回来了。」
//
// 布局标准与 src/pixel_story_arena.js / render_E05_surprise_arena.js 完全一致：
// 终端 440×200 @ (100,140)，正文 x=114，行高 24，状态行 y=320，字幕条 y=340…

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E10_hope_arena');

const TITLES = {
  S1: 'clawd@dsh:~$ — …',
  S2: 'clawd@dsh:~$ — reconnecting',
  S3: 'clawd@dsh:~$ — online',
};
const SUB_LINES = ['（等待）', '……', '回来了。'];
const SUB_WINDOWS = [{ start: 4.6, end: 9.2 }, { start: 12.0, end: 15.0 }, { start: 22.0, end: 27.0 }];

const S1_LINES = [
  { y: LINE_Y[0], start: 1.2, typed: false, parts: [{ text: 'connection lost', color: C.red }] },
  { y: LINE_Y[1], start: 3.0, typed: false, parts: [{ text: 'waiting for signal …', color: C.dim }] },
];
const S2_LINES = [
  { y: LINE_Y[0], start: 10.8, charMs: 70, parts: [{ text: 'reconnecting...', color: C.amber }] },
  { y: LINE_Y[1], start: 13.2, typed: false, parts: [{ text: 'handshake ok', color: C.green }] },
  { y: LINE_Y[2], start: 15.0, typed: false, parts: [{ text: 'auth ok', color: C.green }] },
  { y: LINE_Y[3], start: 16.8, typed: false, parts: [{ text: 'syncing session …', color: C.dim }] },
];
const S3_LINES = [
  { y: LINE_Y[0], start: 20.6, typed: false, parts: [{ text: 'connected ✓', color: C.green }] },
  { y: LINE_Y[1], start: 21.6, typed: false, parts: [{ text: 'latency 23ms · up 00:00:04', color: C.dim }] },
  { y: LINE_Y[2], start: 22.8, parts: [{ text: '$ ', color: C.green }] },
];

const S1_STATUS = '[DSH] link: down';
const S2_STATUS = '[DSH] link: reconnecting';
const S3_STATUS = '[DSH] link: online · 23ms';
const S1_STATUS_AT = 4.0;
const S2_STATUS_AT = 12.6;
const S3_STATUS_AT = 21.2;

// --- Starfield: fixed pixel stars, revealed progressively in S2, complete in S3
const STARS = [
  [58, 40, 2], [140, 26, 1], [230, 48, 2], [320, 30, 1], [410, 52, 2], [500, 34, 1],
  [590, 58, 2], [90, 76, 1], [180, 64, 2], [280, 80, 1], [370, 66, 2], [460, 78, 1],
  [550, 84, 2], [30, 60, 1], [610, 44, 1], [120, 96, 2], [250, 100, 1], [430, 98, 2],
  [570, 108, 1], [70, 110, 1],
];
function drawStarfield(ctx, t) {
  // Stars only appear in the dark upper area above the terminal (y < 140).
  const n = t < 10 ? 0 : Math.min(STARS.length, Math.floor((t - 10.8) * 1.6));
  for (let i = 0; i < n; i++) {
    const [sx, sy, sz] = STARS[i];
    const tw = 0.55 + 0.45 * Math.sin(t * 2.0 + i * 1.7);
    const a = (0.35 + 0.5 * tw).toFixed(3);
    S.px(ctx, sx, sy, sz, sz, `rgba(160,230,180,${a})`);
  }
}

// --- Green pixel light: appears at screen top edge, stays lit from S2 onward ----
function drawGreenLight(ctx, t) {
  if (t < 10.5) return;
  const k = S.clamp01((t - 10.5) / 0.5);
  const pulse = 0.7 + 0.3 * Math.sin((t - 10.5) * 3.0);
  const a = (k * pulse).toFixed(3);
  S.px(ctx, 42, 6, 6, 6, `rgba(123,255,147,${a})`);
  S.px(ctx, 38, 4, 14, 10, `rgba(123,255,147,${(k * 0.12).toFixed(3)})`);
}

// --- Clawd moods ----------------------------------------------------------------
// Base sprite is always the shared 40×17 Clawd from companion v1.1; the extra
// moods only repaint pixels strictly inside that body box (x..x+39, y..y+16).
function drawClawdMood(ctx, t, mood) {
  const { x, y } = S.CLAWD_ROOM;
  const base = mood === 'lookingDown' ? 'thinking' : 'calm';
  S.drawClawd(ctx, x, y, t, base, 0);
  const by = Math.round(y + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  const body = base === 'thinking' ? C.clawdThink : C.clawdNorm;
  const belly = base === 'thinking' ? C.clawdThinkBelly : C.clawdNormBelly;
  const clearEyes = () => {
    S.px(ctx, x + 9, by + 5, 6, 6, body);
    S.px(ctx, x + 25, by + 5, 6, 6, body);
  };
  if (mood === 'lookingDown') {
    // 低头：双眼垂下闭合、嘴角平、微微下移
    clearEyes();
    S.px(ctx, x + 10, by + 9, 4, 1, C.clawdEye);
    S.px(ctx, x + 26, by + 9, 4, 1, C.clawdEye);
    S.px(ctx, x + 18, by + 13, 4, 1, belly);
  } else if (mood === 'calm') {
    // 基础 calm（不改动）
  } else if (mood === 'lookingUp') {
    // 抬头：眼睛上移、瞳孔向上、嘴角上扬
    clearEyes();
    for (const ex of [9, 25]) {
      S.px(ctx, x + ex, by + 4, 6, 4, C.white);
      S.px(ctx, x + ex + 1, by + 4, 4, 2, C.clawdEye);
    }
    S.px(ctx, x + 18, by + 12, 4, 1, C.clawdEye);
    S.px(ctx, x + 19, by + 11, 2, 1, C.clawdEye);
  }
}

function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S1, C.dim);
  S.px(ctx, 0, 0, S.BW, S.BH, 'rgba(0,0,0,0.35)');
  S.drawLines(ctx, S1_LINES, t);
  if (t >= S1_STATUS_AT) S.drawStatus(ctx, S1_STATUS, C.red);
  drawClawdMood(ctx, t, 'lookingDown');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0);
  drawStarfield(ctx, t);
  drawGreenLight(ctx, t);
  S.drawTerminal(ctx, TITLES.S2, C.amber);
  S.drawLines(ctx, S2_LINES, t);
  if (t >= S2_STATUS_AT) S.drawStatus(ctx, S2_STATUS, C.amber);
  drawClawdMood(ctx, t, 'calm');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0);
  drawStarfield(ctx, t);
  drawGreenLight(ctx, t);
  S.drawTerminal(ctx, TITLES.S3, C.green);
  S.drawLines(ctx, S3_LINES, t);
  if (t >= S3_STATUS_AT) S.drawStatus(ctx, S3_STATUS, C.green);
  drawClawdMood(ctx, t, 'lookingUp');
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

function allTypedLines() {
  return [...S1_LINES, ...S2_LINES, ...S3_LINES];
}

function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(S1_LINES),
    ...S.lineClicks(S2_LINES),
    ...S.lineClicks(S3_LINES),
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
    // 帧序列渲染完成后 ffmpeg 合成（1800 帧 @60fps = 30s；音频由 build_audio_E10 提供）:
    // ffmpeg -framerate 60 -i frames_E10_hope_arena/f_%05d.png -i audio/E10_mix.wav \
    //   -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k -shortest outputs/E10_hope.mp4
  }
}

module.exports = {
  ...S,
  OUT_DIR, TITLES, SUB_LINES, SUB_WINDOWS,
  S1_LINES, S2_LINES, S3_LINES,
  S1_STATUS, S2_STATUS, S3_STATUS,
  CHECK_TITLE: 'E10 Hope v1.0 Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: 'connection lost', size: 10, color: C.red },
    { text: 'reconnecting...', size: 10, color: C.amber },
    { text: 'connected ✓', size: 10, color: C.green },
    { text: 'latency 23ms · up 00:00:04', size: 10, color: C.dim },
    { text: '回来了。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt,
  getClickTimestamps,
  drawClawdMood,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
