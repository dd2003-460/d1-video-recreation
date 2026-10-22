// 检查 memory 视频元素重叠
// 与 render_memory.js 的坐标保持一致
const { BW, BH, SCALE, TERM, SUB, C, LINES, SCENES, px, txt, drawTerminal, drawClawd, drawSubtitle } = require('./render_memory');
const { createCanvas } = require('@napi-rs/canvas');

// 重叠检测：收集每个场景的 bbox，两两求交
function overlaps(a, b, tol = 0) {
  const ix = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w) + tol);
  const iy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h) + tol);
  return ix > 0 && iy > 0 ? { w: ix, h: iy } : null;
}

function box(x, y, w, h, id) {
  return { id, x, y, w, h };
}

// 场景 M1-M3: 单终端 + Clawd + 字幕条
// 终端: TERM = {x:0, y:0, w:640, h:360} — 全屏
// 字幕条: SUB = {x:0, y:320, w:640, h:40}
// Clawd: 540,260 40×24+8腿 = 40×32

// M1: 终端全屏 + 字幕条 + Clawd
const M1_BOXES = [
  box(0, 0, 640, 360, 'M1.term'),
  box(0, 320, 640, 40, 'M1.sub'),
  box(540, 260, 40, 32, 'M1.clawd'),
];

// M2: 同上
const M2_BOXES = [
  box(0, 0, 640, 360, 'M2.term'),
  box(0, 320, 640, 40, 'M2.sub'),
  box(540, 260, 40, 32, 'M2.clawd'),
];

// M3: 同上
const M3_BOXES = [
  box(0, 0, 640, 360, 'M3.term'),
  box(0, 320, 640, 40, 'M3.sub'),
  box(540, 260, 40, 32, 'M3.clawd'),
];

function checkScene(name, boxes) {
  const issues = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const o = overlaps(boxes[i], boxes[j]);
      if (o) {
        issues.push(`${boxes[i].id} ∩ ${boxes[j].id}: ${o.w}×${o.h}px`);
      }
    }
  }
  // 检查字幕条是否在画布内
  const sub = boxes.find(b => b.id.includes('sub'));
  if (sub && (sub.x < 0 || sub.y < 0 || sub.x + sub.w > BW || sub.y + sub.h > BH)) {
    issues.push(`字幕条越界: ${JSON.stringify(sub)}`);
  }
  return issues;
}

console.log('=== Memory Video Overlap Check ===\n');

const allScenes = [
  ['M1: df -h /memory', M1_BOXES],
  ['M2: ls her_* files', M2_BOXES],
  ['M3: rm -rf *.tmp', M3_BOXES],
];

let totalIssues = 0;
for (const [name, boxes] of allScenes) {
  const issues = checkScene(name, boxes);
  if (issues.length > 0) {
    totalIssues += issues.length;
    console.log(`${name}:`);
    for (const issue of issues) {
      console.log(`  ⚠️  ${issue}`);
    }
  } else {
    console.log(`${name}: OK`);
  }
}

console.log(`\n=== Total: ${totalIssues} issue(s) ===`);
process.exit(totalIssues > 0 ? 1 : 0);
