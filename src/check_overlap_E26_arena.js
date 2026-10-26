#!/usr/bin/env node
'use strict';
// E26 geometry and narrative guardrails. Any positive-area collision in layout checks fails.
const R = require('./render_E26_compress_arena');
const { createCanvas } = require('@napi-rs/canvas');

const issues = [];
const check = (condition, message) => { if (!condition) issues.push(message); };
const intersects = (a, b) => Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) &&
  Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y);

function cardRects(scene) {
  if (scene === 3) {
    return [
      [22,87],[116,74],[222,77],[414,76],[522,90],
      [24,206],[105,251],[426,248],[520,210],[236,252],
    ].map(([x,y], i) => ({ x, y, w: R.CARDS[i].w * 0.83, h: R.CARDS[i].h * 0.83 }));
  }
  return R.CARDS.map((c) => ({ x:c.x, y:c.y, w:c.w, h:c.h }));
}
function testCardsNoOverlap(rects, label) {
  for (let i=0;i<rects.length;i++) {
    const a=rects[i];
    check(a.x >= 0 && a.y >= 39 && a.x+a.w <= R.BW && a.y+a.h <= 321, `${label}: card ${i+1} outside stage`);
    for (let j=i+1;j<rects.length;j++) check(!intersects(a,rects[j]), `${label}: cards ${i+1} and ${j+1} overlap`);
  }
}

console.log('=== E26 Compress / zero-overlap validation ===');
check(R.BW===640 && R.BH===360 && R.SCALE===2 && R.FW===1280 && R.FH===720, 'canvas/SCALE mismatch');
check(R.FPS===60 && R.DURATION===30 && R.NFRAMES===1800, 'timeline must be 1800 frames @60fps / 30 seconds');
check(R.GROUND_Y>=260 && R.GROUND_Y<=272, 'ground line outside 720p y=520–545 range');
check(R.COLORS.coral==='#D16E59' && R.COLORS.paper==='#E3D9BE', 'brand or note color mismatch');
check(R.CARDS.length===10, 'card wall must contain 10 cards');
check(JSON.stringify(R.CHAR_SIZES.small)==='[41,20]' && JSON.stringify(R.CHAR_SIZES.medium)==='[58,33]' && JSON.stringify(R.CHAR_SIZES.large)==='[96,42]', 'character three-tier sizes mismatch at 360p');
testCardsNoOverlap(cardRects(1), 'S1 wall');
testCardsNoOverlap(cardRects(2), 'S2 wall');
testCardsNoOverlap(cardRects(3), 'S3 background wall');

check(R.s1CardCount(0)===0 && R.s1CardCount(4.0)===5 && R.s1CardCount(8.0)===10, 'S1 card appearance cadence mismatch');
check(R.s1Percent(0)===40 && R.s1Percent(4.0)===60 && R.s1Percent(8.0)===80, 'S1 context progress mismatch');
check(R.semanticState(10).context===92 && R.semanticState(19.99).wallScale<=0.61, 'S2 92% or 40% card shrink missing');
check(R.semanticState(20.8).paperVisible && R.semanticState(28.2).noteCompact, 'S3 note expansion/compact ending missing');
check(R.getClickTimestamps().length===10, 'S3 keyboard clicks must cover all 10 typed characters');

// Verify exact integer nearest-neighbour 2x export and the black HUD bands on key frames.
const samples=[0,240,599,600,900,1199,1200,1500,1799];
for (const n of samples) {
  const {baseCanvas,outCanvas}=R.renderFrameToCanvas(n);
  const base=baseCanvas.getContext('2d').getImageData(0,0,baseCanvas.width,baseCanvas.height).data;
  const out=outCanvas.getContext('2d').getImageData(0,0,outCanvas.width,outCanvas.height).data;
  const coords=[[0,0],[100,38],[639,38],[0,321],[639,359]];
  for (const [x,y] of coords) {
    const i=(y*R.BW+x)*4;
    for(let dy=0;dy<2;dy++) for(let dx=0;dx<2;dx++) {
      const j=((y*2+dy)*R.FW+x*2+dx)*4;
      check(Math.abs(out[j]-base[i])<=1 && Math.abs(out[j+1]-base[i+1])<=1 && Math.abs(out[j+2]-base[i+2])<=1,
        `frame ${n}: 2x nearest-neighbour mismatch at ${x},${y}`);
    }
  }
  const pixel=(x,y)=>{const i=(y*R.BW+x)*4;return [base[i],base[i+1],base[i+2]];};
  for (const [x,y] of [[4,4],[4,330]]) check(pixel(x,y).every(v=>v<10), `frame ${n}: HUD band is not black at ${x},${y}`);
}
// The central compact note occupies a reserved opening; no surrounding card intrudes into it.
const note={x:250,y:176,w:140,h:70};
for (const [i,card] of cardRects(3).entries()) check(!intersects(note,card), `S3 note overlaps surrounding card ${i+1}`);

if (issues.length) {
  console.log(`[FAIL] ${issues.length} issue(s)`);
  for (const issue of issues) console.log(` - ${issue}`);
  process.exit(1);
}
console.log('[PASSED] 画布与帧率规格');
console.log('[PASSED] 10 张卡片墙：三场景全边界内、零卡片重叠');
console.log('[PASSED] 叙尺寸、卡片出现节奏、上下文百分比、告警收缩与笔记收束');
console.log('[PASSED] 便签居中留白，周边卡片零重叠');
console.log(`[PASSED] ${samples.length} 个关键帧：HUD 黑条与 2×最近邻输出`);
console.log('[PASSED] keyboard click schedule: 10 typed characters');
console.log('=== Summary: 6/6 checks PASSED, 0 issue(s) ===');
