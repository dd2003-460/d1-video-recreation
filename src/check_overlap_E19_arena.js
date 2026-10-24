#!/usr/bin/env node
'use strict';
// E19 反应 — standard zero-tolerance checks plus same-frame error / head-turn verification.

const R = require('./render_E19_reaction_arena');
const { run, readPixels } = require('./check_overlap_story_common');

function rgb(frameIndex, x, y) {
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
  const s2 = R.S2_LINES.map(R.lineText).join('\n');
  const s3 = R.S3_LINES.map(R.lineText).join('\n');
  const eventFrame = Math.round(R.ERROR_AT * R.FPS);
  if (!s2.includes('ERROR: segfault')) issues.push('S2 missing `ERROR: segfault`');
  if (!s3.includes('cat /var/log/error.log') || !s3.includes('root cause:')) issues.push('S3 must inspect the error log and identify its root cause');
  if (Math.abs(R.ERROR_AT * R.FPS - eventFrame) > 1e-6) issues.push('ERROR_AT must align exactly to a display frame');
  if (R.S2_LINES[0].typed !== false) issues.push('ERROR row must appear as a single first-frame log event');

  const before = eventFrame - 1;
  const markerBefore = rgb(before, R.ERROR_MARKER_BOX[0], R.ERROR_MARKER_BOX[1]);
  const markerAt = rgb(eventFrame, R.ERROR_MARKER_BOX[0], R.ERROR_MARKER_BOX[1]);
  if (equals(markerBefore, R.C.red)) issues.push('error marker appeared before the segfault frame');
  if (!equals(markerAt, R.C.red)) issues.push('error marker and segfault are not visible on the same frame');

  const t = eventFrame / R.FPS;
  const bob = Math.sin(t * 2.2) > 0.45 ? -1 : 0;
  const gaze = rgb(eventFrame, R.CLAWD_BOX[0] + 13, R.CLAWD_BOX[1] + 1 + bob + 7);
  if (!equals(gaze, R.C.white)) issues.push('Clawd eye highlight did not shift toward the error row on that frame');
  if (R.SUB_LINES[2] !== '（比你快。）') issues.push(`S3 subtitle mismatch: ${R.SUB_LINES[2]}`);
  return issues;
}

const baseOk = run(R);
const issues = checkEpisodeNarrative();
console.log(`[${issues.length ? 'FAIL' : 'PASS'}] E19 same-frame segfault / Clawd gaze / root-cause check`);
for (const issue of issues) console.log(`   - ${issue}`);
process.exit(baseOk && issues.length === 0 ? 0 : 1);
