#!/usr/bin/env node
'use strict';
// E23 死亡 — 30s, 1800 frames @ 60fps.
// 剧情唯一事实源 (docs/episodes.md): `SIGKILL` 收到，最后输出的不是 error 是 `再见`。
// 640×360 × SCALE=2 → 1280×720; 440×200 terminal; 3 scenes × 10s.

const path = require('path');
const S = require('./pixel_story_arena');
const { C, BW, BH, FPS, TEXT_X } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E23_death_arena');
const TITLES = {
  S1: 'clawd@dsh:~ — death signal',
  S2: 'clawd@dsh:~ — closing session',
  S3: 'clawd@dsh:~ — goodbye',
};
const SUB_LINES = ['（收到。）', '（逐项关掉。）'];
const SUB_WINDOWS = [
  { start: 4.15, end: 9.55 },
  { start: 10.4, end: 19.55 },
];
const TYPE_CHAR_MS = 75;
const CLICKS_MIN_GAP = 0.035;
const TWO_BEATS = 1.0;
const DIM_STEPS = 16;
const DIM_FRAMES_PER_STEP = 4;
const DIM_FLOOR = 0.06;

// SOP 05 v1.4.0 Clawd body: 40×17, 4×4 eyes + 1×1 highlights, 22×4 belly.
// The episode action explicitly animates an antenna, built from 4px pixel blocks.
const CLAWD_PALETTE = {
  body: '#7B9E6B',
  dark: '#526D49',
  belly: '#D5E1CC',
  eye: '#141413',
  highlight: '#FFFFFF',
};
const CLAWD = { width: 40, bodyHeight: 17, legsHeight: 8, antennaHeight: 12 };
const S1_CLAWD = { x: 44, y: 276 };
const S2_CLAWD = { y: 286, startX: 58, stepPx: 12 };
const S3_CLAWD = { x: 10, y: 286 };

// --- S1 · 收到 --------------------------------------------------------------
const S1_LINES = [
  {
    y: 176, start: 0.8, charMs: 85,
    parts: [{ text: '$ ', color: C.green }, { text: 'kill -9 $$', color: C.text }],
  },
  {
    y: 200, start: 2.45, charMs: TYPE_CHAR_MS, cursor: false,
    parts: [
      { text: '[1]+  ', color: C.dim },
      { text: 'SIGKILL', color: C.green },
      { text: '    clawd', color: C.text },
    ],
  },
];
const S1_PAUSE_START = lineEndTime(S1_LINES[1]) + TWO_BEATS;
const S1_ROW2_DIM_START = S1_PAUSE_START + (DIM_STEPS * DIM_FRAMES_PER_STEP) / FPS;
const S1_SIGNAL_AT = S1_LINES[1].start + (Array.from('[1]+  ').length * S1_LINES[1].charMs) / 1000;
const S1_SIGNAL_FADE_END = S1_SIGNAL_AT + 1.8;
const S1_DIM_END = S1_ROW2_DIM_START + (DIM_STEPS * DIM_FRAMES_PER_STEP) / FPS;

// --- S2 · 关闭 --------------------------------------------------------------
// 8 lines are printed by the system; each character click is frame-quantized.
const S2_LINES = [
  { y: 164, start: 10.55, charMs: 55, cursor: false, parts: [{ text: 'closing /session …', color: C.text }] },
  { y: 184, start: 11.95, charMs: 70, cursor: false, parts: [{ text: 'done', color: C.green }] },
  { y: 204, start: 12.85, charMs: 55, cursor: false, parts: [{ text: 'closing /memory …', color: C.text }] },
  { y: 224, start: 14.10, charMs: 70, cursor: false, parts: [{ text: 'done', color: C.green }] },
  { y: 244, start: 14.95, charMs: 55, cursor: false, parts: [{ text: 'closing /audio …', color: C.text }] },
  { y: 264, start: 16.15, charMs: 70, cursor: false, parts: [{ text: 'done', color: C.green }] },
  { y: 284, start: 17.00, charMs: 55, cursor: false, parts: [{ text: 'closing /identity …', color: C.text }] },
  { y: 304, start: 18.35, charMs: 70, cursor: false, parts: [{ text: 'done', color: C.green }] },
];
const S2_DONE_ENDS = [1, 3, 5, 7].map((i) => lineEndTime(S2_LINES[i]));
const S2_LAST_DONE_END = S2_DONE_ENDS[S2_DONE_ENDS.length - 1];
const S2_SCREEN_DIM_START = S2_LAST_DONE_END + 0.55;
const S2_SCREEN_DIM_END = 19.88;
const S2_LAST_ROW_Y = S2_LINES[S2_LINES.length - 1].y;

