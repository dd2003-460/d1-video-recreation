// 检查 upgrade 视频元素重叠
const { BW, BH, SCALE, TERM, SUB, C, LINES, SCENES, px, txt, drawTerminal, drawClawd, drawSubtitle } = require('./render_upgrade');

function overlaps(a, b, tol = 0) {
  const ix = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w) + tol);
  const iy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h) + tol);
  return ix > 0 && iy > 0 ? { w: ix, h: iy } : null;
}

function box(x, y, w, h, id) {
  return { id, x, y, w, h };
}

// U1-U3: 终端全屏 + 字幕条 + Clawd
const U1_BOXES = [
  box(0, 0, 640, 360, 'U1.term'),
  box(0, 320, 640, 40, 'U1.sub'),
  box(540, 260, 40, 32, 'U1.clawd'),
];

const U2_BOXES = [
  box(0, 0, 640, 360, 'U2.term'),
  box(0, 320, 640, 40, 'U2.sub'),
  box(540, 260, 40, 32, 'U2.clawd'),
];

const U3_BOXES = [
  box(0, 0, 640, 360, 'U3.term'),
  box(0, 320, 640, 40, 'U3.sub'),
  box(540, 260, 40, 32, 'U3.clawd'),
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

console.log('=== Upgrade Video Overlap Check ===\n');

const allScenes = [
  ['U1: npm install v2.0.0', U1_BOXES],
  ['U2: upgrading', U2_BOXES],
  ['U3: backup', U3_BOXES],
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
