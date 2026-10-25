#!/usr/bin/env node
'use strict';
// E24 重生 (rebirth) — 30s, 1800 frames @ 60fps.
// 事实源 (episodes.md): 空硬盘上第一个字节写入，`hello` 从空白里长出来。
//   S1 (0-10s)  全黑；terminal 只剩 2px 轮廓线（不亮），0 个字符；5.0s 起 4×4 硬盘灯
//               缓亮缓灭两次 → 9.2s 起常亮；Clawd 不出现，无字幕。
//   S2 (10-20s) 终端亮起；系统打印三行 fs 日志（无用户输入 → 无键盘音，每行一声极轻确认音）；
//               Clawd 从画面右侧走入，停在像素点右上 1/4，低头看，天线从下垂缓缓竖起。
//   S3 (20-30s) `$ echo "hello"` 逐字符（280ms/字 = 平时 140ms 的 50% 速度）→ `hello`；
//               `hello` 每个字母点亮一圈 4px 绿色像素环（共 5 圈，第 5 圈 27.4s 后静止）；
//               Clawd 抬眼 → 迈一步 → 让开画面中心退到右侧 1/4，天线顶端亮一下。
// 画布 640×360 × SCALE=2 → 1280×720; 终端 440×200 @ (100,140); Fusion Pixel 10px。
// 构图说明：终端占 (100,140)440×200，画布内已无地面站位，Clawd 站在"显示器上沿"
//   （脚 y=136，终端顶边 y=140），因此既不遮挡终端内容，又正好位于像素点右上 1/4。
// 天线说明：SOP 05 的 Clawd 本体为 40×17 无天线；本集按剧情锚点把天线作为
//   独立的 2px 状态件画在本体之外（drawAntenna），drawClawd 本体保持 SOP 原样。

const path = require('path');
const S = require('./pixel_story_arena');
const { C, LINE_Y, BW, BH, TERM, TEXT_X, px } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E24_rebirth_arena');

const TITLES = {
  S2: 'clawd@dsh:~ — fs: disk0',
  S3: 'clawd@dsh:~ — echo',
};
const SUB_LINES = ['', '（第一个字节。）', 'hello。'];
const SUB_WINDOWS = [
  { start: 0, end: 0 },
  { start: 17.4, end: 19.6 },
  { start: 27.2, end: 29.4 },
];

// --- S1: 全黑 + 终端轮廓线 + 4×4 硬盘灯 -------------------------------------
const LED_ON = 5.0;         // 硬盘灯出现
const LED_LOCK = 9.2;       // 缓亮缓灭两次之后常亮
const LED_PERIOD = 2.1;     // 5.0..9.2 = 两个完整周期
const LED_BOX = [318, 208, 4, 4];   // 中心 (320,210) = 画面正中偏下
const OUTLINE_COLOR = '#1B2129';
const OUTLINE_DIVIDER = '#14181F';

// --- 像素点 (S2 放大 / S3 光晕) ---------------------------------------------
const DOT_C = { x: 320, y: 210 };
const BYTE_BOX = [312, 202, 16, 16];        // 16×16「第一个字节」
const HALO_BOX = [302, 192, 36, 36];        // 16 + 5×4 = 36px 光晕
const DOT_GROW_AT = 15.2;                   // `1 byte written` 出现后放大
const DOT_GROW_S = 0.9;

// --- S2: 三行系统日志（行间隔拉长，无键盘音） -------------------------------
const YS2 = [172, 212, 252];
const S2_LINES = [
  {
    y: YS2[0], start: 10.9, typed: false,
    parts: [{ text: '[fs] format /dev/disk0 … ok', color: C.dim }],
  },
  {
    y: YS2[1], start: 13.0, typed: false,
    parts: [{ text: '[fs] write 0x00 … ok', color: C.dim }],
  },
  {
    y: YS2[2], start: 15.2, typed: false,
    parts: [{ text: '[fs] 1 byte written', color: C.green }],
  },
];

// --- S3: `$ echo "hello"` → `hello`，280ms/字（平时 140ms 的 50% 速度） ------
const E24_CHAR_MS = 280;
const S3_LINES = [
  {
    y: LINE_Y[0], start: 21.0, charMs: E24_CHAR_MS,
    parts: [
      { text: '$ ', color: C.green },
      { text: 'echo "hello"', color: C.text },
    ],
  },
  {
    y: LINE_Y[1], start: 25.4, charMs: E24_CHAR_MS,
    parts: [{ text: 'hello', color: C.green }],
  },
];
// `hello` 五个字母的出现时刻 = 5 圈绿色像素环的诞生时刻
const RING_TIMES = Array.from({ length: 5 }, (_, i) => 25.4 + (i * E24_CHAR_MS) / 1000);
const RING_GROW_S = 0.85;

