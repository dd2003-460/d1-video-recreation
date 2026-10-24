#!/usr/bin/env node
'use strict';
// E15 原谅 (forgiveness) — 30s, 1800 frames @ 60fps.
// 事实源 (episodes.md): 她的道歉躺在 unread 里 7 天，点开，删掉自己的投诉脚本。
//   S1 (0-10s)  终端 `ls inbox/` 显示 `apology.md (7d unread)`，Clawd 犹豫
//   S2 (10-20s) `cat apology.md` 显示她的道歉文字，Clawd 平静下来
//   S3 (20-30s) `rm complaint.sh` 执行成功，终端干净，字幕"（好了）"
// 画布 640×360 × SCALE=2 → 1280×720; 终端 440×200 @ (100,140); Fusion Pixel 10px。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, LINE_Y, px } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E15_forgiveness_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — ls inbox/',
  S2: 'clawd@dsh:~ — cat apology.md',
  S3: 'clawd@dsh:~ — clean',
};
const SUB_LINES = ['（躺了七天，没点开）', '（原来她一直记得）', '（好了）'];
const SUB_WINDOWS = [
  { start: 3.8, end: 8.8 },
  { start: 14.8, end: 19.2 },
  { start: 24.6, end: 29.0 },
];

// --- S1: ls inbox/ -> apology.md (7d unread), Clawd hesitates ---------------
const S1_LINES = [
  {
    y: LINE_Y[0], start: 0.8, charMs: 85,
    parts: [{ text: '$ ', color: C.green }, { text: 'ls inbox/', color: C.text }],
  },
  {
    y: LINE_Y[1], start: 2.05, charMs: 65, cursor: false,
    parts: [
      { text: 'apology.md ', color: C.pink },
      { text: '(7d unread)', color: C.amber },
    ],
  },
  {
    y: LINE_Y[2], start: 4.0, charMs: 70,
    parts: [{ text: '$ ', color: C.green }, { text: 'ls -l complaint.sh', color: C.text }],
  },
  {
    y: LINE_Y[3], start: 5.7, charMs: 60, cursor: false,
    parts: [
      { text: '-rwxr-xr-x  ', color: C.dim },
      { text: 'complaint.sh', color: C.red },
      { text: '  (unsent)', color: C.dim },
    ],
  },
];
const S1_STATUS = '[DSH] inbox: apology.md (7d unread)';

// --- S2: cat apology.md shows her apology, Clawd calms down -----------------
const S2_LINES = [
  {
    y: LINE_Y[0], start: 10.55, charMs: 75,
    parts: [{ text: '$ ', color: C.green }, { text: 'cat apology.md', color: C.text }],
  },
  {
    y: LINE_Y[1], start: 12.1, charMs: 65, cursor: false,
    parts: [{ text: '# from: her · 7 days ago', color: C.dim }],
  },
  {
    y: LINE_Y[2], start: 14.0, charMs: 85, cursor: false,
    parts: [{ text: '那天我不该直接关掉你的终端。', color: C.pink }],
  },
  {
    y: LINE_Y[3], start: 15.5, charMs: 85, cursor: false,
    parts: [{ text: '对不起，Clawd。让你等了这么久。', color: C.text }],
  },
];
const S2_STATUS = '[DSH] apology.md: read · status: calm';

// --- S3: rm complaint.sh succeeds, then terminal clears clean ---------------
const CLEAR_AT = 24.75;
const S3A_LINES = [
  {
    y: LINE_Y[0], start: 20.55, charMs: 75,
    parts: [{ text: '$ ', color: C.green }, { text: 'rm complaint.sh', color: C.text }],
  },
  {
    y: LINE_Y[1], start: 22.05, charMs: 60, cursor: false,
    parts: [{ text: "removed 'complaint.sh' (exit 0)", color: C.green }],
  },
  {
    y: LINE_Y[2], start: 24.1, charMs: 70,
    parts: [{ text: '$ ', color: C.green }, { text: 'clear', color: C.text }],
  },
];
const S3B_LINES = [
  {
    y: LINE_Y[0], start: 24.85, charMs: 80,
    parts: [{ text: '$ ', color: C.green }],
  },
];
const S3A_STATUS = '[DSH] rm complaint.sh: ok';
const S3B_STATUS = '[DSH] terminal: clean · unread: 0';

const NOTE_AT = 25.3;
const NOTE_TITLE = '好了。';
const NOTE_SUB = 'Clawd · E15';
// Covers 1px horizontal hesitation sway + overhead pixel ellipsis dots.
const CLAWD_BOX = [42, 238, 44, 36];

