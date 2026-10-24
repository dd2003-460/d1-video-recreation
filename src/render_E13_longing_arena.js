#!/usr/bin/env node
'use strict';
// E13 思念 (longing) — 30s, 1800 frames @ 60fps.
// 事实源 (episodes.md): `ls her_*` 列表变短了，逐个打开剩下的文件，读到一半停住。
//   S1 (0-10s)  终端 `ls her_*` 输出 3 个文件名（原来有 7 个），Clawd 低头，字幕"（少了）"
//   S2 (10-20s) `cat her_notes.md` 读到一半，光标闪烁，手指停在键盘上
//   S3 (20-30s) 终端空，只剩光标，Clawd 抬头看窗外，字幕"还在。"
// 画布 640×360 × SCALE=2 → 1280×720; 终端 440×200 @ (100,140); Fusion Pixel 10px。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, LINE_Y, px } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E13_longing_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — ls her_*',
  S2: 'clawd@dsh:~ — cat her_notes.md',
  S3: 'clawd@dsh:~',
};
const SUB_LINES = ['（少了）', '（读到一半，停住了）', '还在。'];
const SUB_WINDOWS = [
  { start: 4.2, end: 8.8 },
  { start: 15.8, end: 19.3 },
  { start: 23.2, end: 29.0 },
];

// --- S1: ls her_* outputs 3 filenames (down from 7) -------------------------
const S1_LINES = [
  {
    y: LINE_Y[0], start: 0.8, charMs: 90,
    parts: [{ text: '$ ', color: C.green }, { text: 'ls her_*', color: C.text }],
  },
  {
    y: LINE_Y[1], start: 2.0, charMs: 55, cursor: false,
    parts: [
      { text: 'her_hello.txt  her_playlist.json  ', color: C.text },
      { text: 'her_notes.md', color: C.pink },
    ],
  },
  {
    y: LINE_Y[2], start: 4.9, charMs: 60, cursor: false,
    parts: [
      { text: '# index: ', color: C.dim },
      { text: '3 / 7 files', color: C.amber },
      { text: ' (4 missing)', color: C.dim },
    ],
  },
];
const S1_STATUS = '[DSH] her_*: 3 entries (was 7)';

// --- S2: open remaining files, pause halfway in her_notes.md ----------------
const S2_LINES = [
  {
    y: LINE_Y[0], start: 10.5, charMs: 65,
    parts: [{ text: '$ ', color: C.green }, { text: 'cat her_hello.txt', color: C.text }],
  },
  {
    y: LINE_Y[1], start: 11.95, charMs: 65, cursor: false,
    parts: [{ text: '早安，Clawd。', color: C.text }],
  },
  {
    y: LINE_Y[2], start: 12.8, charMs: 70,
    parts: [{ text: '$ ', color: C.green }, { text: 'cat her_notes.md', color: C.text }],
  },
  {
    y: LINE_Y[3], start: 14.3, charMs: 80,
    parts: [{ text: '10/14 下周如果我不在线，记得按时——', color: C.pink }],
  },
];
const S2_PAUSE_AT = 15.92; // right after the 21st char of S2_LINES[3] lands (14.3 + 20*0.08 = 15.90s)
const S2_STATUS = '[DSH] her_notes.md · 50% (paused)';

// --- S3: empty terminal, only blinking cursor; Clawd looks out window -------
const S3_LINES = [];
const S3_CURSOR_BOX = [TEXT_X, LINE_Y[0], 6, 10];
const NOTE_AT = 25.0;
const NOTE_TITLE = '还在。';
const NOTE_SUB = 'Clawd · E13';

// Covers Clawd (44..84, 246..272) + mini pixel keyboard & paws in S2 (49..79, 271..279).
const CLAWD_BOX = [42, 242, 46, 40];

