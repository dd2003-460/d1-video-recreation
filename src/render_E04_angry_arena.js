#!/usr/bin/env node
'use strict';
// E04 愤怒 (anger) — 30s, 1800 frames @ 60fps.
// 事实源 (episodes.md): 反复失败的第 11 次，`rm -rf` 打了一半停住，手指敲键盘变重。
//   S1 (0-10s)  失败列表: `$ ./build.sh` → [10] FAIL / [11] FAIL / [11/11] ALL FAILED
//               每行 FAIL 红块闪现；键盘音变重（-2dB，节奏 80ms → 60ms）；Clawd thinking → anger（眼角下压 1px）
//   S2 (10-20s) 打了一半: `$ rm -rf /` 逐字符（80ms）打出后停住，光标 0.3s 快闪，画面边缘 4px 暗红 vignette
//   S3 (20-30s) 停住: 指令逐字退格撤销 → `[clawd: 指令 → 已撤销]` → `$ ./build.sh --fix` → `[12] PASS`
//               红晕消退，Clawd anger → calm，便签「愤怒。」
// 画布 640×360 × SCALE=2 → 1280×720; 终端 440×200 @ (100,140); Fusion Pixel 10px。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y, CONTENT, px } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E04_anger_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — build',
  S2: 'clawd@dsh:~ — ',
  S3: 'clawd@dsh:~ — build --fix',
};
const SUB_LINES = ['第十一次了。', '手指停住了。', '愤怒是停下来的勇气。'];
const SUB_WINDOWS = [{ start: 2.2, end: 8.6 }, { start: 13.2, end: 18.6 }, { start: 24.6, end: 29.2 }];

const S1_LINES = [
  { y: LINE_Y[0], start: 0.9, charMs: 80, cursor: false, parts: [{ text: '$ ', color: C.green }, { text: './build.sh', color: C.text }] },
  { y: LINE_Y[1], start: 2.2, charMs: 60, cursor: false, parts: [{ text: '[10] ', color: C.dim }, { text: 'FAIL', color: C.red }, { text: ': assertion at core.js:42', color: C.text }] },
  { y: LINE_Y[2], start: 4.2, charMs: 60, cursor: false, parts: [{ text: '[11] ', color: C.dim }, { text: 'FAIL', color: C.red }, { text: ': assertion at core.js:42', color: C.text }] },
  { y: LINE_Y[3], start: 6.2, charMs: 45, cursor: false, parts: [{ text: '[11/11] ', color: C.red }, { text: 'ALL FAILED', color: C.red }] },
];
const S1_STATUS = '[DSH] build: 11/11 failed';

// Red block that punches in as each FAIL lands.
const FAIL_FLASH_X = 496;
const FAIL_FLASHES = [
  { line: 1, at: 4.07 },
  { line: 2, at: 6.07 },
  { line: 3, at: 6.68 },
];
const FLASH_LIFE = 0.45;

// --- S2: typed hard, then stopped ----------------------------------------
const S2_DANGER = '$ rm -rf /';
const S2_TYPE_AT = 11.0;
const S2_TYPE_MS = 80;
const S2_CURSOR_PERIOD = 0.3;
const S2_FLASH_AT = 11.0;
const S2_STATUS = '[DSH] motor: keydown x9 · halted';

// --- S3: revoked, then fixed --------------------------------------------
const S3_TYPED = 'rm -rf /';
const S3_DEL_AT = 20.7;
const S3_DEL_MS = 70;
const S3_LINES = [
  { y: LINE_Y[1], start: 21.6, charMs: 70, cursor: false, parts: [{ text: '[clawd: ', color: C.dim }, { text: '指令 → 已撤销', color: C.green }, { text: ']', color: C.dim }] },
  { y: LINE_Y[2], start: 22.9, charMs: 80, cursor: false, parts: [{ text: '$ ', color: C.green }, { text: './build.sh --fix', color: C.text }] },
  { y: LINE_Y[3], start: 24.6, charMs: 60, cursor: false, parts: [{ text: '[12] ', color: C.green }, { text: 'PASS', color: C.green }] },
];
const S3_STATUS = '[DSH] command: revoked · build: ok';
const VIGNETTE_OUT_AT = 20.4; // red rim starts receding here
const NOTE_AT = 25.6;
const NOTE_TITLE = '愤怒。';
const NOTE_SUB = 'Clawd · E04';
const CLAWD_BOX = [S.CLAWD_ROOM.x, S.CLAWD_ROOM.y - 1, 40, 25];