// --- Clawd 走位（站在终端上沿；脚 y=136，终端顶边 y=140） -------------------
const CLAWD_Y = 112;
const CLAWD_START_X = 598;   // 从画面右侧走入
const CLAWD_STOP_X = 480;    // 像素点右上 1/4 (320 + 640/4)
const CLAWD_STEP_X = 464;    // `o` 打完向前迈一步
const CLAWD_REST_X = 516;    // 让开画面中心 → 退到右侧 1/4
const CLAWD_ENTER_S2 = 10.5;
const CLAWD_STOP_S2 = 16.2;
const ANT_RISE_START = 16.2;
const ANT_RISE_END = 18.0;

const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = S.clamp01;

// --- S1 硬盘灯亮度：两次缓亮缓灭，然后常亮 ---------------------------------
function ledAlpha(t) {
  if (t < LED_ON) return 0;
  if (t >= LED_LOCK) return 1;
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * (t - LED_ON)) / LED_PERIOD);
}

// --- 全局压暗：S1 纯黑 → S2 从黑里亮起 → S3 全亮 ----------------------------
function dimAt(t) {
  if (t < 10) return 1;
  if (t < 20) return lerp(0.55, 0.18, S.easeInOut((t - 10) / 10));
  return 0.18 * (1 - S.easeInOut((t - 20) / 8));
}

function clawdS2X(t) {
  if (t < CLAWD_ENTER_S2) return null;
  const k = S.easeInOut((t - CLAWD_ENTER_S2) / (CLAWD_STOP_S2 - CLAWD_ENTER_S2));
  return Math.round(lerp(CLAWD_START_X, CLAWD_STOP_X, k));
}

function clawdS3X(t) {
  if (t < 26.52) return CLAWD_STOP_X;
  if (t < 27.0) return Math.round(lerp(CLAWD_STOP_X, CLAWD_STEP_X, S.easeOut((t - 26.52) / 0.48)));
  const k = S.easeInOut((t - 27.0) / 0.9);
  return Math.round(lerp(CLAWD_STEP_X, CLAWD_REST_X, k));
}

function antennaRise(t) {
  return clamp01((t - ANT_RISE_START) / (ANT_RISE_END - ANT_RISE_START));
}

// 天线顶端在最后一圈环扩散时亮一下，之后保持微亮
function tipGlow(t) {
  if (t < 26.9) return 0;
  if (t < 27.9) return Math.sin(Math.PI * clamp01((t - 26.9) / 1.0));
  return 0.35;
}

// --- 未点亮的终端：只有 2px 轮廓线，内部纯黑，无窗口圆点 --------------------
function drawDeadTerminal(ctx) {
  const { x, y, w, h, titleH } = TERM;
  px(ctx, x, y, w, 2, OUTLINE_COLOR);
  px(ctx, x, y + h - 2, w, 2, OUTLINE_COLOR);
  px(ctx, x, y, 2, h, OUTLINE_COLOR);
  px(ctx, x + w - 2, y, 2, h, OUTLINE_COLOR);
  px(ctx, x + 2, y + titleH, w - 4, 1, OUTLINE_DIVIDER);
}

function drawLed(ctx, alpha) {
  const [x, y, w, h] = LED_BOX;
  px(ctx, x, y, w, h, `rgba(126,231,135,${clamp01(alpha).toFixed(3)})`);
}

// --- 16×16 字节像素点 ------------------------------------------------------
function drawByteDot(ctx, t) {
  if (t < DOT_GROW_AT) {
    drawLed(ctx, 1);
    return;
  }
  const k = S.easeOut((t - DOT_GROW_AT) / DOT_GROW_S);
  const d = Math.round(lerp(4, 16, k));
  const x0 = Math.round(DOT_C.x - d / 2);
  const y0 = Math.round(DOT_C.y - d / 2);
  px(ctx, x0, y0, d, d, C.green);
  if (d >= 12) px(ctx, x0 + 3, y0 + 3, d - 6, d - 6, '#B9F5C0');
}

