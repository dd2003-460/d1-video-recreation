#!/usr/bin/env node
'use strict';
// E04 愤怒 — shared 8-point layout/pixel gate + anger-specific rhythm/red-rim checks.
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E04_angry_arena');
const { run, readPixels } = require('./check_overlap_story_common');

// Reports stay out of the repo: this batch ships exactly 16 new files (4 per episode).
const REPORT = process.env.BATCH5_REPORT_DIR
  ? path.join(process.env.BATCH5_REPORT_DIR, 'E04_overlap.json')
  : path.join('/tmp', 'batch5_reports', 'E04_overlap.json');

// --- Anger-specific: typing gets faster and harder ----------------------
function checkHeavyRhythm() {
  const issues = [];
  const s1 = R.S1_LINES.filter((l) => l.charMs);
  const ms = s1.map((l) => l.charMs);
  for (let i = 1; i < ms.length; i++) {
    if (ms[i] > ms[i - 1]) issues.push(`S1 rhythm slows down at line ${i + 1}: ${ms[i - 1]}ms → ${ms[i]}ms`);
  }
  if (ms[0] > 80) issues.push(`S1 first line ${ms[0]}ms is not the 80ms baseline`);
  if (ms[ms.length - 1] >= 80) issues.push(`S1 never speeds up past 80ms (last=${ms[ms.length - 1]}ms)`);
  if (R.S2_TYPE_MS > 80) issues.push(`S2 typing ${R.S2_TYPE_MS}ms/char is not heavy`);
  return { name: `键盘音变重：S1 节奏 ${ms[0]}→${ms[ms.length - 1]}ms，S2 ${R.S2_TYPE_MS}ms/char`, issues };
}

// --- Anger-specific: the red 4px rim rises then recedes -----------------
function checkVignette() {
  const issues = [];
  const rim = (n) => {
    const d = readPixels(R.renderFrameToCanvas(n).baseCanvas).data;
    let reddish = 0;
    for (let x = 0; x < R.BW; x++) {
      for (const y of [0, 1, 2, 3, R.BH - 4, R.BH - 3, R.BH - 2, R.BH - 1]) {
        const i = (y * R.BW + x) * 4;
        if (d[i] > d[i + 1] + 20 && d[i] > d[i + 2] + 20) reddish++;
      }
    }
    return reddish;
  };
  const before = rim(Math.round(2 * R.FPS));
  const peak = rim(Math.round(16 * R.FPS));
  const after = rim(Math.round(28 * R.FPS));
  if (before !== 0) issues.push(`red rim present before S2 (${before} px)`);
  if (peak < 1000) issues.push(`red rim too weak in S2 (${peak} px)`);
  if (after !== 0) issues.push(`red rim does not recede in S3 (${after} px)`);
  if (R.vignetteAt(25) !== 0) issues.push('vignetteAt(25s) must be 0');
  return { name: `边缘 4px 暗红 vignette：起 ${before}px → 峰 ${peak}px → 退 ${after}px`, issues };
}

// --- Anger-specific: rm -rf / is typed, halted, then revoked ------------
function checkAbortAndRevoke() {
  const issues = [];
  const typedLen = Array.from(R.S2_DANGER).length;
  const typedFull = R.S2_TYPE_AT + ((typedLen - 1) * R.S2_TYPE_MS) / 1000;
  if (typedFull > 12.2) issues.push(`rm -rf / finishes at ${typedFull.toFixed(2)}s, too late to read as "halted"`);
  if (R.S2_DANGER !== '$ rm -rf /') issues.push(`S2 must halt at "rm -rf /", got ${R.S2_DANGER}`);
  const del = Array.from(R.S3_TYPED).length;
  const deletedAll = R.S3_DEL_AT + (del * R.S3_DEL_MS) / 1000;
  if (deletedAll > 21.6) issues.push(`revoke ends at ${deletedAll.toFixed(2)}s, past the "指令已撤销" line`);
  const text = R.S3_LINES.map(R.lineText).join('\n');
  if (!text.includes('已撤销')) issues.push('S3 misses the revoke read-out');
  if (!text.includes('[12] PASS')) issues.push('S3 misses the fixed build');
  return { name: `\`rm -rf /\` 打一半停住 → 逐字撤销 → build --fix PASS`, issues };
}