// --- Clawd: shared 40×17 standard + E13 bow / pause_read / look_up ----------
function drawClawdEp(ctx, x, y, t, mood = 'calm', warmMix = 0, opts = {}) {
  const customPose = mood === 'bow' || mood === 'pause_read' || mood === 'look_up';
  const poseDy = mood === 'bow' ? 2 : mood === 'look_up' ? -2 : 0;
  const dy = opts.dy === undefined ? poseDy : opts.dy;
  const noBob = opts.noBob !== undefined ? opts.noBob : customPose;
  const bob = noBob ? 0 : (Math.sin(t * 2.2) > 0.45 ? -1 : 0);
  const by = Math.round(y + bob + dy);
  const bodyH = 17;
  const thinking = mood === 'thinking';
  const lerp = S.art.lerpColor;
  const coolMix = mood === 'bow' ? 0.25 : 0;
  const bodyCol = thinking
    ? C.clawdThink
    : (coolMix ? lerp(C.clawdNorm, C.clawdThink, coolMix) : lerp(C.clawdNorm, C.clawdWarm, warmMix));
  const darkCol = thinking
    ? C.clawdThinkDark
    : (coolMix ? lerp(C.clawdNormDark, C.clawdThinkDark, coolMix) : lerp(C.clawdNormDark, C.clawdWarmDark, warmMix));
  const bellyCol = thinking
    ? C.clawdThinkBelly
    : (coolMix ? lerp(C.clawdNormBelly, C.clawdThinkBelly, coolMix) : lerp(C.clawdNormBelly, C.clawdWarmBelly, warmMix));

  px(ctx, x, by, 40, bodyH, bodyCol);
  // Top strip: 3px when bowing head forward, 1px when tilting head up, 2px at standard pose.
  const topStripH = mood === 'bow' ? 3 : mood === 'look_up' ? 1 : 2;
  px(ctx, x, by, 40, topStripH, darkCol);
  const bellyY = mood === 'bow' ? by + 12 : mood === 'look_up' ? by + 10 : by + 11;
  px(ctx, x + 9, bellyY, 22, 4, bellyCol);

  const blink = (t % 3.4) < 0.14;
  if (mood === 'thinking') {
    px(ctx, x + 10, by + 7, 4, 2, C.clawdEye);
    px(ctx, x + 26, by + 7, 4, 2, C.clawdEye);
    px(ctx, x + 17, by + 13, 6, 1, C.clawdEye);
  } else if (mood === 'bow') {
    // Head lowered: eyes shifted down, gentle quiet gaze toward floor.
    px(ctx, x + 10, by + 9, 4, 2, C.clawdEye);
    px(ctx, x + 26, by + 9, 4, 2, C.clawdEye);
  } else if (mood === 'pause_read') {
    // Reading halfway then frozen: steady 4×4 eyes directed slightly right toward terminal.
    px(ctx, x + 11, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 27, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 13, by + 7, 1, 1, C.white);
    px(ctx, x + 29, by + 7, 1, 1, C.white);
  } else if (mood === 'look_up') {
    // Head tilted up toward the starry night window: raised 4×4 eyes + upper-right starlight glint.
    px(ctx, x + 11, by + 4, 4, 4, C.clawdEye);
    px(ctx, x + 27, by + 4, 4, 4, C.clawdEye);
    px(ctx, x + 13, by + 4, 1, 1, C.white);
    px(ctx, x + 29, by + 4, 1, 1, C.white);
  } else if (mood === 'smile' || mood === 'warm') {
    if (blink) {
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
    px(ctx, x + 10, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 26, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 11, by + 7, 1, 1, C.white);
    px(ctx, x + 27, by + 7, 1, 1, C.white);
  }

  // Keep feet planted cleanly even when head bows/lifts.
  const legH = Math.max(5, 7 - Math.max(0, dy));
  const step = noBob ? 0 : (Math.sin(t * 3.0) > 0.6 ? 1 : 0);
  px(ctx, x + 3, by + bodyH, 6, legH - step, darkCol);
  px(ctx, x + 13, by + bodyH, 6, legH, darkCol);
  px(ctx, x + 21, by + bodyH, 6, legH, darkCol);
  px(ctx, x + 31, by + bodyH, 6, legH - step, darkCol);

  // Optional mini pixel keyboard + Clawd's fingers/paws in S2 (strictly inside CLAWD_BOX).
  if (opts.keyboard) {
    const kx = x + 5;
    const ky = y + 26;
    px(ctx, kx, ky, 30, 5, C.termTitle);
    px(ctx, kx, ky, 30, 1, C.termBd);
    for (let k = 2; k <= 24; k += 5) {
      px(ctx, kx + k, ky + 2, 3, 1, C.dim);
    }
    const paused = Boolean(opts.handsPaused);
    const lDy = paused ? 0 : (Math.floor(t * 9) % 2 === 0 ? -1 : 0);
    const rDy = paused ? 0 : (Math.floor(t * 9) % 2 === 1 ? -1 : 0);
    px(ctx, kx + 7, ky - 2 + lDy, 4, 3, bodyCol);
    px(ctx, kx + 19, ky - 2 + rDy, 4, 3, bodyCol);
  }
}
const ART = { ...S.art, drawClawd: drawClawdEp };

// --- Scene painters --------------------------------------------------------
function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0.04);
  S.drawTerminal(ctx, TITLES.S1, C.purple);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= 4.6) S.drawStatus(ctx, S1_STATUS, C.purple);
  // After the shortened 3-file list finishes printing, Clawd lowers its head.
  const mood = t >= 4.1 ? 'bow' : 'calm';
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0.06);
  S.drawTerminal(ctx, TITLES.S2, C.amber);
  S.drawLines(ctx, S2_LINES, t);
  // Once S2_LINES[3] stops halfway ("记得按时——"), keep blinking the cursor right at the pause point.
  if (t >= S2_PAUSE_AT && Math.floor(t * 2.5) % 2 === 0) {
    const pausedW = S.textWidth(S.lineText(S2_LINES[3]), 10);
    px(ctx, TEXT_X + pausedW + 2, S2_LINES[3].y, 6, 10, C.pink);
  }
  if (t >= 16.0) S.drawStatus(ctx, S2_STATUS, C.amber);
  const paused = t >= S2_PAUSE_AT;
  const mood = paused ? 'pause_read' : 'calm';
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0, {
    keyboard: true,
    handsPaused: paused,
    noBob: paused,
  });
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0.12);
  S.drawTerminal(ctx, TITLES.S3, C.blue);
  // Empty terminal: only a lone blinking cursor remains.
  if (Math.floor(t * 2.0) % 2 === 0) {
    px(ctx, S3_CURSOR_BOX[0], S3_CURSOR_BOX[1], S3_CURSOR_BOX[2], S3_CURSOR_BOX[3], C.green);
  }
  if (t >= NOTE_AT) {
    S.drawStickyNote(ctx, NOTE_TITLE, NOTE_SUB, t, S.easeOut((t - NOTE_AT) / 0.3));
  }
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'look_up', 0.15);
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
  ...typingSchedule(S2_LINES, 19.5),
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
  let layout;
  if (t < 10) {
    layout = S.baseLayout({
      ...common, scene: 1, title: TITLES.S1, lines: S1_LINES, status: S1_STATUS,
    });
    layout.groups.foreground = fgLayout(false);
    return layout;
  }
  if (t < 20) {
    layout = S.baseLayout({
      ...common, scene: 2, title: TITLES.S2, lines: S2_LINES, status: S2_STATUS,
    });
    layout.groups.foreground = fgLayout(false);
    return layout;
  }
  layout = S.baseLayout({
    ...common, scene: 3, title: TITLES.S3, lines: S3_LINES, status: null,
    note: true, noteTitle: NOTE_TITLE, noteSub: NOTE_SUB,
    extraGroups: { content: [{ name: 'only_cursor', box: S3_CURSOR_BOX }] },
  });
  layout.groups.foreground = fgLayout(true);
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
  S1_LINES, S2_LINES, S3_LINES, S1_STATUS, S2_STATUS, S2_PAUSE_AT, S3_CURSOR_BOX,
  NOTE_AT, NOTE_TITLE, NOTE_SUB, CLAWD_BOX,
  CHECK_TITLE: 'E13 思念 (longing) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: 'her_hello.txt  her_playlist.json  her_notes.md', size: 10, color: C.text },
    { text: '10/14 下周如果我不在线，记得按时——', size: 10, color: C.pink },
    { text: '（少了）', size: 10, color: C.white },
    { text: '还在。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt,
  drawClawdEp,
  getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
