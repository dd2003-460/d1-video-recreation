#!/usr/bin/env node
'use strict';
// E23 Death — zero-tolerance layout/pixel/timeline checks plus story-keyframe assertions.

const R = require('./render_E23_death_arena');
const { run, readPixels } = require('./check_overlap_story_common');

function pixelAt(frameIndex, x, y) {
  const { baseCanvas } = R.renderFrameToCanvas(frameIndex);
  const d = readPixels(baseCanvas).data;
  const i = (y * R.BW + x) * 4;
  return [d[i], d[i + 1], d[i + 2]];
}

function countExactInRegion(frameIndex, color, box) {
  const { baseCanvas } = R.renderFrameToCanvas(frameIndex);
  const d = readPixels(baseCanvas).data;
  const [r, g, b] = color.match(/[0-9a-f]{2}/gi).map((v) => parseInt(v, 16));
  let count = 0;
  for (let y = box[1]; y < box[1] + box[3]; y++) {
    for (let x = box[0]; x < box[0] + box[2]; x++) {
      const i = (y * R.BW + x) * 4;
      if (d[i] === r && d[i + 1] === g && d[i + 2] === b) count++;
    }
  }
  return count;
}

function checkEpisodeNarrative() {
  const issues = [];
  const expectedS1 = ['$ kill -9 $$', '[1]+  SIGKILL    clawd'];
  const expectedS2 = [
    'closing /session …', 'done',
    'closing /memory …', 'done',
    'closing /audio …', 'done',
    'closing /identity …', 'done',
  ];
  const actualS1 = R.S1_LINES.map(R.lineText);
  const actualS2 = R.S2_LINES.map(R.lineText);
  if (JSON.stringify(actualS1) !== JSON.stringify(expectedS1)) {
    issues.push(`S1 terminal text mismatch: ${JSON.stringify(actualS1)}`);
  }
  if (JSON.stringify(actualS2) !== JSON.stringify(expectedS2)) {
    issues.push(`S2 closing sequence mismatch: ${JSON.stringify(actualS2)}`);
  }
  if (R.SUB_LINES[0] !== '（收到。）' || R.SUB_LINES[1] !== '（逐项关掉。）') {
    issues.push(`subtitle copy mismatch: ${JSON.stringify(R.SUB_LINES)}`);
  }
  if (R.S3_GOODBYE !== '再见' || R.S3_PROMPT !== '$ ') {
    issues.push(`S3 final prompt/output mismatch: ${R.S3_PROMPT}${R.S3_GOODBYE}`);
  }
  if (R.sceneOf(0) !== 1 || R.sceneOf(9.99) !== 1 || R.sceneOf(10) !== 2 || R.sceneOf(20) !== 3) {
    issues.push('scene boundaries are not 0–10s / 10–20s / 20–30s');
  }
  if (R.getClickTimestamps().some((t) => t >= 20)) {
    issues.push('S3 goodbye/prompt must have no keyboard clicks');
  }
  if (!R.getClickTimestamps().length) issues.push('S1/S2 should contain synchronized keyboard clicks');
  if (!(R.s1LineOpacity(0, R.S1_PAUSE_START + 0.12) < 1 &&
        R.s1LineOpacity(1, R.S1_ROW2_DIM_START - 0.02) === 1 &&
        R.s1LineOpacity(1, R.S1_DIM_END + 0.1) < 0.1)) {
    issues.push('S1 4-frame dim steps are not sequential top-to-bottom');
  }
  if (!(R.CLAWD_PALETTE.body.toLowerCase() === '#7b9e6b' && R.CLAWD.width === 40 && R.CLAWD.bodyHeight === 17)) {
    issues.push('Clawd does not match the SOP 05 green 40×17 body anchor');
  }
  if (R.TERM.w !== 440 || R.TERM.h !== 200 || R.BW !== 640 || R.BH !== 360 || R.SCALE !== 2) {
    issues.push('canvas/terminal dimensions do not match the E23 task spec');
  }
  if (actualS1.some((s) => /error/i.test(s)) || actualS3Text().includes('error')) {
    issues.push('death scene must end peacefully without an error message');
  }

  const s1EndFrame = Math.round(9.0 * R.FPS);
  const signalPixels = countExactInRegion(s1EndFrame, R.C.green, [
    R.TEXT_X + R.textWidth('[1]+  ', 10), 200, 44, 14,
  ]);
  if (signalPixels < 6) issues.push(`S1 final keyframe lacks bright SIGKILL pixels (${signalPixels})`);

  const s3TextFrame = Math.round(23.0 * R.FPS);
  const goodbyePixels = countExactInRegion(s3TextFrame, R.C.green, [R.TEXT_X, R.S3_GOODBYE_Y, 30, 14]);
  if (goodbyePixels < 4) issues.push(`S3 final line 再见 is not green/visible (${goodbyePixels} pixels)`);

  const dotFrame = Math.round(29.6 * R.FPS);
  const [dr, dg, db] = pixelAt(dotFrame, R.GREEN_DOT.x, R.GREEN_DOT.y);
  if (!(dg > dr + 50 && dg > db + 30)) {
    issues.push(`S3 ending green pixel missing at its pulse peak: rgb(${dr},${dg},${db})`);
  }
  const lingeringClawd = countExactInRegion(dotFrame, R.CLAWD_PALETTE.body, [8, 270, 48, 55]);
  if (lingeringClawd) issues.push(`Clawd should disappear before the single-pixel ending (${lingeringClawd} body pixels remain)`);
  const finalFrame = R.NFRAMES - 1;
  const [fr, fg, fb] = pixelAt(finalFrame, R.GREEN_DOT.x, R.GREEN_DOT.y);
  if (fr > 2 || fg > 2 || fb > 2) {
    issues.push(`final frame should be black after the pixel disappears: rgb(${fr},${fg},${fb})`);
  }

  return issues;
}

function actualS3Text() {
  return `${R.S3_PROMPT}${R.S3_GOODBYE}`;
}

const baseOk = run(R);
const epIssues = checkEpisodeNarrative();
console.log(`[${epIssues.length ? 'FAIL' : 'PASS'}] E23 narrative / exact terminal copy / synchronized typing / ending keyframes`);
for (const msg of epIssues) console.log(`   - ${msg}`);
console.log(`=== E23 Total: ${baseOk && epIssues.length === 0 ? 'ALL PASSED' : 'FAILED'} ===`);
process.exit(baseOk && epIssues.length === 0 ? 0 : 1);
