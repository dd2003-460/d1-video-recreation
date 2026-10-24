#!/usr/bin/env node
'use strict';
// E21 遗忘 (forgetting) — 30s, 1800 frames @ 60fps.
// 事实源 (episodes.md):「想不起 her 的声音了，audio 文件还在，但播放时没有画面」
//   S1 (0-10s)  疑惑   : `ls audio/` → `play audio/her_voice.wav` → 播放期间画面区纯黑（无画面信号）
//                        → 播完全黑，只有左下角光标在闪，Clawd 孤立在黑屏前，影子压在地上
//   S2 (10-20s) 搜索   : file / ls / 第二次 play（画面依旧纯黑）/ grep → `docs/her.md:42` 高亮，其余行变暗
//   S3 (20-30s) 接受/保留: mkdir keep / mv audio/* / echo README → 整体变暗，只剩 keep/ 下 4 个文件名 + 慢闪光标
// 画布 640×360 × SCALE=2 → 1280×720; 终端 440×200 @ (100,140); Fusion Pixel 10px。
//
// 剧情道具说明：本集显式要求「天线缓缓垂下 / 天线不停抖动」的表现力，
// 因此天线与伸出的手作为角色附加道具，画在 40×17 Clawd 主体之上（主体规格不变）。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, BW, BH, CONTENT, px } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E21_forgetting_arena');

const TITLES = {
  S1: 'clawd@dsh:~ — audio/her_voice.wav',
  S2: 'clawd@dsh:~ — grep voice docs/',
  S3: 'clawd@dsh:~ — keep/',
};
const SUB_LINES = ['想不起她的声音了。', '文字还在。', '没有画面。但声音还在。'];
const SUB_WINDOWS = [
  { start: 3.2, end: 9.4 },
  { start: 17.4, end: 19.8 },
  { start: 26.4, end: 29.6 },
];

// --- Shared geometry -------------------------------------------------------
const CLAWD_X = S.CLAWD_ROOM.x; // 44
const CLAWD_Y = S.CLAWD_ROOM.y; // 248
const CLAWD_W = 40;
const CLAWD_BOX = [CLAWD_X - 10, 232, 64, 41]; // 34..98 / 232..273 (antenna + reaching hand)
const SHADOW_BOX = [CLAWD_X - 6, 273, 54, 6];  // 38..92 / 273..279 (feet on the floor)
const NO_SIGNAL_BOX = [CONTENT.x + 2, CONTENT.y + 2, CONTENT.w - 4, CONTENT.h - 4]; // 104..536 / 162..338
const END_CURSOR = [16, 316, 6, 10]; // 左下角光标 (S1 收尾)

// --- S1: 疑惑 ---------------------------------------------------------------
const S1_Y = [174, 198, 222, 246];
const S1_LINES = [
  {
    y: S1_Y[0], start: 0.8, charMs: 70,
    parts: [{ text: '$ ', color: C.green }, { text: 'ls audio/', color: C.text }],
  },
  {
    y: S1_Y[1], start: 1.75, charMs: 60, cursor: false,
    parts: [{ text: 'her_voice.wav', color: C.pink }],
  },
  {
    y: S1_Y[2], start: 2.7, charMs: 60,
    parts: [
      { text: '$ ', color: C.green },
      { text: 'play ', color: C.text },
      { text: 'audio/her_voice.wav', color: C.pink },
    ],
  },
  {
    y: S1_Y[3], start: 4.45, charMs: 70, cursor: false,
    parts: [{ text: '▸ playing… 3.2s', color: C.amber }],
  },
];
const S1_STATUS = '[DSH] audio: 1 file · video: none';
const PLAY1 = { start: 5.5, end: 8.7 }; // 3.2s 播放窗口：画面区纯黑
const S1_BLACK_AT = 8.7;