// --- Cursor helpers ------------------------------------------------------
function cursorOn(t, period) {
  return t % period < period / 2;
}

function typedCount(t, length, start, charMs) {
  if (t < start) return 0;
  return Math.min(length, Math.floor(((t - start) * 1000) / charMs) + 1);
}

function deletedCount(t, length, start, charMs) {
  if (t < start) return 0;
  return Math.min(length, Math.floor(((t - start) * 1000) / charMs) + 1);
}

// --- Clawd: anger brows (眼角下压 1px) -----------------------------------
function drawClawdEp(ctx, x, y, t, mood = 'calm', warmMix = 0, opts = {}) {
  const dy = opts.dy === undefined ? 0 : opts.dy;
  if (mood !== 'anger') {
    // thinking / calm / smile stay byte-identical to the shared companion sprite.
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

  // 4×4 eyes, 1px lower than the calm sprite, with the top-outer pixel struck out:
  // the outer eye corner is pressed down 1px.
  px(ctx, x + 10, by + 6, 4, 4, C.clawdEye);
  px(ctx, x + 26, by + 6, 4, 4, C.clawdEye);
  px(ctx, x + 10, by + 6, 1, 1, bodyCol);
  px(ctx, x + 29, by + 6, 1, 1, bodyCol);
  px(ctx, x + 12, by + 9, 1, 1, C.white);
  px(ctx, x + 28, by + 9, 1, 1, C.white);
  // Slanted brows: 2px thick, 1px lower at the nose — the classic angry V.
  px(ctx, x + 9, by + 2, 2, 2, C.clawdEye); // outer end high
  px(ctx, x + 11, by + 3, 2, 2, C.clawdEye);
  px(ctx, x + 13, by + 4, 2, 2, C.clawdEye); // inner end low (toward the nose)
  px(ctx, x + 29, by + 2, 2, 2, C.clawdEye);
  px(ctx, x + 27, by + 3, 2, 2, C.clawdEye);
  px(ctx, x + 25, by + 4, 2, 2, C.clawdEye);
  // Tight, flat mouth.
  px(ctx, x + 17, by + 13, 6, 1, C.clawdEye);

  const step = Math.sin(t * 3.0) > 0.6 ? 1 : 0;
  px(ctx, x + 3, by + bodyH, 6, 7 - step, darkCol);
  px(ctx, x + 13, by + bodyH, 6, 7, darkCol);
  px(ctx, x + 21, by + bodyH, 6, 7, darkCol);
  px(ctx, x + 31, by + bodyH, 6, 7 - step, darkCol);
}
const ART = { ...S.art, drawClawd: drawClawdEp };

// --- Dark-red 4px rim that breathes in and out --------------------------
function drawVignette(ctx, amount) {
  if (amount <= 0) return;
  const a = S.clamp01(amount) * 0.5;
  const col = `rgba(150,24,24,${a.toFixed(3)})`;
  const col2 = `rgba(120,16,16,${(a * 0.6).toFixed(3)})`;
  px(ctx, 0, 0, S.BW, 4, col);
  px(ctx, 0, S.BH - 4, S.BW, 4, col);
  px(ctx, 0, 0, 4, S.BH, col);
  px(ctx, S.BW - 4, 0, 4, S.BH, col);
  px(ctx, 4, 4, S.BW - 8, 1, col2);
  px(ctx, 4, S.BH - 5, S.BW - 8, 1, col2);
  px(ctx, 4, 4, 1, S.BH - 8, col2);
  px(ctx, S.BW - 5, 4, 1, S.BH - 8, col2);
}

function vignetteAt(t) {
  if (t < 10 || t > 22) return 0;
  if (t < S2_FLASH_AT) return S.easeOut((t - 10) / 1.0) * 0.55;
  if (t <= VIGNETTE_OUT_AT) return 0.85;
  return Math.max(0, 0.85 * (1 - S.easeOut((t - VIGNETTE_OUT_AT) / 1.4)));
}

// --- Scene painters -----------------------------------------------------
function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S1, C.red);
  S.drawLines(ctx, S1_LINES, t);
  for (const f of FAIL_FLASHES) {
    const age = t - f.at;
    if (age < 0) continue;
    const y = LINE_Y[f.line] + 2;
    if (age < FLASH_LIFE) {
      const k = 1 - age / FLASH_LIFE;
      px(ctx, FAIL_FLASH_X - 1, y - 1, 8, 8, `rgba(255,90,90,${(0.2 * k).toFixed(3)})`);
      px(ctx, FAIL_FLASH_X, y, 6, 6, C.red);
    } else {
      px(ctx, FAIL_FLASH_X + 1, y + 1, 4, 4, 'rgba(255,90,90,0.45)');
    }
  }
  if (t >= 6.9) S.drawStatus(ctx, S1_STATUS, C.red);
  const mood = t >= 4.1 ? 'anger' : 'thinking';
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2Body(ctx, t) {
  const len = Array.from(S2_DANGER).length;
  const n = typedCount(t, len, S2_TYPE_AT, S2_TYPE_MS);
  const chars = Array.from(S2_DANGER);
  const prompt = '$ ';
  S.txt(ctx, TEXT_X, LINE_Y[0], prompt, C.green, 10);
  const px0 = TEXT_X + S.textWidth(prompt, 10);
  const typed = chars.slice(2, n).join('');
  if (typed) S.txt(ctx, px0, LINE_Y[0], typed, C.text, 10);
  const cx = px0 + S.textWidth(typed, 10) + (typed ? 1 : 0);
  if (cursorOn(t, S2_CURSOR_PERIOD)) px(ctx, cx, LINE_Y[0], 6, 10, C.text);
  if (n >= len) S.drawStatus(ctx, S2_STATUS, C.red);
  return { cx, n };
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0.06);
  S.drawTerminal(ctx, TITLES.S3, C.green);
  // Row 1: the aborted command, deleted character by character.
  const deleted = deletedCount(t, Array.from(S3_TYPED).length, S3_DEL_AT, S3_DEL_MS);
  const shown = Array.from(S3_TYPED).slice(0, Math.max(0, Array.from(S3_TYPED).length - deleted)).join('');
  S.txt(ctx, TEXT_X, LINE_Y[0], '$ ', C.green, 10);
  const px0 = TEXT_X + S.textWidth('$ ', 10);
  if (shown) S.txt(ctx, px0, LINE_Y[0], shown, C.text, 10);
  const cx = px0 + S.textWidth(shown, 10) + (shown ? 1 : 0);
  if (t < 21.4 && cursorOn(t, S2_CURSOR_PERIOD)) px(ctx, cx, LINE_Y[0], 6, 10, C.text);
  S.drawLines(ctx, S3_LINES, t);
  if (t >= 24.7) S.drawStatus(ctx, S3_STATUS, C.green);
  if (t >= NOTE_AT) S.drawStickyNote(ctx, NOTE_TITLE, NOTE_SUB, t, S.easeOut((t - NOTE_AT) / 0.3));
  const mood = t >= 21.6 ? 'calm' : 'anger';
  drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, mood, 0);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

