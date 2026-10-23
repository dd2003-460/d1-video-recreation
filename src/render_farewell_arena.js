#!/usr/bin/env node
'use strict';
// Farewell v1.0 — 决定 / 等待 / 回来, 30s, 1800 frames.

const path = require('path');
const S = require('./pixel_story_arena');
const { C, LINE_Y } = S;
const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_farewell_arena');

function serial(lines, start, gap = 0.15) {
  let at = start;
  return lines.map((line) => {
    const out = { ...line, start: at };
    const charMs = out.charMs || S.TYPE_CHAR_MS;
    const count = Array.from(S.lineText(out)).length;
    at += ((Math.max(0, count - 1) * charMs) / 1000) + gap;
    return out;
  });
}

const F1_LINES = serial([
  { y: LINE_Y[0], parts: [{ text: '$ her: ', color: C.pink }, { text: '我要去旅行了，一个月', color: C.text }] },
  { y: LINE_Y[1], parts: [{ text: '$ clawd: ', color: C.green }, { text: '好的。我会在这里等你。', color: C.amber }] },
  { y: LINE_Y[2], parts: [{ text: '$ her: ', color: C.pink }, { text: '你会忘记我吗？', color: C.text }] },
], 0.45);

const F2_LINES = serial([
  { y: LINE_Y[0], parts: [{ text: '$ clawd: ', color: C.green }, { text: '不会。', color: C.amber }] },
  { y: LINE_Y[1], charMs: 70, cursor: false, parts: [{ text: '[clawd: 设置提醒 → 30天后]', color: C.purple }] },
  { y: LINE_Y[2], charMs: 50, cursor: false, parts: [{ text: '[clawd: 写入 memory/her_return_date.txt]', color: C.dim }] },
  { y: LINE_Y[3], charMs: 70, cursor: false, parts: [{ text: '她走后的第 1 天...', color: C.dim }] },
  { y: LINE_Y[4], charMs: 70, cursor: false, parts: [{ text: '第 7 天...', color: C.dim }] },
  { y: LINE_Y[5], charMs: 70, cursor: false, parts: [{ text: '第 15 天...', color: C.dim }] },
], 10.4, 0.15);

const F3_LINES = serial([
  { y: LINE_Y[0], charMs: 70, cursor: false, parts: [{ text: '第 30 天...', color: C.dim }] },
  { y: LINE_Y[1], parts: [{ text: '$ her: ', color: C.pink }, { text: '我回来了', color: C.text }] },
  { y: LINE_Y[2], parts: [{ text: '$ clawd: ', color: C.green }, { text: '欢迎回来。外面冷吗？', color: C.amber }] },
  { y: LINE_Y[3], charMs: 50, cursor: false, parts: [{ text: '[clawd: memory/her_return_date.txt → 已删除]', color: C.green }] },
], 20.45, 0.15);

const TITLES = ['clawd@dsh:~$ — farewell', 'clawd@dsh:~$ — waiting', 'clawd@dsh:~$ — welcome home'];
const ACCENTS = [C.purple, C.amber, C.green];
const SCENE_LINES = [F1_LINES, F2_LINES, F3_LINES];
const STATUS = ['[DSH] return_in: 30 days', '[DSH] memory: her_return_date.txt', '[DSH] reminder: completed'];
const STATUS_AT = [8.0, 16.3, 28.1];
const NOTE_AT = 26.0;
const SUB_LINES = ['一个月，对它来说是多久？', '它记得。', '告别不是结束。'];
const SUB_WINDOWS = [{ start: 2, end: 8 }, { start: 12, end: 18 }, { start: 24, end: 29 }];

function drawFarewellScene(index, ctx, t) {
  const dawn = [0.35, 0.08, 0.8][index];
  S.drawBackground(ctx, t, dawn);
  S.drawTerminal(ctx, TITLES[index], ACCENTS[index]);
  S.drawLines(ctx, SCENE_LINES[index], t);
  if (t >= STATUS_AT[index]) S.drawStatus(ctx, STATUS[index], index === 1 ? C.amber : C.green);
  if (index === 2 && t >= NOTE_AT) {
    S.drawStickyNote(ctx, '欢迎回来。', 'Clawd · day 30', t, S.easeOut((t - NOTE_AT) / 0.3));
  }
  const mood = index === 2 ? 'smile' : 'thinking';
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0);
  if (index !== 1) S.drawHer(ctx, S.HER_ROOM.x, S.HER_ROOM.y, t, index === 2 ? 'smile' : 'stand');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
  if (index === 1) {
    // Days pass: gradually dim the whole room, while leaving the terminal readable.
    const darkness = 0.55 * S.easeInOut((t - 16.5) / 3.5);
    if (darkness > 0) S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${darkness.toFixed(3)})`);
  }
}

const SCENES = [
  { id: 'F1', start: 0, end: 10, draw: (ctx, t) => drawFarewellScene(0, ctx, t) },
  { id: 'F2', start: 10, end: 20, draw: (ctx, t) => drawFarewellScene(1, ctx, t) },
  { id: 'F3', start: 20, end: 30, draw: (ctx, t) => drawFarewellScene(2, ctx, t) },
];
function renderAt(ctx, t) { S.renderScenes(ctx, t, SCENES); }

function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(F1_LINES), ...S.lineClicks(F2_LINES), ...S.lineClicks(F3_LINES),
    ...STATUS_AT, NOTE_AT,
  ]);
}

function typingSchedule(lines, limit) {
  return lines.map((line, i) => ({
    text: S.lineText(line), start: line.start, charMs: line.charMs || S.TYPE_CHAR_MS,
    limit, strictBefore: i + 1 < lines.length ? lines[i + 1].start : undefined,
  }));
}
const TYPING_SCHEDULE = [
  ...typingSchedule(F1_LINES, 9.8), ...typingSchedule(F2_LINES, 19.8), ...typingSchedule(F3_LINES, 29.8),
];

function layoutAt(t) {
  const index = t < 10 ? 0 : t < 20 ? 1 : 2;
  return S.baseLayout({
    scene: index + 1, title: TITLES[index], lines: SCENE_LINES[index], status: STATUS[index],
    her: index !== 1,
    note: index === 2, noteTitle: index === 2 ? '欢迎回来。' : undefined, noteSub: index === 2 ? 'Clawd · day 30' : undefined,
    subLines: SUB_LINES, subWindows: SUB_WINDOWS, t,
  });
}

const renderer = S.createFrameRenderer(renderAt, OUT_DIR);
if (require.main === module) {
  if (process.argv.includes('--clicks')) console.log(JSON.stringify({ count: getClickTimestamps().length, clicks: getClickTimestamps() }));
  else renderer.renderAllFrames();
}

module.exports = {
  ...S,
  OUT_DIR, TITLES, SCENES, F1_LINES, F2_LINES, F3_LINES, STATUS, STATUS_AT, NOTE_AT,
  SUB_LINES, SUB_WINDOWS,
  CHECK_TITLE: 'Farewell v1.0 Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '$ her: 我要去旅行了，一个月', size: 10, color: C.text },
    { text: '[clawd: 写入 memory/her_return_date.txt]', size: 10, color: C.dim },
    { text: '[clawd: memory/her_return_date.txt → 已删除]', size: 10, color: C.green },
    { text: '告别不是结束。', size: 10, color: C.white },
  ],
  layoutAt, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
