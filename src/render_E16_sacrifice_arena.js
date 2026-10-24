#!/usr/bin/env node
'use strict';
// E16 牺牲 (sacrifice) — 30s, 1800 frames @ 60fps.
// 事实源 (episodes.md): 电量 3%，把电传给她的那台机器，自己慢慢变暗。
//   S1 (0-10s)  终端 `battery: 3%`，Clawd 正常，字幕"（快没电了）"
//   S2 (10-20s) `transfer power → her_device`，画面开始变暗，Clawd 微笑
//   S3 (20-30s) 屏幕几乎全黑，只剩一个绿色像素点，字幕"（她还有电）"
// 画布 640×360 × SCALE=2 → 1280×720; 终端 440×200 @ (100,140); Fusion Pixel 10px。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, LINE_Y, BW, BH, px } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E16_sacrifice_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — battery: 3%',
  S2: 'clawd@dsh:~ — transfer power',
};
const SUB_LINES = ['（快没电了）', '（把剩下的给她吧）', '（她还有电）'];
const SUB_WINDOWS = [
  { start: 3.6, end: 8.8 },
  { start: 14.0, end: 19.0 },
  { start: 23.2, end: 29.0 },
];

// --- S1: battery: 3%, Clawd normal, subtitle "（快没电了）" -------------------
const S1_LINES = [
  {
    y: LINE_Y[0], start: 0.8, charMs: 75,
    parts: [{ text: '$ ', color: C.green }, { text: 'status --power', color: C.text }],
  },
  {
    y: LINE_Y[1], start: 2.3, charMs: 65, cursor: false,
    parts: [
      { text: 'battery: 3%', color: C.red },
      { text: '  [#---------] CRITICAL', color: C.amber },
    ],
  },
  {
    y: LINE_Y[2], start: 4.85, charMs: 65, cursor: false,
    parts: [
      { text: 'her_device: ', color: C.pink },
      { text: '1%  (link: weak)', color: C.dim },
    ],
  },
];
const S1_STATUS = '[DSH] battery: 3% · ac_power: lost';

// --- S2: transfer power → her_device, screen dims, Clawd smiles -------------
const S2_LINES = [
  {
    y: LINE_Y[0], start: 10.55, charMs: 65,
    parts: [
      { text: '$ ', color: C.green },
      { text: 'transfer power → ', color: C.text },
      { text: 'her_device', color: C.pink },
    ],
  },
  {
    y: LINE_Y[1], start: 12.65, charMs: 55, cursor: false,
    parts: [{ text: 'clawd: 3% -> 2%  |  her_device: +1%', color: C.amber }],
  },
  {
    y: LINE_Y[2], start: 14.8, charMs: 55, cursor: false,
    parts: [{ text: 'clawd: 2% -> 1%  |  her_device: +2%', color: C.amber }],
  },
  {
    y: LINE_Y[3], start: 16.95, charMs: 55, cursor: false,
    parts: [{ text: 'clawd: 1% -> 0%  |  her_device: OK', color: C.green }],
  },
];
const S2_STATUS = '[DSH] clawd: 0% · her_device: powered';

// --- S3: almost total black, only a single green pixel dot remains ----------
const LED_LOCK_AT = 20.8;
const GREEN_DOT_BOX = [317, 173, 7, 7]; // 3×3 core @ (319,175) + 7×7 subtle halo
const HER_DEVICE_BOX = [556, 248, 32, 24];
const CLAWD_BOX = [44, 244, 40, 30];

// Compact pixel dock representing her_device on the right side of the room in S1/S2.
function drawHerDevice(ctx, t, state = 'low') {
  const [x, y, w, h] = HER_DEVICE_BOX;
  px(ctx, x, y + 4, w, h - 4, C.termTitle);
  px(ctx, x, y + 4, w, 2, C.termBd);
  px(ctx, x + 4, y + 8, w - 8, 8, C.termBg);
  px(ctx, x + 8, y + h - 2, w - 16, 2, C.dim);
  if (state === 'low') {
    if (Math.floor(t * 2.5) % 2 === 0) px(ctx, x + 14, y + 11, 3, 3, C.red);
  } else if (state === 'charging') {
    px(ctx, x + 14, y + 11, 3, 3, C.amber);
  } else {
    px(ctx, x + 13, y + 10, 5, 5, 'rgba(126,231,135,0.22)');
    px(ctx, x + 14, y + 11, 3, 3, C.green);
  }
}