const SCENES = [
  { start: 0, draw: drawS1 },
  {
    start: 10,
    draw: (ctx, t) => {
      S.drawBackground(ctx, t, 0);
      S.drawTerminal(ctx, TITLES.S2, C.red);
      drawS2Body(ctx, t);
      drawClawdEp(ctx, S.CLAWD_ROOM.x, S.CLAWD_ROOM.y, t, t >= 10.6 ? 'anger' : 'thinking', 0);
      S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
    },
  },
  { start: 20, draw: drawS3 },
];

function renderAt(ctx, t) {
  S.renderScenes(ctx, t, SCENES);
  drawVignette(ctx, vignetteAt(t));
}

// --- Clicks: every character typed, plus every backspace ----------------
function scriptClicks(text, at, ms) {
  return Array.from(text).map((_, i) => at + (i * ms) / 1000);
}

function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(S1_LINES),
    ...S.lineClicks(S3_LINES),
    ...scriptClicks(S2_DANGER, S2_TYPE_AT, S2_TYPE_MS),
    ...scriptClicks(S3_TYPED, S3_DEL_AT, S3_DEL_MS),
    ...FAIL_FLASHES.map((f) => f.at),
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
  ...typingSchedule(S1_LINES, 9.6),
  ...typingSchedule(S3_LINES, 29.5),
  { text: S2_DANGER, start: S2_TYPE_AT, charMs: S2_TYPE_MS, limit: 19.6 },
];

