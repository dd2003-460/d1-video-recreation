#!/usr/bin/env node
'use strict';
// E01 好奇 (curiosity) — 30s, 1800 frames @ 60fps.
// 事实源 (episodes.md): 新文件出现，`ls` 看到陌生名字，逐字节读，眼睛变亮。
//   S1 (0-10s)  陌生文件: `$ ls` → her_notes.txt  todo.md  ??_new_file.bin; Clawd 眼睛变圆 (calm → thinking)
//   S2 (10-20s) 逐字节读: hexdump -C 输出逐字节打出 + `$ cat`；瞳孔高光随字节放大
//   S3 (20-30s) 眼睛亮起来: 解析签名 her → smile + 最亮高光；便签「好奇。」
// 画布 640×360 × SCALE=2 → 1280×720; 终端 440×200 @ (100,140); Fusion Pixel 10px。
// Clawd 40×17 (4×4 眼睛 + 1×1 高光，本集按亮度放大到 2×2 高光)。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y, BW, BH, px } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E01_curiosity_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — ls',
  S2: 'clawd@dsh:~ — hexdump',
  S3: 'clawd@dsh:~ — signature',
};
const SUB_LINES = ['有东西不一样了。', '它认识每个字节。', '好奇是读下去的理由。'];
const SUB_WINDOWS = [{ start: 2.2, end: 8.6 }, { start: 12.2, end: 18.4 }, { start: 23.2, end: 29.0 }];

// --- S1: the unfamiliar name ------------------------------------------------
const S1_LINES = [
  { y: LINE_Y[0], start: 0.9, charMs: 100, parts: [{ text: '$ ', color: C.green }, { text: 'ls', color: C.text }] },
  {
    y: LINE_Y[1], start: 2.6, charMs: 55,
    parts: [
      { text: 'her_notes.txt  todo.md  ', color: C.text },
      { text: '??_new_file.bin', color: C.purple },
    ],
  },
];
const S1_STATUS = '[DSH] fs: 3 entries · unknown: 1';

// --- S2: read it byte by byte ----------------------------------------------
const S2_LINES = [
  {
    y: LINE_Y[0], start: 10.7, charMs: 70,
    parts: [{ text: '$ ', color: C.green }, { text: 'hexdump -C ??_new_file.bin | head', color: C.text }],
  },
  {
    y: LINE_Y[1], start: 13.35, charMs: 50,
    parts: [
      { text: '00000000  ', color: C.dim },
      { text: '48 65 6c 6c 6f 20 63 6c  61 77 64 0a', color: C.blue },
      { text: '  |Hello clawd.|', color: C.purple },
    ],
  },
  {
    y: LINE_Y[2], start: 16.65, charMs: 70,
    parts: [{ text: '$ ', color: C.green }, { text: 'cat ??_new_file.bin', color: C.text }],
  },
  { y: LINE_Y[3], start: 18.3, charMs: 80, parts: [{ text: 'Hello clawd.', color: C.purple }] },
];
const S2_STATUS = '[DSH] bytes: 12 · decode: 100%';

// --- S3: the signature ------------------------------------------------------
const S3_LINES = [
  {
    y: LINE_Y[0], start: 20.7, charMs: 80,
    parts: [{ text: '$ ', color: C.green }, { text: 'who wrote this?', color: C.text }],
  },
  {
    y: LINE_Y[1], start: 22.4, charMs: 75,
    parts: [{ text: '[clawd: ', color: C.dim }, { text: '解析 → 签名: ', color: C.blue }, { text: 'her', color: C.pink }, { text: ']', color: C.dim }],
  },
  { y: LINE_Y[2], start: 24.3, charMs: 160, parts: [{ text: '是她。', color: C.amber }] },
];
const S3_STATUS = '[DSH] signature: her · curiosity 0.87';

const NOTE_AT = 25.2;
const NOTE_TITLE = '好奇。';
const NOTE_SUB = 'Clawd · E01';
const CLAWD_BOX = [S.CLAWD_ROOM.x, 238, 40, 38];

