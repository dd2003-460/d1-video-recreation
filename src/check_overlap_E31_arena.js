#!/usr/bin/env node
'use strict';
// E31 阅读 (reading) — batch-12 米纸书页+墨线线稿校验 (docs/style-analysis.md, 无 HUD).
// 容差 0px: 规格 + 字体 + 叙 + 剧情三幕 + 分场像素 + 几何 + 运动 + SCALE=2 + 音频.

const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E31_reading_arena');
const A = require('../scripts/build_audio_E31');
const { overlap, interArea, outside, readPixels } = require('./check_overlap_story_common');

function hex(d, x, y) {
  const i = (y * R.BW + x) * 4;
  return `#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function frameData(n) { return readPixels(R.renderFrameToCanvas(n).baseCanvas).data; }
function rgbOf(target) { return [1, 3, 5].map((i) => parseInt(target.slice(i, i + 2), 16)); }
function countColor(d, target, box) {
  const [tr, tg, tb] = rgbOf(target);
  const [x0, y0, w, h] = box || [0, 0, R.BW, R.BH];
  let n = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = (y * R.BW + x) * 4;
    if (d[i] === tr && d[i + 1] === tg && d[i + 2] === tb) n++;
  }
  return n;
}

// 1) 画布/规格/色板/无 HUD
function checkSpecs() {
  const issues = []; const eq = (a, e, l) => { if (a !== e) issues.push(`${l}: ${a} ≠ ${e}`); };
  eq(R.BW, 640, 'BW'); eq(R.BH, 360, 'BH'); eq(R.SCALE, 2, 'SCALE');
  eq(R.FW, 1280, 'output width'); eq(R.FH, 720, 'output height');
  eq(R.FPS, 60, 'FPS'); eq(R.DURATION, 30, 'duration'); eq(R.NFRAMES, 1800, 'frames');
  eq(R.CORAL, '#D16E59', '品牌珊瑚');
  eq(R.PAPER, '#E3D9BE', '米纸书页');
  eq(R.INK_LINE, '#4A443D', '墨线');
  eq(R.XU_S_W, 40, '叙小档宽@360p (=80px@720p≈81)');
  eq(R.XU_S_H, 20, '叙小档高@360p (=40px@720p)');
  // 无 HUD: 首行/末行不应是纯黑
  const d = frameData(900);
  const topLuma = (d[0] + d[1] + d[2]) / 3;
  const botI = ((R.BH - 1) * R.BW + 320) * 4;
  const botLuma = (d[botI] + d[botI + 1] + d[botI + 2]) / 3;
  if (topLuma < 30) issues.push(`帧顶行暗度 ${topLuma.toFixed(0)} < 30 (疑似 HUD 黑条)`);
  if (botLuma < 30) issues.push(`帧末行暗度 ${botLuma.toFixed(0)} < 30 (疑似 HUD 黑条)`);
  return { name: '画布 640×360 SCALE=2 + 无 HUD + 色板 + 叙 40×20', issues };
}

// 2) 字体: CJK 无衬线
function checkFonts() {
  const issues = [];
  const cv = createCanvas(200, 40);
  const ctx = cv.getContext('2d');
  ctx.font = `12px ${R.SANS_FAMILY}`;
  const m = ctx.measureText('背影');
  if (m.width < 16) issues.push(`CJK 字体未生效 (「背影」宽度 ${m.width}px < 16px)`);
  return { name: 'CJK 黑体无衬线 (NotoSansSC) 渲染正常', issues };
}

// 3) 叙: 小档 40×20 在页边
function checkXu() {
  const issues = [];
  // S1 帧: 右下角应有珊瑚色
  const d1 = frameData(300);
  const xuBox = [R.XU_RIGHT_BOTTOM[0] - 2, R.XU_RIGHT_BOTTOM[1] - 2, R.XU_S_W + 4, R.XU_S_H + 4];
  const coralPx = countColor(d1, R.CORAL, xuBox);
  if (coralPx < 30) issues.push(`S1 叙区域珊瑚像素 ${coralPx} < 30 (叙未渲染)`);
  // S3 帧: 中央偏下应有珊瑚色
  const d3 = frameData(1680); // t=28s
  const xuCenterBox = [R.XU_CENTER[0] - 2, R.XU_CENTER[1] - 2, R.XU_S_W + 4, R.XU_S_H + 4];
  const coralPx3 = countColor(d3, R.CORAL, xuCenterBox);
  if (coralPx3 < 30) issues.push(`S3 叙中央区域珊瑚像素 ${coralPx3} < 30 (叙未移到中央)`);
  return { name: '叙小档 40×20: S1 右下角 / S3 中央偏下', issues };
}

// 4) 剧情三幕
function checkNarrative() {
  const issues = [];
  // S1 (t=5s): 有墨线线稿 + 米纸底
  const d1 = frameData(300);
  const paperPx = countColor(d1, R.PAPER, [R.PAGE.x, R.PAGE.y, R.PAGE.w, R.PAGE.h]);
  if (paperPx < 50000) issues.push(`S1 米纸像素 ${paperPx} < 50000 (书页未渲染)`);
  const inkPx = countColor(d1, R.INK_LINE, [R.ILLUST_BOX.x, R.ILLUST_BOX.y, R.ILLUST_BOX.w, R.ILLUST_BOX.h]);
  if (inkPx < 50) issues.push(`S1 墨线像素 ${inkPx} < 50 (线稿未渲染)`);
  // S2 (t=15s): 有墨线线稿 (河+树+房子)
  const d2 = frameData(900);
  const inkPx2 = countColor(d2, R.INK_LINE, [R.ILLUST_BOX.x, R.ILLUST_BOX.y, R.ILLUST_BOX.w, R.ILLUST_BOX.h]);
  if (inkPx2 < 50) issues.push(`S2 墨线像素 ${inkPx2} < 50 (线稿未渲染)`);
  // S3 (t=27s): 无线稿 (空白页)
  const d3 = frameData(1620);
  const inkPx3 = countColor(d3, R.INK_LINE, [R.ILLUST_BOX.x, R.ILLUST_BOX.y, R.ILLUST_BOX.w, R.ILLUST_BOX.h]);
  if (inkPx3 > 20) issues.push(`S3 墨线像素 ${inkPx3} > 20 (空白页应无线稿)`);
  return { name: '剧情三幕: S1 背影线稿 / S2 呼兰河线稿 / S3 空白页', issues };
}

// 5) 分场像素: 6 关键帧无黑场
function checkScenePixels() {
  const issues = [];
  for (const [label, fn] of [['S1-start', 0], ['S1-end', 590], ['S2-start', 600], ['S2-end', 1190], ['S3-start', 1200], ['S3-end', 1799]]) {
    const d = frameData(fn);
    let darkPx = 0;
    for (let y = 0; y < R.BH; y += 4) {
      for (let x = 0; x < R.BW; x += 4) {
        const i = (y * R.BW + x) * 4;
        if (d[i] < 20 && d[i + 1] < 20 && d[i + 2] < 20) darkPx++;
      }
    }
    const sampled = (R.BW / 4) * (R.BH / 4);
    if (darkPx / sampled > 0.15) issues.push(`${label} (f${fn}): 暗像素比 ${(darkPx / sampled * 100).toFixed(0)}% > 15%`);
  }
  return { name: '分场像素: 6 关键帧无黑场', issues };
}

// 6) 逐帧几何: 无截断
function checkFrames() {
  const issues = [];
  const samples = [0, 300, 600, 900, 1200, 1500, 1799];
  for (const fn of samples) {
    const d = frameData(fn);
    // 检查四角是否为奶油/米纸色 (非黑/非异常)
    for (const [x, y] of [[0, 0], [R.BW - 1, 0], [0, R.BH - 1], [R.BW - 1, R.BH - 1]]) {
      const i = (y * R.BW + x) * 4;
      if (d[i] < 50 && d[i + 1] < 50 && d[i + 2] < 50) {
        issues.push(`f${fn}: 角 (${x},${y}) 暗像素 #${hex(d, x, y)}`);
      }
    }
  }
  return { name: `逐帧几何: ${samples.length} 采样帧四角无截断`, issues };
}