// --- Layout -------------------------------------------------------------
function layoutAt(t) {
  const common = { subLines: SUB_LINES, subWindows: SUB_WINDOWS, t };
  let layout;
  if (t < 10) {
    layout = S.baseLayout({ ...common, scene: 1, title: TITLES.S1, lines: S1_LINES, status: S1_STATUS });
  } else if (t < 20) {
    layout = S.baseLayout({ ...common, scene: 2, title: TITLES.S2, lines: [], status: S2_STATUS });
    layout.groups.content = [
      { name: 'prompt_row', box: S.textBox(TEXT_X, LINE_Y[0], S2_DANGER, 10) },
      { name: 'fast_cursor', box: [TEXT_X + S.textWidth(S2_DANGER, 10) + 2, LINE_Y[0], 6, 10] },
      { name: 'status', box: S.textBox(TEXT_X, STATUS_Y, S2_STATUS, 10) },
    ];
  } else {
    layout = S.baseLayout({
      ...common, scene: 3, title: TITLES.S3, lines: S3_LINES, status: S3_STATUS,
      note: true, noteTitle: NOTE_TITLE, noteSub: NOTE_SUB,
    });
    layout.groups.content = [
      { name: 'revoked_row', box: S.textBox(TEXT_X, LINE_Y[0], `$ ${S3_TYPED}`, 10) },
      { name: 'revoked_cursor', box: [TEXT_X + S.textWidth(`$ ${S3_TYPED}`, 10) + 2, LINE_Y[0], 6, 10] },
      ...S.contentLayout(S3_LINES, S3_STATUS),
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
  S1_LINES, S1_STATUS, FAIL_FLASHES, FLASH_LIFE, FAIL_FLASH_X,
  S2_DANGER, S2_TYPE_AT, S2_TYPE_MS, S2_CURSOR_PERIOD, S2_STATUS,
  S3_TYPED, S3_DEL_AT, S3_DEL_MS, S3_LINES, S3_STATUS, NOTE_AT, NOTE_TITLE, NOTE_SUB, CLAWD_BOX,
  VIGNETTE_OUT_AT,
  CHECK_TITLE: 'E04 愤怒 (anger) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '[11] FAIL: assertion at core.js:42', size: 10, color: C.text },
    { text: '[11/11] ALL FAILED', size: 10, color: C.red },
    { text: '[clawd: 指令 → 已撤销]', size: 10, color: C.dim },
    { text: '愤怒是停下来的勇气。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt, getClickTimestamps, drawClawdEp, cursorOn, typedCount, deletedCount, vignetteAt,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