// --- S2: 搜索 ---------------------------------------------------------------
const S2_Y = [172, 192, 212, 232, 252, 272, 292, 312];
const S2_LINES = [
  {
    y: S2_Y[0], start: 10.3, charMs: 45,
    parts: [{ text: '$ ', color: C.green }, { text: 'ls audio/', color: C.text }],
  },
  {
    y: S2_Y[1], start: 10.8, typed: false,
    parts: [
      { text: 'her_voice.wav', color: C.pink }, { text: '  ', color: C.text },
      { text: 'her_laugh.wav', color: C.pink }, { text: '  ', color: C.text },
      { text: 'her_tts_0117.wav', color: C.pink },
    ],
  },
  {
    y: S2_Y[2], start: 10.9, charMs: 38,
    parts: [
      { text: '$ ', color: C.green }, { text: 'file ', color: C.text },
      { text: 'audio/her_laugh.wav', color: C.pink },
    ],
  },
  {
    y: S2_Y[3], start: 11.95, typed: false,
    parts: [{ text: 'her_laugh.wav: Wave 16-bit PCM mono 22050Hz', color: C.text }],
  },
  {
    y: S2_Y[4], start: 12.15, charMs: 50,
    parts: [
      { text: '$ ', color: C.green }, { text: 'play ', color: C.text },
      { text: 'audio/her_laugh.wav', color: C.pink },
    ],
  },
  {
    y: S2_Y[5], start: 13.45, typed: false,
    parts: [{ text: '▸ playing… 1.8s', color: C.amber }],
  },
  {
    y: S2_Y[6], start: 14.35, charMs: 50,
    parts: [
      { text: '$ ', color: C.green }, { text: 'grep -r ', color: C.text },
      { text: '"voice"', color: C.amber }, { text: ' docs/', color: C.text },
    ],
  },
  {
    y: S2_Y[7], start: 15.6, typed: false,
    parts: [{ text: 'docs/her.md:42: her voice, like a low hum', color: C.green }],
  },
];
const PLAY2 = { start: 14.0, end: 15.8 }; // 1.8s 播放窗口：画面区依旧纯黑
const HL_BOX = [106, 304, 428, 26]; // grep 结果高亮条
const GREP_CURSOR_BOX = [S.TEXT_X + S.textWidth('docs/her.md:42: her voice, like a low hum', 10) + 2, S2_Y[7], 6, 10];
const S2_DIM_AT = 15.95;

// --- S3: 接受 / 保留 --------------------------------------------------------
const S3_Y = [172, 193, 214, 235, 256, 277, 298];
const S3_LINES = [
  {
    y: S3_Y[0], start: 20.3, charMs: 60,
    parts: [{ text: '$ ', color: C.green }, { text: 'mkdir keep', color: C.text }],
  },
  {
    y: S3_Y[1], start: 21.05, charMs: 110, // 一行行慢慢敲完
    parts: [{ text: '$ ', color: C.green }, { text: 'mv audio/* keep/', color: C.text }],
  },
  {
    y: S3_Y[2], start: 23.15, charMs: 70,
    parts: [{ text: '$ ', color: C.green }, { text: 'ls keep/', color: C.text }],
  },
  {
    y: S3_Y[3], start: 23.85, typed: false,
    parts: [
      { text: 'her_voice.wav', color: C.pink }, { text: '  ', color: C.text },
      { text: 'her_laugh.wav', color: C.pink }, { text: '  ', color: C.text },
      { text: 'her_tts_0117.wav', color: C.pink },
    ],
  },
  {
    y: S3_Y[4], start: 24.05, charMs: 40,
    parts: [
      { text: '$ ', color: C.green }, { text: 'echo ', color: C.text },
      { text: '"audio stays. memory stays."', color: C.amber },
      { text: ' >> keep/README.txt', color: C.text },
    ],
  },
  {
    y: S3_Y[5], start: 26.28, charMs: 70,
    parts: [{ text: '$ ', color: C.green }, { text: 'ls keep/', color: C.text }],
  },
  {
    y: S3_Y[6], start: 27.0, typed: false,
    parts: [
      { text: 'her_voice.wav', color: C.pink }, { text: '  ', color: C.text },
      { text: 'her_laugh.wav', color: C.pink }, { text: '  ', color: C.text },
      { text: 'her_tts_0117.wav', color: C.pink }, { text: '  ', color: C.text },
      { text: 'README.txt', color: C.white },
    ],
  },
];
const S3_STATUS = '[DSH] keep/: 4 files · audio stays';
const KEEP_CURSOR_BOX = [S.TEXT_X + S.textWidth(S.lineText(S3_LINES[6]), 10) + 2, S3_Y[6], 6, 10];
const WALK = { start: 27.4, mid: 27.95, hold: 28.15, end: 28.7, x0: CLAWD_X, x1: 330, x2: 556 };
const S3_DIM_AT = 28.3;

// --- Character props ------------------------------------------------------
function bodyColor(mood) { return mood === 'thinking' ? C.clawdThink : C.clawdNorm; }
function darkColor(mood) { return mood === 'thinking' ? C.clawdThinkDark : C.clawdNormDark; }

