#!/usr/bin/env node
'use strict';
// E17 依赖 — standard zero-tolerance checks plus the 24h / retry / last-ping invariants.

const R = require('./render_E17_dependency_arena');
const { run, readPixels } = require('./check_overlap_story_common');

function pixelEquals(frameIndex, x, y, color) {
  const d = readPixels(R.renderFrameToCanvas(frameIndex).baseCanvas).data;
  const i = (y * R.BW + x) * 4;
  const expected = color.match(/[0-9a-f]{2}/gi).map((v) => parseInt(v, 16));
  return d[i] === expected[0] && d[i + 1] === expected[1] && d[i + 2] === expected[2];
}
function checkEpisodeNarrative() {
  const issues = [];
  const s1 = R.S1_LINES.map(R.lineText).join('\n');
  const s2 = R.S2_LINES.map(R.lineText).join('\n');
  if (!s1.includes('last her') || !s1.includes('24h ago')) issues.push('S1 must show last her and a 24h-old login');
  if (!s2.includes('cron: ping her') || (s2.match(/ping her \.\.\. no reply/g) || []).length < 4) {
    issues.push('S2 must start cron and show four unanswered pings');
  }
  if (R.lineText(R.S3_LINE) !== 'ping her ...') issues.push(`S3 final line mismatch: ${R.lineText(R.S3_LINE)}`);
  if (R.SUB_LINES[2] !== '等待应答。') issues.push(`S3 subtitle mismatch: ${R.SUB_LINES[2]}`);
  if (!(R.DROOP_CLAWD_BOX[0] + R.DROOP_CLAWD_BOX[2] < R.TERM.x)) issues.push('drooped tail must remain clear of the terminal');

  const cursorFrame = 22 * R.FPS;
  if (!pixelEquals(cursorFrame, R.S3_CURSOR_BOX[0] + 1, R.S3_CURSOR_BOX[1] + 1, R.C.green)) {
    issues.push('S3 slow green cursor is not visible after the final ping is typed');
  }
  return issues;
}

const baseOk = run(R);
const issues = checkEpisodeNarrative();
console.log(`[${issues.length ? 'FAIL' : 'PASS'}] E17 dependency narrative / terminal-only wait / drooped-tail check`);
for (const issue of issues) console.log(`   - ${issue}`);
process.exit(baseOk && issues.length === 0 ? 0 : 1);
