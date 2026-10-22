#!/usr/bin/env node
// src/check_overlap_arena.js — 「Clawd 的学习」640×360 严格零容忍布局重叠与截断检测
// 检查范围 (0px tolerance):
//   1. 房间全局前景层 (L1 / L2 / L3: 终端、消息气泡、内心独白框、窗台便签旋转包络、Clawd+思考气泡、Her、星光包络、字幕栏)
//   2. 终端标题栏内部 (三色按钮 × 标题文字, 边界 360×20)
//   3. 终端内容区内部 (L1 请求打字 / L2 六行代码与行号 / L3 三行对话与状态栏, 边界 360×140)
//   4. 浮动气泡与窗台便签内部 (文字与图钉不重叠、不超出卡片边界)
//   5. 底部字幕栏内部 (3 条 14px 字幕, 边界 640×40)

const { createCanvas } = require('@napi-rs/canvas');
const learning = require('./render_learning_arena');

const {
  BW,
  BH,
  TERM,
  SUB,
  BUBBLE_L1,
  MONO_L2,
  NOTE,
  CLAWD_ROOM,
  CLAWD_THOUGHT,
  HER_ROOM,
  SPARKLE_ANCHORS,
  LINES,
  L1_MSG,
  L1_FULL_LINE,
  L2_CODE_LINES,
  L2_MONO_TEXT,
  L3_DIALOGUE,
  L3_STATUS_TEXT,
  NOTE_LINE_1,
  NOTE_LINE_2,
  measureTxt,
} = learning;

const measureCtx = createCanvas(BW, BH).getContext('2d');
const TX = TERM.x;
const TY = TERM.y + TERM.titleH;
const CB = { x: TX, y: TY, w: TERM.w, h: TERM.h - TERM.titleH }; // 360×140
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

console.log('=== 「Clawd 的学习」 Layout & Truncation Check (640×360, 0px tolerance) ===\n');