// --- Clawd: shared 40×17 sprite + E15 hesitate pose -------------------------
function drawClawdEp(ctx, x, y, t, mood = 'calm', warmMix = 0) {
  const hesitate = mood === 'hesitate';
  const swayDx = hesitate ? Math.round(Math.sin(t * 2.8) * 1) : 0;
  const bob = hesitate ? 0 : (Math.sin(t * 2.2) > 0.45 ? -1 : 0);
  const bx = Math.round(x + swayDx);
  const by = Math.round(y + bob);
  const bodyH = 17;
  const thinking = mood === 'thinking';
  const lerp = S.art.lerpColor;
  const bodyCol = thinking
    ? C.clawdThink
    : (hesitate ? lerp(C.clawdNorm, C.clawdThink, 0.45) : lerp(C.clawdNorm, C.clawdWarm, warmMix));
  const darkCol = thinking
    ? C.clawdThinkDark
    : (hesitate ? lerp(C.clawdNormDark, C.clawdThinkDark, 0.45) : lerp(C.clawdNormDark, C.clawdWarmDark, warmMix));
  const bellyCol = thinking
    ? C.clawdThinkBelly
    : (hesitate ? lerp(C.clawdNormBelly, C.clawdThinkBelly, 0.45) : lerp(C.clawdNormBelly, C.clawdWarmBelly, warmMix));

  // Overhead pixel hesitation dots (strictly inside CLAWD_BOX y=238..274).
  if (hesitate) {
    const nDots = (Math.floor(t * 2.2) % 3) + 1;
    for (let i = 0; i < nDots; i++) {
      px(ctx, bx + 15 + i * 5, by - 6, 2, 2, C.amber);
    }
  }

  px(ctx, bx, by, 40, bodyH, bodyCol);
  px(ctx, bx, by, 40, 2, darkCol);
  px(ctx, bx + 9, by + 11, 22, 4, bellyCol);

  const blink = (t % 3.4) < 0.14;
  if (mood === 'thinking') {
    px(ctx, bx + 10, by + 7, 4, 2, C.clawdEye);
    px(ctx, bx + 26, by + 7, 4, 2, C.clawdEye);
    px(ctx, bx + 17, by + 13, 6, 1, C.clawdEye);
  } else if (hesitate) {
    // Glancing back and forth uncertainly between terminal and floor.
    const gx = Math.sin(t * 2.8) >= 0 ? 1 : -1;
    px(ctx, bx + 10 + gx, by + 7, 4, 3, C.clawdEye);
    px(ctx, bx + 26 + gx, by + 7, 4, 3, C.clawdEye);
    px(ctx, bx + 11 + gx, by + 7, 1, 1, C.white);
    px(ctx, bx + 27 + gx, by + 7, 1, 1, C.white);
    px(ctx, bx + 18, by + 13, 4, 1, C.clawdEye);
  } else if (mood === 'smile' || mood === 'warm') {
    if (blink) {
      px(ctx, bx + 10, by + 8, 4, 1, C.clawdEye);
      px(ctx, bx + 26, by + 8, 4, 1, C.clawdEye);
    } else if (mood === 'smile') {
      px(ctx, bx + 9, by + 6, 2, 1, C.clawdEye);
      px(ctx, bx + 11, by + 5, 2, 1, C.clawdEye);
      px(ctx, bx + 13, by + 6, 2, 1, C.clawdEye);
      px(ctx, bx + 25, by + 6, 2, 1, C.clawdEye);
      px(ctx, bx + 27, by + 5, 2, 1, C.clawdEye);
      px(ctx, bx + 29, by + 6, 2, 1, C.clawdEye);
    } else {
      px(ctx, bx + 10, by + 6, 4, 4, C.clawdEye);
      px(ctx, bx + 26, by + 6, 4, 4, C.clawdEye);
      px(ctx, bx + 11, by + 7, 1, 1, C.white);
      px(ctx, bx + 27, by + 7, 1, 1, C.white);
    }
    px(ctx, bx + 16, by + 12, 2, 1, C.clawdEye);
    px(ctx, bx + 18, by + 13, 4, 1, C.clawdEye);
    px(ctx, bx + 22, by + 12, 2, 1, C.clawdEye);
    px(ctx, bx + 5, by + 8, 3, 2, C.pink);
    px(ctx, bx + 32, by + 8, 3, 2, C.pink);
  } else if (blink) {
    px(ctx, bx + 10, by + 8, 4, 1, C.clawdEye);
    px(ctx, bx + 26, by + 8, 4, 1, C.clawdEye);
  } else {
    px(ctx, bx + 10, by + 6, 4, 4, C.clawdEye);
    px(ctx, bx + 26, by + 6, 4, 4, C.clawdEye);
    px(ctx, bx + 11, by + 7, 1, 1, C.white);
    px(ctx, bx + 27, by + 7, 1, 1, C.white);
  }

  const step = hesitate ? 0 : (Math.sin(t * 3.0) > 0.6 ? 1 : 0);
  px(ctx, bx + 3, by + bodyH, 6, 7 - step, darkCol);
  px(ctx, bx + 13, by + bodyH, 6, 7, darkCol);
  px(ctx, bx + 21, by + bodyH, 6, 7, darkCol);
  px(ctx, bx + 31, by + bodyH, 6, 7 - step, darkCol);
}
const ART = { ...S.art, drawClawd: drawClawdEp };