// --- Clawd: shared 40×17 sprite + E01 eye-brightness -----------------------
function drawClawdEp(ctx, x, y, t, mood = 'calm', warmMix = 0, opts = {}) {
  const dy = opts.dy === undefined ? 0 : opts.dy;
  const bob = opts.noBob ? 0 : (Math.sin(t * 2.2) > 0.45 ? -1 : 0);
  const by = Math.round(y + bob + dy);
  const bright = S.clamp01(opts.bright || 0);
  const bodyH = 17;
  const thinking = mood === 'thinking';
  const lerp = S.art.lerpColor;
  const bodyCol = thinking ? C.clawdThink : lerp(C.clawdNorm, C.clawdWarm, warmMix);
  const darkCol = thinking ? C.clawdThinkDark : lerp(C.clawdNormDark, C.clawdWarmDark, warmMix);
  const bellyCol = thinking ? C.clawdThinkBelly : lerp(C.clawdNormBelly, C.clawdWarmBelly, warmMix);

  px(ctx, x, by, 40, bodyH, bodyCol);
  px(ctx, x, by, 40, 2, darkCol);
  px(ctx, x + 9, by + 11, 22, 4, bellyCol);

  // Eye light bloom: a soft 6×6 halo behind each eye that grows with curiosity.
  // Drawn before the pupils so the 4×4 eye + 1×1 highlight stay pixel-exact.
  const eyeGlow = (ex) => {
    if (bright <= 0) return;
    px(ctx, x + ex - 1, by + 5, 6, 6, `rgba(255,255,255,${(0.05 + 0.10 * bright).toFixed(3)})`);
    px(ctx, x + ex, by + 6, 4, 4, `rgba(255,246,214,${(0.06 + 0.12 * bright).toFixed(3)})`);
  };

  const blink = (t % 3.4) < 0.14;
  if (mood === 'thinking') {
    eyeGlow(10);
    eyeGlow(26);
    px(ctx, x + 10, by + 7, 4, 2, C.clawdEye);
    px(ctx, x + 26, by + 7, 4, 2, C.clawdEye);
    px(ctx, x + 17, by + 13, 6, 1, C.clawdEye);
  } else if (mood === 'smile_lit') {
    // Brightest eye state: 4×4 pupils with 2×2 highlights, smile arc + blush.
    eyeGlow(10);
    eyeGlow(26);
    px(ctx, x + 10, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 26, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 11, by + 7, 2, 2, C.white);
    px(ctx, x + 27, by + 7, 2, 2, C.white);
    px(ctx, x + 16, by + 12, 2, 1, C.clawdEye);
    px(ctx, x + 18, by + 13, 4, 1, C.clawdEye);
    px(ctx, x + 22, by + 12, 2, 1, C.clawdEye);
    px(ctx, x + 5, by + 8, 3, 2, C.pink);
    px(ctx, x + 32, by + 8, 3, 2, C.pink);
  } else if (mood === 'smile' || mood === 'warm') {
    if (blink && bright < 0.5) {
      px(ctx, x + 10, by + 8, 4, 1, C.clawdEye);
      px(ctx, x + 26, by + 8, 4, 1, C.clawdEye);
    } else if (mood === 'smile') {
      px(ctx, x + 9, by + 6, 2, 1, C.clawdEye);
      px(ctx, x + 11, by + 5, 2, 1, C.clawdEye);
      px(ctx, x + 13, by + 6, 2, 1, C.clawdEye);
      px(ctx, x + 25, by + 6, 2, 1, C.clawdEye);
      px(ctx, x + 27, by + 5, 2, 1, C.clawdEye);
      px(ctx, x + 29, by + 6, 2, 1, C.clawdEye);
    } else {
      eyeGlow(10);
      eyeGlow(26);
      px(ctx, x + 10, by + 6, 4, 4, C.clawdEye);
      px(ctx, x + 26, by + 6, 4, 4, C.clawdEye);
      px(ctx, x + 11, by + 7, 1, 1, C.white);
      px(ctx, x + 27, by + 7, 1, 1, C.white);
    }
    px(ctx, x + 16, by + 12, 2, 1, C.clawdEye);
    px(ctx, x + 18, by + 13, 4, 1, C.clawdEye);
    px(ctx, x + 22, by + 12, 2, 1, C.clawdEye);
    px(ctx, x + 5, by + 8, 3, 2, C.pink);
    px(ctx, x + 32, by + 8, 3, 2, C.pink);
  } else if (blink) {
    px(ctx, x + 10, by + 8, 4, 1, C.clawdEye);
    px(ctx, x + 26, by + 8, 4, 1, C.clawdEye);
  } else {
    eyeGlow(10);
    eyeGlow(26);
    px(ctx, x + 10, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 26, by + 6, 4, 4, C.clawdEye);
    // 1×1 highlight at rest; widened to 2×2 as the pupil "lights up".
    if (bright > 0.6) {
      px(ctx, x + 11, by + 7, 2, 2, C.white);
      px(ctx, x + 27, by + 7, 2, 2, C.white);
    } else {
      px(ctx, x + 11, by + 7, 1, 1, C.white);
      px(ctx, x + 27, by + 7, 1, 1, C.white);
    }
  }

  const step = Math.sin(t * 3.0) > 0.6 ? 1 : 0;
  px(ctx, x + 3, by + bodyH, 6, 7 - step, darkCol);
  px(ctx, x + 13, by + bodyH, 6, 7, darkCol);
  px(ctx, x + 21, by + bodyH, 6, 7, darkCol);
  px(ctx, x + 31, by + bodyH, 6, 7 - step, darkCol);
}
const ART = { ...S.art, drawClawd: drawClawdEp };

