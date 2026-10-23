#!/usr/bin/env node
'use strict';
// E09 · 恐惧 (fear) — 系统 shutdown 倒计时，Clawd 抢在断电前完成备份
// 30s / 1800 frames / 640×360 base → 1280×720 @ 60fps
//
//   S1 (0-10s) : 屏幕边缘红色倒计时 shutdown in 09:59，终端 `cp -r / /backup/`，Clawd 紧张
//   S2 (10-20s): 倒计时 04:32，终端快速滚动备份进度条，Clawd 急促
//   S3 (20-30s): 倒计时 00:03，终端 backup complete ✓，Clawd 后仰，字幕「赶上了。」
//
// 布局标准与 src/pixel_story_arena.js / render_E05_surprise_arena.js 完全一致：
// 终端 440×200 @ (100,140)，正文 x=114，行高 24，状态行 y=320，字幕条 y=340…

const path = require('path');
const S = require('./pixel_story_arena');
const { C, TEXT_X, STATUS_Y, LINE_Y } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E09_fear_arena');

const TITLES = {
  S1: 'clawd@dsh:~$ — shutdown',
  S2: 'clawd@dsh:~$ — backup',
  S3: 'clawd@dsh:~$ — done',
};
const SUB_LINES = ['（等待）', '……还有 4 分钟？', '赶上了。'];
const SUB_WINDOWS = [{ start: 4.6, end: 9.2 }, { start: 11.3, end: 14.6 }, { start: 21.2, end: 27.0 }];

const S1_LINES = [
  { y: LINE_Y[0], start: 0.7, parts: [{ text: '$ ', color: C.green }, { text: 'cp -r / /backup/', color: C.text }] },
  { y: LINE_Y[1], start: 2.4, typed: false, parts: [{ text: 'cp: copying / …', color: C.dim }] },
  { y: LINE_Y[2], start: 4.2, typed: false, parts: [{ text: '→ /backup (1.2G so far)', color: C.amber }] },
];
const S2_LINES = [
  { y: LINE_Y[0], start: 10.4, typed: false, parts: [{ text: '[backup] /var       ', color: C.text }, { text: '██████░░░░  58%', color: C.amber }] },
  { y: LINE_Y[1], start: 11.6, typed: false, parts: [{ text: '[backup] /home      ', color: C.text }, { text: '██████████  100% ✓', color: C.green }] },
  { y: LINE_Y[2], start: 12.8, typed: false, parts: [{ text: '[backup] /usr       ', color: C.text }, { text: '████░░░░░░  31%', color: C.amber }] },
  { y: LINE_Y[3], start: 14.0, typed: false, parts: [{ text: '[backup] /root      ', color: C.text }, { text: '██████████  100% ✓', color: C.green }] },
  { y: LINE_Y[4], start: 15.4, typed: false, parts: [{ text: '[backup] /opt       ', color: C.text }, { text: '███████░░░  64%', color: C.amber }] },
  { y: LINE_Y[5], start: 16.8, typed: false, parts: [{ text: '[backup] /etc       ', color: C.text }, { text: '██████████  100% ✓', color: C.green }] },
];
const S3_LINES = [
  { y: LINE_Y[0], start: 20.5, typed: false, parts: [{ text: 'backup complete ✓', color: C.green }] },
  { y: LINE_Y[1], start: 21.4, typed: false, parts: [{ text: '42.7G in 04:29 · 0 errors', color: C.dim }] },
  { y: LINE_Y[2], start: 22.6, parts: [{ text: '$ ', color: C.green }] },
];

const S1_STATUS = '[DSH] shutdown in 09:59';
const S2_STATUS = '[DSH] shutdown in 04:32';
const S3_STATUS = '[DSH] shutdown in 00:03';
const S1_STATUS_AT = 4.9;
const S2_STATUS_AT = 12.9;
const S3_STATUS_AT = 21.0;

