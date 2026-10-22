#!/usr/bin/env node
// check_overlap.js — 「Clawd 的早安」640×360 严格零容忍布局重叠与截断检测
// 检查范围:
//   1. 房间全局前景层 (G1 / G2 / G3: 终端、角色 Clawd/Her、便签卡片、闪光粒子运动包络、字幕栏)
//   2. 终端标题栏内部 (按钮 × 标题文字, 边界 360×20)
//   3. 终端内容区内部 (G1 / G2 / G3 所有文字、光标、气泡、输入栏, 边界 360×140)
//   4. G3 便签卡片内部 (红色图钉 × 标题 × 副标题, 边界 180×80)
//   5. 底部字幕栏内部 (G1 / G2 / G3 全部字幕行, 边界 640×40)

const { createCanvas } = require('@napi-rs/canvas');
const gm = require('./render_goodmorning_arena');

const {
  BW, BH, TERM, NOTE, SUB, LINES, G1_CMD, G2_MSGS, G3_LINES, SPARKLE_ANCHORS, measureTxt,
} = gm;

const measureCtx = createCanvas(BW, BH).getContext('2d');
const TX = TERM.x;
const TY = TERM.y + TERM.titleH;
const CB = { x: TX, y: TY, w: TERM.w, h: TERM.h - TERM.titleH };
const CANVAS_BOUNDS = { x: 0, y: 0, w: BW, h: BH };

function W(lx) { return lx + TX; }
function WL(ly) { return ly + TY; }

// Include ±1px vertical bobbing envelope for characters
function clawdBox(x, y) { return [x, y - 1, 40, 23]; }
function herBox(x, y) { return [x, y - 1, 16, 29]; }

function txtBox(x, y, str, size, align = 'left') {
  const w = measureTxt(measureCtx, str, size);
  const h = Math.ceil(size * 1.2);
  let dx = x;
  if (align === 'center') dx = x - w / 2;
  else if (align === 'right') dx = x - w;
  return [Math.floor(dx), y, Math.ceil(w), h];
}

function overlap(a, b) {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  return (x2 - x1) > 0 && (y2 - y1) > 0;
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
      issues.push(`TRUNCATED: ${b.name} box=[${b.box}] outside bounds=[${bounds.x},${bounds.y},${bounds.w},${bounds.h}]`);
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

console.log('=== 「Clawd 的早安」 Layout & Truncation Check (640×360, 0px tolerance) ===\n');

// 1. Room-level Foreground Checks
console.log('1. 房间全局前景层');
checkScene('G1 Room', [
  { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
  { name: 'her_left', box: herBox(80, 196) },
  { name: 'clawd_right', box: clawdBox(524, 200) },
  { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
], CANVAS_BOUNDS);

checkScene('G2 Room', [
  { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
  { name: 'her_left_wave', box: herBox(20, 180) },
  { name: 'clawd_right_happy', box: clawdBox(540, 184) },
  { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
], CANVAS_BOUNDS);

checkScene('G3 Room', [
  { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
  { name: 'stickyNote', box: [NOTE.x, NOTE.y, NOTE.w, NOTE.h] },
  { name: 'clawd_room', box: clawdBox(516, 196) },
  { name: 'her_room', box: herBox(572, 192) },
  ...SPARKLE_ANCHORS.map((a, i) => ({
    name: `sparkle_${i}`,
    box: [a.x - 10, a.y - 12, 23, 27],
  })),
  { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
], CANVAS_BOUNDS);

// 2. Terminal Title Bar Internal Check
console.log('\n2. 终端标题栏内部');
for (const title of ['clawd@morning:~$', 'clawd@chat:~$', 'clawd@goodbye:~$']) {
  checkScene(`TitleBar (${title})`, [
    { name: 'btn_red', box: [TERM.x + 8, TERM.y + 7, 6, 6] },
    { name: 'btn_amber', box: [TERM.x + 18, TERM.y + 7, 6, 6] },
    { name: 'btn_green', box: [TERM.x + 28, TERM.y + 7, 6, 6] },
    { name: 'title_txt', box: txtBox(TERM.x + TERM.w / 2, TERM.y + 4, title, 12, 'center') },
  ], { x: TERM.x, y: TERM.y, w: TERM.w, h: TERM.titleH });
}

// 3. Terminal Content Area Internal Checks
console.log('\n3. 终端内容区内部 (360×140)');
const pw = measureTxt(measureCtx, '$ ', 12) + 2;
checkScene('G1 Terminal Content', [
  { name: 'cmd_line', box: txtBox(W(14), WL(18), `$ ${G1_CMD}`, 12) },
  { name: 'out_line', box: txtBox(W(14), WL(44), '→ 早安', 12) },
  { name: 'prompt2', box: txtBox(W(14), WL(70), '$ ', 12) },
  { name: 'cursor', box: [W(14 + pw + 2), WL(70), 7, 12] },
  { name: 'date_line', box: txtBox(W(14), WL(104), 'Tue Oct 22 07:00', 12) },
], CB);

checkScene('G2 Terminal Content', [
  ...G2_MSGS.map((m, i) => {
    const bw = measureTxt(measureCtx, m.text, 12) + 20;
    const bx = m.role === 'clawd' ? 348 - bw : 12;
    return { name: `bubble_${i + 1}`, box: [W(bx), WL(m.y), bw, 20] };
  }),
  { name: 'input_bar', box: [W(12), WL(114), 336, 16] },
], CB);

checkScene('G3 Terminal Content', G3_LINES.map((l, i) => ({
  name: `g3_line_${i + 1}`,
  box: txtBox(W(16), WL(l.y), l.text, 12),
})), CB);

// 4. Sticky Note Internal Check
console.log('\n4. 便签卡片内部 (180×80)');
checkScene('G3 Sticky Note Content', [
  { name: 'red_pin', box: [NOTE.x + Math.floor(NOTE.w / 2) - 4, NOTE.y + 4, 8, 8] },
  { name: 'note_title', box: txtBox(NOTE.x + 16, NOTE.y + 20, '早安', 14) },
  { name: 'note_sub', box: txtBox(NOTE.x + 16, NOTE.y + 48, 'Clawd & 她', 14) },
], NOTE);

// 5. Subtitle Bar Internal Check
console.log('\n5. 字幕栏内部 (640×40)');
for (let i = 0; i < LINES.length; i++) {
  checkScene(`Subtitle G${i + 1}`, [
    { name: `sub_text_${i + 1}`, box: txtBox(BW / 2, SUB.y + 14, LINES[i], 10, 'center') },
  ], SUB);
}

console.log(`\n=== Summary: ${passedChecks}/${totalChecks} checks PASSED, ${totalIssues} issue(s) ===`);
process.exit(totalIssues > 0 ? 1 : 0);
