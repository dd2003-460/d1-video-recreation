// 检查 learning 视频元素重叠
const { BW, BH, SCALE, TERM, SUB, C, LINES, SCENES, px, txt, drawTerminal, drawClawd, drawSubtitle } = require('./render_learning');

function overlaps(a, b, tol = 0) {
  const ix = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w) + tol);
  const iy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h) + tol);
  return ix > 0 && iy > 0 ? { w: ix, h: iy } : null;
}

function box(x, y, w, h, id) {
  return { id, x, y, w, h };
}

// L1-L3: 终端全屏 + 字幕条 + Clawd
const L1_BOXES = [
  box(0, 0, 640, 360, 'L1.term'),
  box(0, 320, 640, 40, 'L1.sub'),
  box(540, 260, 40, 32, 'L1.clawd'),
];

const L2_BOXES = [
  box(0, 0, 640, 360, 'L2.term'),
  box(0, 320, 640, 40, 'L2.sub'),
  box(540, 260, 40, 32, 'L2.clawd'),
];

const L3_BOXES = [
  box(0, 0, 640, 360, 'L3.term'),
  box(0, 320, 640, 40, 'L3.sub'),
  box(540, 260, 40, 32, 'L3.clawd'),
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
  const sub = boxes.find(b => b.id.includes('sub'));
  if (sub && (sub.x < 0 || sub.y < 0 || sub.x + sub.w > BW || sub.y + sub.h > BH)) {
    issues.push(`字幕条越界: ${JSON.stringify(sub)}`);
  }
  return issues;
}

console.log('=== Learning Video Overlap Check ===\n');

const allScenes = [
  ['L1: pip install knowledge', L1_BOXES],
  ['L2: learning', L2_BOXES],
  ['L3: understood', L3_BOXES],
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
