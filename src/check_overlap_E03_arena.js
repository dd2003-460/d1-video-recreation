#!/usr/bin/env node
'use strict';
// E03 悲伤 — shared 8-point layout/pixel gate + sorrow-specific cursor/dim checks.
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E03_sad_arena');
const { run, readPixels } = require('./check_overlap_story_common');

// Reports stay out of the repo: this batch ships exactly 16 new files (4 per episode).
const REPORT = process.env.BATCH5_REPORT_DIR
  ? path.join(process.env.BATCH5_REPORT_DIR, 'E03_overlap.json')
  : path.join('/tmp', 'batch5_reports', 'E03_overlap.json');

// --- Sorrow-specific: the cursor actually slows down ----------------------
function checkCursorRhythm() {
  const issues = [];
  const onFrames = (period, from, to) => {
    let toggles = 0;
    let prev = R.cursorOn(from, period);
    for (let n = Math.round(from * R.FPS); n < Math.round(to * R.FPS); n++) {
      const cur = R.cursorOn(n / R.FPS, period);
      if (cur !== prev) toggles++;
      prev = cur;
    }
    return toggles;
  };
  const s1 = onFrames(R.S2_CURSOR_PERIOD, 10, 20);
  const s2 = onFrames(R.S3_CURSOR_PERIOD, 20, 30);
  if (R.S2_CURSOR_PERIOD < 1.0) issues.push(`S2 blink period ${R.S2_CURSOR_PERIOD}s must be slow (1.2s)`);
  if (R.S3_CURSOR_PERIOD < 1.9) issues.push(`S3 blink period ${R.S3_CURSOR_PERIOD}s must be very slow (2s)`);
  if (s2 >= s1) issues.push(`S3 cursor (${s2} toggles) is not slower than S2 (${s1} toggles)`);
  if (s1 < 4) issues.push('S2 cursor barely blinks');
  return { name: `光标变慢：S2 ${R.S2_CURSOR_PERIOD}s / S3 ${R.S3_CURSOR_PERIOD}s (${s1} → ${s2} toggles)`, issues };
}

// --- Sorrow-specific: typed, then deleted back to the bare prompt --------
function checkTypeThenDelete() {
  const issues = [];
  const chars = Array.from(R.S2_TYPED);
  const len = chars.length;
  const shownAt = (t) => R.typedCount(t, len, R.S2_TYPE_AT, R.S2_TYPE_MS, R.S2_DEL_AT, R.S2_DEL_MS);
  const typedFull = R.S2_TYPE_AT + (len * R.S2_TYPE_MS) / 1000;
  const deletedAll = R.S2_DEL_AT + (len * R.S2_DEL_MS) / 1000;
  if (typedFull > R.S2_DEL_AT) issues.push('typing overlaps deletion');
  if (deletedAll > 19.6) issues.push(`deletion ends ${deletedAll.toFixed(2)}s, past the S2 window`);
  if (shownAt(typedFull + 0.05) !== len) issues.push('typed text never completes');
  if (shownAt(deletedAll + 0.1) !== 0) issues.push('typed text is never fully deleted');
  // Monotonic down after the delete starts.
  let prev = shownAt(R.S2_DEL_AT);
  for (let t = R.S2_DEL_AT; t <= deletedAll + 0.1; t += 1 / R.FPS) {
    const cur = shownAt(t);
    if (cur > prev) issues.push(`deletion grows at ${t.toFixed(2)}s`);
    prev = cur;
  }
  // Pixel proof on the real frame: ink in the prompt row appears, then goes.
  // Sampled only on cursor-on frames, so the blink itself cannot confound the count.
  const inkOnCursorFrame = (t) => {
    let tt = t;
    for (let i = 0; i < 90 && !R.cursorOn(tt, R.S2_CURSOR_PERIOD); i++) tt += 1 / R.FPS;
    return ink(tt);
  };
  const ink = (t) => {
    const d = readPixels(R.renderFrameToCanvas(Math.round(t * R.FPS)).baseCanvas).data;
    let n = 0;
    for (let y = 174; y < 188; y++) for (let x = 114; x < 500; x++) {
      const i = (y * R.BW + x) * 4;
      if (d[i] + d[i + 1] + d[i + 2] > 150) n++;
    }
    return n;
  };
  const bare = inkOnCursorFrame(R.S2_TYPE_AT + 0.02);
  const mid = inkOnCursorFrame(typedFull + 0.05);
  const after = inkOnCursorFrame(deletedAll + 0.15);
  if (!(mid > bare)) issues.push(`typing produced no ink (${bare} → ${mid})`);
  if (!(after < mid)) issues.push(`deleting removed no ink (${mid} → ${after})`);
  return { name: `打字又删掉：\`${R.S2_TYPED}\` ${R.S2_TYPE_AT}s→${typedFull.toFixed(2)}s，删除 ${R.S2_DEL_AT}s→${deletedAll.toFixed(2)}s`, issues };
}

