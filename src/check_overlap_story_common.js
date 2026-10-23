#!/usr/bin/env node
'use strict';
// Shared zero-tolerance geometric, text, pixel-art and timeline checks.

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');

function overlap(a, b) {
  return Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]) > 0 &&
    Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]) > 0;
}
function interArea(a, b) {
  const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return Math.max(0, w) * Math.max(0, h);
}
function outside(box, b) {
  return box[0] < b.x || box[1] < b.y || box[0] + box[2] > b.x + b.w || box[1] + box[3] > b.y + b.h;
}
function readPixels(canvas) { return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height); }
function hexAt(d, width, x, y) {
  if (x < 0 || y < 0 || x >= width || y >= d.length / (width * 4)) return '#out';
  const i = (y * width + x) * 4;
  return `#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function checkSpecs(R) {
  const issues = [];
  const eq = (actual, expected, label) => { if (actual !== expected) issues.push(`${label}: ${actual} ≠ ${expected}`); };
  eq(R.BW, 640, 'BW'); eq(R.BH, 360, 'BH'); eq(R.SCALE, 2, 'SCALE');
  eq(R.FW, 1280, 'output width'); eq(R.FH, 720, 'output height');
  eq(R.FPS, 60, 'FPS'); eq(R.DURATION, 30, 'duration'); eq(R.NFRAMES, 1800, 'frames');
  eq(R.TERM.x, 100, 'terminal x'); eq(R.TERM.y, 140, 'terminal y');
  eq(R.TERM.w, 440, 'terminal width'); eq(R.TERM.h, 200, 'terminal height');
  eq(R.TERM.titleH, 20, 'title bar height'); eq(R.CONTENT.h, 180, 'content height');
  if (!/FusionPixel/i.test(R.art.FONT_10)) issues.push(`FONT_10 is not Fusion Pixel: ${R.art.FONT_10}`);
  const ascii = R.textWidth('A', 10);
  const cjk = R.textWidth('她', 10);
  if (ascii !== 5) issues.push(`10px ASCII width ${ascii} ≠ 5`);
  if (cjk !== 10) issues.push(`10px CJK width ${cjk} ≠ 10`);
  return { name: '画布 / 440×200 终端 / Fusion Pixel 10px', issues };
}

function checkTextNoAA(R) {
  const issues = [];
  const cv = createCanvas(700, 80);
  const ctx = cv.getContext('2d');
  for (const sample of R.AA_SAMPLES) {
    ctx.fillStyle = '#14161C';
    ctx.fillRect(0, 0, cv.width, cv.height);
    R.art.txt(ctx, 8, 8, sample.text, sample.color, sample.size || 10);
    const d = readPixels(cv).data;
    const colors = new Set();
    for (let i = 0; i < d.length; i += 4) colors.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    if (colors.size !== 2) issues.push(`「${sample.text}」has ${colors.size} colors; expected text/background only`);
  }
  return { name: `点阵文字阈值二值化、无抗锯齿灰边 (${R.AA_SAMPLES.length} samples)`, issues };
}

function checkClawd(R) {
  const A = R.art;
  const C = A.C;
  const issues = [];
  const W = 240, H = 140, x = 60, y = 40, BG = '#F5EDD5';
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const draw = (mood) => {
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    A.drawClawd(ctx, x, y, 1.4, mood, 0); // no bob / no blink
    return readPixels(cv).data;
  };
  const at = (d, X, Y) => hexAt(d, W, X, Y);
  const norm = (v) => String(v).toLowerCase();
  const d = draw('calm');
  if (at(d, x - 1, y + 6) !== norm(BG) || at(d, x + 40, y + 6) !== norm(BG)) issues.push('Clawd body width is not 40px');
  if (at(d, x + 2, y + 16) === norm(BG)) issues.push('Clawd body height is less than 17px');
  if (at(d, x + 20, y) !== norm(C.clawdNormDark) || at(d, x + 20, y + 1) !== norm(C.clawdNormDark)) issues.push('Clawd 2px dark top strip mismatch');
  if (at(d, x + 20, y + 2) !== norm(C.clawdNorm)) issues.push('Clawd top strip exceeds 2px');
  if (at(d, x + 9, y + 11) !== norm(C.clawdNormBelly) || at(d, x + 30, y + 14) !== norm(C.clawdNormBelly)) issues.push('Clawd belly 22×4 mismatch');
  for (const ex of [10, 26]) {
    for (let dy = 6; dy <= 9; dy++) for (let dx = 0; dx < 4; dx++) {
      const col = at(d, x + ex + dx, y + dy);
      if (col !== norm(C.clawdEye) && col !== '#ffffff') issues.push(`calm eye is not 4×4 at x+${ex}, y+${dy}`);
    }
    if (at(d, x + ex + 1, y + 7) !== '#ffffff') issues.push(`calm eye x+${ex} lacks 1×1 highlight`);
  }
  const dt = draw('thinking');
  if (at(dt, x + 20, y + 3) !== norm(C.clawdThink)) issues.push('thinking body palette mismatch');
  if (at(dt, x + 10, y + 7) !== norm(C.clawdEye) || at(dt, x + 10, y + 8) !== norm(C.clawdEye)) issues.push('thinking focused eyes mismatch');
  const ds = draw('smile');
  if (at(ds, x + 5, y + 8) !== norm(C.pink) || at(ds, x + 33, y + 8) !== norm(C.pink)) issues.push('smile blush missing');
  if (at(ds, x + 19, y + 13) !== norm(C.clawdEye)) issues.push('smile arc missing');
  return { name: 'Clawd 40×17 / 4×4 眼睛 + 1×1 高光 / calm·thinking·smile', issues };
}

function checkHer(R) {
  const A = R.art;
  const issues = [];
  const W = 240, H = 140, x = 100, y = 40, BG = '#F5EDD5';
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
  A.drawHer(ctx, x, y, 1.4, 'stand');
  const d = readPixels(cv).data;
  let minX = 999, maxX = -1, minY = 999, maxY = -1;
  for (let Y = 20; Y < H; Y++) for (let X = 0; X < W; X++) {
    if (hexAt(d, W, X, Y) !== BG.toLowerCase()) {
      minX = Math.min(minX, X); maxX = Math.max(maxX, X);
      minY = Math.min(minY, Y); maxY = Math.max(maxY, Y);
    }
  }
  const w = maxX - minX + 1, h = maxY - minY + 1;
  if (minX < x || maxX > x + 15) issues.push(`Her exceeds 16px slot: x=${minX - x}..${maxX - x}`);
  if (w !== 12) issues.push(`Her visual width ${w} ≠ 12`);
  if (minY !== y || h !== 28) issues.push(`Her height/top mismatch: top=${minY - y}, h=${h}`);
  return { name: `Her ${w}×${h} / 粉色裙子 / companion 原始造型`, issues };
}

function checkTyping(R) {
  const issues = [];
  for (const item of R.TYPING_SCHEDULE) {
    const count = Array.from(item.text).length;
    const charMs = item.charMs || R.TYPE_CHAR_MS;
    const end = item.start + (Math.max(0, count - 1) * charMs) / 1000;
    if (end > item.limit + 1e-6) issues.push(`「${item.text}」last char at ${end.toFixed(3)}s > ${item.limit}s`);
    if (item.strictBefore !== undefined && end > item.strictBefore + 1e-6) {
      issues.push(`「${item.text}」last char ${end.toFixed(3)}s > next line ${item.strictBefore}s`);
    }
  }
  return { name: `打字完整且逐行串行 (${R.TYPING_SCHEDULE.length} lines)`, issues };
}

function checkFrames(R) {
  const issues = [];
  let comparisons = 0, instances = 0;
  for (let n = 0; n < R.NFRAMES; n++) {
    const { scene, groups, bounds } = R.layoutAt(n / R.FPS);
    for (const [gname, list] of Object.entries(groups)) {
      if (!list.length) continue;
      const bound = bounds[gname];
      if (!bound) { issues.push(`frame ${n}: missing bounds for ${gname}`); continue; }
      instances += list.length;
      for (let i = 0; i < list.length; i++) {
        const el = list[i];
        if (el.box.some((v) => !Number.isInteger(v))) issues.push(`frame ${n} ${gname}/${el.name}: non-integer [${el.box}]`);
        if (outside(el.box, bound)) issues.push(`frame ${n} scene ${scene} ${gname}/${el.name}: TRUNCATED [${el.box}] outside ${JSON.stringify(bound)}`);
        for (let j = i + 1; j < list.length; j++) {
          comparisons++;
          if (overlap(el.box, list[j].box)) {
            issues.push(`frame ${n} scene ${scene} ${gname}: OVERLAP ${el.name}[${el.box}] × ${list[j].name}[${list[j].box}] area=${interArea(el.box, list[j].box)}`);
          }
        }
      }
    }
  }
  return { name: `逐帧几何 / 0px 重叠 / 无截断 (${R.NFRAMES} frames, ${instances} instances, ${comparisons} pairs)`, issues };
}

function checkScale2x(R) {
  const issues = [];
  const frames = [0, 240, 599, 600, 900, 1199, 1200, 1500, 1799];
  for (const n of frames) {
    const { baseCanvas, outCanvas } = R.renderFrameToCanvas(n);
    const base = readPixels(baseCanvas).data;
    const out = readPixels(outCanvas).data;
    let bad = 0;
    for (let y = 0; y < R.BH; y++) for (let x = 0; x < R.BW; x++) {
      const si = (y * R.BW + x) * 4;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const di = ((y * 2 + dy) * R.FW + x * 2 + dx) * 4;
        if (Math.abs(out[di] - base[si]) > 1 || Math.abs(out[di + 1] - base[si + 1]) > 1 || Math.abs(out[di + 2] - base[si + 2]) > 1) bad++;
      }
    }
    if (bad) issues.push(`frame ${n}: ${bad} output pixels differ from exact 2× nearest-neighbor`);
  }
  return { name: `SCALE=2 严格最近邻 (${frames.length} sampled frames)`, issues };
}

function checkClicks(R) {
  const issues = [];
  const clicks = R.getClickTimestamps();
  for (let i = 0; i < clicks.length; i++) {
    const t = clicks[i];
    if (Math.abs(t * R.FPS - Math.round(t * R.FPS)) > 5e-4) issues.push(`click ${t}s is not on a display frame`);
    if (i && (t <= clicks[i - 1] || t - clicks[i - 1] < 0.035 - 1e-6)) issues.push(`click ordering/dedup error at ${t}s`);
  }
  if (!clicks.length) issues.push('no keyboard clicks');
  return { name: `键盘音时间戳帧对齐 (${clicks.length} clicks)`, issues };
}

function run(R, opts = {}) {
  console.log(`=== ${R.CHECK_TITLE} ===`);
  const started = Date.now();
  const results = [checkSpecs(R), checkTextNoAA(R), checkClawd(R), checkHer(R), checkTyping(R), checkFrames(R), checkScale2x(R), checkClicks(R)];
  let issueCount = 0;
  for (const result of results) {
    issueCount += result.issues.length;
    console.log(`[${result.issues.length ? 'FAIL' : 'PASS'}] ${result.name}`);
    for (const msg of result.issues.slice(0, 30)) console.log(`   - ${msg}`);
    if (result.issues.length > 30) console.log(`   ... ${result.issues.length - 30} more`);
  }
  const passed = results.filter((r) => !r.issues.length).length;
  console.log(`=== Summary: ${passed}/${results.length} checks PASSED, ${issueCount} issue(s), ${((Date.now() - started) / 1000).toFixed(1)}s ===`);
  if (opts.reportPath) {
    fs.mkdirSync(path.dirname(opts.reportPath), { recursive: true });
    fs.writeFileSync(opts.reportPath, JSON.stringify({
      status: issueCount ? 'FAILED' : 'PASSED', generatedAt: new Date().toISOString(), title: R.CHECK_TITLE,
      canvas: { width: R.BW, height: R.BH, scale: R.SCALE, outputWidth: R.FW, outputHeight: R.FH, fps: R.FPS, frames: R.NFRAMES },
      terminal: R.TERM, content: R.CONTENT,
      summary: { checksPassed: passed, checksTotal: results.length, issues: issueCount },
      checks: results.map((r) => ({ name: r.name, status: r.issues.length ? 'FAILED' : 'PASSED', issues: r.issues })),
      clicks: R.getClickTimestamps().length,
    }, null, 2) + '\n');
    console.log(`Report: ${opts.reportPath}`);
  }
  return issueCount === 0;
}

module.exports = { run, overlap, interArea, outside, readPixels };
