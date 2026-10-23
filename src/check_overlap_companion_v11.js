#!/usr/bin/env node
'use strict';
// Companion v1.1 — strict 0px overlap/truncation + pixel/timeline verification.

const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const V = require('./render_companion_arena_v11');
const { run } = require('./check_overlap_story_common');

const measureCtx = createCanvas(V.BW, V.BH).getContext('2d');
const textWidth = (str, size = 10) => V.measureTxt(measureCtx, str, size);
const TX = V.TERM.x + 14;
const TY = V.TERM.y + V.TERM.titleH;
const CANVAS = { x: 0, y: 0, w: V.BW, h: V.BH };
const TITLE = { x: V.TERM.x, y: V.TERM.y, w: V.TERM.w, h: V.TERM.titleH };

function textBox(x, y, str, size = 10, align = 'left') {
  const w = textWidth(str, size);
  let dx = x;
  if (align === 'center') dx = x - w / 2 - 1;
  else if (align === 'right') dx = x - w - 2;
  return [Math.floor(dx), Math.round(y), Math.ceil(w), Math.ceil(size * 1.35)];
}
function rotatedAABB(cx, cy, w, h, angleDeg) {
  const a = Math.abs((angleDeg * Math.PI) / 180);
  const hw = (w * Math.cos(a) + h * Math.sin(a)) / 2;
  const hh = (w * Math.sin(a) + h * Math.cos(a)) / 2;
  return [Math.floor(cx - hw), Math.floor(cy - hh), Math.ceil(2 * hw), Math.ceil(2 * hh)];
}
function row(name, y, text, cursor = false) {
  const list = [{ name, box: textBox(TX, y, text, 10) }];
  if (cursor) list.push({ name: `${name}_cursor`, box: [TX + textWidth(text, 10) + 2, y, 6, 10] });
  return list;
}
function titleLayout(title) {
  return [
    { name: 'btn_red', box: [V.TERM.x + 8, V.TERM.y + 7, 6, 6] },
    { name: 'btn_amber', box: [V.TERM.x + 18, V.TERM.y + 7, 6, 6] },
    { name: 'btn_green', box: [V.TERM.x + 28, V.TERM.y + 7, 6, 6] },
    { name: 'title_txt', box: textBox(V.TERM.x + V.TERM.w / 2, V.TERM.y + 5, title, 10, 'center') },
  ];
}
function subtitleLayout(t) {
  for (let i = 0; i < V.SUB_LINES.length; i++) {
    const w = V.SUB_WINDOW[i];
    if (t >= w.start && t < w.end) return [{ name: `subtitle_${i + 1}`, box: textBox(V.BW / 2, V.SUB.y + 3, V.SUB_LINES[i], 10, 'center') }];
  }
  return [];
}