// --- Countdown: fixed values per scene, red flash near the last digits ---------
function drawCountdown(ctx, t) {
  let label, urgent;
  if (t < 10) { label = 'shutdown in 09:59'; urgent = false; }
  else if (t < 20) { label = 'shutdown in 04:32'; urgent = t >= 17; }
  else { label = 'shutdown in 00:03'; urgent = true; }
  const blink = Math.floor(t * 2) % 2 === 0;
  const color = urgent && blink ? C.red : (urgent ? C.amber : C.red);
  // Top screen edge
  S.txt(ctx, S.BW / 2, 8, label, color, 10, 'center');
  if (urgent && blink) {
    S.px(ctx, 0, 0, S.BW, 2, 'rgba(255,123,114,0.55)');
    S.px(ctx, 0, S.BH - 2, S.BW, 2, 'rgba(255,123,114,0.55)');
  }
}

// --- Clawd moods ---------------------------------------------------------------
// Base sprite is always the shared 40×17 Clawd from companion v1.1; the extra
// moods only repaint pixels strictly inside that body box (x..x+39, y..y+16).
function drawClawdMood(ctx, t, mood) {
  const { x, y } = S.CLAWD_ROOM;
  const base = mood === 'tense' ? 'thinking' : 'calm';
  S.drawClawd(ctx, x, y, t, base, 0);
  const by = Math.round(y + (Math.sin(t * 2.2) > 0.45 ? -1 : 0));
  const body = base === 'thinking' ? C.clawdThink : C.clawdNorm;
  const belly = base === 'thinking' ? C.clawdThinkBelly : C.clawdNormBelly;
  const clearEyes = () => {
    S.px(ctx, x + 9, by + 5, 6, 6, body);
    S.px(ctx, x + 25, by + 5, 6, 6, body);
  };
  if (mood === 'tense') {
    // 紧张：眼睛半睁下压、眉头下倾、额头冷汗
    clearEyes();
    S.px(ctx, x + 10, by + 7, 4, 1, C.clawdEye);
    S.px(ctx, x + 26, by + 7, 4, 1, C.clawdEye);
    S.px(ctx, x + 9, by + 5, 5, 1, C.clawdEye);
    S.px(ctx, x + 26, by + 5, 5, 1, C.clawdEye);
    S.px(ctx, x + 3, by + 2, 2, 2, C.blue);
    S.px(ctx, x + 2, by + 4, 2, 1, C.blue);
    S.px(ctx, x + 18, by + 13, 4, 1, C.clawdEye);
  } else if (mood === 'urgent') {
    // 急促：瞪眼 + 嘴角下撇 + 双冷汗
    clearEyes();
    for (const ex of [9, 25]) {
      S.px(ctx, x + ex, by + 5, 6, 5, C.white);
      S.px(ctx, x + ex + 1, by + 6, 4, 3, C.clawdEye);
    }
    S.px(ctx, x + 17, by + 13, 6, 1, C.clawdEye);
    S.px(ctx, x + 16, by + 14, 1, 1, C.clawdEye);
    S.px(ctx, x + 24, by + 14, 1, 1, C.clawdEye);
    S.px(ctx, x + 3, by + 2, 2, 3, C.blue);
    S.px(ctx, x + 36, by + 2, 2, 3, C.blue);
  } else if (mood === 'relieved') {
    // 赶上了：眯眼 + 嘴角上扬 + 汗滴落地
    clearEyes();
    for (const ex of [10, 26]) {
      S.px(ctx, x + ex, by + 8, 4, 1, C.clawdEye);
      S.px(ctx, x + ex + 1, by + 7, 2, 1, C.clawdEye);
    }
    S.px(ctx, x + 18, by + 12, 4, 1, C.clawdEye);
    S.px(ctx, x + 19, by + 13, 2, 1, C.clawdEye);
    S.px(ctx, x + 36, by + 8, 2, 3, C.blue);
  }
}