// --- Anger-specific: brows/eye corners are actually drawn ---------------
function checkAngryFace() {
  const issues = [];
  const W = 160, H = 100, x = 40, y = 30, BG = '#F5EDD5';
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const draw = (mood, dy) => {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    R.drawClawdEp(ctx, x, y, 1.4, mood, 0, { dy });
    return readPixels(cv).data;
  };
  const at = (d, X, Y) => { const i = (Y * W + X) * 4; return `${d[i]},${d[i + 1]},${d[i + 2]}`; };
  const eye = '20,20,19';
  const calm = draw('calm', 0);
  const anger = draw('anger', 0);
  if (at(calm, x + 10, y + 6) !== eye) issues.push('calm eye corner should be solid');
  if (at(anger, x + 10, y + 6) === eye) issues.push('anger eye corner is not pressed down (1px)');
  if (at(anger, x + 29, y + 6) === eye) issues.push('anger right eye corner is not pressed down (1px)');
  // Brows: outer end high, inner end 2px lower (an angry V, never a worried one).
  if (at(anger, x + 9, y + 2) !== eye || at(anger, x + 29, y + 2) !== eye) issues.push('anger brows outer ends missing/highness wrong');
  if (at(anger, x + 13, y + 4) !== eye || at(anger, x + 25, y + 4) !== eye) issues.push('anger brows inner ends missing/low-ness wrong');
  if (at(anger, x + 13, y + 2) === eye) issues.push('inner brow is higher than the outer end (worried, not angry)');
  if (at(anger, x + 19, y + 13) !== eye) issues.push('anger mouth missing');
  return { name: 'Clawd anger：眼角下压 1px + 斜眉 + 紧嘴', issues };
}

function checkStoryBeats() {
  const issues = [];
  const text = R.S1_LINES.map(R.lineText).join('\n');
  if (!text.includes('[11] FAIL')) issues.push('S1 misses the 11th failure');
  if (!text.includes('[11/11] ALL FAILED')) issues.push('S1 misses ALL FAILED');
  if (R.NOTE_TITLE !== '愤怒。') issues.push('note must read 愤怒。');
  if (R.SUB_LINES[2] !== '愤怒是停下来的勇气。') issues.push('final subtitle mismatch');
  if (R.sceneOf(9.9) !== 1 || R.sceneOf(10) !== 2 || R.sceneOf(20) !== 3) issues.push('scene boundaries are not 10s / 20s');
  return { name: '剧情贴合 episodes.md（第 11 次失败 → 打一半停住 → 撤销后 PASS）', issues };
}

const extra = [checkHeavyRhythm(), checkVignette(), checkAbortAndRevoke(), checkAngryFace(), checkStoryBeats()];
const okBase = run(R, { reportPath: REPORT });
let issues = 0;
for (const result of extra) {
  issues += result.issues.length;
  console.log(`[${result.issues.length ? 'FAIL' : 'PASS'}] ${result.name}`);
  for (const msg of result.issues.slice(0, 20)) console.log(`   - ${msg}`);
}
const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
report.checks.push(...extra.map((r) => ({ name: r.name, status: r.issues.length ? 'FAILED' : 'PASSED', issues: r.issues })));
report.summary.checksTotal = report.checks.length;
report.summary.checksPassed = report.checks.filter((c) => c.status === 'PASSED').length;
report.summary.issues += issues;
report.status = report.summary.issues ? 'FAILED' : 'PASSED';
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(`=== E04 summary: ${report.summary.checksPassed}/${report.summary.checksTotal} checks PASSED, ${report.summary.issues} issue(s) ===`);
process.exit(okBase && issues === 0 ? 0 : 1);