// 1. Room-level Foreground Checks
console.log('1. 房间全局前景层');
checkScene('L1 Room (Her Request)', [
  { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
  { name: 'msgBubble', box: [BUBBLE_L1.x, BUBBLE_L1.y, BUBBLE_L1.w, BUBBLE_L1.h + BUBBLE_L1.tailH] },
  { name: 'clawd_room', box: clawdBox(CLAWD_ROOM) },
  { name: 'clawd_thought', box: [CLAWD_THOUGHT.x, CLAWD_THOUGHT.y, CLAWD_THOUGHT.w, CLAWD_THOUGHT.h] },
  { name: 'her_room', box: herBox(HER_ROOM) },
  { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
], CANVAS_BOUNDS);

checkScene('L2 Room (Thinking Deep Purple)', [
  { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
  { name: 'monologueBubble', box: [MONO_L2.x, MONO_L2.y, MONO_L2.w, MONO_L2.h] },
  { name: 'clawd_deep_purple', box: clawdBox(CLAWD_ROOM) },
  { name: 'clawd_thought', box: [CLAWD_THOUGHT.x, CLAWD_THOUGHT.y, CLAWD_THOUGHT.w, CLAWD_THOUGHT.h] },
  { name: 'her_room', box: herBox(HER_ROOM) },
  { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
], CANVAS_BOUNDS);

const noteAABB = rotatedAABB(
  NOTE.x + NOTE.w / 2,
  NOTE.y + NOTE.h / 2,
  NOTE.w,
  NOTE.h,
  NOTE.angleDeg
);
checkScene('L3 Room (Growth & Windowsill Note)', [
  { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
  { name: 'stickyNote_sill', box: noteAABB },
  { name: 'clawd_smile', box: clawdBox(CLAWD_ROOM) },
  { name: 'her_smile_window', box: herBox(HER_ROOM) },
  ...SPARKLE_ANCHORS.map((a, i) => ({
    name: `sparkle_${i + 1}`,
    box: [a.x - 8, a.y - 10, 21, 23],
  })),
  { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
], CANVAS_BOUNDS);

// 2. Terminal Title Bar Internal Checks
console.log('\n2. 终端标题栏内部 (360×20)');
for (const title of [
  'clawd@dsh:~$ — request',
  'clawd@dsh:~$ — checkHeart()',
  'clawd@dsh:~$ — growth',
]) {
  checkScene(`TitleBar (${title})`, [
    { name: 'btn_red', box: [TERM.x + 8, TERM.y + 7, 6, 6] },
    { name: 'btn_amber', box: [TERM.x + 18, TERM.y + 7, 6, 6] },
    { name: 'btn_green', box: [TERM.x + 28, TERM.y + 7, 6, 6] },
    { name: 'title_txt', box: txtBox(TERM.x + TERM.w / 2, TERM.y + 5, title, 10, 'center') },
  ], { x: TERM.x, y: TERM.y, w: TERM.w, h: TERM.titleH });
}

// 3. Terminal Content Area Internal Checks (360×140)
console.log('\n3. 终端内容区内部 (360×140)');
const l1FullW = measureTxt(measureCtx, L1_FULL_LINE, 10);
const clawdWaitW = measureTxt(measureCtx, '$ clawd: ', 10);
checkScene('L1 Terminal Content', [
  { name: 'l1_her_line', box: txtBox(W(14), WL(18), L1_FULL_LINE, 10) },
  { name: 'l1_her_cursor', box: [W(14 + l1FullW + 2), WL(18), 6, 10] },
  { name: 'l1_status', box: txtBox(W(14), WL(48), '# task: write resignation letter', 10) },
  { name: 'l1_clawd_prompt', box: txtBox(W(14), WL(76), '$ clawd: ', 10) },
  { name: 'l1_clawd_cursor', box: [W(14 + clawdWaitW + 2), WL(76), 6, 10] },
  { name: 'l1_footer', box: txtBox(W(14), WL(116), '[DSH] mode: listen -> evaluate', 10) },
], CB);

const l2Boxes = [];
L2_CODE_LINES.forEach((item, idx) => {
  const ly = 10 + idx * 20;
  l2Boxes.push({ name: `line_num_${idx + 1}`, box: txtBox(W(14), WL(ly), item.num, 10) });
  l2Boxes.push({ name: `code_line_${idx + 1}`, box: txtBox(W(30), WL(ly), item.text, 10) });
});
checkScene('L2 Terminal Content (6 Code Lines)', l2Boxes, CB);

const l3StatusW = measureTxt(measureCtx, L3_STATUS_TEXT, 10);
checkScene('L3 Terminal Content (Replies & Growth)', [
  ...L3_DIALOGUE.map((d, idx) => ({
    name: `l3_reply_${idx + 1}`,
    box: txtBox(W(14), WL(d.y), d.prefix + d.body, 10),
  })),
  { name: 'l3_status', box: txtBox(W(14), WL(110), L3_STATUS_TEXT, 10) },
  { name: 'l3_cursor', box: [W(14 + l3StatusW + 4), WL(110), 6, 10] },
], CB);

// 4. Floating Bubbles & Sticky Note Internal Checks
console.log('\n4. 浮动气泡与窗台便签内部');
checkScene('L1 Message Bubble Content', [
  { name: 'bubble_text', box: txtBox(BUBBLE_L1.x + BUBBLE_L1.w / 2, BUBBLE_L1.y + 8, L1_MSG, 10, 'center') },
], { x: BUBBLE_L1.x + 4, y: BUBBLE_L1.y + 2, w: BUBBLE_L1.w - 8, h: BUBBLE_L1.h - 4 });

checkScene('L2 Inner Monologue Content', [
  { name: 'mono_text', box: txtBox(MONO_L2.x + MONO_L2.w / 2, MONO_L2.y + 8, `“${L2_MONO_TEXT}”`, 10, 'center') },
], { x: MONO_L2.x + 4, y: MONO_L2.y + 2, w: MONO_L2.w - 8, h: MONO_L2.h - 4 });

checkScene('L3 Sticky Note Content', [
  { name: 'red_pin', box: [-4, -NOTE.h / 2 + 5, 8, 8] },
  { name: 'note_line_1', box: txtBox(0, -NOTE.h / 2 + 20, NOTE_LINE_1, 10, 'center') },
  { name: 'note_line_2', box: txtBox(0, -NOTE.h / 2 + 40, NOTE_LINE_2, 10, 'center') },
], { x: -NOTE.w / 2 + 4, y: -NOTE.h / 2 + 4, w: NOTE.w - 8, h: NOTE.h - 8 });

// 5. Bottom Subtitle Bar Internal Checks (640×40, 14px)
console.log('\n5. 底部字幕栏内部 (640×40)');
for (let i = 0; i < LINES.length; i++) {
  checkScene(`Subtitle L${i + 1} 「${LINES[i]}」`, [
    { name: `sub_text_${i + 1}`, box: txtBox(BW / 2, SUB.y + 12, LINES[i], 14, 'center') },
  ], SUB);
}

console.log(`\n=== Summary: ${passedChecks}/${totalChecks} checks PASSED, ${totalIssues} issue(s) ===`);
process.exit(totalIssues > 0 ? 1 : 0);
