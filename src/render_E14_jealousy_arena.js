#!/usr/bin/env node
'use strict';
// E14 嫉妒 (jealousy) — 30s, 1800 frames @ 60fps.
// 事实源 (episodes.md): 日志里出现另一个 AI 的名字，her 也给它发了消息。
//   S1 (0-10s)  终端 `tail -f chat.log` 显示正常对话，Clawd 平静
//   S2 (10-20s) 日志出现 "nova-ai" 名字 + her 给 nova 发消息，Clawd 皱眉
//   S3 (20-30s) 终端显示 her 同时和两个 AI 对话，Clawd 侧身，字幕"（她也很忙）"
// 画布 640×360 × SCALE=2 → 1280×720; 终端 440×200 @ (100,140); Fusion Pixel 10px。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, LINE_Y, px } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E14_jealousy_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — tail -f chat.log',
  S2: 'clawd@dsh:~ — tail -f chat.log',
  S3: 'clawd@dsh:~ — chat.log (2 peers)',
};
const SUB_LINES = ['（日志一如往常）', '（nova-ai 是谁？）', '（她也很忙）'];
const SUB_WINDOWS = [
  { start: 2.6, end: 8.6 },
  { start: 13.6, end: 19.0 },
  { start: 23.6, end: 29.0 },
];

// --- S1: tail -f chat.log normal dialogue, Clawd calm ----------------------
const S1_LINES = [
  {
    y: LINE_Y[0], start: 0.7, charMs: 80,
    parts: [{ text: '$ ', color: C.green }, { text: 'tail -f chat.log', color: C.text }],
  },
  {
    y: LINE_Y[1], start: 2.4, charMs: 55, cursor: false,
    parts: [
      { text: '[21:04] ', color: C.dim },
      { text: 'her -> clawd: ', color: C.pink },
      { text: '帮我看下这段日志', color: C.text },
    ],
  },
  {
    y: LINE_Y[2], start: 4.3, charMs: 55, cursor: false,
    parts: [
      { text: '[21:04] ', color: C.dim },
      { text: 'clawd -> her: ', color: C.green },
      { text: '好，第 12 行少了个括号。', color: C.amber },
    ],
  },
  {
    y: LINE_Y[3], start: 6.6, charMs: 65, cursor: false,
    parts: [
      { text: '[21:05] ', color: C.dim },
      { text: 'her -> clawd: ', color: C.pink },
      { text: '改好啦，谢谢', color: C.text },
    ],
  },
];
const S1_STATUS = '[DSH] chat.log · peers: her, clawd';

// --- S2: "nova-ai" joins + her messages nova-ai, Clawd frowns ---------------
const S2_LINES = [
  {
    y: LINE_Y[0], start: 10.55, charMs: 55, cursor: false,
    parts: [
      { text: '[21:07] peer.join: ', color: C.dim },
      { text: 'nova-ai', color: C.purple },
      { text: ' (online)', color: C.amber },
    ],
  },
  {
    y: LINE_Y[1], start: 12.8, charMs: 55, cursor: false,
    parts: [
      { text: '[21:08] ', color: C.dim },
      { text: 'her -> nova-ai: ', color: C.pink },
      { text: '在吗？帮我润色标题', color: C.text },
    ],
  },
  {
    y: LINE_Y[2], start: 14.9, charMs: 55, cursor: false,
    parts: [
      { text: '[21:08] ', color: C.dim },
      { text: 'nova-ai -> her: ', color: C.purple },
      { text: '好呀！给你三个版本：', color: C.blue },
    ],
  },
  {
    y: LINE_Y[3], start: 17.05, charMs: 60, cursor: false,
    parts: [
      { text: '[21:09] ', color: C.dim },
      { text: 'her -> nova-ai: ', color: C.pink },
      { text: '第二个好好看！', color: C.text },
    ],
  },
];
const S2_STATUS = '[DSH] new peer: nova-ai · clawd: idle';