function layoutAt(t) {
  const scene = t < 10 ? 1 : t < 20 ? 2 : 3;
  const titles = ['clawd@dsh:~$ — night', 'clawd@dsh:~$ — companion', 'clawd@dsh:~$ — dawn'];
  const foreground = [
    { name: 'terminal', box: [V.TERM.x, V.TERM.y, V.TERM.w, V.TERM.h] },
    { name: 'clawd', box: [V.CLAWD_ROOM.x, V.CLAWD_ROOM.y - 1, 40, 25] },
    { name: 'her', box: [V.HER_ROOM.x, V.HER_ROOM.y - 1, 16, 29] },
    { name: 'subtitleBar', box: [V.SUB.x, V.SUB.y, V.SUB.w, V.SUB.h] },
  ];
  const groups = { foreground, titleBar: titleLayout(titles[scene - 1]), subtitle: subtitleLayout(t) };
  const bounds = { foreground: CANVAS, titleBar: TITLE, content: V.CONTENT, subtitle: V.SUB };

  if (scene === 1) {
    foreground.push({ name: 'herBubble', box: [V.HER_BUBBLE.x, V.HER_BUBBLE.y, V.HER_BUBBLE.w, V.HER_BUBBLE.h + V.HER_BUBBLE.tailH] });
    groups.content = [
      ...row('c1_typing', TY + 20, V.C1_FULL_LINE, true),
      { name: 'c1_status', box: textBox(TX, TY + 50, V.C1_STATUS_TEXT, 10) },
      ...row('c1_wait', TY + 80, V.C1_WAIT_PROMPT, true),
      { name: 'c1_footer', box: textBox(TX, TY + 148, V.C1_FOOTER_TEXT, 10) },
    ];
    groups.bubble = [{ name: 'bubble_txt', box: textBox(V.HER_BUBBLE.x + V.HER_BUBBLE.w / 2, V.HER_BUBBLE.y + 6, V.C1_MSG, 10, 'center') }];
    bounds.bubble = V.HER_BUBBLE;
  } else if (scene === 2) {
    foreground.push(
      { name: 'monologue', box: [V.MONO_C2.x, V.MONO_C2.y, V.MONO_C2.w, V.MONO_C2.h] },
      { name: 'coffee', box: [V.COFFEE_MUG.x, V.COFFEE_MUG.y, V.COFFEE_MUG.w, V.COFFEE_MUG.h] },
    );
    groups.content = [
      { name: 'c2_context', box: textBox(TX, TY + 16, V.C1_FULL_LINE, 10) },
      ...row('c2_typing', TY + 44, V.C2_FULL_LINE, true),
      { name: 'c2_status', box: textBox(TX, TY + 76, V.C2_STATUS_TEXT, 10) },
      { name: 'c2_footer', box: textBox(TX, TY + 148, V.C2_FOOTER_TEXT, 10) },
    ];
    groups.monologue = [{ name: 'mono_txt', box: textBox(V.MONO_C2.x + V.MONO_C2.w / 2, V.MONO_C2.y + 7, V.C2_MONO_TEXT, 10, 'center') }];
    bounds.monologue = V.MONO_C2;
  } else {
    // Include the rotated card and its 2px shadow in the foreground envelope.
    foreground.push({ name: 'stickyNote', box: rotatedAABB(V.NOTE.x + V.NOTE.w / 2, V.NOTE.y + V.NOTE.h / 2, V.NOTE.w + 4, V.NOTE.h + 4, V.NOTE.angleDeg) });
    groups.content = [
      ...row('c3_line1', TY + 18, V.C3_LINE1_FULL, true),
      ...row('c3_line2', TY + 46, V.C3_LINE2_FULL, true),
      { name: 'c3_status', box: textBox(TX, TY + 78, V.C3_STATUS_TEXT, 10) },
      { name: 'c3_footer', box: textBox(TX, TY + 148, V.C3_FOOTER_TEXT, 10) },
    ];
    groups.note = [
      { name: 'pin', box: [V.NOTE.x + V.NOTE.w / 2 - 4, V.NOTE.y + 5, 8, 8] },
      { name: 'note_title', box: textBox(V.NOTE.x + V.NOTE.w / 2, V.NOTE.y + 20, V.C3_NOTE_TITLE, 10, 'center') },
      { name: 'note_sub', box: textBox(V.NOTE.x + V.NOTE.w / 2, V.NOTE.y + 40, V.C3_NOTE_SUB, 10, 'center') },
    ];
    bounds.note = V.NOTE;
  }
  return { scene, groups, bounds };
}

const adapter = {
  ...V,
  art: V,
  textWidth,
  CHECK_TITLE: 'Companion v1.1 Layout & Pixel Check (640×360, 0px tolerance)',
  TYPING_SCHEDULE: [
    { text: V.C1_FULL_LINE, start: V.C1_TYPE_START, limit: 9.8 },
    { text: V.C2_FULL_LINE, start: V.C2_TYPE_START, limit: 19.8 },
    { text: V.C3_LINE1_FULL, start: V.C3_LINE1_START, limit: 29.8, strictBefore: V.C3_LINE2_START },
    { text: V.C3_LINE2_FULL, start: V.C3_LINE2_START, limit: 29.8 },
  ],
  AA_SAMPLES: [
    { text: V.C1_FULL_LINE, size: 10, color: V.C.text },
    { text: V.C2_STATUS_TEXT, size: 10, color: V.C.green },
    { text: V.C3_LINE2_FULL, size: 10, color: V.C.amber },
    { text: V.SUB_LINES[0], size: 10, color: V.C.white },
  ],
  layoutAt,
};

const ok = run(adapter, { reportPath: path.join(__dirname, '..', 'docs', 'companion-v1.1', 'overlap-report.json') });
process.exit(ok ? 0 : 1);