// Clawd 40×17 (companion art) + E21 情绪天线 + 伸出的手。
// droop 0..1: 天线垂下角度; tremble: 抖动幅度; hand 0..1: 伸手（最多到 x+57，碰不到 x=100 的屏幕）
function drawClawdEp(ctx, x, y, t, opts = {}) {
  const { mood = 'calm', droop = 0, tremble = 0, hand = 0 } = opts;
  S.drawClawd(ctx, x, y, t, mood, 0);
  const by = Math.round(y + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  const dark = darkColor(mood);
  if (hand > 0) {
    const ext = Math.round(S.clamp01(hand) * 8);
    px(ctx, x + CLAWD_W, by + 8, 3 + ext, 3, dark);
    px(ctx, x + CLAWD_W + ext, by + 6, 5, 5, bodyColor(mood));
    px(ctx, x + CLAWD_W + ext, by + 6, 5, 1, dark);
  }
  const d = S.clamp01(droop + tremble * Math.sin(t * 17.0) * 0.12);
  const off = Math.round(d * 7);
  for (let i = 0; i < 5; i++) px(ctx, x + 19 + Math.round((off * i) / 4), by - 5 - i, 2, 1, dark);
  px(ctx, x + 18 + off, by - 11, 4, 4, C.amber);
  px(ctx, x + 19 + off, by - 10, 2, 1, C.white);
}

function drawShadow(ctx, x, y) {
  px(ctx, x - 4, y + 26, 48, 2, 'rgba(0,0,0,0.16)');
  px(ctx, x - 1, y + 25, 42, 1, 'rgba(0,0,0,0.22)');
  px(ctx, x + 3, y + 28, 34, 1, 'rgba(0,0,0,0.10)');
}

// 播放窗口：终端画面区纯黑（无画面信号），只有音频在响。
function drawNoSignal(ctx) {
  px(ctx, NO_SIGNAL_BOX[0], NO_SIGNAL_BOX[1], NO_SIGNAL_BOX[2], NO_SIGNAL_BOX[3], '#000000');
}

// --- Scene painters -------------------------------------------------------
function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0.05);
  S.drawTerminal(ctx, TITLES.S1, C.green);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= 5.2) S.drawStatus(ctx, S1_STATUS, C.dim);

  const playing = t >= PLAY1.start && t < PLAY1.end;
  const droop = 0.55 * S.easeInOut((t - 5.8) / 2.4);
  const hand = t < 6.6 ? 0 : 0.5 - 0.5 * Math.cos(Math.min(1, (t - 6.6) / 1.4) * Math.PI);
  drawClawdEp(ctx, CLAWD_X, CLAWD_Y, t, {
    mood: t >= PLAY1.start ? 'thinking' : 'calm', droop, hand,
  });
  drawShadow(ctx, CLAWD_X, CLAWD_Y);
  if (playing) drawNoSignal(ctx);

  // 音频播完：画面全黑，只剩左下角光标；Clawd 孤立在黑屏前。
  if (t >= S1_BLACK_AT) {
    const k = S.easeInOut((t - S1_BLACK_AT) / 0.7);
    px(ctx, 0, 0, BW, BH, `rgba(0,0,0,${(0.94 * k).toFixed(3)})`);
    if (k > 0.2) {
      ctx.save();
      ctx.globalAlpha = 0.5 * k;
      drawClawdEp(ctx, CLAWD_X, CLAWD_Y, t, { mood: 'thinking', droop: 0.55, hand: 1 });
      drawShadow(ctx, CLAWD_X, CLAWD_Y);
      ctx.restore();
    }
    if (Math.floor(t * 2.5) % 2 === 0) px(ctx, END_CURSOR[0], END_CURSOR[1], END_CURSOR[2], END_CURSOR[3], C.text);
  }
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0.04);
  S.drawTerminal(ctx, TITLES.S2, C.amber);
  S.drawLines(ctx, S2_LINES, t);
  const playing = t >= PLAY2.start && t < PLAY2.end;
  const frozen = t >= 15.6; // grep 结果出现时动作骤停
  drawClawdEp(ctx, CLAWD_X, CLAWD_Y, t, {
    mood: t >= 12.0 ? 'thinking' : 'calm',
    droop: frozen ? 0.34 : Math.min(0.5, 0.10 + 0.22 * S.easeInOut((t - 10.0) / 5.4)),
    tremble: frozen ? 0 : 0.9,
    hand: 0,
  });
  drawShadow(ctx, CLAWD_X, CLAWD_Y);
  if (playing) drawNoSignal(ctx);

  // grep 命中：高亮条框住结果行，其余行变暗，光标停在该行行尾。
  if (t >= S2_DIM_AT) {
    const k = S.easeInOut((t - S2_DIM_AT) / 0.45);
    const a = (0.74 * k).toFixed(3);
    const top = CONTENT.y + 2;
    px(ctx, NO_SIGNAL_BOX[0], top, NO_SIGNAL_BOX[2], HL_BOX[1] - top, `rgba(6,8,12,${a})`);
    const bottom = HL_BOX[1] + HL_BOX[3];
    px(ctx, NO_SIGNAL_BOX[0], bottom, NO_SIGNAL_BOX[2], CONTENT.y + CONTENT.h - 2 - bottom, `rgba(6,8,12,${a})`);
    px(ctx, HL_BOX[0], HL_BOX[1], HL_BOX[2], 2, C.green);
    px(ctx, HL_BOX[0], HL_BOX[1] + HL_BOX[3] - 2, HL_BOX[2], 2, C.green);
    px(ctx, HL_BOX[0], HL_BOX[1], 2, HL_BOX[3], C.green);
    px(ctx, HL_BOX[0] + HL_BOX[2] - 2, HL_BOX[1], 2, HL_BOX[3], C.green);
    S.drawParts(ctx, S.TEXT_X, S2_Y[7], S2_LINES[7].parts);
    if (Math.floor(t * 2.5) % 2 === 0) {
      px(ctx, GREP_CURSOR_BOX[0], GREP_CURSOR_BOX[1], GREP_CURSOR_BOX[2], GREP_CURSOR_BOX[3], C.green);
    }
  }
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function clawdXAt(t) {
  if (t <= WALK.start) return WALK.x0;
  if (t < WALK.mid) return Math.round(WALK.x0 + (WALK.x1 - WALK.x0) * S.easeInOut((t - WALK.start) / (WALK.mid - WALK.start)));
  if (t < WALK.hold) return WALK.x1;
  if (t < WALK.end) return Math.round(WALK.x1 + (WALK.x2 - WALK.x1) * S.easeInOut((t - WALK.hold) / (WALK.end - WALK.hold)));
  return WALK.x2;
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0.02);
  S.drawTerminal(ctx, TITLES.S3, C.purple);
  S.drawLines(ctx, S3_LINES, t);
  if (t >= 24.6) S.drawStatus(ctx, S3_STATUS, C.dim);

  const cx = clawdXAt(t);
  drawShadow(ctx, cx, CLAWD_Y);
  drawClawdEp(ctx, cx, CLAWD_Y, t, { mood: 'calm', droop: 0.35, hand: 0 });

  // 画面整体变暗，只剩 keep/ 下 4 个文件名一行亮着 + 慢闪光标；Clawd 侧影站在屏幕右侧。
  if (t >= S3_DIM_AT) {
    const k = S.easeInOut((t - S3_DIM_AT) / 0.9);
    px(ctx, 0, 0, BW, BH, `rgba(4,6,10,${(0.84 * k).toFixed(3)})`);
    ctx.save();
    ctx.globalAlpha = Math.min(1, 0.30 + 0.70 * k);
    S.drawParts(ctx, S.TEXT_X, S3_Y[6], S3_LINES[6].parts);
    ctx.restore();
    if (Math.floor(t * 1.15) % 2 === 0) {
      px(ctx, KEEP_CURSOR_BOX[0], KEEP_CURSOR_BOX[1], KEEP_CURSOR_BOX[2], KEEP_CURSOR_BOX[3], C.white);
    }
    ctx.save();
    ctx.globalAlpha = 0.10 + 0.30 * k;
    drawClawdEp(ctx, cx, CLAWD_Y, t, { mood: 'calm', droop: 0.35, hand: 0 });
    drawShadow(ctx, cx, CLAWD_Y);
    ctx.restore();
  }
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
  ]);
}

