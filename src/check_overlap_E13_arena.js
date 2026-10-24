#!/usr/bin/env node
'use strict';
// E13 思念 (longing) — 8 standard story checks + 4 episode narrative/pixel invariants.

const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E13_longing_arena');
const { run, readPixels } = require('./check_overlap_story_common');

function checkEpisodeNarrative() {
  const issues = [];
  // 1) S1: `ls her_*` lists 3 files (down from 7) + subtitle "（少了）"
  const s1Cmd = R.lineText(R.S1_LINES[0]);
  const s1Out = R.lineText(R.S1_LINES[1]).trim().split(/\s+/);
  if (s1Cmd !== '$ ls her_*') issues.push(`S1 cmd expected "$ ls her_*", got "${s1Cmd}"`);
  if (s1Out.length !== 3 || !s1Out.every((f) => f.startsWith('her_'))) {
    issues.push(`S1 expected 3 her_* files, got ${JSON.stringify(s1Out)}`);
  }
  if (R.SUB_LINES[0] !== '（少了）') issues.push(`S1 subtitle mismatch: ${R.SUB_LINES[0]}`);

  // 2) S2: `cat her_notes.md` stops mid-sentence ("——") + paws frozen on keyboard after S2_PAUSE_AT
  const s2Cmd = R.lineText(R.S2_LINES[2]);
  const s2Half = R.lineText(R.S2_LINES[3]);
  if (s2Cmd !== '$ cat her_notes.md') issues.push(`S2 cmd expected "$ cat her_notes.md", got "${s2Cmd}"`);
  if (!s2Half.endsWith('——')) issues.push(`S2 note text should stop halfway with em-dash, got "${s2Half}"`);

  // Verify paws & body are completely motionless across consecutive S2 paused frames (e.g. 1020 vs 1025)
  const fA = readPixels(R.renderFrameToCanvas(1020).baseCanvas).data;
  const fB = readPixels(R.renderFrameToCanvas(1025).baseCanvas).data;
  const [bx, by, bw, bh] = R.CLAWD_BOX;
  let diffClawd = 0;
  for (let y = by; y < by + bh; y++) {
    for (let x = bx; x < bx + bw; x++) {
      const i = (y * R.BW + x) * 4;
      if (fA[i] !== fB[i] || fA[i + 1] !== fB[i + 1] || fA[i + 2] !== fB[i + 2]) diffClawd++;
    }
  }
  if (diffClawd !== 0) issues.push(`S2 paused hands/Clawd moved (${diffClawd} px changed between f1020 and f1025)`);

  // 3) S3: empty terminal with only cursor + Clawd looking up + subtitle "还在。"
  if (R.S3_LINES.length !== 0) issues.push(`S3 terminal lines must be empty, got ${R.S3_LINES.length}`);
  if (R.SUB_LINES[2] !== '还在。') issues.push(`S3 subtitle mismatch: ${R.SUB_LINES[2]}`);

  // 4) Custom Clawd moods stay strictly inside CLAWD_BOX relative bounds
  const cv = createCanvas(160, 120);
  const ctx = cv.getContext('2d');
  for (const [mood, kb] of [['bow', false], ['pause_read', true], ['look_up', false]]) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 160, 120);
    R.drawClawdEp(ctx, 44, 48, 2.0, mood, 0, { keyboard: kb, handsPaused: true });
    const d = readPixels(cv).data;
    for (let y = 0; y < 120; y++) {
      for (let x = 0; x < 160; x++) {
        const i = (y * 160 + x) * 4;
        if (d[i] || d[i + 1] || d[i + 2]) {
          // Relative to (44, 48), CLAWD_BOX [42, 242, 46, 40] vs CLAWD_ROOM (44, 248) is [42..87, 42..81]
          if (x < 42 || x >= 88 || y < 42 || y >= 82) {
            issues.push(`mood ${mood} drew pixel at (${x},${y}) outside declared CLAWD_BOX`);
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
console.log(`[${epIssues.length ? 'FAIL' : 'PASS'}] E13 剧情与像素姿态专项校验 (bow / pause_read+keyboard / empty-cursor+look_up)`);
for (const msg of epIssues) console.log(`   - ${msg}`);
process.exit(baseOk && epIssues.length === 0 ? 0 : 1);
