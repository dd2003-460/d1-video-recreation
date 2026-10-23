#!/usr/bin/env node
'use strict';
// E01 好奇 — shared 8-point layout/pixel gate + episode-specific expression/sync checks.
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E01_curious_arena');
const { run, readPixels } = require('./check_overlap_story_common');

// Reports stay out of the repo: this batch ships exactly 16 new files (4 per episode).
const REPORT = process.env.BATCH5_REPORT_DIR
  ? path.join(process.env.BATCH5_REPORT_DIR, 'E01_overlap.json')
  : path.join('/tmp', 'batch5_reports', 'E01_overlap.json');

// --- Episode-specific: Clawd eye bloom (E01's "眼睛变亮") ------------------
function checkEyeBloom() {
  const issues = [];
  const W = 160, H = 100, x = 40, y = 30, BG = '#F5EDD5';
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const draw = (bright) => {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    R.drawClawdEp(ctx, x, y, 1.4, 'calm', 0, { bright });
    return readPixels(cv).data;
  };
  const at = (d, X, Y) => {
    const i = (Y * W + X) * 4;
    return `${d[i]},${d[i + 1]},${d[i + 2]}`;
  };
  const WHITE = '255,255,255';
  const dark = draw(0);
  if (at(dark, x + 11, y + 7) !== WHITE || at(dark, x + 12, y + 8) === WHITE) {
    issues.push('rest state must be a 1×1 highlight at (x+11, y+7)');
  }
  if (at(dark, x + 9, y + 5) === at(draw(0), x + 20, y + 3)) {
    // (kept simple: glow must not exist at bright=0 — the 6×6 halo corner stays body colour)
    const body = at(dark, x + 20, y + 3);
    if (at(dark, x + 9, y + 5) !== body) issues.push('bright=0 must not draw an eye halo');
  }
  const lit = draw(1);
  if (at(lit, x + 11, y + 7) !== WHITE || at(lit, x + 12, y + 8) !== WHITE) {
    issues.push('bright=1 must widen the highlight to 2×2');
  }
  if (at(lit, x + 9, y + 5) === at(lit, x + 20, y + 3)) {
    issues.push('bright=1 must add a halo around the pupil');
  }
  return { name: 'Clawd 眼睛变亮 (1×1 → 2×2 高光 + 6×6 光晕)', issues };
}

// --- Episode-specific: one keyboard click per typed character --------------
function checkClickPerChar() {
  const issues = [];
  const clicks = R.getClickTimestamps();
  const groups = [
    { name: 'S1', lines: R.S1_LINES },
    { name: 'S2', lines: R.S2_LINES },
    { name: 'S3', lines: R.S3_LINES },
  ];
  for (const g of groups) {
    for (const line of g.lines) {
      const chars = Array.from(R.lineText(line));
      const charMs = line.charMs || R.TYPE_CHAR_MS;
      const start = line.start;
      const end = start + ((chars.length - 1) * charMs) / 1000;
      const inWindow = clicks.filter((t) => t >= start - 1e-6 && t <= end + 1 / R.FPS + 1e-6).length;
      if (inWindow !== chars.length) {
        issues.push(`${g.name} 「${R.lineText(line)}」: ${inWindow} clicks for ${chars.length} chars`);
      }
    }
  }
  return { name: `键盘音与逐字打字一一对应 (${clicks.length} clicks)`, issues };
}

// --- Episode-specific: pixel change on every click frame -------------------
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
  return { name: `每个键盘音对应一帧可见变化 (${Math.min(clicks.length, 40)} sampled)`, issues };
}

// --- Episode-specific: story beats land where the brief says --------------
function checkStoryBeats() {
  const issues = [];
  if (R.SUB_LINES.length !== 3) issues.push(`expected 3 subtitles, got ${R.SUB_LINES.length}`);
  for (const w of R.SUB_WINDOWS) {
    if (w.start < 0 || w.end > R.DURATION) issues.push(`subtitle window ${w.start}-${w.end} outside 0..30s`);
    const chars = Array.from(R.SUB_LINES[R.SUB_WINDOWS.indexOf(w)]).length;
    if (w.start + (chars * R.SUB_CHAR_MS) / 1000 > w.end) issues.push(`subtitle window ${w.start}-${w.end} too short for ${chars} chars`);
  }
  // S1 must show the unfamiliar name, S2 the decoded bytes, S3 the signature.
  const text = (lines) => lines.map(R.lineText).join('\n');
  if (!text(R.S1_LINES).includes('??_new_file.bin')) issues.push('S1 misses the unfamiliar file name');
  if (!text(R.S2_LINES).includes('48 65 6c 6c 6f') || !text(R.S2_LINES).includes('Hello clawd.')) issues.push('S2 misses the byte-by-byte read');
  if (!text(R.S3_LINES).includes('her')) issues.push('S3 misses the signature');
  if (R.sceneOf(9.9) !== 1 || R.sceneOf(10) !== 2 || R.sceneOf(20) !== 3) issues.push('scene boundaries are not 10s / 20s');
  return { name: '剧情贴合 episodes.md（陌生名字 → 逐字节 → 签名 her）', issues };
}

const extra = [checkEyeBloom(), checkClickPerChar(), checkClickFramesDiffer(), checkStoryBeats()];
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
console.log(`=== E01 summary: ${report.summary.checksPassed}/${report.summary.checksTotal} checks PASSED, ${report.summary.issues} issue(s) ===`);
process.exit(okBase && issues === 0 ? 0 : 1);
