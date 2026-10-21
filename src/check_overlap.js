// v1.2 overlap auditor: replicate element placements in ABSOLUTE frame coords, report overlaps per scene.
// Same geometry as render_full_pixel.js (BW=320, BH=180 base, SCALE=4).
// S1-S5: content is translated to window (termX=24, termY+14=36). Local (lx,ly) -> abs (lx+24, ly+36).
// Window content area: 272 wide x 122 tall (abs x:24-296, y:36-158).
// S6 + CARD: full frame, no translate.
const BW = 320, BH = 180;
const TX = 24, TY = 36; // window content origin (absolute)
function W(lx, ly) { return lx + TX; } // window local x -> abs
function WL(lx, ly) { return ly + TY; } // window local y -> abs

function clawdBox(x, y) { return [x, y, 20, 11]; }       // body 20x9 + 2 legs below
function fatFishBox(x, y) { return [x, y, 26, 16]; }     // fat oval + fins
function herBox(x, y) { return [x, y, 16, 30]; }
function noteBox(x, y) { return [x, y, 28, 24]; }
function textLine(x, y, len, px, align) {
  let lx;
  if (align === 'center') lx = x - len * px / 2;
  else if (align === 'right') lx = x - len * px;
  else lx = x;
  return [lx, y, len * px, px * 1.2];
}

function overlap(a, b) {
  return a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
}
function interArea(a, b) {
  const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return w > 0 && h > 0 ? w * h : 0;
}

// ---- S1 (window): term 3 lines + date/pinned + Clawd ----
// term lines start ty=16 (local), step 18. date y70, pinned y84 (local). Clawd(236,78) local.
const S1 = [
  ['term1', [W(10), WL(16), 200, 12]],
  ['term2', [W(10), WL(34), 200, 12]],
  ['term3', [W(10), WL(52), 200, 12]],
  ['date', [W(10), WL(70), 140, 10]],
  ['pinned', [W(10), WL(84), 90, 10]],
  ['clawd', clawdBox(W(236), WL(78))],
];

// ---- S2 (window): msgs 3 + pin + note + her + inputBar + Clawd ----
// msgs my=16 (local) step 18. note(224,4). her(4,76). inputBar y92. Clawd(232,76).
const S2 = [
  ['msg1', [W(8), WL(16), 240, 14]],
  ['msg2', [W(8), WL(34), 240, 14]],
  ['msg3', [W(8), WL(52), 240, 14]],
  ['note', noteBox(W(224), WL(4))],
  ['her', herBox(W(4), WL(76))],
  ['inputBar', [W(8), WL(92), 256, 8]],
  ['clawd', clawdBox(W(232), WL(76))],
];

// ---- S3 (window): code 8 lines + slot bar + Clawd ----
// code lines y=8+i*11 (local) font10. lineNumbers x=20. slot(180,82). Clawd(236,88).
const S3 = [
  ['code1', [W(30), WL(8), 220, 10]],
  ['code2', [W(30), WL(19), 220, 10]],
  ['code3', [W(30), WL(30), 220, 10]],
  ['code4', [W(30), WL(41), 220, 10]],
  ['code5', [W(30), WL(52), 220, 10]],
  ['code6', [W(30), WL(63), 220, 10]],
  ['code7', [W(30), WL(74), 220, 10]],
  ['code8', [W(30), WL(85), 220, 10]],
  ['slotLabel', [W(180), WL(72), 40, 10]],
  ['slotBar', [W(180), WL(82), 84, 8]],
  ['slotTxt', [W(180), WL(94), 100, 10]],
  ['clawd', clawdBox(W(236), WL(88))],
];

// ---- S4 (window): pinned bar + empty lines + battery + slot + Clawd ----
// pinned(8,8). emptyLines ey=30+i*16 n<=4. '09:00' y30. battery(10,92). slot(210,92). Clawd(232,78).
const S4 = [
  ['pinnedBar', [W(8), WL(8), 240, 14]],
  ['emptyLines', [W(10), WL(30), 220, 56]],
  ['time0900', [W(10), WL(30), 50, 10]],
  ['battery', [W(10), WL(92), 60, 10]],
  ['slotBar', [W(210), WL(92), 30, 8]],
  ['clawd', clawdBox(W(232), WL(78))],
];

// ---- S5 (window): waiting + tokens + compress + re-pin + waitLog + fatFish ----
// waiting y12 font12. tokens y32. compress y46. re-pin py=64-p*8 (64-56). waitLog(10,76). fatFish(226,40).
const S5 = [
  ['waiting', [W(10), WL(12), 150, 12]],
  ['tokens', [W(10), WL(32), 90, 10]],
  ['compress', [W(10), WL(46), 130, 10]],
  ['rePin', [W(10), WL(56), 140, 10]],
  ['waitLog', [W(10), WL(76), 150, 24]],
  ['fatFish', fatFishBox(W(226), WL(40))],
];

// ---- S6 (full frame, no translate): golden + slot0 + forever + Clawd + note + her ----
// golden gy=56. slot0 gy+30=86. forever gy+44=100. Clawd(BW/2-7,112). note(28,86). her(264,86).
const S6 = [
  ['golden', textLine(BW / 2, 56, 8, 14, 'center')],
  ['slot0', textLine(BW / 2, 86, 9, 12, 'center')],
  ['forever', textLine(BW / 2, 104, 6, 12, 'center')],
  ['clawd', clawdBox(BW / 2 - 7, 122)],
  ['note', noteBox(28, 86)],
  ['her', herBox(264, 86)],
];

// ---- CARD (full frame): card + cardTxt + tape ----
// CARD nested text (txt/sub on card) and tape are by design (visual layering), excluded from overlap audit.
// Only check the CARD against the frame edge (cardX+cardW <= BW, cardY+cardH <= BH).
const CARD = [
  ['card', [120, 120, 180, 50]], // final position; check cardX+180=300<320, cardY+50=170<180
];

// ---- subtitle bar (full frame): y=150-180 ----
// Subtitle text is by design on the bar, excluded from overlap audit.
const SUB = [
  ['subtitleBar', [0, 150, BW, 30]], // single element, no overlap possible
];

const scenes = { S1, S2, S3, S4, S5, S6, CARD, SUB };
let totalIssues = 0;
for (const [name, els] of Object.entries(scenes)) {
  console.log(`\n=== ${name} ===`);
  let found = false;
  for (let i = 0; i < els.length; i++) {
    for (let j = i + 1; j < els.length; j++) {
      const a = els[i][1], b = els[j][1];
      if (overlap(a, b)) {
        const area = interArea(a, b);
        const small = Math.min(a[2] * a[3], b[2] * b[3]);
        console.log(`  OVERLAP: ${els[i][0]} ${JSON.stringify(a)} x ${els[j][0]} ${JSON.stringify(b)}  inter=${area}px (${Math.round(100 * area / small)}% of smaller)`);
        found = true;
      }
    }
  }
  if (found) totalIssues++;
  else console.log('  no overlaps');
}
console.log(`\nTotal scenes with overlaps: ${totalIssues}`);
process.exit(totalIssues > 0 ? 1 : 0);
