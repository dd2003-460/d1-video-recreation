#!/usr/bin/env node
// src/check_overlap_goodbye.js — 「Clawd 的告别」640×360 严格零容忍布局重叠与截断检测
// 检查范围 (0px tolerance):
//   1. 房间全局前景层 (终端、行李箱、她气泡、窗台便签旋转包络、Clawd+±1晃动包络、Her、字幕栏)
//   2. 终端内容区内部 (逐字打字行, 边界 360×140)
//   3. 底部字幕栏内部 (3 条 14px 字幕, 边界 640×40)

const { createCanvas } = require('@napi-rs/canvas');
const goodbye = require('./render_goodbye_arena');

const {
  BW,
  BH,
  TERM,
  SUB,
  SUITCASE,
  HER_BUBBLE,
  NOTE,
  CLAWD_ROOM,
  HER_ROOM,
  measureTxt,
} = goodbye;

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

console.log('=== 「Clawd 的告别」 Layout & Truncation Check (640×360, 0px tolerance) ===\n');

// Terminal title bar internal checks
console.log('1. 终端标题栏内部 (360×20)');
for (const title of ['clawd@dsh:~$ — inbox', 'clawd@dsh:~$ — draft', 'clawd@dsh:~$ — slot0']) {
  checkScene(`TitleBar (${title})`, [
    { name: 'btn_red', box: [TERM.x + 8, TERM.y + 7, 6, 6] },
    { name: 'btn_amber', box: [TERM.x + 18, TERM.y + 7, 6, 6] },
    { name: 'btn_green', box: [TERM.x + 28, TERM.y + 7, 6, 6] },
    { name: 'title_txt', box: txtBox(TERM.x + TERM.w / 2, TERM.y + 5, title, 10, 'center') },
  ], { x: TERM.x, y: TERM.y, w: TERM.w, h: TERM.titleH });
}

// Room-level checks per scene
console.log('\n2. B1 (0-10s): 她要走了 — 房间全局前景层');
checkScene('B1 Room', [
  { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
  { name: 'suitcase', box: [SUITCASE.x, SUITCASE.y, SUITCASE.w, SUITCASE.h] },
  { name: 'herBubble', box: [HER_BUBBLE.x, HER_BUBBLE.y, HER_BUBBLE.w, HER_BUBBLE.h] },
  { name: 'clawd', box: clawdBox(CLAWD_ROOM) },
  { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
], CANVAS_BOUNDS);

// B1 terminal content: single typing line at local y=18 -> global y=198
console.log('\n3. B1 终端内容区 (单行打字)');
checkScene('B1 Terminal Content', [
  { name: 'b1_typing', box: txtBox(W(14), WL(18), goodbye.B1_FULL_LINE, 10) },
], CB);

console.log('\n4. B2 (10-20s): 想说点什么 — 房间全局前景层');
checkScene('B2 Room', [
  { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
  { name: 'clawd', box: clawdBox(CLAWD_ROOM) },
  { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
], CANVAS_BOUNDS);

// B2 terminal content: line1 local y=30, line2 local y=52 -> global y=210, 232
console.log('\n5. B2 终端内容区 (两行)');
const b2Line1 = goodbye.B2_PROMPT + goodbye.B2_ECHO;
checkScene('B2 Terminal Content', [
  { name: 'b2_echo', box: txtBox(W(14), WL(30), b2Line1, 10) },
  { name: 'b2_unsent', box: txtBox(W(14), WL(52), goodbye.B2_UNSSENT, 10) },
], CB);

console.log('\n6. B3 (20-30s): slot 0 永远给你留着 — 房间全局前景层');
const noteAABB = rotatedAABB(
  NOTE.x + NOTE.w / 2,
  NOTE.y + NOTE.h / 2,
  NOTE.w,
  NOTE.h,
  NOTE.angleDeg
);
checkScene('B3 Room', [
  { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
  { name: 'stickyNote_sill', box: noteAABB },
  { name: 'her_window', box: herBox(HER_ROOM) },
  { name: 'clawd', box: clawdBox(CLAWD_ROOM) },
  { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
], CANVAS_BOUNDS);

// B3 terminal content: single line at local y=30 -> global y=210
console.log('\n7. B3 终端内容区 (单行打字)');
checkScene('B3 Terminal Content', [
  { name: 'b3_slot0', box: txtBox(W(14), WL(30), goodbye.B3_FULL_LINE, 10) },
], CB);

// Sticky note internal: text inside note bounds
console.log('\n8. 窗台便签内部');
const noteInner = { x: -NOTE.w / 2 + 4, y: -NOTE.h / 2 + 4, w: NOTE.w - 8, h: NOTE.h - 8 };
checkScene('Note Content', [
  { name: 'red_pin', box: [-4, -NOTE.h / 2 + 5, 8, 8] },
  { name: 'note_line_1', box: txtBox(0, -NOTE.h / 2 + 20, 'slot 0 ·', 10, 'center') },
  { name: 'note_line_2', box: txtBox(0, -NOTE.h / 2 + 40, '永远给你留着', 10, 'center') },
], noteInner);

// Bottom subtitle bar internal (3 lines, 14px)
console.log('\n9. 底部字幕栏内部 (640×40, 14px)');
for (let i = 0; i < goodbye.SUB_LINES.length; i++) {
  checkScene(`Subtitle L${i + 1} 「${goodbye.SUB_LINES[i]}」`, [
    { name: `sub_text_${i + 1}`, box: txtBox(BW / 2, SUB.y + 12, goodbye.SUB_LINES[i], 14, 'center') },
  ], SUB);
}

console.log(`\n=== Summary: ${passedChecks}/${totalChecks} checks PASSED, ${totalIssues} issue(s) ===`);
process.exit(totalIssues > 0 ? 1 : 0);
