#!/usr/bin/env node
'use strict';
// E18 放手 — standard zero-tolerance checks plus review / archive / clean-prompt invariants.

const R = require('./render_E18_let_go_arena');
const { run } = require('./check_overlap_story_common');

function checkEpisodeNarrative() {
  const issues = [];
  const s1 = R.S1_LINES.map(R.lineText).join('\n');
  const s2 = R.S2_LINES.map(R.lineText).join('\n');
  const s3Early = R.S3_EARLY_LINES.map(R.lineText).join('\n');
  if (!s1.includes('$ ls her_*')) issues.push('S1 missing `ls her_*`');
  if (R.FILE_FOCUS.length !== 5) issues.push(`S1 inspects ${R.FILE_FOCUS.length} files; expected five visible beats`);
  if (!s2.includes('tar -czf archive/her.tar.gz her_*')) issues.push('S2 missing tar command');
  if (R.TAR_BAR_BOX[2] !== 254) issues.push('S2 archive progress bar geometry changed');
  if (!s3Early.includes('$ rm her_*')) issues.push('S3 missing `rm her_*` completion');
  if (!R.lineText(R.S3_PROMPT).endsWith('$')) issues.push('S3 should end with only a fresh shell prompt');
  if (R.SUB_LINES[2] !== '（干净了。）') issues.push(`S3 subtitle mismatch: ${R.SUB_LINES[2]}`);
  if (!(R.S3_CLEAR_AT > 22 && R.S3_CLEAR_AT < 24)) issues.push('S3 terminal should clear after the rm confirmation');
  return issues;
}

const baseOk = run(R);
const issues = checkEpisodeNarrative();
console.log(`[${issues.length ? 'FAIL' : 'PASS'}] E18 file-by-file review / tar progress / clean terminal check`);
for (const issue of issues) console.log(`   - ${issue}`);
process.exit(baseOk && issues.length === 0 ? 0 : 1);
