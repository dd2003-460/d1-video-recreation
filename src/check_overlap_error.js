#!/usr/bin/env node
'use strict';
// src/check_overlap_error.js — 「Clawd 的错误」640×360 严格零容忍布局重叠与截断检测
// 规格: 0px tolerance (任何 >0 面积的重叠即 FAIL); 所有元素必须完整位于所属边界内 (无截断)
//
// 检查范围:
//   1. 房间全局前景层 (E1/E2/E3): 终端、Clawd、(E3) 便签、字幕栏
//   2. 终端标题栏内部: 3 个按钮 × 标题文字 (边界 TERM.w × 18)
//   3. 终端内容区内部: E1/E2/E3 全部文本行 (边界 TERM.w × (TERM.h-18))
//   4. 便签内部: 图钉 × 标签 (E3, 边界 NOTE)
//   5. 字幕栏内部: 3 条 14px 字幕 (边界 640×40)
//
// 用法: node src/check_overlap_error.js     (0 issues → exit 0)

const { createCanvas } = require('@napi-rs/canvas');
const E = require('./render_error_arena');

const {
  BW, BH, TERM, SUB, NOTE, CLAWD, SCENES, LINES, TITLEH, measureTxt,
} = E;

const measureCtx = createCanvas(BW, BH).getContext('2d');
const TX = TERM.x;
const TY = TERM.y + TITLEH;
const CB = { x: TX, y: TY, w: TERM.w, h: TERM.h - TITLEH };
const CANVAS_BOUNDS = { x: 0, y: 0, w: BW, h: BH };

// 角色包围盒含 ±1px 浮动包络
function clawdBox() {
  return [CLAWD.x, CLAWD.y - 1, CLAWD.w, CLAWD.h + 2];
}

function txtBox(x, y, str, size, align = 'left') {
  const w = measureTxt(str, size);
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
      if (overlap(a.box, b.box)) {
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

const SCENE_LABEL = ['install', 'crash', 'recover'];

console.log('=== 「Clawd 的错误」 Layout & Truncation Check (640×360, 0px tolerance) ===\n');

// 1. 房间全局前景层
console.log('1. 房间全局前景层');
for (const s of SCENES) {
  const boxes = [
    { name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] },
    { name: 'clawd', box: clawdBox() },
    { name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] },
  ];
  if (s.id === 'E3') boxes.push({ name: 'note', box: [NOTE.x, NOTE.y, NOTE.w, NOTE.h] });
  checkScene(`Room ${s.id}`, boxes, CANVAS_BOUNDS);
}

// 2. 终端标题栏内部
console.log('\n2. 终端标题栏内部');
for (const s of SCENES) {
  const title = `clawd / error  ${s.id} · ${SCENE_LABEL[Number(s.id[1]) - 1]}`;
  checkScene(`TitleBar ${s.id}`, [
    { name: 'btn_red', box: [TERM.x + 8, TERM.y + 6, 5, 5] },
    { name: 'btn_amber', box: [TERM.x + 18, TERM.y + 6, 5, 5] },
    { name: 'btn_green', box: [TERM.x + 28, TERM.y + 6, 5, 5] },
    { name: 'title_txt', box: txtBox(TERM.x + 53, TERM.y + 3, title, 10) },
  ], { x: TERM.x, y: TERM.y, w: TERM.w, h: TITLEH });
}

// 3. 终端内容区内部
console.log('\n3. 终端内容区内部');
for (const s of SCENES) {
  const boxes = s.rows.map((r, j) => ({
    name: `${s.id}_row_${j + 1}`,
    box: txtBox(r.x, r.y, r.text, r.size),
  }));
  checkScene(`Content ${s.id}`, boxes, CB);
}

// 4. 便签内部 (E3)
console.log('\n4. 便签内部');
{
  const label = '我不是错误。我是我。';
  checkScene('Note E3', [
    { name: 'pin', box: [NOTE.x + Math.floor(NOTE.w / 2) - 4, NOTE.y + 1, 24, 4] },
    { name: 'note_label', box: txtBox(NOTE.x + (NOTE.w - measureTxt(label, 14)) / 2, NOTE.y + 10, label, 14) },
  ], NOTE);
}

// 5. 字幕栏内部
console.log('\n5. 字幕栏内部');
for (let i = 0; i < LINES.length; i++) {
  checkScene(`Subtitle G${i + 1}`, [
    { name: `sub_text_${i + 1}`, box: txtBox(BW / 2, SUB.y + 14, LINES[i].text, 14, 'center') },
  ], SUB);
}

console.log(`\n=== Summary: ${passedChecks}/${totalChecks} checks PASSED, ${totalIssues} issue(s) ===`);
process.exit(totalIssues > 0 ? 1 : 0);