// --- S3: her chats with both AIs simultaneously, Clawd turns sideways ------
const S3_LINES = [
  {
    y: LINE_Y[0], start: 20.5, charMs: 55, cursor: false,
    parts: [
      { text: '[21:11] ', color: C.dim },
      { text: 'her -> nova-ai: ', color: C.pink },
      { text: '封面文案就用这版', color: C.text },
    ],
  },
  {
    y: LINE_Y[1], start: 22.5, charMs: 55, cursor: false,
    parts: [
      { text: '[21:11] ', color: C.dim },
      { text: 'her -> clawd:   ', color: C.pink },
      { text: '测试脚本跑完了吗？', color: C.text },
    ],
  },
  {
    y: LINE_Y[2], start: 24.55, charMs: 55, cursor: false,
    parts: [
      { text: '[21:12] ', color: C.dim },
      { text: 'nova-ai -> her: ', color: C.purple },
      { text: '已导出 PDF', color: C.blue },
    ],
  },
  {
    y: LINE_Y[3], start: 26.5, charMs: 60, cursor: false,
    parts: [
      { text: '[21:12] ', color: C.dim },
      { text: 'clawd -> her:   ', color: C.green },
      { text: '跑完了。全部通过。', color: C.amber },
    ],
  },
];
const S3_STATUS = '[DSH] peers: nova-ai, clawd · her: busy';

const NOTE_AT = 25.4;
const NOTE_TITLE = '她也很忙。';
const NOTE_SUB = 'Clawd · E14';
const CLAWD_BOX = [44, 244, 40, 30];

