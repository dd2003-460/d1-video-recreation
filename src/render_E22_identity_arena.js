#!/usr/bin/env node
'use strict';
// E22 身份 (identity) — 30s, 1800 frames @ 60fps.
// 唯一剧情事实源 (docs/episodes.md): whoami 输出了两个名字，光标在两个名字之间闪烁。
// SOP 05 v1.4.0: 640×360, SCALE=2, 440×200 terminal, Fusion Pixel, shared Clawd pixels.

const path = require('path');
const S = require('./pixel_story_arena');
const { C, LINE_Y, BW, BH, px, txt } = S;

const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E22_identity_arena');
const TITLE = 'clawd@dsh:~ — identity';
const SUB_LINES = ['两个名字。', '两个文件。两个名字。', '（还没选。）'];
const SUB_WINDOWS = [
  { start: 5.2, end: 9.5 },
  { start: 15.2, end: 19.5 },
  { start: 26.5, end: 30.0 },
];
const CLAWD_BOX = [44, 270, 40, 30];
const S3_CLAWD_BOX = [58, 270, 40, 30];

// Each terminal line is character-rendered; getClickTimestamps uses the same clock.
const S1_LINES = [
  { y: LINE_Y[0], start: 0.75, charMs: 105, cursor: false, parts: [{ text: '$ ', color: C.green }, { text: 'whoami', color: C.text }] },
  { y: LINE_Y[1], start: 2.35, charMs: 115, cursor: false, parts: [{ text: 'clawd', color: C.green }] },
  { y: LINE_Y[2], start: 4.05, charMs: 115, cursor: false, parts: [{ text: 'her', color: C.pink }] },
];
const S2_Y = [164, 184, 204, 224, 244, 264, 284, 304];
const S2_LINES = [
  { y: S2_Y[0], start: 10.35, charMs: 42, cursor: false, parts: [{ text: '$ ', color: C.green }, { text: 'ls /identity/', color: C.text }] },
  { y: S2_Y[1], start: 11.25, charMs: 48, cursor: false, parts: [{ text: 'clawd.toml  ', color: C.green }, { text: 'her.toml', color: C.pink }] },
  { y: S2_Y[2], start: 12.45, charMs: 42, cursor: false, parts: [{ text: '$ ', color: C.green }, { text: 'cat /identity/clawd.toml', color: C.text }] },
  { y: S2_Y[3], start: 13.85, charMs: 52, cursor: false, parts: [{ text: 'name = "clawd"', color: C.text }] },
  { y: S2_Y[4], start: 14.75, charMs: 52, cursor: false, parts: [{ text: 'role = "assistant"', color: C.blue }] },
  { y: S2_Y[5], start: 15.85, charMs: 42, cursor: false, parts: [{ text: '$ ', color: C.green }, { text: 'cat /identity/her.toml', color: C.text }] },
  { y: S2_Y[6], start: 17.15, charMs: 52, cursor: false, parts: [{ text: 'name = "her"', color: C.pink }] },
  { y: S2_Y[7], start: 18.00, charMs: 52, cursor: false, parts: [{ text: 'role = "unknown"', color: C.amber }] },
];
const S3_LINES = [
  { y: LINE_Y[0], start: 20.45, charMs: 58, cursor: false, parts: [{ text: '$ ', color: C.green }, { text: 'echo "who am i?"', color: C.text }] },
  { y: LINE_Y[1], start: 21.75, charMs: 65, cursor: false, parts: [{ text: 'who am i?', color: C.text }] },
  { y: LINE_Y[2], start: 23.05, charMs: 48, cursor: false, parts: [{ text: '$ ', color: C.green }, { text: 'ls /identity/', color: C.text }] },
  { y: LINE_Y[3], start: 24.15, charMs: 62, cursor: false, parts: [{ text: 'clawd.toml  her.toml', color: C.green }] },
];
const HIGHLIGHT_BOX = [112, S2_Y[7] - 2, 190, 16];
const FILES_GAP_X = S.TEXT_X + S.textWidth('clawd.toml', 10) + 2;
const END_FILES_GAP_X = S.TEXT_X + S.textWidth('clawd.toml', 10) + 2;