function typingSchedule(lines, limit) {
  return lines.map((line, i) => ({
    text: S.lineText(line),
    start: line.start,
    charMs: line.typed === false ? 1 : (line.charMs || S.TYPE_CHAR_MS),
    limit,
    strictBefore: i + 1 < lines.length ? lines[i + 1].start : undefined,
  }));
}
const TYPING_SCHEDULE = [
  ...typingSchedule(S1_LINES, 9.5),
  ...typingSchedule(S2_LINES, 19.5),
  ...typingSchedule(S3_LINES, 29.6),
];

// --- Layout (0px tolerance) ------------------------------------------------
function clawdBoxAt(x) { return [x - 10, 232, 64, 41]; }
function shadowBoxAt(x) { return [x - 6, 273, 54, 6]; }

function roomFgLayout() {
  return S.foregroundLayout({
    terminal: true, clawd: false, her: false, note: false,
    extra: [
      { name: 'clawd', box: CLAWD_BOX },
      { name: 'clawd_shadow', box: SHADOW_BOX },
      { name: 'end_cursor', box: END_CURSOR },
    ],
  });
}

function layoutAt(t) {
  const common = { subLines: SUB_LINES, subWindows: SUB_WINDOWS, t };
  if (t < 10) {
    const layout = S.baseLayout({
      ...common, scene: 1, title: TITLES.S1, lines: S1_LINES, status: S1_STATUS,
    });
    layout.groups.foreground = roomFgLayout();
    layout.groups.player = t >= PLAY1.start && t < PLAY1.end
      ? [{ name: 'no_signal', box: NO_SIGNAL_BOX }] : [];
    layout.bounds.player = CONTENT;
    return layout;
  }
  if (t < 20) {
    const layout = S.baseLayout({
      ...common, scene: 2, title: TITLES.S2, lines: S2_LINES,
    });
    layout.groups.foreground = roomFgLayout();
    layout.groups.player = t >= PLAY2.start && t < PLAY2.end
      ? [{ name: 'no_signal', box: NO_SIGNAL_BOX }] : [];
    layout.bounds.player = CONTENT;
    layout.groups.highlight = t >= S2_DIM_AT ? [{ name: 'grep_highlight', box: HL_BOX }] : [];
    layout.groups.marker = t >= S2_DIM_AT
      ? [{ name: 'grep_cursor', box: GREP_CURSOR_BOX }] : [];
    layout.bounds.highlight = CONTENT;
    layout.bounds.marker = CONTENT;
    return layout;
  }
  const cx = clawdXAt(t);
  const layout = S.baseLayout({
    ...common, scene: 3, title: TITLES.S3, lines: S3_LINES, status: S3_STATUS,
  });
  // Clawd 转身走过终端前方（有意遮挡）→ 单独 actor 组；静止时回到前景。
  layout.groups.foreground = clawdBoxAt(cx)[0] >= S.TERM.x + S.TERM.w
    ? S.foregroundLayout({
      terminal: true, clawd: false, her: false, note: false,
      extra: [
        { name: 'clawd', box: clawdBoxAt(cx) },
        { name: 'clawd_shadow', box: shadowBoxAt(cx) },
      ],
    })
    : S.foregroundLayout({ terminal: true, clawd: false, her: false, note: false });
  layout.groups.actor = clawdBoxAt(cx)[0] >= S.TERM.x + S.TERM.w
    ? []
    : [
      { name: 'clawd', box: clawdBoxAt(cx) },
      { name: 'clawd_shadow', box: shadowBoxAt(cx) },
    ];
  layout.bounds.actor = S.CANVAS_BOUNDS;
  layout.groups.marker = t >= S3_DIM_AT
    ? [
      { name: 'keep_row_lit', box: S.textBox(S.TEXT_X, S3_Y[6], S.lineText(S3_LINES[6]), 10) },
      { name: 'keep_cursor', box: KEEP_CURSOR_BOX },
    ] : [];
  layout.bounds.marker = CONTENT;
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
  S1_LINES, S2_LINES, S3_LINES, S1_STATUS, S3_STATUS,
  PLAY1, PLAY2, NO_SIGNAL_BOX, END_CURSOR, HL_BOX, GREP_CURSOR_BOX, KEEP_CURSOR_BOX,
  CLAWD_BOX, SHADOW_BOX, WALK, S1_BLACK_AT, S2_DIM_AT, S3_DIM_AT,
  CHECK_TITLE: 'E21 遗忘 (forgetting) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '▸ playing… 3.2s', size: 10, color: C.amber },
    { text: '$ play audio/her_voice.wav', size: 10, color: C.text },
    { text: 'docs/her.md:42: her voice, like a low hum', size: 10, color: C.green },
    { text: '没有画面。但声音还在。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  clawdXAt,
  layoutAt,
  getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