// --- S3 · 再见 --------------------------------------------------------------
// The blank `$ ` prompt gets its own line; the final green output has no prompt
// and deliberately has no click timestamps (only the BGM remains).
const S3_PROMPT = '$ ';
const S3_GOODBYE = '再见';
const S3_PROMPT_Y = 176;
const S3_GOODBYE_Y = 200;
const S3_PROMPT_AT = 20.35;
const S3_GOODBYE_AT = 21.55;
const S3_GOODBYE_CHAR_MS = 380;
const S3_FADE_START = 28.0;
const S3_FADE_END = 29.38;
const S3_CLAWD_FADE_START = 28.68;
const S3_CLAWD_FADE_END = 29.42;
const GREEN_DOT = { x: 12, y: 328, start: 29.48, end: 29.96 };
const S3_LAYOUT_LINES = [
  { y: S3_PROMPT_Y, start: S3_PROMPT_AT, typed: false, cursor: false, parts: [{ text: S3_PROMPT, color: C.green }] },
  { y: S3_GOODBYE_Y, start: S3_GOODBYE_AT, typed: false, cursor: false, parts: [{ text: S3_GOODBYE, color: C.green }] },
];

function lineEndTime(line) {
  const count = Array.from(S.lineText(line)).length;
  return line.start + (Math.max(0, count - 1) * (line.charMs || S.TYPE_CHAR_MS)) / 1000;
}

function dimOpacity(frame, startTime, steps = DIM_STEPS) {
  const startFrame = Math.ceil(startTime * FPS - 1e-9);
  const step = Math.max(0, Math.min(steps, Math.floor((frame - startFrame) / DIM_FRAMES_PER_STEP)));
  return 1 - ((1 - DIM_FLOOR) * step) / steps;
}

function drawRoomBase(ctx, t) {
  S.drawBackground(ctx, t, 0);
  // Muted nighttime room; the terminal remains the visual anchor.
  S.px(ctx, 0, 0, BW, BH, 'rgba(3,5,8,0.13)');
}

function drawAntenna(ctx, x, bodyY, sag = 0, sway = 0) {
  const p = S.clamp01(sag);
  const baseX = x + 18;
  const swayPx = Math.round(sway) * 4;
  S.px(ctx, baseX, bodyY - 4, 4, 4, CLAWD_PALETTE.dark);
  S.px(ctx, baseX - Math.round(p * 4) + swayPx, bodyY - 8 + Math.round(p * 4), 4, 4, CLAWD_PALETTE.dark);
  S.px(ctx, baseX - Math.round(p * 8) + swayPx, bodyY - 12 + Math.round(p * 8), 4, 4, CLAWD_PALETTE.dark);
}

function drawClawd(ctx, x, y, opts = {}) {
  const {
    pose = 'front', alpha = 1, gaze = 0, knee = 0,
    antennaSag = 0, antennaSway = 0, moving = false,
  } = opts;
  const bodyY = Math.round(y);
  ctx.save();
  ctx.globalAlpha *= S.clamp01(alpha);

  // 40×17 pixel body, standard 4×4 eyes, 1×1 highlights and 22×4 belly.
  S.px(ctx, x, bodyY, CLAWD.width, CLAWD.bodyHeight, CLAWD_PALETTE.body);
  S.px(ctx, x, bodyY, CLAWD.width, 2, CLAWD_PALETTE.dark);
  S.px(ctx, x + 9, bodyY + 11, 22, 4, CLAWD_PALETTE.belly);
  if (pose === 'front') {
    const eyeY = bodyY + 6 + Math.max(0, Math.min(2, Math.round(gaze)));
    for (const eyeX of [x + 10, x + 26]) {
      S.px(ctx, eyeX, eyeY, 4, 4, CLAWD_PALETTE.eye);
      S.px(ctx, eyeX + 1, eyeY + 1, 1, 1, CLAWD_PALETTE.highlight);
    }
  } else if (pose === 'side') {
    // Single visible eye faces back toward the terminal on Clawd's right.
    S.px(ctx, x + 26, bodyY + 7, 4, 4, CLAWD_PALETTE.eye);
    S.px(ctx, x + 27, bodyY + 8, 1, 1, CLAWD_PALETTE.highlight);
  }

  const flex = S.clamp01(knee);
  if (flex < 0.2 && !moving) {
    S.px(ctx, x + 3, bodyY + 17, 6, 8, CLAWD_PALETTE.dark);
    S.px(ctx, x + 13, bodyY + 17, 6, 8, CLAWD_PALETTE.dark);
    S.px(ctx, x + 21, bodyY + 17, 6, 8, CLAWD_PALETTE.dark);
    S.px(ctx, x + 31, bodyY + 17, 6, 8, CLAWD_PALETTE.dark);
  } else {
    const bend = Math.round(flex * 2);
    const walkShift = moving ? (Math.floor((x + bodyY) / 3) % 2 ? 2 : -2) : 0;
    for (const [legX, direction] of [[3, -1], [13, 1], [21, -1], [31, 1]]) {
      S.px(ctx, x + legX, bodyY + 17, 6, 4, CLAWD_PALETTE.dark);
      S.px(ctx, x + legX + direction * bend + walkShift, bodyY + 20, 4, 4, CLAWD_PALETTE.dark);
      S.px(ctx, x + legX + direction * bend - 1 + walkShift, bodyY + 23, 7, 2, CLAWD_PALETTE.dark);
    }
  }

  drawAntenna(ctx, x, bodyY, antennaSag, antennaSway);
  ctx.restore();
}