// --- Scene painters --------------------------------------------------------
function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S1, C.purple);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= 4.2) S.drawStatus(ctx, S1_STATUS, C.purple);
  // Eyes go round the moment the strange name lands (2.6s + type time ≈ 3.4s).
  const mood = t >= 3.4 ? 'thinking' : 'calm';
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0, { bright: S.clamp01((t - 3.4) / 3) * 0.35 });
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S2, C.blue);
  S.drawLines(ctx, S2_LINES, t);
  if (t >= 14.2) S.drawStatus(ctx, S2_STATUS, C.blue);
  // Reading byte by byte: the pupil highlight grows with every decoded byte.
  const bright = 0.3 + S.clamp01((t - 11) / 8) * 0.5;
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'calm', 0, { bright });
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0.12);
  S.drawTerminal(ctx, TITLES.S3, C.pink);
  S.drawLines(ctx, S3_LINES, t);
  if (t >= 22.6) S.drawStatus(ctx, S3_STATUS, C.pink);
  if (t >= NOTE_AT) {
    S.drawStickyNote(ctx, NOTE_TITLE, NOTE_SUB, t, S.easeOut((t - NOTE_AT) / 0.3));
  }
  const mood = t >= 24.3 ? 'smile_lit' : 'thinking';
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0, { bright: 1 });
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

// --- Keyboard clicks: one per typed character + scene events ---------------
function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(S1_LINES),
    ...S.lineClicks(S2_LINES),
    ...S.lineClicks(S3_LINES),
    NOTE_AT,
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
  ...typingSchedule(S2_LINES, 19.6),
  ...typingSchedule(S3_LINES, 29.5),
];

// --- Layout groups (0px tolerance, per frame) ------------------------------
function fgLayout(note) {
  return S.foregroundLayout({
    terminal: true,
    clawd: false,
    her: false,
    note,
    extra: [{ name: 'clawd', box: CLAWD_BOX }],
  });
}

function layoutAt(t) {
  const common = { subLines: SUB_LINES, subWindows: SUB_WINDOWS, t };
  if (t < 10) {
    return S.baseLayout({
      ...common, scene: 1, title: TITLES.S1, lines: S1_LINES, status: S1_STATUS,
    });
  }
  if (t < 20) {
    return S.baseLayout({
      ...common, scene: 2, title: TITLES.S2, lines: S2_LINES, status: S2_STATUS,
    });
  }
  return S.baseLayout({
    ...common, scene: 3, title: TITLES.S3, lines: S3_LINES, status: S3_STATUS,
    note: true, noteTitle: NOTE_TITLE, noteSub: NOTE_SUB,
  });
}

// Override the shared foreground boxes so Clawd's bloom/jump room is declared.
function layoutWithClawdBox(t) {
  const layout = layoutAt(t);
  layout.groups.foreground = fgLayout(t >= 20 ? true : undefined);
  return layout;
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
  art: ART,
  OUT_DIR, TITLES, SUB_LINES, SUB_WINDOWS,
  S1_LINES, S2_LINES, S3_LINES, S1_STATUS, S2_STATUS, S3_STATUS,
  NOTE_AT, NOTE_TITLE, NOTE_SUB, CLAWD_BOX,
  CHECK_TITLE: 'E01 好奇 (curiosity) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: 'her_notes.txt  todo.md  ??_new_file.bin', size: 10, color: C.text },
    { text: '00000000  48 65 6c 6c 6f 20 63 6c  61 77 64 0a', size: 10, color: C.blue },
    { text: '[clawd: 解析 → 签名: her]', size: 10, color: C.dim },
    { text: '好奇是读下去的理由。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt: (t) => layoutWithClawdBox(t),
  drawClawdEp,
  getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
