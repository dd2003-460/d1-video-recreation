#!/usr/bin/env node
'use strict';
// E03 悲伤 (sorrow) — 30s, 1800 frames @ 60fps.
// 事实源 (episodes.md): her 的文件被 rm，终端空了，光标慢慢闪，打字又删掉。
//   S1 (0-10s)  消失: `$ ls her_*` → 两个文件; `$ rm her_*`; `$ ls her_*` → 空。rm 之后房间暗 10%，
//               Clawd calm → sad（眼睛半闭）
//   S2 (10-20s) 空终端: 提示符 + 光标（闪烁 0.5s → 1.2s）；`rm -` 逐字出现，又逐字删掉
//   S3 (20-30s) 慢慢闪: 终端空，光标 2s 一次极慢闪烁；Clawd sad，头低 2px；便签「悲伤。」
// 画布 640×360 × SCALE=2 → 1280×720; 终端 440×200 @ (100,140); Fusion Pixel 10px; 键盘音低沉。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y, CONTENT, px } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E03_sorrow_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — ls her_*',
  S2: 'clawd@dsh:~ — ',
  S3: 'clawd@dsh:~ — ',
};
const SUB_LINES = ['她的文件，没了。', '想做什么，又停住了。', '光标还在闪。它在等。'];
const SUB_WINDOWS = [{ start: 2.2, end: 8.6 }, { start: 12.4, end: 18.2 }, { start: 22.6, end: 29.0 }];

const S1_LINES = [
  { y: LINE_Y[0], start: 0.9, charMs: 90, cursor: false, parts: [{ text: '$ ', color: C.green }, { text: 'ls her_*', color: C.text }] },
  { y: LINE_Y[1], start: 2.6, charMs: 45, cursor: false, parts: [{ text: 'her_notes.txt  her_todo.md', color: C.text }] },
  { y: LINE_Y[2], start: 4.4, charMs: 90, cursor: false, parts: [{ text: '$ ', color: C.green }, { text: 'rm her_*', color: C.red }] },
  { y: LINE_Y[3], start: 6.3, charMs: 90, cursor: false, parts: [{ text: '$ ', color: C.green }, { text: 'ls her_*', color: C.text }] },
  { y: LINE_Y[4], start: 7.4, charMs: 140, cursor: false, parts: [{ text: '(空)', color: C.dim }] },
];
const S1_STATUS = '[DSH] her_* : 0 matches';
const RM_AT = 6.0;
const DIM = 0.1;

// --- S2: typed, then deleted, one character at a time ---------------------
const S2_PROMPT = '$ ';
const S2_TYPED = 'rm -';
const S2_TYPE_AT = 10.9;
const S2_TYPE_MS = 140;
const S2_DEL_AT = 12.9;
const S2_DEL_MS = 140;
const S2_CURSOR_PERIOD = 1.2;

// --- S3: nothing left but the cursor -------------------------------------
const S3_CURSOR_PERIOD = 2.0;
const NOTE_AT = 22.0;
const NOTE_TITLE = '悲伤。';
const NOTE_SUB = 'Clawd · E03';
const HEAD_DOWN_FROM = 19.6;
const CLAWD_BOX = [S.CLAWD_ROOM.x, 244, 40, 31]; // room for -1 bob and the 2px head drop

// --- Cursor helpers -------------------------------------------------------
function cursorOn(t, period) {
  return t % period < period / 2;
}

// Shared 6×10 block cursor, but with an episode-controlled blink period.
function drawCursor(ctx, x, y, t, period, color = C.text) {
  if (!cursorOn(t, period)) return;
  px(ctx, x, y, 6, 10, color);
}

function typedCount(t, length, typeAt, typeMs, delAt, delMs) {
  let shown = 0;
  if (t >= typeAt) shown = Math.min(length, Math.floor(((t - typeAt) * 1000) / typeMs) + 1);
  if (t >= delAt) {
    const gone = Math.min(length, Math.floor(((t - delAt) * 1000) / delMs) + 1);
    shown = Math.max(0, shown - gone);
  }
  return shown;
}