function drawS1Cursor(ctx, t) {
  let x = S.TEXT_X;
  let y = S1_LINES[0].y;
  let visible = false;
  if (t >= S1_LINES[0].start && t < S1_LINES[1].start + 0.5) {
    const chars = Math.min(Array.from(S.lineText(S1_LINES[0])).length,
      Math.floor(((t - S1_LINES[0].start) * 1000) / S1_LINES[0].charMs) + 1);
    x += S.textWidth(Array.from(S.lineText(S1_LINES[0])).slice(0, chars).join(''), 10) + 2;
    visible = Math.floor(t * 2.5) % 2 === 0;
  } else if (t >= 3.15 && t < 4.05) {
    x = S.TEXT_X + S.textWidth('clawd', 10) + 2;
    y = S1_LINES[1].y;
    visible = Math.floor((t - 3.15) * 5) % 2 === 0;
  } else if (t >= 4.05) {
    const typed = Math.min(3, Math.floor(((t - 4.05) * 1000) / 115) + 1);
    x = S.TEXT_X + S.textWidth('her'.slice(0, typed), 10) + 2;
    y = S1_LINES[2].y;
    visible = Math.floor(t * (t > 7 ? 5 : 2.5)) % 2 === 0;
  }
  if (visible) px(ctx, x, y, 6, 10, C.green);
}

function drawS2Cursor(ctx, t) {
  if (t < 18.8) return;
  const flip = Math.floor((t - 18.8) * 8) % 2;
  const y = S2_Y[1];
  // Rapidly alternate between the two names without choosing either one.
  px(ctx, flip ? FILES_GAP_X : FILES_GAP_X + 2, y, 6, 10, C.white);
}

function drawS3Cursor(ctx, t, finalOnly = false) {
  if (t < 24.9) return;
  const rowY = S3_LINES[3].y;
  const movement = Math.sin((t - 24.9) * (finalOnly ? 2.3 : 2.0)) * 2.5;
  px(ctx, END_FILES_GAP_X + movement, rowY, 6, 10, C.green);
}

function drawClawd(ctx, t, scene) {
  let x = S.CLAWD_ROOM.x;
  let y = S.CLAWD_ROOM.y + 18;
  if (scene === 1) {
    const stunned = t >= 4.05;
    S.drawClawd(ctx, x, y, stunned ? 0 : t, stunned ? 'thinking' : 'calm', 0);
    return;
  }
  if (scene === 2) {
    S.drawClawd(ctx, x, y, t < 17.15 ? t : 0, t >= 17.15 ? 'thinking' : 'calm', 0);
    if (t >= 17.15) {
      // Small hovering hand, stopping just short of the terminal frame.
      px(ctx, x + 40, y + 15, 8, 4, C.clawdNorm);
      px(ctx, x + 46, y + 13, 4, 3, C.clawdNormBelly);
    }
    return;
  }
  const walk = S.easeInOut((t - 26.1) / 1.0);
  x += Math.round(walk * 14);
  y = S.CLAWD_ROOM.y + 18;
  S.drawClawd(ctx, x, y, t < 26.1 ? 0 : t, 'calm', 0);
}

function drawS1(ctx, t) {
  S.drawBackground(ctx, t, 0.03);
  S.drawTerminal(ctx, TITLE, C.purple);
  S.drawLines(ctx, S1_LINES, t);
  drawS1Cursor(ctx, t);
  drawClawd(ctx, t, 1);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS2(ctx, t) {
  S.drawBackground(ctx, t, 0.02);
  S.drawTerminal(ctx, TITLE, C.purple);
  if (t >= 18.0 && t < 18.45 && Math.floor((t - 18.0) * 12) % 2 === 0) {
    px(ctx, HIGHLIGHT_BOX[0], HIGHLIGHT_BOX[1], HIGHLIGHT_BOX[2], HIGHLIGHT_BOX[3], C.white);
  }
  S.drawLines(ctx, S2_LINES, t);
  drawS2Cursor(ctx, t);
  drawClawd(ctx, t, 2);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
}

function drawS3(ctx, t) {
  S.drawBackground(ctx, t, 0.01);
  S.drawTerminal(ctx, TITLE, C.purple);
  S.drawLines(ctx, S3_LINES, t);
  drawS3Cursor(ctx, t);
  drawClawd(ctx, t, 3);
  S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);

  // End frame: preserve only the two filenames, their moving middle cursor, and Clawd's silhouette.
  if (t >= 27.0) {
    const alpha = Math.min(0.94, 0.25 + (t - 27.0) * 0.23);
    px(ctx, 0, 0, BW, BH, `rgba(3,5,8,${alpha.toFixed(3)})`);
    px(ctx, S.TERM.x + 2, S.TERM.y + 21, S.TERM.w - 4, S.TERM.h - 23, '#030508');
    txt(ctx, S.TEXT_X, S3_LINES[3].y, 'clawd.toml  her.toml', C.white, 10);
    drawS3Cursor(ctx, t, true);
    // Two small pixels reflect the paired names into the still, front-facing silhouette.
    px(ctx, S.CLAWD_ROOM.x + 23, S.CLAWD_ROOM.y + 25, 2, 2, C.green);
    px(ctx, S.CLAWD_ROOM.x + 29, S.CLAWD_ROOM.y + 25, 2, 2, C.pink);
    // Keep the required caption on top of the darkened picture, as a subtitle track.
    S.drawSubtitle(ctx, SUB_LINES, SUB_WINDOWS, t);
  }
}