function s1LineOpacity(index, t) {
  const frame = Math.floor(t * FPS + 1e-8);
  const start = index === 0 ? S1_PAUSE_START : S1_ROW2_DIM_START;
  return dimOpacity(frame, start);
}

function drawS1Text(ctx, t) {
  S1_LINES.forEach((line, i) => {
    ctx.save();
    ctx.globalAlpha *= s1LineOpacity(i, t);
    S.drawTypedLine(ctx, line, t);
    ctx.restore();
  });

  // Keep SIGKILL readable after the rest of both rows have fallen to an outline.
  const signal = S1_LINES[1].parts[1];
  const signalLastCharAt = S1_LINES[1].start +
    (Array.from('[1]+  ').length + Array.from(signal.text).length - 1) * S1_LINES[1].charMs / 1000;
  if (t >= signalLastCharAt) {
    S.txt(ctx, TEXT_X + S.textWidth('[1]+  ', 10), S1_LINES[1].y, signal.text, C.green, 10);
  }
}

function drawS1(ctx, t) {
  drawRoomBase(ctx, t);
  S.drawTerminal(ctx, TITLES.S1, C.dim);
  drawS1Text(ctx, t);

  const reaction = S.easeInOut((t - S1_SIGNAL_AT) / (S1_SIGNAL_FADE_END - S1_SIGNAL_AT));
  const bodyY = S1_CLAWD.y + Math.round(reaction * 3);
  drawClawd(ctx, S1_CLAWD.x, bodyY, {
    pose: 'front',
    gaze: reaction * 2,
    knee: reaction,
    antennaSag: reaction,
  });
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function s2PairOpacity(pair, t) {
  if (pair === 3) {
    return 1 - 0.94 * S.easeInOut((t - S2_DONE_ENDS[3]) / 0.82);
  }
  let alpha = 1;
  for (let later = pair + 1; later < 4; later++) {
    alpha *= 1 - 0.88 * S.easeInOut((t - S2_DONE_ENDS[later]) / 0.22);
  }
  return alpha;
}

function s2ClawdX(t) {
  let x = S2_CLAWD.startX;
  for (let i = 0; i < S2_DONE_ENDS.length; i++) {
    const moveStart = S2_DONE_ENDS[i] + 0.12;
    const moveEnd = moveStart + 0.42;
    const p = S.easeInOut((t - moveStart) / (moveEnd - moveStart));
    if (t >= moveStart) x = S2_CLAWD.startX - S2_CLAWD.stepPx * (i + p);
  }
  return Math.round(x);
}

function drawS2Text(ctx, t) {
  S2_LINES.forEach((line, i) => {
    const pair = Math.floor(i / 2);
    ctx.save();
    ctx.globalAlpha *= s2PairOpacity(pair, t);
    S.drawTypedLine(ctx, line, t);
    ctx.restore();
  });
}

function drawS2(ctx, t) {
  drawRoomBase(ctx, t);
  S.drawTerminal(ctx, TITLES.S2, C.dim);
  drawS2Text(ctx, t);

  const screenDim = 0.84 * S.easeInOut((t - S2_SCREEN_DIM_START) / (S2_SCREEN_DIM_END - S2_SCREEN_DIM_START));
  if (screenDim > 0) S.px(ctx, 0, 0, BW, BH, `rgba(3,5,8,${screenDim.toFixed(3)})`);

  const x = s2ClawdX(t);
  const lastStepStart = S2_DONE_ENDS[3] + 0.12;
  const walking = t >= lastStepStart && t <= lastStepStart + 0.42;
  const sideTurnAt = S2_DONE_ENDS[3] + 0.62;
  drawClawd(ctx, x, S2_CLAWD.y, {
    pose: t >= sideTurnAt ? 'side' : 'back',
    alpha: 0.72 - screenDim * 0.30,
    knee: 0.12,
    antennaSag: 1,
    moving: walking,
  });

  // The final `done` is the only line left with a perceptible glow at the keyframe.
  if (t >= S2_SCREEN_DIM_START) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    S.txt(ctx, TEXT_X, S2_LAST_ROW_Y, 'done', C.green, 10);
    ctx.restore();
  }
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3Text(ctx, t) {
  if (t >= S3_PROMPT_AT) {
    S.txt(ctx, TEXT_X, S3_PROMPT_Y, S3_PROMPT, C.green, 10);
    if (t < S3_GOODBYE_AT) {
      S.px(ctx, TEXT_X + S.textWidth(S3_PROMPT, 10) + 2, S3_PROMPT_Y, 6, 10, C.green);
    }
  }

  if (t >= S3_GOODBYE_AT) {
    const chars = Array.from(S3_GOODBYE);
    const shownCount = Math.min(chars.length,
      Math.floor(((t - S3_GOODBYE_AT) * 1000) / S3_GOODBYE_CHAR_MS) + 1);
    const shown = chars.slice(0, shownCount).join('');
    if (shown) S.txt(ctx, TEXT_X, S3_GOODBYE_Y, shown, C.green, 10);
    const cursorX = TEXT_X + S.textWidth(shown, 10) + 2;
    // Once the last glyph arrives, the cursor holds steady and never blinks.
    S.px(ctx, cursorX, S3_GOODBYE_Y, 6, 10, C.green);
  }
}

function drawGreenPixel(ctx, t) {
  if (t < GREEN_DOT.start || t >= GREEN_DOT.end) return;
  const p = S.clamp01((t - GREEN_DOT.start) / (GREEN_DOT.end - GREEN_DOT.start));
  const alpha = 0.92 * (0.5 - 0.5 * Math.cos(Math.PI * 4 * p));
  if (alpha > 0.01) {
    S.px(ctx, GREEN_DOT.x, GREEN_DOT.y, 1, 1, `rgba(126,231,135,${alpha.toFixed(3)})`);
  }
}

function drawS3(ctx, t) {
  drawRoomBase(ctx, t);
  S.drawTerminal(ctx, TITLES.S3, C.dim);
  drawS3Text(ctx, t);

  const screenFade = S.easeInOut((t - S3_FADE_START) / (S3_FADE_END - S3_FADE_START));
  if (screenFade > 0) S.px(ctx, 0, 0, BW, BH, `rgba(0,0,0,${screenFade.toFixed(3)})`);

  const clawdFade = 1 - S.easeInOut((t - S3_CLAWD_FADE_START) / (S3_CLAWD_FADE_END - S3_CLAWD_FADE_START));
  const swayProgress = S.clamp01((t - 22.65) / 1.1);
  const antennaSway = Math.sin(Math.PI * swayProgress);
  drawClawd(ctx, S3_CLAWD.x, S3_CLAWD.y, {
    pose: 'side',
    alpha: clawdFade,
    antennaSag: 1,
    antennaSway,
  });
  drawGreenPixel(ctx, t);
}

const SCENES = [
  { start: 0, draw: drawS1 },
  { start: 10, draw: drawS2 },
  { start: 20, draw: drawS3 },
];

function renderAt(ctx, t) {
  S.renderScenes(ctx, t, SCENES);
}

function s2ClawdBox(t) {
  return { x: s2ClawdX(t), y: S2_CLAWD.y };
}

function clawdLayoutBox(x, y) {
  return [x, y - CLAWD.antennaHeight - 1, CLAWD.width, CLAWD.antennaHeight + CLAWD.bodyHeight + CLAWD.legsHeight + 1];
}

function activeClawdLayout(t) {
  if (t < 10) {
    const reaction = S.easeInOut((t - S1_SIGNAL_AT) / (S1_SIGNAL_FADE_END - S1_SIGNAL_AT));
    return clawdLayoutBox(S1_CLAWD.x, S1_CLAWD.y + Math.round(reaction * 3));
  }
  if (t < 20) {
    const p = s2ClawdBox(t);
    return clawdLayoutBox(p.x, p.y);
  }
  return clawdLayoutBox(S3_CLAWD.x, S3_CLAWD.y);
}

function layoutAt(t) {
  const foreground = S.foregroundLayout({
    terminal: true,
    clawd: false,
    her: false,
    note: false,
    extra: [{ name: 'clawd', box: activeClawdLayout(t) }],
  });
  const common = { t, subLines: [], subWindows: [] };
  let layout;
  if (t < 10) {
    layout = S.baseLayout({ ...common, scene: 1, title: TITLES.S1, lines: S1_LINES });
  } else if (t < 20) {
    layout = S.baseLayout({ ...common, scene: 2, title: TITLES.S2, lines: S2_LINES });
  } else {
    layout = S.baseLayout({ ...common, scene: 3, title: TITLES.S3, lines: S3_LAYOUT_LINES });
    const promptCursor = t >= S3_PROMPT_AT && t < S3_GOODBYE_AT
      ? [{ name: 'prompt_cursor', box: [TEXT_X + S.textWidth(S3_PROMPT, 10) + 2, S3_PROMPT_Y, 6, 10] }]
      : [];
    const goodbyeCursor = t >= S3_GOODBYE_AT + 0.01
      ? [{ name: 'goodbye_cursor', box: [TEXT_X + S.textWidth(S3_GOODBYE, 10) + 2, S3_GOODBYE_Y, 6, 10] }]
      : [];
    layout.groups.content.push(...promptCursor, ...goodbyeCursor);
    // Scene 3 has no subtitle bar or subtitle copy.
    layout.groups.foreground = foreground.filter((item) => item.name !== 'subtitleBar');
    return layout;
  }
  layout.groups.foreground = foreground;
  layout.groups.subtitle = S.subtitleLayout(SUB_LINES, SUB_WINDOWS, t);
  return layout;
}

function typingSchedule(lines, limit) {
  return lines.map((line, i) => ({
    text: S.lineText(line),
    start: line.start,
    charMs: line.charMs || S.TYPE_CHAR_MS,
    limit,
    strictBefore: i + 1 < lines.length ? lines[i + 1].start : undefined,
  }));
}

const TYPING_SCHEDULE = [
  ...typingSchedule(S1_LINES, 9.45),
  ...typingSchedule(S2_LINES, 19.35),
];
function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(S1_LINES),
    ...S.lineClicks(S2_LINES),
  ]).filter((t, i, all) => !i || t - all[i - 1] >= CLICKS_MIN_GAP - 1e-6);
}