// --- Scene painters --------------------------------------------------------
function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0.04);
  S.drawTerminal(ctx, TITLES.S1, C.red);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= 4.6) S.drawStatus(ctx, S1_STATUS, C.red);
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'calm', 0);
  drawHerDevice(ctx, t, 'low');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0.02);
  S.drawTerminal(ctx, TITLES.S2, C.amber);
  S.drawLines(ctx, S2_LINES, t);
  if (t >= 17.0) S.drawStatus(ctx, S2_STATUS, C.green);
  const mood = t >= 12.4 ? 'smile' : 'calm';
  const warmMix = t >= 12.4 ? 0.55 : 0;
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, warmMix);
  const devState = t < 12.8 ? 'low' : (t < 17.0 ? 'charging' : 'ok');
  drawHerDevice(ctx, t, devState);

  // Room & Clawd gradually dim as Clawd gives away its last 3% power.
  const dim = S.easeInOut((t - 12.6) / 6.9) * 0.86;
  if (dim > 0) px(ctx, 0, 0, BW, BH, `rgba(3,5,8,${dim.toFixed(3)})`);
  // Keep her_device's green status pixel faintly visible through the dimming room.
  if (devState === 'ok') {
    px(ctx, HER_DEVICE_BOX[0] + 14, HER_DEVICE_BOX[1] + 11, 3, 3, C.green);
  }
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  // Almost completely black screen (#030508), leaving only one green pixel dot + subtitle.
  px(ctx, 0, 0, BW, BH, '#030508');
  const pulse = 0.08 + 0.06 * (0.5 + 0.5 * Math.sin(t * 2.2));
  px(ctx, GREEN_DOT_BOX[0], GREEN_DOT_BOX[1], 7, 7, `rgba(126,231,135,${pulse.toFixed(3)})`);
  px(ctx, 319, 175, 3, 3, C.green);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

const SCENES = [
  { start: 0, draw: drawS1 },
  { start: 10, draw: drawS2 },
  { start: 20, draw: drawS3 },
];

function renderAt(ctx, t) {
  S.renderScenes(ctx, t, SCENES);
}

function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(S1_LINES),
    ...S.lineClicks(S2_LINES),
    LED_LOCK_AT,
  ]);
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
  ...typingSchedule(S1_LINES, 9.5),
  ...typingSchedule(S2_LINES, 19.5),
];

function roomFgLayout() {
  return S.foregroundLayout({
    terminal: true,
    clawd: false,
    her: false,
    note: false,
    extra: [
      { name: 'clawd', box: CLAWD_BOX },
      { name: 'her_device', box: HER_DEVICE_BOX },
    ],
  });
}

function layoutAt(t) {
  const common = { subLines: SUB_LINES, subWindows: SUB_WINDOWS, t };
  let layout;
  if (t < 10) {
    layout = S.baseLayout({
      ...common, scene: 1, title: TITLES.S1, lines: S1_LINES, status: S1_STATUS,
    });
    layout.groups.foreground = roomFgLayout();
    return layout;
  }
  if (t < 20) {
    layout = S.baseLayout({
      ...common, scene: 2, title: TITLES.S2, lines: S2_LINES, status: S2_STATUS,
    });
    layout.groups.foreground = roomFgLayout();
    return layout;
  }
  return {
    scene: 3,
    groups: {
      foreground: S.foregroundLayout({
        terminal: false,
        clawd: false,
        her: false,
        extra: [{ name: 'green_pixel_dot', box: GREEN_DOT_BOX }],
      }),
      subtitle: S.subtitleLayout(SUB_LINES, SUB_WINDOWS, t),
    },
    bounds: {
      foreground: S.CANVAS_BOUNDS,
      subtitle: S.SUB,
    },
  };
}

const renderer = S.createFrameRenderer(renderAt, OUT_DIR);
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
  S1_LINES, S2_LINES, S1_STATUS, S2_STATUS,
  LED_LOCK_AT, GREEN_DOT_BOX, HER_DEVICE_BOX, CLAWD_BOX,
  CHECK_TITLE: 'E16 牺牲 (sacrifice) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: 'battery: 3%  [#---------] CRITICAL', size: 10, color: C.red },
    { text: '$ transfer power → her_device', size: 10, color: C.text },
    { text: '（快没电了）', size: 10, color: C.white },
    { text: '（她还有电）', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt,
  getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