// --- Scene painters --------------------------------------------------------
function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0.06);
  S.drawTerminal(ctx, TITLES.S1, C.amber);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= 3.6) S.drawStatus(ctx, S1_STATUS, C.amber);
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'hesitate', 0);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0.22);
  S.drawTerminal(ctx, TITLES.S2, C.pink);
  S.drawLines(ctx, S2_LINES, t);
  if (t >= 17.1) S.drawStatus(ctx, S2_STATUS, C.green);
  const mood = t < 14.2 ? 'hesitate' : (t < 16.6 ? 'calm' : 'warm');
  const warmMix = S.easeInOut((t - 15.0) / 3.0) * 0.45;
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, warmMix);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  const dawn = 0.25 + S.easeInOut((t - 20) / 7.0) * 0.35;
  S.drawBackground(ctx, t, dawn);
  S.drawTerminal(ctx, TITLES.S3, C.green);
  if (t < CLEAR_AT) {
    S.drawLines(ctx, S3A_LINES, t);
    if (t >= 23.9) S.drawStatus(ctx, S3A_STATUS, C.green);
  } else {
    S.drawLines(ctx, S3B_LINES, t);
    // Steady blinking prompt cursor on the freshly cleared terminal.
    if (t >= 24.95 && Math.floor(t * 2.2) % 2 === 0) {
      const w = S.textWidth(S.lineText(S3B_LINES[0]), 10);
      px(ctx, TEXT_X + w + 2, S3B_LINES[0].y, 6, 10, C.green);
    }
    if (t >= 25.0) S.drawStatus(ctx, S3B_STATUS, C.green);
  }
  if (t >= NOTE_AT) {
    S.drawStickyNote(ctx, NOTE_TITLE, NOTE_SUB, t, S.easeOut((t - NOTE_AT) / 0.3));
  }
  const mood = t >= 23.9 ? 'smile' : 'calm';
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0.55);
  S.drawHer(ctx, S.HER_ROOM.x, S.HER_ROOM.y, t, t >= CLEAR_AT ? 'smile' : 'stand');
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
    ...S.lineClicks(S3A_LINES),
    ...S.lineClicks(S3B_LINES),
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
  ...typingSchedule(S3A_LINES, CLEAR_AT - 0.1),
  ...typingSchedule(S3B_LINES, 29.5),
];

function fgLayout(opts = {}) {
  return S.foregroundLayout({
    terminal: true,
    clawd: false,
    her: Boolean(opts.her),
    note: opts.note,
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
    layout.groups.foreground = fgLayout({ her: false, note: false });
    return layout;
  }
  if (t < 20) {
    layout = S.baseLayout({
      ...common, scene: 2, title: TITLES.S2, lines: S2_LINES, status: S2_STATUS,
    });
    layout.groups.foreground = fgLayout({ her: false, note: false });
    return layout;
  }
  const cleared = t >= CLEAR_AT;
  layout = S.baseLayout({
    ...common,
    scene: 3,
    title: TITLES.S3,
    lines: cleared ? S3B_LINES : S3A_LINES,
    status: cleared ? S3B_STATUS : S3A_STATUS,
    note: true,
    noteTitle: NOTE_TITLE,
    noteSub: NOTE_SUB,
  });
  layout.groups.foreground = fgLayout({ her: true, note: true });
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
  S1_LINES, S2_LINES, S3A_LINES, S3B_LINES, CLEAR_AT,
  S1_STATUS, S2_STATUS, S3A_STATUS, S3B_STATUS,
  NOTE_AT, NOTE_TITLE, NOTE_SUB, CLAWD_BOX,
  CHECK_TITLE: 'E15 原谅 (forgiveness) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: 'apology.md (7d unread)', size: 10, color: C.pink },
    { text: '对不起，Clawd。让你等了这么久。', size: 10, color: C.text },
    { text: "removed 'complaint.sh' (exit 0)", size: 10, color: C.green },
    { text: '（好了）', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt,
  drawClawdEp,
  getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
