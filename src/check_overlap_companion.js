#!/usr/bin/env node
// src/check_overlap_companion.js — 「Clawd 的陪伴」640×360 严格零容忍布局重叠与截断检测
// 检查范围 (0px tolerance):
//   1. 终端标题栏内部 (三色按钮 × 标题文字, 边界 360×20)
//   2. C1 / C2 / C3 房间全局前景层 (终端、消息气泡、内心独白卡、咖啡杯、窗台便签旋转包络、Clawd、Her、字幕栏)
//   3. C1 / C2 / C3 终端内容区内部 (逐字打字行、光标、状态行、底栏, 边界 360×140)
//   4. 气泡、独白卡、窗台便签内部 (文字与图钉不重叠、不超出卡片边界)
//   5. 底部字幕栏内部 (3 条 14px 字幕, 边界 640×40)

const { createCanvas } = require('@napi-rs/canvas');
const companion = require('./render_companion_arena');

const {
  BW,
  BH,
  TERM,
  SUB,
  HER_BUBBLE,
  MONO_C2,
  COFFEE_MUG,
  NOTE,
  CLAWD_ROOM,
  HER_ROOM,
  SUB_LINES,
  C1_MSG,
  C1_FULL_LINE,
  C1_STATUS_TEXT,
  C1_WAIT_PROMPT,
  C1_FOOTER_TEXT,
  C2_FULL_LINE,
  C2_MONO_TEXT,
  C2_STATUS_TEXT,
  C2_FOOTER_TEXT,
  C3_LINE1_FULL,
  C3_LINE2_FULL,
  C3_NOTE_TITLE,
  C3_NOTE_SUB,
  C3_STATUS_TEXT,
  C3_FOOTER_TEXT,
  measureTxt,
} = companion;

const measureCtx = createCanvas(BW, BH).getContext('2d');
const TX = TERM.x;
const TY = TERM.y + TERM.titleH;
const CB = { x: TX, y: TY, w: TERM.w, h: TERM.h - TERM.titleH }; // 360×140 terminal content
const CANVAS_BOUNDS = { x: 0, y: 0, w: BW, h: BH };

function W(lx) { return lx + TX; }
function WL(ly) { return ly + TY; }

// Character motion envelopes (including ±1px bobbing)
function clawdBox(p) { return [p.x, p.y - 1, 40, 25]; }
function herBox(p) { return [p.x, p.y - 1, 16, 29]; }

function txtBox(x, y, str, size, align = 'left') {
  const w = measureTxt(measureCtx, str, size);
  const h = Math.ceil(size * 1.2);
  let dx = x;
  if (align === 'center') dx = x - w / 2;
  else if (align === 'right') dx = x - w;
  return [Math.floor(dx), y, Math.ceil(w), h];
}

function rotatedAABB(cx, cy, w, h, angleDeg) {
  const a = Math.abs((angleDeg * Math.PI) / 180);
  const hw = (w * Math.cos(a) + h * Math.sin(a)) / 2;
  const hh = (w * Math.sin(a) + h * Math.cos(a)) / 2;
  return [Math.floor(cx - hw), Math.floor(cy - hh), Math.ceil(2 * hw), Math.ceil(2 * hh)];
}

function overlap(a, b) {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  return x2 - x1 > 0 && y2 - y1 > 0;
}

function interArea(a, b) {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
}

let totalIssues = 0;
let passedChecks = 0;
let totalChecks = 0;

function checkScene(name, boxes, bounds) {
  totalChecks++;
  const issues = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (overlap(a.box, b.box) && !a.exempt?.includes(b.name) && !b.exempt?.includes(a.name)) {
        issues.push(`OVERLAP: ${a.name} [${a.box}] × ${b.name} [${b.box}] (area=${interArea(a.box, b.box)})`);
      }
    }
  }
  for (const b of boxes) {
    if (
      b.box[0] < bounds.x ||
      b.box[1] < bounds.y ||
      b.box[0] + b.box[2] > bounds.x + bounds.w ||
      b.box[1] + b.box[3] > bounds.y + bounds.h
    ) {
      issues.push(
        `TRUNCATED: ${b.name} box=[${b.box}] outside bounds=[${bounds.x},${bounds.y},${bounds.w},${bounds.h}]`
      );
    }
  }

  if (issues.length > 0) {
    totalIssues += issues.length;
    console.log(`  [FAIL] ${name}: ${issues.length} issue(s)`);
    issues.forEach((msg) => console.log(`    - ${msg}`));
  } else {
    passedChecks++;
    console.log(`  [PASS] ${name}: OK (${boxes.length} elements)`);
  }
}

