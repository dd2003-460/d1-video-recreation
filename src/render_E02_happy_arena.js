#!/usr/bin/env node
'use strict';
// E02 快乐 (joy) — 30s, 1800 frames @ 60fps.
// 事实源 (episodes.md): 测试全绿，`All tests passed`，Clawd 跳一下，终端洒出像素彩点。
//   S1 (0-10s)  跑测试: `$ npm test` + 三行 PASS，每行 PASS 落地时绿色像素块闪现
//   S2 (10-20s) 全绿: `Tests:  12/12 passed` / `All tests passed ✓` → Clawd 跳一下（4px 往返 30 帧）
//                + 终端顶部洒出 10 个 4px 彩点（红黄绿粉，缓慢下落消失）
//   S3 (20-30s) 快乐的余温: 2-3 个彩点余韵落下；便签「快乐。」
// 画布 640×360 × SCALE=2 → 1280×720; 终端 440×200 @ (100,140); Fusion Pixel 10px。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y, CONTENT } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E02_joy_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — npm test',
  S2: 'clawd@dsh:~ — test report',
  S3: 'clawd@dsh:~ — echo',
};
const SUB_LINES = ['三行绿。', '全绿。', '快乐是 12/12。'];
const SUB_WINDOWS = [{ start: 2.4, end: 8.8 }, { start: 14.6, end: 19.4 }, { start: 25.2, end: 29.2 }];

const S1_LINES = [
  { y: LINE_Y[0], start: 0.9, charMs: 90, parts: [{ text: '$ ', color: C.green }, { text: 'npm test', color: C.text }] },
  { y: LINE_Y[1], start: 2.4, charMs: 45, parts: [{ text: 'PASS ', color: C.green }, { text: 'src/core.test.js', color: C.text }] },
  { y: LINE_Y[2], start: 4.0, charMs: 45, parts: [{ text: 'PASS ', color: C.green }, { text: 'src/render.test.js', color: C.text }] },
  { y: LINE_Y[3], start: 5.6, charMs: 45, parts: [{ text: 'PASS ', color: C.green }, { text: 'src/audio.test.js', color: C.text }] },
];
const S1_STATUS = '[DSH] jest: 3 suites · 0 failed';

const S2_LINES = [
  { y: LINE_Y[0], start: 10.7, charMs: 60, parts: [{ text: 'Tests:  12/12 passed', color: C.green }] },
  { y: LINE_Y[1], start: 12.6, charMs: 70, parts: [{ text: 'All tests passed ', color: C.green }, { text: '✓', color: C.green }] },
];
const S2_STATUS = '[DSH] exit 0 · all green';

const S3_LINES = [
  { y: LINE_Y[0], start: 20.7, charMs: 80, parts: [{ text: '$ ', color: C.green }, { text: 'echo 今天感觉如何', color: C.text }] },
  { y: LINE_Y[1], start: 22.5, charMs: 160, parts: [{ text: '很好。', color: C.amber }] },
  {
    y: LINE_Y[2], start: 23.5, charMs: 60,
    parts: [{ text: '[clawd: ', color: C.dim }, { text: '情感 → ', color: C.blue }, { text: '快乐 (0.95)', color: C.green }, { text: ']', color: C.dim }],
  },
];
const S3_STATUS = '[DSH] affect: joy 0.95 · peak';

const NOTE_AT = 25.2;
const NOTE_TITLE = '快乐。';
const NOTE_SUB = 'Clawd · E02';

// --- Green pixel block that flashes the moment each PASS line lands --------
const FLASH_X = 500;
const FLASHES = [
  { line: 1, at: 3.4 },
  { line: 2, at: 5.0 },
  { line: 3, at: 6.6 },
];
const FLASH_LIFE = 0.5;

