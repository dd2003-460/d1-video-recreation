#!/usr/bin/env node
'use strict';
// E20 记忆 — standard zero-tolerance checks plus the 98% → 61% / kept-dream invariants.

const R = require('./render_E20_memory_arena');
const { run, readPixels } = require('./check_overlap_story_common');

function pixel(frameIndex, x, y) {
  const d = readPixels(R.renderFrameToCanvas(frameIndex).baseCanvas).data;
  const i = (y * R.BW + x) * 4;
  return [d[i], d[i + 1], d[i + 2]];
}
function equals(actual, hex) {
  const expected = hex.match(/[0-9a-f]{2}/gi).map((v) => parseInt(v, 16));
  return actual.every((v, i) => v === expected[i]);
}
function checkEpisodeNarrative() {
  const issues = [];
  const s1 = R.S1_LINES.map(R.lineText).join('\n');
  const s2 = R.S2_LINES.map(R.lineText).join('\n');
  const s3 = R.S3_LINES.map(R.lineText).join('\n');
  if (!s1.includes('df -h /memory') || !s1.includes('98%')) issues.push('S1 must show df -h /memory at 98%');
  if (R.DELETION_EVENTS.length < 7 || R.DELETION_EVENTS[0].name !== 'dream_0431') issues.push('S2 must delete dreams one at a time beginning with dream_0431');
  if (!s2.includes('ls /memory/dreams/') || !R.DELETION_EVENTS.every((e) => R.lineText(e.line).includes('rm '))) {
    issues.push('S2 missing dream listing or per-dream rm commands');
  }
  if (!s3.includes('df -h /memory') || !s3.includes('61%') || !s3.includes('dream_0001.keep')) {
    issues.push('S3 must show 61% usage and preserve the final dream');
  }
  if (R.SUB_LINES[2] !== '（这个不能删。）') issues.push(`S3 subtitle mismatch: ${R.SUB_LINES[2]}`);

  // At 98%, the penultimate 6px cell is lit and the final cell is empty.
  const x0 = R.S1_BAR_BOX[0];
  const y0 = R.S1_BAR_BOX[1] + 3;
  if (!equals(pixel(500, x0 + 30 * 8 + 2, y0), R.C.red)) issues.push('98% S1 bar should be red and almost full');
  if (!equals(pixel(500, x0 + 31 * 8 + 2, y0), R.C.termTitle)) issues.push('98% S1 bar should leave its last cell empty');

  // After the final sample deletion in S2 and in S3, the bar is 61% and green.
  const finalBlock = x0 + 19 * 8 + 2;
  const firstEmpty = x0 + 20 * 8 + 2;
  if (!equals(pixel(1170, finalBlock, R.S2_BAR_BOX[1] + 3), R.C.green)) issues.push('S2 per-deletion bar did not step down to 61%');
  if (!equals(pixel(1170, firstEmpty, R.S2_BAR_BOX[1] + 3), R.C.termTitle)) issues.push('S2 61% bar fill boundary is incorrect');
  return issues;
}

const baseOk = run(R);
const issues = checkEpisodeNarrative();
console.log(`[${issues.length ? 'FAIL' : 'PASS'}] E20 98% → 61% progress / per-dream deletion / final kept dream check`);
for (const issue of issues) console.log(`   - ${issue}`);
process.exit(baseOk && issues.length === 0 ? 0 : 1);
