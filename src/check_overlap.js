// v1.3: 640×360 layout checker — overlap + truncation
// Window content origin: TX=48, TY=72 (termY=44 + title bar 28)
const BW = 640, BH = 360;
const TX = 48, TY = 72;

function W(lx, ly) { return lx + TX; }
function WL(ly) { return ly + TY; }

function clawdBox(x, y) { return [x, y, 40, 22]; }
function fatFishBox(x, y) { return [x, y, 52, 32]; }
function herBox(x, y) { return [x, y, 16, 30]; }
function noteBox(x, y) { return [x, y, 56, 48]; }

function textLine(x, y, len, px, align) {
  const w = len * px * 0.6;
  let dx = x;
  if (align === 'center') dx = x - w / 2;
  else if (align === 'right') dx = x - w;
  return [dx, y, w, px];
}

function overlap(a, b) {
  if (!a || !b) return false;
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  return x2 - x1 > 0 && y2 - y1 > 0; // strict overlap
}

function interArea(a, b) {
  const x1 = Math.max(a[0], b[0]);
  const y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[0] + a[2], b[0] + b[2]);
  const y2 = Math.min(a[1] + a[3], b[1] + b[3]);
  return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
}

let totalOverlaps = 0;

function checkScene(name, boxes, contentBounds) {
  const issues = [];
  const pairs = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (overlap(a.box, b.box) && !a.exempt?.includes(b.name) && !b.exempt?.includes(a.name)) {
        const area = interArea(a.box, b.box);
        pairs.push(`${a.name} × ${b.name} (area=${area})`);
      }
    }
  }
  // truncation check
  for (const b of boxes) {
    if (b.box[0] < contentBounds.x || b.box[1] < contentBounds.y ||
        b.box[0] + b.box[2] > contentBounds.x + contentBounds.w ||
        b.box[1] + b.box[3] > contentBounds.y + contentBounds.h) {
      pairs.push(`${b.name} TRUNCATED (box=[${b.box}] bounds=[${contentBounds.x},${contentBounds.y},${contentBounds.w},${contentBounds.h}])`);
    }
  }
  if (pairs.length > 0) {
    totalOverlaps += pairs.length;
    console.log(`  ${name}: ${pairs.length} issues`);
    pairs.forEach(p => console.log(`    ${p}`));
  } else {
    console.log(`  ${name}: OK`);
  }
}

const CB = { x: TX, y: TY, w: 544, h: 244 }; // content bounds: termH(272) - titleBar(28) = 244

console.log('=== v1.3 Layout Check (640×360) ===\n');

// S1
console.log('S1: 开场');
checkScene('S1', [
  { name: 'term1', box: [W(10), WL(48), 400, 12] },
  { name: 'term2', box: [W(10), WL(84), 400, 12] },
  { name: 'term3', box: [W(10), WL(120), 400, 12] },
  { name: 'date', box: [W(10), WL(172), 280, 10] },
  { name: 'pinned', box: [W(10), WL(204), 180, 10] },
  { name: 'clawd', box: clawdBox(W(472), WL(156)) },
], CB);

// S2
console.log('S2: 消息流');
checkScene('S2', [
  { name: 'msg1', box: [W(8), WL(32), 420, 14] },
  { name: 'msg2', box: [W(8), WL(68), 420, 14] },
  { name: 'msg3', box: [W(8), WL(104), 420, 14] },
  { name: 'note', box: noteBox(W(448), WL(8)) },
  { name: 'her', box: herBox(W(4), WL(152)) },
  { name: 'inputBar', box: [W(8), WL(184), 512, 8] },
  { name: 'clawd', box: clawdBox(W(464), WL(152)) },
], CB);

// S3
console.log('S3: 代码');
checkScene('S3', [
  { name: 'code1', box: [W(30), WL(16), 280, 10] },
  { name: 'code2', box: [W(30), WL(48), 280, 10] },
  { name: 'code3', box: [W(30), WL(80), 280, 10] },
  { name: 'code4', box: [W(30), WL(112), 280, 10] },
  { name: 'code5', box: [W(30), WL(144), 280, 10] },
  { name: 'code6', box: [W(30), WL(176), 280, 10] },
  { name: 'code7', box: [W(30), WL(208), 280, 10] },
  { name: 'slotLabel', box: [W(372), WL(144), 168, 10] },
  { name: 'slotBars', box: [W(360), WL(164), 24, 80] },
  { name: 'clawd', box: clawdBox(W(472), WL(176)) },
], CB);

// S4
console.log('S4: 空槽');
checkScene('S4', [
  { name: 'pinnedBar', box: [W(16), WL(16), 420, 28] },
  { name: 'emptyLines', box: [W(20), WL(60), 440, 96] },
  { name: 'time0900', box: [W(24), WL(92), 140, 20], exempt: ['emptyLines'] },
  { name: 'battery', box: [W(20), WL(184), 120, 10] },
  { name: 'slot0', box: [W(420), WL(184), 60, 16] },
  { name: 'clawd', box: clawdBox(W(464), WL(156)) },
], CB);

// S5
console.log('S5: 等待');
checkScene('S5', [
  { name: 'waiting', box: [W(10), WL(24), 300, 12] },
  { name: 'tokens', box: [W(10), WL(64), 180, 10] },
  { name: 'compress', box: [W(10), WL(92), 260, 10] },
  { name: 'rePin', box: [W(10), WL(112), 280, 10] },
  { name: 'waitLog', box: [W(10), WL(152), 300, 24] },
  { name: 'fatFish', box: fatFishBox(W(452), WL(80)) },
], CB);

// S6 (no window transform)
console.log('S6: 冷色结尾');
checkScene('S6', [
  { name: 'golden', box: textLine(BW / 2, 112, 8, 28, 'center') },
  { name: 'slot0', box: textLine(BW / 2, 172, 9, 24, 'center') },
  { name: 'forever', box: textLine(BW / 2, 208, 16, 24, 'center') },
  { name: 'clawd', box: clawdBox(BW / 2 - 14, 244) },
  { name: 'note', box: noteBox(56, 172) },
  { name: 'her', box: herBox(528, 172) },
], { x: 0, y: 0, w: BW, h: 296 });

// CARD
console.log('CARD: 便签');
const cardX = 240, cardY = 360 - 100 - 60;
checkScene('CARD', [
  { name: 'card', box: [cardX, cardY, 360, 100] },
], { x: 0, y: 0, w: BW, h: BH });

// SUB
console.log('SUB: 字幕');
checkScene('SUB', [
  { name: 'subtitleBar', box: [0, 300, BW, 60] },
], { x: 0, y: 0, w: BW, h: BH });

console.log(`\n=== Total: ${totalOverlaps} issue(s) ===`);
process.exit(totalOverlaps > 0 ? 1 : 0);