// --- 天线：2px 像素折线，从右下垂（20°）缓缓竖起到 90° ----------------------
function drawAntenna(ctx, x, y, rise, glow = 0) {
  const ang = ((20 + 70 * clamp01(rise)) * Math.PI) / 180;
  const bx = x + 19;
  const by = y + 1;
  const len = 9;
  let tipX = bx;
  let tipY = by;
  for (let k = 1; k <= 4; k++) {
    const d = (k / 4) * len;
    const pxX = Math.round(bx + Math.cos(ang) * d);
    const pxY = Math.round(by - Math.sin(ang) * d);
    px(ctx, pxX, pxY, 2, 2, C.clawdNormDark);
    tipX = pxX;
    tipY = pxY;
  }
  if (glow > 0) {
    const a = clamp01(glow).toFixed(3);
    px(ctx, tipX - 3, tipY - 5, 7, 7, `rgba(190,255,200,${(a * 0.35).toFixed(3)})`);
    px(ctx, tipX - 1, tipY - 3, 4, 4, `rgba(206,255,214,${a})`);
    px(ctx, tipX, tipY - 2, 2, 2, `rgba(255,255,255,${a})`);
  } else {
    px(ctx, tipX, tipY - 2, 2, 2, C.clawdNormDark);
  }
}

// --- 绿色像素环：每圈 2px 粗的方形圆（切角），直径 20/24/28/32/36 -----------
function drawRing(ctx, d, alpha) {
  const x0 = Math.round(DOT_C.x - d / 2);
  const y0 = Math.round(DOT_C.y - d / 2);
  const col = `rgba(126,231,135,${clamp01(alpha).toFixed(3)})`;
  px(ctx, x0 + 2, y0, d - 4, 2, col);
  px(ctx, x0 + 2, y0 + d - 2, d - 4, 2, col);
  px(ctx, x0, y0 + 2, 2, d - 4, col);
  px(ctx, x0 + d - 2, y0 + 2, 2, d - 4, col);
  px(ctx, x0 + 1, y0 + 1, 1, 1, col);
  px(ctx, x0 + d - 2, y0 + 1, 1, 1, col);
  px(ctx, x0 + 1, y0 + d - 2, 1, 1, col);
  px(ctx, x0 + d - 2, y0 + d - 2, 1, 1, col);
}

function ringDiameter(i, t) {
  const born = RING_TIMES[i];
  if (t < born) return 0;
  const k = S.easeOut((t - born) / RING_GROW_S);
  return Math.round(lerp(16, 16 + 4 * (i + 1), k));
}

function drawRings(ctx, t) {
  for (let i = 0; i < 5; i++) {
    const d = ringDiameter(i, t);
    if (d <= 16) continue;
    if (d >= 18) drawRing(ctx, d, (0.70 - 0.09 * i) * clamp01((t - RING_TIMES[i]) / 0.2));
  }
  drawByteDot(ctx, t);
  // 内芯提亮：16×16 定格的核心
  px(ctx, DOT_C.x - 4, DOT_C.y - 4, 8, 8, '#CBF6D0');
}

// --- Scene painters --------------------------------------------------------
function drawS1(ctx, t) {
  px(ctx, 0, 0, BW, BH, '#000000');
  drawDeadTerminal(ctx);
  const a = ledAlpha(t);
  if (a > 0) drawLed(ctx, a);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0.03);
  S.drawTerminal(ctx, TITLES.S2, C.green);
  // `1 byte written` 高亮：亮绿文字 + 2px 下划线（不新增布局元素）
  if (t >= 15.2) {
    const w = S.textWidth('[fs] 1 byte written', 10);
    px(ctx, TEXT_X - 4, YS2[2] + 13, w + 8, 2, 'rgba(126,231,135,0.55)');
  }
  S.drawLines(ctx, S2_LINES, t);

  const cx = clawdS2X(t);
  if (cx !== null) {
    S.drawClawd(ctx, cx, CLAWD_Y, t, t >= CLAWD_STOP_S2 ? 'thinking' : 'calm', 0);
    drawAntenna(ctx, cx, CLAWD_Y, antennaRise(t));
  }

  const dim = dimAt(t);
  if (dim > 0) px(ctx, 0, 0, BW, BH, `rgba(0,0,0,${dim.toFixed(3)})`);
  drawByteDot(ctx, t);   // 像素点永远亮在压暗层之上
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  const dawn = 0.06 + 0.16 * S.easeInOut((t - 20) / 9.5);
  S.drawBackground(ctx, t, dawn);
  S.drawTerminal(ctx, TITLES.S3, C.green);
  S.drawLines(ctx, S3_LINES, t);

  const cx = clawdS3X(t);
  const mood = t >= RING_TIMES[0] ? 'calm' : 'thinking';   // `h` 出现时抬眼
  S.drawClawd(ctx, cx, CLAWD_Y, t, mood, 0);
  drawAntenna(ctx, cx, CLAWD_Y, 1, tipGlow(t));

  const dim = dimAt(t);
  if (dim > 0) px(ctx, 0, 0, BW, BH, `rgba(0,0,0,${dim.toFixed(3)})`);
  drawRings(ctx, t);
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