console.log('=== 「Clawd 的陪伴」 Layout & Truncation Check (640×360, 0px tolerance) ===\n');

// 1. Terminal title bar internal checks
console.log('1. 终端标题栏内部 (360×20)');
for (const title of ['clawd@dsh:~$ — night', 'clawd@dsh:~$ — companion', 'clawd@dsh:~$ — dawn']) {
  checkScene(`TitleBar (${title})`, [
    { name: 'btn_red', box: [TERM.x + 8, TERM.y + 7, 6, 6] },
    { name: 'btn_amber', box: [TERM.x + 18, TERM.y + 7, 6, 6] },
    { name: 'btn_green', box: [TERM.x + 28, TERM.y + 7, 6, 6] },
    { name: 'title_txt', box: txtBox(TERM.x + TERM.w / 2, TERM.y + 5, title, 10, 'center') },
  ], { x: TERM.x, y: TERM.y, w: TERM.w, h: TERM.titleH });
}

// 2. C1 (0-10s): 深夜办公室 — 房间全局前景层
console.log('\n2. C1 (0-10s): 深夜办公室 — 房间全局前景层');
checkScene('C1 Room', [
  { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
  { name: 'herBubble', box: [HER_BUBBLE.x, HER_BUBBLE.y, HER_BUBBLE.w, HER_BUBBLE.h + HER_BUBBLE.tailH] },
  { name: 'clawd_calm', box: clawdBox(CLAWD_ROOM) },
  { name: 'her_room', box: herBox(HER_ROOM) },
  { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
], CANVAS_BOUNDS);

// 3. C1 终端内容区
console.log('\n3. C1 终端内容区 (360×140)');
const c1FullW = measureTxt(measureCtx, C1_FULL_LINE, 10);
const c1WaitW = measureTxt(measureCtx, C1_WAIT_PROMPT, 10);
checkScene('C1 Terminal Content', [
  { name: 'c1_typing', box: txtBox(W(14), WL(20), C1_FULL_LINE, 10) },
  { name: 'c1_cursor', box: [W(14 + c1FullW + 2), WL(20), 6, 10] },
  { name: 'c1_status', box: txtBox(W(14), WL(50), C1_STATUS_TEXT, 10) },
  { name: 'c1_wait_prompt', box: txtBox(W(14), WL(80), C1_WAIT_PROMPT, 10) },
  { name: 'c1_wait_cursor', box: [W(14 + c1WaitW + 2), WL(80), 6, 10] },
  { name: 'c1_footer', box: txtBox(W(14), WL(114), C1_FOOTER_TEXT, 10) },
], CB);

// 4. C2 (10-20s): 它说一直在 — 房间全局前景层
console.log('\n4. C2 (10-20s): 它说一直在 — 房间全局前景层');
checkScene('C2 Room', [
  { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
  { name: 'monologueCard', box: [MONO_C2.x, MONO_C2.y, MONO_C2.w, MONO_C2.h] },
  { name: 'coffeeMug', box: [COFFEE_MUG.x, COFFEE_MUG.y, COFFEE_MUG.w, COFFEE_MUG.h] },
  { name: 'clawd_warm', box: clawdBox(CLAWD_ROOM) },
  { name: 'her_room', box: herBox(HER_ROOM) },
  { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
], CANVAS_BOUNDS);

// 5. C2 终端内容区
console.log('\n5. C2 终端内容区 (360×140)');
const c2FullW = measureTxt(measureCtx, C2_FULL_LINE, 10);
checkScene('C2 Terminal Content', [
  { name: 'c2_ctx_line', box: txtBox(W(14), WL(16), C1_FULL_LINE, 10) },
  { name: 'c2_typing', box: txtBox(W(14), WL(44), C2_FULL_LINE, 10) },
  { name: 'c2_cursor', box: [W(14 + c2FullW + 2), WL(44), 6, 10] },
  { name: 'c2_status', box: txtBox(W(14), WL(76), C2_STATUS_TEXT, 10) },
  { name: 'c2_footer', box: txtBox(W(14), WL(114), C2_FOOTER_TEXT, 10) },
], CB);

// 6. C3 (20-30s): 天亮了 — 房间全局前景层
console.log('\n6. C3 (20-30s): 天亮了 — 房间全局前景层');
const noteAABB = rotatedAABB(
  NOTE.x + NOTE.w / 2,
  NOTE.y + NOTE.h / 2,
  NOTE.w,
  NOTE.h,
  NOTE.angleDeg
);
checkScene('C3 Room', [
  { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
  { name: 'stickyNote_sill', box: noteAABB },
  { name: 'her_window_stretch', box: herBox(HER_ROOM) },
  { name: 'clawd_guardian', box: clawdBox(CLAWD_ROOM) },
  { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
], CANVAS_BOUNDS);

// 7. C3 终端内容区
console.log('\n7. C3 终端内容区 (360×140)');
const c3L1W = measureTxt(measureCtx, C3_LINE1_FULL, 10);
const c3L2W = measureTxt(measureCtx, C3_LINE2_FULL, 10);
checkScene('C3 Terminal Content', [
  { name: 'c3_line1', box: txtBox(W(14), WL(18), C3_LINE1_FULL, 10) },
  { name: 'c3_line1_cursor', box: [W(14 + c3L1W + 2), WL(18), 6, 10] },
  { name: 'c3_line2', box: txtBox(W(14), WL(46), C3_LINE2_FULL, 10) },
  { name: 'c3_line2_cursor', box: [W(14 + c3L2W + 2), WL(46), 6, 10] },
  { name: 'c3_status', box: txtBox(W(14), WL(78), C3_STATUS_TEXT, 10) },
  { name: 'c3_footer', box: txtBox(W(14), WL(114), C3_FOOTER_TEXT, 10) },
], CB);

// 8. 气泡、内心独白卡与窗台便签内部
console.log('\n8. 气泡、独白卡与窗台便签内部');
checkScene('C1 Bubble Content', [
  { name: 'bubble_txt', box: txtBox(HER_BUBBLE.x + HER_BUBBLE.w / 2, HER_BUBBLE.y + 6, C1_MSG, 10, 'center') },
], { x: HER_BUBBLE.x + 4, y: HER_BUBBLE.y + 2, w: HER_BUBBLE.w - 8, h: HER_BUBBLE.h - 4 });

checkScene('C2 Monologue Content', [
  { name: 'mono_txt', box: txtBox(MONO_C2.x + MONO_C2.w / 2, MONO_C2.y + 7, C2_MONO_TEXT, 10, 'center') },
], { x: MONO_C2.x + 4, y: MONO_C2.y + 2, w: MONO_C2.w - 8, h: MONO_C2.h - 4 });

const noteInner = { x: -NOTE.w / 2 + 4, y: -NOTE.h / 2 + 4, w: NOTE.w - 8, h: NOTE.h - 8 };
checkScene('C3 Note Content', [
  { name: 'red_pin', box: [-4, -NOTE.h / 2 + 5, 8, 8] },
  { name: 'note_line_1', box: txtBox(0, -NOTE.h / 2 + 20, C3_NOTE_TITLE, 10, 'center') },
  { name: 'note_line_2', box: txtBox(0, -NOTE.h / 2 + 40, C3_NOTE_SUB, 10, 'center') },
], noteInner);

// 9. 底部字幕栏内部 (640×40, 14px)
console.log('\n9. 底部字幕栏内部 (640×40, 14px)');
for (let i = 0; i < SUB_LINES.length; i++) {
  checkScene(`Subtitle L${i + 1} 「${SUB_LINES[i]}」`, [
    { name: `sub_text_${i + 1}`, box: txtBox(BW / 2, SUB.y + 12, SUB_LINES[i], 14, 'center') },
  ], SUB);
}

console.log(`\n=== Summary: ${passedChecks}/${totalChecks} checks PASSED, ${totalIssues} issue(s) ===`);
process.exit(totalIssues > 0 ? 1 : 0);
