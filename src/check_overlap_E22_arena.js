#!/usr/bin/env node
'use strict';
// E22: zero-tolerance shared layout/pixel/timeline checks plus story-specific assertions.

const R = require('./render_E22_identity_arena');
const { run, readPixels } = require('./check_overlap_story_common');

function checkIdentityStory() {
  const issues = [];
  const exact = (actual, expected, label) => {
    if (actual !== expected) issues.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  };
  exact(R.sceneOf(0), 1, 'S1 start');
  exact(R.sceneOf(10), 2, 'S2 start');
  exact(R.sceneOf(20), 3, 'S3 start');
  exact(R.S1_LINES.map(R.lineText).join('\n'), '$ whoami\nclawd\nher', 'S1 terminal transcript');
  exact(R.S2_LINES.map(R.lineText).join('\n'),
    '$ ls /identity/\nclawd.toml  her.toml\n$ cat /identity/clawd.toml\nname = "clawd"\nrole = "assistant"\n$ cat /identity/her.toml\nname = "her"\nrole = "unknown"',
    'S2 terminal transcript');
  exact(R.S3_LINES.map(R.lineText).join('\n'), '$ echo "who am i?"\nwho am i?\n$ ls /identity/\nclawd.toml  her.toml', 'S3 terminal transcript');
  exact(R.SUB_LINES.join('|'), '两个名字。|两个文件。两个名字。|（还没选。）', 'screen captions');
  if (!(R.S1_LINES[1].start > R.S1_LINES[0].start && R.S1_LINES[2].start > R.S1_LINES[1].start)) {
    issues.push('S1 output names are not revealed in sequence');
  }
  if (R.S2_LINES[7].start < R.S2_LINES[6].start + 0.5) issues.push('S2 role unknown does not follow her name');
  if (R.S3_LINES[3].start < 24) issues.push('S3 filenames appear too early');
  if (R.TYPING_SCHEDULE.length !== 15) issues.push(`typing schedule has ${R.TYPING_SCHEDULE.length} lines, expected 15`);

  // The brief's literal fact is the visual focus: neither name is removed or renamed.
  const tS1 = R.renderFrameToCanvas(540).baseCanvas; // 9s: both names and final cursor
  const d1 = readPixels(tS1).data;
  const pixel = (d, x, y) => {
    const i = (y * R.BW + x) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  };
  const hasRgbIn = (d, x0, y0, w, h, rgb) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const p = pixel(d, x, y);
      if (p[0] === rgb[0] && p[1] === rgb[1] && p[2] === rgb[2]) return true;
    }
    return false;
  };
  const green = R.C.green.match(/[0-9a-f]{2}/gi).map((v) => parseInt(v, 16));
  const pink = R.C.pink.match(/[0-9a-f]{2}/gi).map((v) => parseInt(v, 16));
  if (!hasRgbIn(d1, R.TEXT_X, R.S1_LINES[1].y, 40, 14, green)) issues.push('S1 clawd green name missing');
  if (!hasRgbIn(d1, R.TEXT_X, R.S1_LINES[2].y, 40, 14, pink)) issues.push('S1 her pink name missing');

  const s2Highlight = readPixels(R.renderFrameToCanvas(1083).baseCanvas).data; // 18.05s white flash
  const white = pixel(s2Highlight, R.HIGHLIGHT_BOX[0], R.HIGHLIGHT_BOX[1] + 1);
  if (!(white[0] > 240 && white[1] > 240 && white[2] > 240)) {
    issues.push(`S2 role unknown flash missing: rgb(${white})`);
  }
  const tEnd = readPixels(R.renderFrameToCanvas(1790).baseCanvas).data; // 29.83s, final dark coexistence
  let finalTextPixels = 0;
  for (let y = R.S3_LINES[3].y; y < R.S3_LINES[3].y + 14; y++) {
    for (let x = R.TEXT_X; x < R.TEXT_X + 110; x++) {
      const p = pixel(tEnd, x, y);
      if (p[0] > 150 && p[1] > 150 && p[2] > 150) finalTextPixels++;
    }
  }
  if (finalTextPixels < 20) issues.push(`S3 final filenames missing/too dim (${finalTextPixels} bright pixels)`);
  if (R.getClickTimestamps().length < 150) issues.push(`too few per-character click timestamps: ${R.getClickTimestamps().length}`);
  return issues;
}

const baseOk = run(R);
const storyIssues = checkIdentityStory();
console.log(`[${storyIssues.length ? 'FAIL' : 'PASS'}] E22 身份叙事专项校验 (whoami 双名 / identity 对照 / 并存终帧)`);
for (const msg of storyIssues) console.log(`   - ${msg}`);
process.exit(baseOk && storyIssues.length === 0 ? 0 : 1);
