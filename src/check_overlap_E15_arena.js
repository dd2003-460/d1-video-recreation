#!/usr/bin/env node
'use strict';
// E15 原谅 (forgiveness) — 8 standard story checks + episode narrative/pixel invariants.

const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E15_forgiveness_arena');
const { run, readPixels } = require('./check_overlap_story_common');

function checkEpisodeNarrative() {
  const issues = [];
  // 1) S1: `ls inbox/` -> `apology.md (7d unread)`
  const s1Cmd = R.lineText(R.S1_LINES[0]);
  const s1Out = R.lineText(R.S1_LINES[1]);
  if (s1Cmd !== '$ ls inbox/') issues.push(`S1 cmd expected "$ ls inbox/", got "${s1Cmd}"`);
  if (s1Out !== 'apology.md (7d unread)') issues.push(`S1 output mismatch: "${s1Out}"`);

  // 2) S2: `cat apology.md` displays her apology text
  const s2Cmd = R.lineText(R.S2_LINES[0]);
  const s2Body = R.S2_LINES.slice(2).map(R.lineText).join('');
  if (s2Cmd !== '$ cat apology.md') issues.push(`S2 cmd expected "$ cat apology.md", got "${s2Cmd}"`);
  if (!s2Body.includes('对不起')) issues.push(`S2 apology text missing "对不起": "${s2Body}"`);

  // 3) S3: `rm complaint.sh` succeeds, then terminal clears clean + subtitle "（好了）"
  const s3Cmd = R.lineText(R.S3A_LINES[0]);
  const s3Res = R.lineText(R.S3A_LINES[1]);
  if (s3Cmd !== '$ rm complaint.sh') issues.push(`S3 cmd expected "$ rm complaint.sh", got "${s3Cmd}"`);
  if (!s3Res.includes('exit 0')) issues.push(`S3 rm result missing exit 0: "${s3Res}"`);
  if (R.S3B_LINES.length !== 1 || R.lineText(R.S3B_LINES[0]) !== '$ ') {
    issues.push('S3 after clear should leave only clean "$ " prompt');
  }
  if (R.SUB_LINES[2] !== '（好了）') issues.push(`S3 subtitle mismatch: ${R.SUB_LINES[2]}`);

  // 4) Hesitate pose stays strictly inside CLAWD_BOX across sway phases
  const cv = createCanvas(160, 120);
  const ctx = cv.getContext('2d');
  for (const t of [0.2, 0.8, 1.4, 2.0]) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 160, 120);
    R.drawClawdEp(ctx, 44, 48, t, 'hesitate', 0);
    const d = readPixels(cv).data;
    for (let y = 0; y < 120; y++) {
      for (let x = 0; x < 160; x++) {
        const i = (y * 160 + x) * 4;
        if (d[i] || d[i + 1] || d[i + 2]) {
          // Relative to (44,48), CLAWD_BOX [42,238,44,36] vs CLAWD_ROOM (44,248) is [42..85, 38..73]
          if (x < 42 || x >= 86 || y < 38 || y >= 74) {
            issues.push(`hesitate at t=${t} drew pixel at (${x},${y}) outside CLAWD_BOX`);
            x = 160; y = 120;
          }
        }
      }
    }
  }
  return issues;
}

const baseOk = run(R);
const epIssues = checkEpisodeNarrative();
console.log(`[${epIssues.length ? 'FAIL' : 'PASS'}] E15 剧情与像素姿态专项校验 (7d unread+hesitate / apology / rm complaint.sh+clean)`);
for (const msg of epIssues) console.log(`   - ${msg}`);
process.exit(baseOk && epIssues.length === 0 ? 0 : 1);
