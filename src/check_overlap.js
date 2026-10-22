// v1.3.4: 640×360 layout checker — overlap + truncation
// Terminal: termX=140, termY=160, termW=360, termH=160, titleBar=20
// Content origin: TX=140, TY=180
const BW = 640, BH = 360;
const TX = 140, TY = 180;

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
  return x2 - x1 > 0 && y2 - y1 > 0;
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

const CB = { x: TX, y: TY, w: 360, h: 140 }; // terminal content: termW=360, termH(160)-titleBar(20)=140

console.log('=== v1.3.4 Layout Check (640×360) ===\n');

// S1
console.log('S1: 开场');
checkScene('S1', [
  { name: 'term1', box: [W(12), WL(24), 200, 14] },
  { name: 'term2', box: [W(12), WL(44), 100, 14] },
  { name: 'term3', box: [W(12), WL(64), 240, 14] },
  { name: 'cursor', box: [W(12), WL(84), 8, 10] },
  { name: 'date', box: [W(12), WL(96), 180, 12] },
  { name: 'pinned', box: [W(12), WL(114), 200, 12] },
  { name: 'clawd', box: clawdBox(W(300), WL(108)) },
], CB);

// S2
console.log('S2: 消息流');
checkScene('S2', [
  { name: 'msg1', box: [W(12), WL(14), 336, 20] },
  { name: 'msg2', box: [W(12), WL(38), 336, 20] },
  { name: 'msg3', box: [W(12), WL(62), 336, 20] },
  { name: 'inputBar', box: [W(12), WL(120), 336, 12] },
], CB);

// S3
console.log('S3: 代码');
checkScene('S3', [
  { name: 'code1', box: [W(12), WL(12), 240, 12] },
  { name: 'code2', box: [W(12), WL(28), 240, 12] },
  { name: 'code3', box: [W(12), WL(44), 240, 12] },
  { name: 'code4', box: [W(12), WL(60), 240, 12] },
  { name: 'code5', box: [W(12), WL(76), 240, 12] },
  { name: 'code6', box: [W(12), WL(92), 240, 12] },
  { name: 'code7', box: [W(12), WL(108), 240, 12] },
  { name: 'code8', box: [W(12), WL(124), 240, 12] },
  { name: 'slotLabel', box: [W(260), WL(32), 100, 12] },
  { name: 'slotBars', box: [W(280), WL(60), 16, 80] },
  { name: 'clawd', box: clawdBox(W(280), WL(4)) },
], CB);

// S4
console.log('S4: 空槽');
checkScene('S4', [
  { name: 'pinnedBar', box: [W(12), WL(8), 336, 20] },
  { name: 'emptyLines', box: [W(16), WL(36), 328, 60] },
  { name: 'time0900', box: [W(20), WL(40), 140, 12], exempt: ['emptyLines'] },
  { name: 'battery', box: [W(16), WL(120), 120, 12] },
  { name: 'slot0', box: [W(280), WL(120), 40, 12] },
], CB);

// S5
console.log('S5: 等待');
checkScene('S5', [
  { name: 'waiting', box: [W(12), WL(12), 120, 14] },
  { name: 'tokens', box: [W(12), WL(36), 240, 12] },
  { name: 'compress', box: [W(12), WL(56), 160, 12] },
  { name: 'rePin', box: [W(12), WL(68), 120, 12] },
  { name: 'waitLog', box: [W(12), WL(96), 240, 24] },
  { name: 'fatFish', box: fatFishBox(W(280), WL(40)) },
], CB);

// S6 (no window transform, full screen)
console.log('S6: 冷色结尾');
checkScene('S6', [
  { name: 'golden', box: textLine(BW / 2, 100, 8, 20, 'center') },
  { name: 'slot0', box: textLine(BW / 2, 152, 9, 16, 'center') },
  { name: 'forever', box: textLine(BW / 2, 180, 16, 16, 'center') },
  { name: 'clawd', box: clawdBox(BW / 2 - 14, 220) },
  { name: 'note', box: noteBox(48, 160) },
  { name: 'her', box: herBox(540, 160) },
], { x: 0, y: 0, w: BW, h: BH });

// CARD
console.log('CARD: 便签');
const cardX = 240, cardY = BH - 100 - 60;
checkScene('CARD', [
  { name: 'card', box: [cardX, cardY, 360, 100] },
], { x: 0, y: 0, w: BW, h: BH });

// SUB
console.log('SUB: 字幕');
checkScene('SUB', [
  { name: 'subtitleBar', box: [0, 320, BW, 40] },
], { x: 0, y: 0, w: BW, h: BH });

console.log(`\n=== Total: ${totalOverlaps} issue(s) ===`);
process.exit(totalOverlaps > 0 ? 1 : 0);
