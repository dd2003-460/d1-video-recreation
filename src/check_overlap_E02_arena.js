#!/usr/bin/env node
'use strict';
// E02 快乐 — shared 8-point layout/pixel gate + joy-specific motion/confetti checks.
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E02_happy_arena');
const { run, readPixels } = require('./check_overlap_story_common');

// Reports stay out of the repo: this batch ships exactly 16 new files (4 per episode).
const REPORT = process.env.BATCH5_REPORT_DIR
  ? path.join(process.env.BATCH5_REPORT_DIR, 'E02_overlap.json')
  : path.join('/tmp', 'batch5_reports', 'E02_overlap.json');

// --- Joy-specific: the 4px jump is a real, time-boxed y displacement ------
function checkJump() {
  const issues = [];
  const peak = R.jumpOffset(R.JUMP_AT + R.JUMP_FRAMES / R.FPS / 2);
  if (peak !== -4) issues.push(`jump peak ${peak}px ≠ -4px`);
  if (R.jumpOffset(R.JUMP_AT - 0.02) !== 0) issues.push('jump starts before its cue');
  if (R.jumpOffset(R.JUMP_AT) !== 0) issues.push('first jump frame must be grounded');
  if (R.jumpOffset(R.JUMP_AT + R.JUMP_FRAMES / R.FPS) !== 0) issues.push('jump must land after 30 frames');
  const vals = new Set();
  for (let k = 0; k <= R.JUMP_FRAMES; k++) vals.add(R.jumpOffset(R.JUMP_AT + k / R.FPS));
  if (vals.size < 4) issues.push('jump does not travel smoothly');
  return { name: `Clawd 跳跃 4px 往返 / 30 帧 (${R.JUMP_AT}s)`, issues };
}

// --- Joy-specific: confetti count, size, palette and fall direction -------
function checkConfetti() {
  const issues = [];
  const mid = R.CONFETTI_AT + 0.45;
  const boxes = (R.layoutAt(mid).groups.fx || []).filter((b) => b.name.startsWith('confetti_'));
  if (boxes.length !== R.CONFETTI.length) issues.push(`${boxes.length} confetti visible ≠ ${R.CONFETTI.length}`);
  if (R.CONFETTI.length < 8 || R.CONFETTI.length > 12) issues.push(`confetti count ${R.CONFETTI.length} outside 8-12`);
  for (const b of boxes) {
    if (b.box[2] !== 4 || b.box[3] !== 4) issues.push(`${b.name} is ${b.box[2]}×${b.box[3]}, expected 4×4`);
    if (b.box[1] < R.CONFETTI_TOP) issues.push(`${b.name} spawned above the terminal content`);
  }
  // Falls (never rises) and eventually disappears.
  for (const p of R.CONFETTI) {
    const y1 = R.particleY(p, p.delay + 0.1);
    const y2 = R.particleY(p, p.delay + 0.4);
    if (!(y2 > y1)) issues.push(`confetti@${p.x} does not fall`);
    if (R.particleY(p, p.delay + p.life + 0.01) !== null) issues.push(`confetti@${p.x} never disappears`);
  }
  if (R.RESIDUAL.length < 2 || R.RESIDUAL.length > 3) issues.push('S3 should keep 2-3 residual pixels');
  const palette = new Set(R.CONFETTI.map((p) => p.color));
  if (palette.size < 4) issues.push(`confetti palette only ${palette.size} colours, expected red/amber/green/pink`);
  return { name: `像素彩点 ${R.CONFETTI.length}×4px（红黄绿粉 / 下落消失）+ 余韵 ${R.RESIDUAL.length}`, issues };
}

// --- Joy-specific: every click lands on a frame that visibly changes ------
function checkClickFramesDiffer() {
  const issues = [];
  const clicks = R.getClickTimestamps().filter((t) => t * R.FPS >= 2);
  for (const t of clicks.slice(0, 40)) {
    const n = Math.round(t * R.FPS);
    const a = readPixels(R.renderFrameToCanvas(n).baseCanvas).data;
    const b = readPixels(R.renderFrameToCanvas(n - 1).baseCanvas).data;
    let diff = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diff++;
    if (!diff) issues.push(`click @${t}s (frame ${n}) produced no visible pixel change`);
  }
  return { name: `键盘音与画面同步 (${Math.min(clicks.length, 40)} sampled clicks)`, issues };
}

// --- Joy-specific: story beats -------------------------------------------
function checkStoryBeats() {
  const issues = [];
  const text = (lines) => lines.map(R.lineText).join('\n');
  if (!text(R.S1_LINES).includes('PASS src/core.test.js')) issues.push('S1 misses the PASS lines');
  if (!text(R.S2_LINES).includes('All tests passed')) issues.push('S2 misses "All tests passed"');
  if (!text(R.S2_LINES).includes('12/12')) issues.push('S2 misses 12/12');
  if (!text(R.S3_LINES).includes('快乐 (0.95)')) issues.push('S3 misses the joy affect read-out');
  if (R.NOTE_TITLE !== '快乐。') issues.push('note must read 快乐。');
  if (R.sceneOf(9.9) !== 1 || R.sceneOf(10) !== 2 || R.sceneOf(20) !== 3) issues.push('scene boundaries are not 10s / 20s');
  return { name: '剧情贴合 episodes.md（三行 PASS → All tests passed → 快乐 0.95）', issues };
}

// --- Joy-specific: the jump is visible in pixels, not just in maths ------
function checkJumpVisible() {
  const issues = [];
  const n0 = Math.round((R.JUMP_AT - 0.1) * R.FPS);
  const n1 = Math.round((R.JUMP_AT + R.JUMP_FRAMES / R.FPS / 2) * R.FPS);
  const crop = (n) => {
    const d = readPixels(R.renderFrameToCanvas(n).baseCanvas).data;
    const out = [];
    for (let y = 228; y < 296; y++) for (let x = 40; x < 88; x++) {
      const i = (y * R.BW + x) * 4;
      out.push(d[i], d[i + 1], d[i + 2]);
    }
    return out;
  };
  const a = crop(n0);
  const b = crop(n1);
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
  if (!diff) issues.push('Clawd crop is unchanged at jump apex');
  return { name: '跳跃在像素层面可见（Clawd 区域帧差）', issues };
}

const extra = [checkJump(), checkConfetti(), checkClickFramesDiffer(), checkStoryBeats(), checkJumpVisible()];
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
console.log(`=== E02 summary: ${report.summary.checksPassed}/${report.summary.checksTotal} checks PASSED, ${report.summary.issues} issue(s) ===`);
process.exit(okBase && issues === 0 ? 0 : 1);