// --- Sorrow-specific: room dims after rm and stays dim -------------------
function checkRoomDims() {
  const issues = [];
  const corner = (n) => {
    const d = readPixels(R.renderFrameToCanvas(n).baseCanvas).data;
    const i = (8 * R.BW + 8) * 4; // wall pixel, far from the terminal
    return d[i] + d[i + 1] + d[i + 2];
  };
  const before = corner(Math.round((R.RM_AT - 0.5) * R.FPS));
  const after = corner(Math.round((R.RM_AT + 1.0) * R.FPS));
  const later = corner(Math.round(25 * R.FPS));
  if (!(after < before)) issues.push(`room did not dim after rm (${before} → ${after})`);
  if (after !== later) issues.push('room brightness is not held through S3');
  return { name: `rm 之后房间亮度 -${Math.round(R.DIM * 100)}% 并保持`, issues };
}

function checkStoryBeats() {
  const issues = [];
  const text = R.S1_LINES.map(R.lineText).join('\n');
  if (!text.includes('rm her_*')) issues.push('S1 misses `rm her_*`');
  if (!text.includes('her_notes.txt')) issues.push('S1 misses the files that disappear');
  if (R.NOTE_TITLE !== '悲伤。') issues.push('note must read 悲伤。');
  if (R.SUB_LINES.length !== 3) issues.push('expected 3 subtitles');
  if (R.sceneOf(9.9) !== 1 || R.sceneOf(10) !== 2 || R.sceneOf(20) !== 3) issues.push('scene boundaries are not 10s / 20s');
  return { name: '剧情贴合 episodes.md（rm → 空终端 → 慢闪光标）', issues };
}

// --- Sorrow-specific: the sad face is drawn, not just labelled ----------
function checkSadFace() {
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
  const WHITE = '255,255,255';
  const calm = draw('calm', 0);
  const sad = draw('sad', 2);
  if (at(calm, x + 11, y + 7) !== WHITE) issues.push('calm eyes lost their 1×1 highlight');
  if (at(sad, x + 11, y + 7) === WHITE) issues.push('sad eyes must not keep the highlight');
  if (at(sad, x + 10, y + 6) === at(calm, x + 10, y + 6)) issues.push('sad eyes are not lowered');
  if (at(sad, x + 20, y + 2) === at(calm, x + 20, y + 2)) issues.push('sad head is not dropped 2px');
  // Mouth must curve down at the corners (frown), not up (smile).
  const eye = '20,20,19'; // C.clawdEye #141413
  const mouthCorner = at(sad, x + 16, y + 2 + 13);
  const mouthMiddle = at(sad, x + 19, y + 2 + 12);
  if (mouthCorner !== eye || mouthMiddle !== eye) issues.push('sad mouth pixels missing');
  if (at(sad, x + 19, y + 2 + 13) === eye) issues.push('sad mouth dips in the middle (smile, not frown)');
  const smile = R.art.drawClawd ? draw('smile', 0) : null;
  if (smile && at(smile, x + 19, y + 13) !== eye) issues.push('shared smile arc lost its middle pixel');
  return { name: 'Clawd sad：眼睛半闭 + 下压的嘴角 + 头低 2px', issues };
}

const extra = [checkCursorRhythm(), checkTypeThenDelete(), checkRoomDims(), checkStoryBeats(), checkSadFace()];
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
console.log(`=== E03 summary: ${report.summary.checksPassed}/${report.summary.checksTotal} checks PASSED, ${report.summary.issues} issue(s) ===`);
process.exit(okBase && issues === 0 ? 0 : 1);