// --- Pixel confetti: 10 lanes, 4px, from the top of the terminal -----------
const CONFETTI_COLORS = [C.red, C.amber, C.green, C.pink];
const CONFETTI_AT = 14.05; // the instant `All tests passed ✓` completes
const CONFETTI = Array.from({ length: 10 }, (_, i) => ({
  x: 130 + i * 38,
  delay: CONFETTI_AT + (i % 3) * 0.12,
  speed: 78 + (i % 4) * 10, // px/s, slow fall
  life: 1.2,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));
const CONFETTI_TOP = 162;

// --- S3 residual sparkles --------------------------------------------------
const RESIDUAL = [
  { x: 320, delay: 20.4, speed: 70, life: 1.6, color: CONFETTI_COLORS[2] },
  { x: 434, delay: 20.9, speed: 62, life: 1.5, color: CONFETTI_COLORS[1] },
  { x: 472, delay: 21.4, speed: 76, life: 1.4, color: CONFETTI_COLORS[3] },
];

const JUMP_AT = 14.0;
const JUMP_FRAMES = 30; // 0.5s round trip, 4px peak

function jumpOffset(t) {
  const k = (t - JUMP_AT) * S.FPS;
  if (k < 0 || k > JUMP_FRAMES) return 0;
  const phase = k / JUMP_FRAMES; // 0..1
  return -Math.round(4 * Math.sin(phase * Math.PI));
}

function particleY(p, t) {
  const age = t - p.delay;
  if (age < 0 || age > p.life) return null;
  return CONFETTI_TOP + age * p.speed;
}

function drawParticle(ctx, p, t, topY = CONFETTI_TOP) {
  const age = t - p.delay;
  if (age < 0 || age > p.life) return;
  const y = Math.round(topY + age * p.speed);
  const fade = age > p.life - 0.45 ? S.clamp01((p.life - age) / 0.45) : 1;
  ctx.save();
  ctx.globalAlpha = fade;
  S.px(ctx, p.x, y, 4, 4, p.color);
  S.px(ctx, p.x + 1, y + 1, 1, 1, 'rgba(255,255,255,0.75)');
  ctx.restore();
}

function drawFlash(ctx, line, t, at) {
  const age = t - at;
  if (age < 0) return;
  const y = LINE_Y[line] + 2;
  if (age < FLASH_LIFE) {
    const k = 1 - age / FLASH_LIFE;
    S.px(ctx, FLASH_X - 1, y - 1, 8, 8, `rgba(126,231,135,${(0.18 * k).toFixed(3)})`);
    S.px(ctx, FLASH_X, y, 6, 6, C.green);
  } else {
    S.px(ctx, FLASH_X + 1, y + 1, 4, 4, 'rgba(126,231,135,0.45)');
  }
}

// --- Scene painters --------------------------------------------------------
function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S1, C.green);
  S.drawLines(ctx, S1_LINES, t);
  for (const f of FLASHES) drawFlash(ctx, f.line, t, f.at);
  if (t >= 3.4) S.drawStatus(ctx, S1_STATUS, C.green);
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'thinking', 0);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0.05);
  S.drawTerminal(ctx, TITLES.S2, C.green);
  S.drawLines(ctx, S2_LINES, t);
  if (t >= 12.6) S.drawStatus(ctx, S2_STATUS, C.green);
  for (const p of CONFETTI) drawParticle(ctx, p, t);
  const mood = t >= JUMP_AT ? 'smile' : 'thinking';
  const dy = jumpOffset(t);
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y + dy, t, mood, 0);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0.12);
  S.drawTerminal(ctx, TITLES.S3, C.amber);
  S.drawLines(ctx, S3_LINES, t);
  if (t >= 22.7) S.drawStatus(ctx, S3_STATUS, C.amber);
  for (const p of RESIDUAL) drawParticle(ctx, p, t, 200);
  if (t >= NOTE_AT) S.drawStickyNote(ctx, NOTE_TITLE, NOTE_SUB, t, S.easeOut((t - NOTE_AT) / 0.3));
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'smile', 0);
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
    ...FLASHES.map((f) => f.at),
    CONFETTI_AT,
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

// --- Layout ---------------------------------------------------------------
const CLAWD_JUMP_BOX = [S.CLAWD_ROOM.x, 232, 40, 40]; // room for the 4px jump
const JUMP_END = JUMP_AT + JUMP_FRAMES / S.FPS;

function fxBoxes(t) {
  const list = [];
  for (const f of FLASHES) {
    if (t < f.at) continue;
    const big = t - f.at < FLASH_LIFE;
    list.push({
      name: `pass_flash_${f.line}`,
      box: big ? [FLASH_X, LINE_Y[f.line] + 2, 6, 6] : [FLASH_X + 1, LINE_Y[f.line] + 3, 4, 4],
    });
  }
  for (let i = 0; i < CONFETTI.length; i++) {
    const p = CONFETTI[i];
    const y = particleY(p, t);
    if (y === null) continue;
    list.push({ name: `confetti_${i}`, box: [p.x, Math.round(y), 4, 4] });
  }
  for (let i = 0; i < RESIDUAL.length; i++) {
    const p = RESIDUAL[i];
    const age = t - p.delay;
    if (age < 0 || age > p.life) continue;
    list.push({ name: `residual_${i}`, box: [p.x, Math.round(200 + age * p.speed), 4, 4] });
  }
  return list;
}

function layoutAt(t) {
  const common = { subLines: SUB_LINES, subWindows: SUB_WINDOWS, t };
  const jumping = t >= JUMP_AT && t < JUMP_END;
  const clawdBox = jumping ? CLAWD_JUMP_BOX : [S.CLAWD_ROOM.x, S.CLAWD_ROOM.y - 1, 40, 25];
  let layout;
  if (t < 10) {
    layout = S.baseLayout({ ...common, scene: 1, title: TITLES.S1, lines: S1_LINES, status: S1_STATUS });
  } else if (t < 20) {
    layout = S.baseLayout({ ...common, scene: 2, title: TITLES.S2, lines: S2_LINES, status: S2_STATUS });
  } else {
    layout = S.baseLayout({
      ...common, scene: 3, title: TITLES.S3, lines: S3_LINES, status: S3_STATUS,
      note: true, noteTitle: NOTE_TITLE, noteSub: NOTE_SUB,
    });
  }
  layout.groups.foreground = S.foregroundLayout({
    terminal: true, clawd: false, her: false,
    note: t >= 20 ? true : undefined,
    extra: [{ name: 'clawd', box: clawdBox }],
  });
  const fx = fxBoxes(t);
  if (fx.length) {
    layout.groups.fx = fx;
    layout.bounds.fx = CONTENT;
  }
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
  OUT_DIR, TITLES, SUB_LINES, SUB_WINDOWS,
  S1_LINES, S2_LINES, S3_LINES, S1_STATUS, S2_STATUS, S3_STATUS,
  NOTE_AT, NOTE_TITLE, NOTE_SUB,
  FLASHES, FLASH_LIFE, FLASH_X, CONFETTI, CONFETTI_AT, RESIDUAL,
  JUMP_AT, JUMP_FRAMES, CONFETTI_TOP,
  CHECK_TITLE: 'E02 快乐 (joy) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: 'PASS src/core.test.js', size: 10, color: C.text },
    { text: 'Tests:  12/12 passed', size: 10, color: C.green },
    { text: '[clawd: 情感 → 快乐 (0.95)]', size: 10, color: C.dim },
    { text: '快乐是 12/12。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt, getClickTimestamps, jumpOffset, particleY,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
