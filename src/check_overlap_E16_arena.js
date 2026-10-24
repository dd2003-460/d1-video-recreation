#!/usr/bin/env node
'use strict';
// E16 牺牲 (sacrifice) — 8 standard story checks + episode narrative/pixel invariants.

const R = require('./render_E16_sacrifice_arena');
const { run, readPixels } = require('./check_overlap_story_common');

function upperScreenMeanLuma(frameIdx) {
  const d = readPixels(R.renderFrameToCanvas(frameIdx).baseCanvas).data;
  const maxY = R.SUB.y; // y=0..340 above subtitle bar
  let sum = 0;
  for (let y = 0; y < maxY; y++) {
    for (let x = 0; x < R.BW; x++) {
      const i = (y * R.BW + x) * 4;
      sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
  }
  return sum / (R.BW * maxY);
}

function checkEpisodeNarrative() {
  const issues = [];
  // 1) S1: `battery: 3%` + subtitle "（快没电了）"
  const s1All = R.S1_LINES.map(R.lineText).join('\n');
  if (!s1All.includes('battery: 3%')) issues.push('S1 missing "battery: 3%"');
  if (R.SUB_LINES[0] !== '（快没电了）') issues.push(`S1 subtitle mismatch: ${R.SUB_LINES[0]}`);

  // 2) S2: `transfer power → her_device` + progressive darkening across t=12s..19s
  const s2Cmd = R.lineText(R.S2_LINES[0]);
  if (!s2Cmd.includes('transfer power → her_device')) {
    issues.push(`S2 cmd missing "transfer power → her_device": "${s2Cmd}"`);
  }
  const luma12 = upperScreenMeanLuma(720);  // 12.0s
  const luma16 = upperScreenMeanLuma(960);  // 16.0s
  const luma19 = upperScreenMeanLuma(1140); // 19.0s
  if (!(luma12 > luma16 && luma16 > luma19)) {
    issues.push(`S2 screen did not progressively dim: luma(12s)=${luma12.toFixed(1)}, luma(16s)=${luma16.toFixed(1)}, luma(19s)=${luma19.toFixed(1)}`);
  }

  // 3) S3: almost completely black upper screen + lone bright green pixel dot @ (320, 176) + subtitle "（她还有电）"
  const luma25 = upperScreenMeanLuma(1500); // 25.0s
  if (luma25 > 8.0) issues.push(`S3 upper screen not near-black: luma(25s)=${luma25.toFixed(2)}`);
  const d25 = readPixels(R.renderFrameToCanvas(1500).baseCanvas).data;
  const gi = (176 * R.BW + 320) * 4;
  const [gr, gg, gb] = [d25[gi], d25[gi + 1], d25[gi + 2]];
  if (!(gg > 200 && gg > gr + 80 && gg > gb + 60)) {
    issues.push(`S3 green pixel dot missing/wrong color at (320,176): rgb(${gr},${gg},${gb})`);
  }
  if (R.SUB_LINES[2] !== '（她还有电）') issues.push(`S3 subtitle mismatch: ${R.SUB_LINES[2]}`);

  return issues;
}

const baseOk = run(R);
const epIssues = checkEpisodeNarrative();
console.log(`[${epIssues.length ? 'FAIL' : 'PASS'}] E16 剧情与像素亮度专项校验 (battery 3% / transfer+dim+smile / near-black+green-dot)`);
for (const msg of epIssues) console.log(`   - ${msg}`);
process.exit(baseOk && epIssues.length === 0 ? 0 : 1);