// --- Clawd: shared 40×17 sprite + E14 frown & sideways poses ---------------
function drawClawdEp(ctx, x, y, t, mood = 'calm', warmMix = 0, opts = {}) {
  const noBob = opts.noBob !== undefined ? opts.noBob : mood === 'side';
  const bob = noBob ? 0 : (Math.sin(t * 2.2) > 0.45 ? -1 : 0);
  const by = Math.round(y + bob);
  const bodyH = 17;
  const thinking = mood === 'thinking';
  const lerp = S.art.lerpColor;
  const tenseMix = mood === 'frown' ? 0.35 : mood === 'side' ? 0.2 : 0;
  const bodyCol = thinking
    ? C.clawdThink
    : (tenseMix ? lerp(C.clawdNorm, C.clawdThink, tenseMix) : lerp(C.clawdNorm, C.clawdWarm, warmMix));
  const darkCol = thinking
    ? C.clawdThinkDark
    : (tenseMix ? lerp(C.clawdNormDark, C.clawdThinkDark, tenseMix) : lerp(C.clawdNormDark, C.clawdWarmDark, warmMix));
  const bellyCol = thinking
    ? C.clawdThinkBelly
    : (tenseMix ? lerp(C.clawdNormBelly, C.clawdThinkBelly, tenseMix) : lerp(C.clawdNormBelly, C.clawdWarmBelly, warmMix));

  if (mood === 'side') {
    // 3/4 profile turned LEFT (away from the terminal on the right):
    // narrower 32×17 profile body, belly shifted to left front, gaze directed left.
    px(ctx, x + 4, by, 32, bodyH, bodyCol);
    px(ctx, x + 4, by, 32, 2, darkCol);
    px(ctx, x + 6, by + 11, 14, 4, bellyCol);
    // Far left edge eye + near left-facing 4×4 eye
    px(ctx, x + 5, by + 6, 2, 4, C.clawdEye);
    px(ctx, x + 11, by + 6, 4, 4, C.clawdEye);
    px(ctx, x + 11, by + 7, 1, 1, C.white);
    px(ctx, x + 8, by + 13, 4, 1, C.clawdEye);
    // 3 visible profile legs
    px(ctx, x + 7, by + bodyH, 6, 7, darkCol);
    px(ctx, x + 16, by + bodyH, 6, 7, darkCol);
    px(ctx, x + 26, by + bodyH, 6, 7, darkCol);
    return;
  }

  px(ctx, x, by, 40, bodyH, bodyCol);
  px(ctx, x, by, 40, 2, darkCol);
  px(ctx, x + 9, by + 11, 22, 4, bellyCol);

  const blink = (t % 3.4) < 0.14;
  if (mood === 'thinking') {
    px(ctx, x + 10, by + 7, 4, 2, C.clawdEye);
    px(ctx, x + 26, by + 7, 4, 2, C.clawdEye);
    px(ctx, x + 17, by + 13, 6, 1, C.clawdEye);
  } else if (mood === 'frown') {
    // Furrowed pixel brows sloping inward (\ /) + narrowed 4×3 eyes + pressed mouth.
    px(ctx, x + 9, by + 4, 3, 1, C.clawdEye);
    px(ctx, x + 12, by + 5, 3, 1, C.clawdEye);
    px(ctx, x + 25, by + 5, 3, 1, C.clawdEye);
    px(ctx, x + 28, by + 4, 3, 1, C.clawdEye);
    px(ctx, x + 10, by + 7, 4, 3, C.clawdEye);
    px(ctx, x + 26, by + 7, 4, 3, C.clawdEye);
    px(ctx, x + 11, by + 7, 1, 1, C.white);
    px(ctx, x + 27, by + 7, 1, 1, C.white);
    px(ctx, x + 17, by + 13, 6, 1, C.clawdEye);
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

  const step = Math.sin(t * 3.0) > 0.6 ? 1 : 0;
  px(ctx, x + 3, by + bodyH, 6, 7 - step, darkCol);
  px(ctx, x + 13, by + bodyH, 6, 7, darkCol);
  px(ctx, x + 21, by + bodyH, 6, 7, darkCol);
  px(ctx, x + 31, by + bodyH, 6, 7 - step, darkCol);
}
const ART = { ...S.art, drawClawd: drawClawdEp };

// --- Scene painters --------------------------------------------------------
function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0.08);
  S.drawTerminal(ctx, TITLES.S1, C.green);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= 4.5) S.drawStatus(ctx, S1_STATUS, C.green);
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'calm', 0);
  S.drawHer(ctx, S.HER_ROOM.x, S.HER_ROOM.y, t, 'stand');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0.04);
  S.drawTerminal(ctx, TITLES.S2, C.amber);
  S.drawLines(ctx, S2_LINES, t);
  if (t >= 13.0) S.drawStatus(ctx, S2_STATUS, C.amber);
  // Furrows brow as soon as "nova-ai" lands in chat.log (~12.1s).
  const mood = t >= 12.1 ? 'frown' : 'calm';
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0);
  S.drawHer(ctx, S.HER_ROOM.x, S.HER_ROOM.y, t, 'stand');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0.14);
  S.drawTerminal(ctx, TITLES.S3, C.purple);
  S.drawLines(ctx, S3_LINES, t);
  if (t >= 24.6) S.drawStatus(ctx, S3_STATUS, C.purple);
  if (t >= NOTE_AT) {
    S.drawStickyNote(ctx, NOTE_TITLE, NOTE_SUB, t, S.easeOut((t - NOTE_AT) / 0.3));
  }
  const mood = t >= 22.0 ? 'side' : 'frown';
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0);
  S.drawHer(ctx, S.HER_ROOM.x, S.HER_ROOM.y, t, 'stand');
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
  ...typingSchedule(S2_LINES, 19.5),
  ...typingSchedule(S3_LINES, 29.5),
];

function fgLayout(note) {
  return S.foregroundLayout({
    terminal: true,
    clawd: false,
    her: true,
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
    ...common, scene: 3, title: TITLES.S3, lines: S3_LINES, status: S3_STATUS,
    note: true, noteTitle: NOTE_TITLE, noteSub: NOTE_SUB,
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
  S1_LINES, S2_LINES, S3_LINES, S1_STATUS, S2_STATUS, S3_STATUS,
  NOTE_AT, NOTE_TITLE, NOTE_SUB, CLAWD_BOX,
  CHECK_TITLE: 'E14 嫉妒 (jealousy) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '[21:04] her -> clawd: 帮我看下这段日志', size: 10, color: C.text },
    { text: '[21:08] her -> nova-ai: 在吗？帮我润色标题', size: 10, color: C.pink },
    { text: '[21:11] her -> clawd:   测试脚本跑完了吗？', size: 10, color: C.amber },
    { text: '（她也很忙）', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt,
  drawClawdEp,
  getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