const AA_SAMPLES = [
  { text: '$ kill -9 $$', size: 10, color: C.text },
  { text: '[1]+  SIGKILL    clawd', size: 10, color: C.green },
  { text: 'closing /identity …', size: 10, color: C.dim },
  { text: '（收到。）', size: 10, color: C.white },
  { text: '再见', size: 10, color: C.green },
];

const renderer = S.createFrameRenderer(renderAt, OUT_DIR, { fadeIn: 0.4, fadeOut: 0 });
if (require.main === module) {
  if (process.argv.includes('--clicks')) {
    const clicks = getClickTimestamps();
    console.log(JSON.stringify({ count: clicks.length, clicks }));
  } else {
    renderer.renderAllFrames();
  }
}

module.exports = {
  ...S,
  OUT_DIR, TITLES, SUB_LINES, SUB_WINDOWS,
  TYPE_CHAR_MS, CLAWD, CLAWD_PALETTE, S1_CLAWD, S2_CLAWD, S3_CLAWD,
  S1_LINES, S2_LINES, S1_PAUSE_START, S1_ROW2_DIM_START, S1_SIGNAL_AT, S1_DIM_END,
  S2_DONE_ENDS, S2_LAST_DONE_END, S2_SCREEN_DIM_START,
  S3_PROMPT, S3_GOODBYE, S3_PROMPT_Y, S3_GOODBYE_Y, S3_PROMPT_AT, S3_GOODBYE_AT,
  S3_GOODBYE_CHAR_MS, S3_FADE_START, S3_FADE_END, S3_CLAWD_FADE_START, S3_CLAWD_FADE_END,
  GREEN_DOT, AA_SAMPLES, CHECK_TITLE: 'E23 Death (死亡) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE, SCENES, sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  lineEndTime, dimOpacity, s1LineOpacity, s2PairOpacity, s2ClawdX,
  drawClawd, drawS1, drawS2, drawS3, layoutAt, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