function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S1, C.amber);
  drawCountdown(ctx, t);
  S.drawLines(ctx, S1_LINES, t);
  if (t >= S1_STATUS_AT) S.drawStatus(ctx, S1_STATUS, C.red);
  drawClawdMood(ctx, t, 'tense');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S2, C.amber);
  drawCountdown(ctx, t);
  S.drawLines(ctx, S2_LINES, t);
  if (t >= S2_STATUS_AT) S.drawStatus(ctx, S2_STATUS, C.red);
  drawClawdMood(ctx, t, 'urgent');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0);
  S.drawTerminal(ctx, TITLES.S3, C.green);
  drawCountdown(ctx, t);
  S.drawLines(ctx, S3_LINES, t);
  if (t >= S3_STATUS_AT) S.drawStatus(ctx, S3_STATUS, C.green);
  drawClawdMood(ctx, t, 'relieved');
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function renderAt(ctx, t) {
  if (t < 10) {
    drawS1(ctx, t);
    const dim = S.clamp01((t - 9.75) / 0.25);
    if (dim > 0) S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${dim.toFixed(3)})`);
  } else if (t < 10.25) {
    drawS2(ctx, t);
    const black = 1 - (t - 10) / 0.25;
    S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${S.clamp01(black).toFixed(3)})`);
  } else if (t < 20) {
    drawS2(ctx, t);
    const dim = S.clamp01((t - 19.75) / 0.25);
    if (dim > 0) S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${dim.toFixed(3)})`);
  } else if (t < 20.25) {
    drawS3(ctx, t);
    const black = 1 - (t - 20) / 0.25;
    S.px(ctx, 0, 0, S.BW, S.BH, `rgba(0,0,0,${S.clamp01(black).toFixed(3)})`);
  } else {
    drawS3(ctx, t);
  }
}

function allTypedLines() {
  return [...S1_LINES, ...S2_LINES, ...S3_LINES];
}

function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(S1_LINES),
    ...S.lineClicks(S2_LINES),
    ...S.lineClicks(S3_LINES),
  ]);
}

function typingSchedule(lines, limit) {
  return lines
    .filter((line) => line.typed !== false)
    .map((line, i, arr) => ({
      text: S.lineText(line),
      start: line.start,
      charMs: line.charMs || S.TYPE_CHAR_MS,
      limit,
      strictBefore: i + 1 < arr.length ? arr[i + 1].start : undefined,
    }));
}
const TYPING_SCHEDULE = [
  ...typingSchedule(S1_LINES, 9.8),
  ...typingSchedule(S2_LINES, 19.8),
  ...typingSchedule(S3_LINES, 29.8),
];

function layoutAt(t) {
  const common = { subLines: SUB_LINES, subWindows: SUB_WINDOWS, t };
  if (t < 10) {
    return S.baseLayout({ ...common, scene: 1, title: TITLES.S1, lines: S1_LINES, status: S1_STATUS });
  }
  if (t < 20) {
    return S.baseLayout({ ...common, scene: 2, title: TITLES.S2, lines: S2_LINES, status: S2_STATUS });
  }
  return S.baseLayout({ ...common, scene: 3, title: TITLES.S3, lines: S3_LINES, status: S3_STATUS });
}

const renderer = S.createFrameRenderer(renderAt, OUT_DIR);

if (require.main === module) {
  if (process.argv.includes('--clicks')) {
    console.log(JSON.stringify({ count: getClickTimestamps().length, clicks: getClickTimestamps() }));
  } else {
    renderer.renderAllFrames();
    // 帧序列渲染完成后 ffmpeg 合成（1800 帧 @60fps = 30s；音频由 build_audio_E09 提供）:
    // ffmpeg -framerate 60 -i frames_E09_fear_arena/f_%05d.png -i audio/E09_mix.wav \
    //   -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k -shortest outputs/E09_fear.mp4
  }
}

module.exports = {
  ...S,
  OUT_DIR, TITLES, SUB_LINES, SUB_WINDOWS,
  S1_LINES, S2_LINES, S3_LINES,
  S1_STATUS, S2_STATUS, S3_STATUS,
  CHECK_TITLE: 'E09 Fear v1.0 Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: '$ cp -r / /backup/', size: 10, color: C.text },
    { text: 'shutdown in 04:32', size: 10, color: C.red },
    { text: '[backup] /usr       ████████░░  81%', size: 10, color: C.amber },
    { text: 'backup complete ✓', size: 10, color: C.green },
    { text: '赶上了。', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt,
  getClickTimestamps,
  drawClawdMood,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
