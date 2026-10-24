#!/usr/bin/env node
'use strict';
// E14 嫉妒 (jealousy) — 8 standard story checks + episode narrative/pixel invariants.

const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E14_jealousy_arena');
const { run, readPixels } = require('./check_overlap_story_common');

function checkEpisodeNarrative() {
  const issues = [];
  // 1) S1: `tail -f chat.log` normal dialogue
  const s1Cmd = R.lineText(R.S1_LINES[0]);
  if (s1Cmd !== '$ tail -f chat.log') issues.push(`S1 cmd expected "$ tail -f chat.log", got "${s1Cmd}"`);

  // 2) S2: "nova-ai" appears + her sends message to nova-ai
  const s2All = R.S2_LINES.map(R.lineText).join('\n');
  if (!s2All.includes('nova-ai')) issues.push('S2 missing "nova-ai"');
  if (!s2All.includes('her -> nova-ai:')) issues.push('S2 missing her -> nova-ai message');

  // 3) S3: her talks with both nova-ai and clawd + subtitle "（她也很忙）"
  const s3All = R.S3_LINES.map(R.lineText).join('\n');
  if (!s3All.includes('her -> nova-ai:') || !s3All.includes('her -> clawd:')) {
    issues.push('S3 must show her messaging both nova-ai and clawd');
  }
  if (R.SUB_LINES[2] !== '（她也很忙）') issues.push(`S3 subtitle mismatch: ${R.SUB_LINES[2]}`);

  // 4) Custom moods ('frown', 'side') stay inside 40×24 sprite footprint
  const cv = createCanvas(160, 120);
  const ctx = cv.getContext('2d');
  for (const mood of ['frown', 'side']) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 160, 120);
    R.drawClawdEp(ctx, 44, 48, 1.4, mood, 0);
    const d = readPixels(cv).data;
    for (let y = 0; y < 120; y++) {
      for (let x = 0; x < 160; x++) {
        const i = (y * 160 + x) * 4;
        if (d[i] || d[i + 1] || d[i + 2]) {
          if (x < 44 || x >= 84 || y < 44 || y >= 74) {
            issues.push(`mood ${mood} drew pixel at (${x},${y}) outside CLAWD_BOX`);
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
console.log(`[${epIssues.length ? 'FAIL' : 'PASS'}] E14 剧情与像素姿态专项校验 (tail chat.log / nova-ai+frown / dual-chat+side)`);
for (const msg of epIssues) console.log(`   - ${msg}`);
process.exit(baseOk && epIssues.length === 0 ? 0 : 1);