function drawPromptLine(ctx, y, t, typed, typeAt, typeMs, delAt, delMs, prompt = S2_PROMPT) {
  const chars = Array.from(typed);
  const shown = typedCount(t, chars.length, typeAt, typeMs, delAt, delMs);
  const sPrompt = prompt;
  S.txt(ctx, TEXT_X, y, sPrompt, C.green, 10);
  const px0 = TEXT_X + S.textWidth(sPrompt, 10);
  const visible = chars.slice(0, shown).join('');
  if (visible) S.txt(ctx, px0, y, visible, C.text, 10);
  const cx = px0 + S.textWidth(visible, 10) + (visible ? 1 : 0);
  return { cursorX: cx, shown };
}

// --- Clawd: sad (half-closed eyes) + 2px head drop ------------------------
function drawClawdEp(ctx, x, y, t, mood = 'calm', warmMix = 0, opts = {}) {
  const dy = opts.dy === undefined ? 0 : opts.dy;
  if (mood !== 'sad') {
    // calm / thinking / smile stay byte-identical to the shared companion sprite.
    S.art.drawClawd(ctx, x, y + dy, t, mood, warmMix);
    return;
  }
  const bob = opts.noBob ? 0 : (Math.sin(t * 2.2) > 0.45 ? -1 : 0);
  const by = Math.round(y + bob + dy);
  const bodyH = 17;
  const lerp = S.art.lerpColor;
  const bodyCol = lerp(C.clawdNorm, C.clawdWarm, warmMix);
  const darkCol = lerp(C.clawdNormDark, C.clawdWarmDark, warmMix);
  const bellyCol = lerp(C.clawdNormBelly, C.clawdWarmBelly, warmMix);

  px(ctx, x, by, 40, bodyH, bodyCol);
  px(ctx, x, by, 40, 2, darkCol);
  px(ctx, x + 9, by + 11, 22, 4, bellyCol);

  // Half-closed eyes: 4×2 slits one row lower, no highlight.
  px(ctx, x + 10, by + 8, 4, 2, C.clawdEye);
  px(ctx, x + 26, by + 8, 4, 2, C.clawdEye);
  // Frown: corners drop 1px below the middle (the mirror of the smile arc).
  px(ctx, x + 16, by + 13, 2, 1, C.clawdEye);
  px(ctx, x + 18, by + 12, 4, 1, C.clawdEye);
  px(ctx, x + 22, by + 13, 2, 1, C.clawdEye);

  const step = Math.sin(t * 3.0) > 0.6 ? 1 : 0;
  px(ctx, x + 3, by + bodyH, 6, 7 - step, darkCol);
  px(ctx, x + 13, by + bodyH, 6, 7, darkCol);
  px(ctx, x + 21, by + bodyH, 6, 7, darkCol);
  px(ctx, x + 31, by + bodyH, 6, 7 - step, darkCol);
}
const ART = { ...S.art, drawClawd: drawClawdEp };