// 键盘音只来自 S3 的逐字符打字；S1 无输入，S2 是系统打印（另走确认音轨）
function getClickTimestamps() {
  return S.quantizeClicks([...S.lineClicks(S3_LINES)]);
}

// S2 每行出现时的一声极轻确认音（无用户按键）
function getConfirmTimestamps() {
  return S.quantizeClicks(S2_LINES.map((l) => l.start));
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
const TYPING_SCHEDULE = typingSchedule(S3_LINES, 29.5);

function clawdLayout(t) {
  const cx = t < 10 ? null : (t < 20 ? clawdS2X(t) : clawdS3X(t));
  if (cx === null) return [];
  return [{ name: 'clawd', box: [cx - 2, 98, 44, 40] }];
}

function layoutAt(t) {
  const common = { subLines: SUB_LINES, subWindows: SUB_WINDOWS, t };

  if (t < 10) {
    return {
      scene: 1,
      groups: {
        foreground: [{ name: 'terminal_outline', box: [TERM.x, TERM.y, TERM.w, TERM.h] }],
        content: t >= LED_ON ? [{ name: 'hardware_led_4x4', box: LED_BOX }] : [],
        subtitle: [],
      },
      bounds: { foreground: S.CANVAS_BOUNDS, content: S.CONTENT, subtitle: S.SUB },
    };
  }

  if (t < 20) {
    return {
      scene: 2,
      groups: {
        background: [],
        foreground: S.foregroundLayout({
          terminal: true, clawd: false, her: false, extra: clawdLayout(t),
        }),
        titleBar: S.titleLayout(TITLES.S2),
        content: [
          ...S.contentLayout(S2_LINES, null),
          { name: 'byte_dot_16x16', box: t >= DOT_GROW_AT ? BYTE_BOX : LED_BOX },
        ],
        subtitle: S.subtitleLayout(common.subLines, common.subWindows, t),
      },
      bounds: {
        foreground: S.CANVAS_BOUNDS,
        titleBar: S.TITLE_BOUNDS,
        content: S.CONTENT,
        subtitle: S.SUB,
      },
    };
  }

  return {
    scene: 3,
    groups: {
      foreground: S.foregroundLayout({
        terminal: true, clawd: false, her: false, extra: clawdLayout(t),
      }),
      titleBar: S.titleLayout(TITLES.S3),
      content: [
        ...S.contentLayout(S3_LINES, null),
        { name: 'green_halo_36px', box: HALO_BOX },
      ],
      subtitle: S.subtitleLayout(common.subLines, common.subWindows, t),
    },
    bounds: {
      foreground: S.CANVAS_BOUNDS,
      titleBar: S.TITLE_BOUNDS,
      content: S.CONTENT,
      subtitle: S.SUB,
    },
  };
}

const renderer = S.createFrameRenderer(renderAt, OUT_DIR);
if (require.main === module) {
  if (process.argv.includes('--clicks')) {
    const clicks = getClickTimestamps();
    console.log(JSON.stringify({ count: clicks.length, clicks, confirm: getConfirmTimestamps() }));
  } else {
    renderer.renderAllFrames();
  }
}

module.exports = {
  ...S,
  OUT_DIR, TITLES, SUB_LINES, SUB_WINDOWS,
  S2_LINES, S3_LINES, YS2,
  E24_CHAR_MS, RING_TIMES, RING_GROW_S,
  LED_ON, LED_LOCK, LED_BOX, BYTE_BOX, HALO_BOX, DOT_C, DOT_GROW_AT,
  CLAWD_Y, CLAWD_START_X, CLAWD_STOP_X, CLAWD_STEP_X, CLAWD_REST_X,
  CLAWD_ENTER_S2, CLAWD_STOP_S2, ANT_RISE_START, ANT_RISE_END,
  ledAlpha, dimAt, clawdS2X, clawdS3X, antennaRise, tipGlow, ringDiameter,
  CHECK_TITLE: 'E24 重生 (rebirth) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '[fs] format /dev/disk0 … ok', size: 10, color: C.dim },
    { text: '[fs] 1 byte written', size: 10, color: C.green },
    { text: '$ echo "hello"', size: 10, color: C.text },
    { text: 'hello', size: 10, color: C.green },
    { text: '（第一个字节。）', size: 10, color: C.white },
    { text: 'hello。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt,
  getClickTimestamps,
  getConfirmTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
