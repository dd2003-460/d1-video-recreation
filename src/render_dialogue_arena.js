#!/usr/bin/env node
'use strict';
// Dialogue v1.0 — 早安 / 理解 / 陪伴, 30s, 1800 frames.

const path = require('path');
const S = require('./pixel_story_arena');
const { C, LINE_Y } = S;
const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_dialogue_arena');

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

const D1_LINES = serial([
  { y: LINE_Y[0], parts: [{ text: '$ her: ', color: C.pink }, { text: '早上好', color: C.text }] },
  { y: LINE_Y[1], parts: [{ text: '$ clawd: ', color: C.green }, { text: '早上好。今天有什么计划？', color: C.amber }] },
  { y: LINE_Y[2], parts: [{ text: '$ her: ', color: C.pink }, { text: '写周报', color: C.text }] },
  { y: LINE_Y[3], parts: [{ text: '$ clawd: ', color: C.green }, { text: '需要我帮忙整理数据吗？', color: C.amber }] },
], 0.45);

const D2_LINES = serial([
  { y: LINE_Y[0], charMs: 70, parts: [{ text: '$ her: ', color: C.pink }, { text: '其实我今天有点累', color: C.text }] },
  { y: LINE_Y[1], charMs: 70, parts: [{ text: '$ clawd: ', color: C.green }, { text: '听起来你今天过得不容易。', color: C.amber }] },
  { y: LINE_Y[2], charMs: 50, cursor: false, parts: [{ text: '[clawd: 检测 → 情感: 疲惫 (0.82)]', color: C.purple }] },
  { y: LINE_Y[3], charMs: 70, parts: [{ text: '$ her: ', color: C.pink }, { text: '你怎么知道的？', color: C.text }] },
  { y: LINE_Y[4], charMs: 70, parts: [{ text: '$ clawd: ', color: C.green }, { text: '你的消息比平时短了 40%。', color: C.amber }] },
], 10.35, 0.12);

const D3_LINES = serial([
  { y: LINE_Y[0], parts: [{ text: '$ her: ', color: C.pink }, { text: '谢谢你', color: C.text }] },
  { y: LINE_Y[1], parts: [{ text: '$ clawd: ', color: C.green }, { text: '不客气。我一直在这里。', color: C.amber }] },
  { y: LINE_Y[2], charMs: 70, cursor: false, parts: [{ text: '[clawd: 情感 → 温暖 (0.91)]', color: C.pink }] },
], 20.5);

const TITLES = ['clawd@dsh:~$ — good morning', 'clawd@dsh:~$ — listening', 'clawd@dsh:~$ — together'];
const ACCENTS = [C.green, C.purple, C.pink];
const SCENE_LINES = [D1_LINES, D2_LINES, D3_LINES];
const STATUS = ['[DSH] dialogue: morning', '[DSH] emotion: fatigue=0.82', '[DSH] warmth=0.91 · always_here'];
const STATUS_AT = [9.35, 18.0, 27.2];
const NOTE_AT = 25.2;
const SUB_LINES = ['对话从早安开始。', '它学会了倾听。', '这就是对话的意义。'];
const SUB_WINDOWS = [{ start: 2, end: 8 }, { start: 12, end: 18 }, { start: 24, end: 29 }];

function drawDialogueScene(index, ctx, t) {
  S.drawBackground(ctx, t, 0.68);
  S.drawTerminal(ctx, TITLES[index], ACCENTS[index]);
  S.drawLines(ctx, SCENE_LINES[index], t);
  if (t >= STATUS_AT[index]) S.drawStatus(ctx, STATUS[index], index === 1 ? C.purple : C.green);
  if (index === 2 && t >= NOTE_AT) {
    S.drawStickyNote(ctx, '陪伴。', 'Clawd · always here', t, S.easeOut((t - NOTE_AT) / 0.3));
  }
  const mood = index === 0 ? 'calm' : index === 1 ? 'thinking' : 'smile';
  S.drawClawd(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0);
  S.drawHer(ctx, S.HER_ROOM.x, S.HER_ROOM.y, t, index === 2 ? 'smile' : 'stand');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

const SCENES = [
  { id: 'D1', start: 0, end: 10, draw: (ctx, t) => drawDialogueScene(0, ctx, t) },
  { id: 'D2', start: 10, end: 20, draw: (ctx, t) => drawDialogueScene(1, ctx, t) },
  { id: 'D3', start: 20, end: 30, draw: (ctx, t) => drawDialogueScene(2, ctx, t) },
];
function renderAt(ctx, t) { S.renderScenes(ctx, t, SCENES); }

function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(D1_LINES), ...S.lineClicks(D2_LINES), ...S.lineClicks(D3_LINES),
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
  ...typingSchedule(D1_LINES, 9.8), ...typingSchedule(D2_LINES, 19.8), ...typingSchedule(D3_LINES, 29.8),
];

function layoutAt(t) {
  const index = t < 10 ? 0 : t < 20 ? 1 : 2;
  return S.baseLayout({
    scene: index + 1, title: TITLES[index], lines: SCENE_LINES[index], status: STATUS[index],
    note: index === 2, noteTitle: index === 2 ? '陪伴。' : undefined, noteSub: index === 2 ? 'Clawd · always here' : undefined,
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
  OUT_DIR, TITLES, SCENES, D1_LINES, D2_LINES, D3_LINES, STATUS, STATUS_AT, NOTE_AT,
  SUB_LINES, SUB_WINDOWS,
  CHECK_TITLE: 'Dialogue v1.0 Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '$ clawd: 早上好。今天有什么计划？', size: 10, color: C.amber },
    { text: '[clawd: 检测 → 情感: 疲惫 (0.82)]', size: 10, color: C.purple },
    { text: '$ clawd: 你的消息比平时短了 40%。', size: 10, color: C.amber },
    { text: '这就是对话的意义。', size: 10, color: C.white },
  ],
  layoutAt, getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