// 7) 台阶运动
function checkMotion() {
  const issues = [];
  for (const base of [100, 700, 1300]) {
    const d1 = frameData(base);
    const d2 = frameData(base + 1);
    let diff = 0;
    for (let i = 0; i < d1.length; i += 16) diff += Math.abs(d1[i] - d2[i]);
    if (diff > 50000) issues.push(`f${base}→f${base + 1}: 帧间差异 ${diff} 过大`);
  }
  return { name: '台阶运动: 3 组相邻帧差异可控', issues };
}

// 8) SCALE=2 最近邻
function checkScale2x() {
  const issues = [];
  const c = R.renderFrameToCanvas(900);
  const base = readPixels(c.baseCanvas).data;
  const out = readPixels(c.outCanvas).data;
  let mismatch = 0;
  for (let y = 0; y < R.BH; y += 2) {
    for (let x = 0; x < R.BW; x += 2) {
      const bi = (y * R.BW + x) * 4;
      const oi = ((y * 2) * R.FW + (x * 2)) * 4;
      for (let k = 0; k < 3; k++) {
        if (Math.abs(base[bi + k] - out[oi + k]) > 2) { mismatch++; break; }
      }
    }
  }
  if (mismatch > 10) issues.push(`SCALE=2: ${mismatch} 像素偏差 > 2`);
  return { name: 'SCALE=2 严格最近邻', issues };
}

// 9) 音频
function checkAudio() {
  const issues = [];
  const ev = R.getSfxEvents();
  if (ev.length < 3) issues.push(`音频事件数 ${ev.length} < 3`);
  for (const e of ev) {
    if (Math.abs(e.t * R.FPS - Math.round(e.t * R.FPS)) > 5e-4) issues.push(`事件 ${e.t}s 未对齐帧`);
    if (e.t < 0 || e.t >= R.DURATION) issues.push(`事件 ${e.t}s 越界`);
  }
  if (A.BGM_GAIN_DB !== -16) issues.push(`BGM ${A.BGM_GAIN_DB}dB ≠ -16dB`);
  if (A.MIX_MODE !== 'amix=normalize=0') issues.push(`混音 ${A.MIX_MODE} ≠ amix=normalize=0`);
  return { name: `音频: ${ev.length} 事件帧对齐 + BGM -16dB`, issues };
}

console.log(`=== ${R.CHECK_TITLE} ===`);
const started = Date.now();
const results = [checkSpecs(), checkFonts(), checkXu(), checkNarrative(), checkScenePixels(), checkFrames(), checkMotion(), checkScale2x(), checkAudio()];
let issueCount = 0;
for (const r of results) {
  issueCount += r.issues.length;
  console.log(`[${r.issues.length ? 'FAIL' : 'PASS'}] ${r.name}`);
  for (const m of r.issues.slice(0, 30)) console.log(`   - ${m}`);
}
const passed = results.filter((r) => !r.issues.length).length;
console.log(`=== Summary: ${passed}/${results.length} checks PASSED, ${issueCount} issue(s), ${((Date.now() - started) / 1000).toFixed(1)}s ===`);
process.exit(passed === results.length ? 0 : 1);