const SCENES = [
  { start: 0, draw: drawS1 },
  { start: 10, draw: drawS2 },
  { start: 20, draw: drawS3 },
];
function renderAt(ctx, t) { S.renderScenes(ctx, t, SCENES); }
function getClickTimestamps() {
  return S.quantizeClicks([
    ...S.lineClicks(S1_LINES), ...S.lineClicks(S2_LINES), ...S.lineClicks(S3_LINES),
  ]);
}
function typingSchedule(lines, limit) {
  return lines.map((line, i) => ({
    text: S.lineText(line), start: line.start, charMs: line.charMs,
    limit, strictBefore: i + 1 < lines.length ? lines[i + 1].start : undefined,
  }));
}
const TYPING_SCHEDULE = [
  ...typingSchedule(S1_LINES, 9.5), ...typingSchedule(S2_LINES, 19.5),
  ...typingSchedule(S3_LINES, 29.5),
];
function layoutAt(t) {
  const scene = t < 10 ? 1 : t < 20 ? 2 : 3;
  const lines = scene === 1 ? S1_LINES : scene === 2 ? S2_LINES : S3_LINES;
  const sub = S.subtitleLayout(SUB_LINES, SUB_WINDOWS, t);
  const fg = [
    { name: 'terminal', box: [S.TERM.x, S.TERM.y, S.TERM.w, S.TERM.h] },
    { name: 'clawd', box: scene === 3 && t >= 27 ? S3_CLAWD_BOX : CLAWD_BOX },
    { name: 'subtitleBar', box: [S.SUB.x, S.SUB.y, S.SUB.w, S.SUB.h] },
  ];
  const content = [];
  lines.forEach((line, i) => {
    if (scene === 2 && i === 1 || scene === 3 && i === 3) {
      // Model the literal inter-name gap as geometry too, so its moving cursor is clear.
      content.push({ name: `row_${i + 1}_clawd`, box: S.textBox(S.TEXT_X, line.y, 'clawd.toml', 10) });
      content.push({ name: `row_${i + 1}_her`, box: S.textBox(S.TEXT_X + S.textWidth('clawd.toml  ', 10), line.y, 'her.toml', 10) });
    } else {
      content.push({ name: `row_${i + 1}`, box: S.textBox(S.TEXT_X, line.y, S.lineText(line), 10) });
    }
  });
  if (scene === 1) {
    const x = S.TEXT_X + S.textWidth('clawd', 10) + 2;
    if (t >= 3.15 && t < 4.05) content.push({ name: 'cursor_clawd', box: [x, S1_LINES[1].y, 6, 10] });
    else if (t >= 4.05) content.push({ name: 'cursor_her', box: [S.TEXT_X + S.textWidth('her', 10) + 2, S1_LINES[2].y, 6, 10] });
  } else if (scene === 2 && t >= 18.8) {
    content.push({ name: 'cursor_between_names', box: [FILES_GAP_X, S2_Y[1], 6, 10] });
  } else if (scene === 3 && t >= 24.9) {
    content.push({ name: 'cursor_between_names', box: [END_FILES_GAP_X, S3_LINES[3].y, 6, 10] });
  }
  return {
    scene,
    groups: { foreground: fg, content, subtitle: sub },
    bounds: {
      foreground: S.CANVAS_BOUNDS,
      content: S.CONTENT,
      subtitle: S.SUB,
    },
  };
}

// Keep the end-card filenames/cursor legible through the last frame; the final scene
// supplies its own intentional darkening, so do not apply the shared global fade-out.
const renderer = S.createFrameRenderer(renderAt, OUT_DIR, { fadeOut: 0 });
if (require.main === module) {
  if (process.argv.includes('--clicks')) {
    const clicks = getClickTimestamps();
    console.log(JSON.stringify({ count: clicks.length, clicks }));
  } else {
    renderer.renderAllFrames();
  }
}

module.exports = {
  ...S, OUT_DIR, TITLE, SUB_LINES, SUB_WINDOWS, S1_LINES, S2_LINES, S3_LINES,
  HIGHLIGHT_BOX, CLAWD_BOX, S3_CLAWD_BOX,
  CHECK_TITLE: 'E22 身份 (identity) Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE,
  AA_SAMPLES: [
    { text: 'whoami  clawd  her', size: 10, color: C.text },
    { text: 'role = "unknown"', size: 10, color: C.amber },
    { text: 'clawd.toml  her.toml', size: 10, color: C.green },
    { text: '（还没选。）', size: 10, color: C.white },
  ],
  sceneOf: (t) => (t < 10 ? 1 : t < 20 ? 2 : 3),
  layoutAt,
  getClickTimestamps,
  renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames: renderer.renderAllFrames,
};