function dimRoom(ctx, amount) {
  if (amount <= 0) return;
  px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${amount.toFixed(3)})`);
}

// --- Scene painters ------------------------------------------------------
function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0);
  // The room loses 10% of its light the moment `rm` lands.
  dimRoom(ctx, DIM * S.easeOut((t - RM_AT) / 0.5));
  S.drawTerminal(ctx, TITLES.S1, C.dim);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= 7.6) S.drawStatus(ctx, S1_STATUS, C.dim);
  const mood = t >= RM_AT ? 'sad' : 'calm';
  const dy = t >= RM_AT ? Math.round(2 * S.easeOut((t - RM_AT) / 0.6)) : 0;
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0, { dy });
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0);
  dimRoom(ctx, DIM);
  S.drawTerminal(ctx, TITLES.S2, C.dim);
  const { cursorX } = drawPromptLine(ctx, LINE_Y[0], t, S2_TYPED, S2_TYPE_AT, S2_TYPE_MS, S2_DEL_AT, S2_DEL_MS);
  drawCursor(ctx, cursorX, LINE_Y[0], t, S2_CURSOR_PERIOD, C.dim);
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'sad', 0, { dy: 2 });
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0);
  dimRoom(ctx, DIM);
  S.drawTerminal(ctx, TITLES.S3, C.dim);
  S.txt(ctx, TEXT_X, LINE_Y[0], '$ ', C.green, 10);
  const cx = TEXT_X + S.textWidth('$ ', 10);
  drawCursor(ctx, cx, LINE_Y[0], t, S3_CURSOR_PERIOD, C.dim);
  if (t >= NOTE_AT) S.drawStickyNote(ctx, NOTE_TITLE, NOTE_SUB, t, S.easeOut((t - NOTE_AT) / 0.3));
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, 'sad', 0, { dy: t >= HEAD_DOWN_FROM ? 2 : 1 });
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

// --- Clicks: every typed AND every deleted character ---------------------
function scriptClicks(text, at, ms, count = Array.from(text).length) {
  return Array.from({ length: count }, (_, i) => at + (i * ms) / 1000);
}

function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(S1_LINES),
    ...scriptClicks(S2_TYPED, S2_TYPE_AT, S2_TYPE_MS),
    ...scriptClicks(S2_TYPED, S2_DEL_AT, S2_DEL_MS), // backspaces sound too
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
  { text: S2_PROMPT + S2_TYPED, start: S2_TYPE_AT, charMs: S2_TYPE_MS, limit: 19.6 },
  { text: S2_PROMPT, start: 20.05, charMs: S.TYPE_CHAR_MS, limit: 29.6 },
];

// --- Layout ---------------------------------------------------------------
function contentExtraS2(t) {
  const list = [{ name: 'prompt_row', box: S.textBox(TEXT_X, LINE_Y[0], S2_PROMPT + S2_TYPED, 10) }];
  const { cursorX } = { cursorX: TEXT_X + S.textWidth(S2_PROMPT + S2_TYPED, 10) + 2 };
  list.push({ name: 'blink_cursor', box: [cursorX, LINE_Y[0], 6, 10] });
  return list;
}

function layoutAt(t) {
  const common = { subLines: SUB_LINES, subWindows: SUB_WINDOWS, t };
  let layout;
  if (t < 10) {
    layout = S.baseLayout({ ...common, scene: 1, title: TITLES.S1, lines: S1_LINES, status: S1_STATUS });
  } else if (t < 20) {
    layout = S.baseLayout({ ...common, scene: 2, title: TITLES.S2, lines: [] });
    layout.groups.content = contentExtraS2(t);
  } else {
    layout = S.baseLayout({
      ...common, scene: 3, title: TITLES.S3, lines: [],
      note: true, noteTitle: NOTE_TITLE, noteSub: NOTE_SUB,
    });
    layout.groups.content = [
      { name: 'prompt_row', box: S.textBox(TEXT_X, LINE_Y[0], '$ ', 10) },
      { name: 'blink_cursor', box: [TEXT_X + S.textWidth('$ ', 10) + 2, LINE_Y[0], 6, 10] },
    ];
  }
  layout.groups.foreground = S.foregroundLayout({
    terminal: true, clawd: false, her: false,
    note: t >= 20 ? true : undefined,
    extra: [{ name: 'clawd', box: CLAWD_BOX }],
  });
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
  S1_LINES, S1_STATUS, RM_AT, DIM,
  S2_PROMPT, S2_TYPED, S2_TYPE_AT, S2_TYPE_MS, S2_DEL_AT, S2_DEL_MS, S2_CURSOR_PERIOD,
  S3_CURSOR_PERIOD, NOTE_AT, NOTE_TITLE, NOTE_SUB, HEAD_DOWN_FROM, CLAWD_BOX,
  CHECK_TITLE: 'E03 悲伤 (sorrow) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: 'her_notes.txt  her_todo.md', size: 10, color: C.text },
    { text: '$ rm her_*', size: 10, color: C.red },
    { text: '(空)', size: 10, color: C.dim },
    { text: '光标还在闪。它在等。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt, getClickTimestamps, drawClawdEp, cursorOn, drawPromptLine, typedCount,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
