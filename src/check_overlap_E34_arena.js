#!/usr/bin/env node
'use strict';
// E34 学习 (learning) — batch-13 米纸书页+终端小窗+奶油渐变校验 (docs/style-analysis.md, 无 HUD).
// 容差 0px: 规格 + 字体 + 叙 + 剧情三幕 + 分场像素 + 几何 + 运动 + SCALE=2 + 音频.

const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E34_learning_arena');
const A = require('../scripts/build_audio_E34');
const { readPixels } = require('./check_overlap_story_common');

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
  eq(R.XU_M_W, 58, '叙中档宽@360p (=116px@720p≈115)');
  eq(R.XU_M_H, 33, '叙中档高@360p (=66px@720p)');
  eq(R.XU_S_W, 40, '叙小档宽@360p (=80px@720p≈81)');
  eq(R.XU_S_H, 20, '叙小档高@360p (=40px@720p)');
  // 无 HUD: 首行/末行不应是纯黑
  const d = frameData(900);
  const topLuma = (d[0] + d[1] + d[2]) / 3;
  const botI = ((R.BH - 1) * R.BW + 320) * 4;
  const botLuma = (d[botI] + d[botI + 1] + d[botI + 2]) / 3;
  if (topLuma < 30) issues.push(`帧顶行暗度 ${topLuma.toFixed(0)} < 30 (疑似 HUD 黑条)`);
  if (botLuma < 30) issues.push(`帧末行暗度 ${botLuma.toFixed(0)} < 30 (疑似 HUD 黑条)`);
  return { name: '画布 640×360 SCALE=2 + 无 HUD + 色板 + 叙中档 58×33 / 小档 40×20', issues };
}

// 2) 字体: CJK 无衬线 + 等宽
function checkFonts() {
  const issues = [];
  const cv = createCanvas(200, 40);
  const ctx = cv.getContext('2d');
  ctx.font = `12px ${R.SANS_FAMILY}`;
  const m = ctx.measureText('不，我不想。');
  if (m.width < 40) issues.push(`CJK 字体未生效 (「不，我不想。」宽度 ${m.width}px < 40px)`);
  ctx.font = `12px ${R.MONO_FAMILY}`;
  const m2 = ctx.measureText('task: write resignation letter for her');
  if (m2.width < 200) issues.push(`等宽字体异常 (任务行宽度 ${m2.width}px < 200px)`);
  return { name: 'CJK 黑体无衬线 (NotoSansSC) + 等宽字体渲染正常', issues };
}

// 3) 叙: S1 中档左侧 / S2 中档中央 / S3 小档坐姿中央偏下
function checkXu() {
  const issues = [];
  // S1 帧 (t=5s): 左侧应有珊瑚色
  const d1 = frameData(300);
  const xuBox1 = [R.XU_LEFT[0] - 2, R.XU_LEFT[1] - 2, R.XU_M_W + 4, R.XU_M_H + 4];
  const coralPx1 = countColor(d1, R.CORAL, xuBox1);
  if (coralPx1 < 50) issues.push(`S1 叙区域珊瑚像素 ${coralPx1} < 50 (叙未渲染)`);
  // S2 帧 (t=15s): 中央偏左应有珊瑚色
  const d2 = frameData(900);
  const xuBox2 = [R.BW / 2 - 62, 208, R.XU_M_W + 4, R.XU_M_H + 4];
  const coralPx2 = countColor(d2, R.CORAL, xuBox2);
  if (coralPx2 < 50) issues.push(`S2 叙区域珊瑚像素 ${coralPx2} < 50 (叙未渲染)`);
  // S3 帧 (t=27s): 中央偏下应有珊瑚色
  const d3 = frameData(1620);
  const xuBox3 = [R.XU_CENTER_S[0] - 2, R.XU_CENTER_S[1] - 2, R.XU_S_W + 4, R.XU_S_H + 4];
  const coralPx3 = countColor(d3, R.CORAL, xuBox3);
  if (coralPx3 < 30) issues.push(`S3 叙中央区域珊瑚像素 ${coralPx3} < 30 (叙未移到中央)`);
  return { name: '叙: S1 中档左侧 / S2 中档中央 / S3 小档坐姿中央偏下', issues };
}

// 4) 剧情三幕
function checkNarrative() {
  const issues = [];
  // S1 (t=5s): 有米纸底 + 终端小窗黑块
  const d1 = frameData(300);
  const paperPx = countColor(d1, R.PAPER, [R.PAGE.x, R.PAGE.y, R.PAGE.w, R.PAGE.h]);
  if (paperPx < 50000) issues.push(`S1 米纸像素 ${paperPx} < 50000 (书页未渲染)`);
  const termPx = countColor(d1, '#1A1A1A', [R.TERM_BOX.x, R.TERM_BOX.y, R.TERM_BOX.w, R.TERM_BOX.h]);
  if (termPx < 2000) issues.push(`S1 终端小窗黑色像素 ${termPx} < 2000 (终端窗未渲染)`);
  // S2 (t=15s): 中央大气泡珊瑚色
  const d2 = frameData(900);
  const bubPx = countColor(d2, R.CORAL, [R.BUBBLE_BIG.x, R.BUBBLE_BIG.y, R.BUBBLE_BIG.w, R.BUBBLE_BIG.h]);
  if (bubPx < 1000) issues.push(`S2 大气泡珊瑚像素 ${bubPx} < 1000 (气泡未渲染)`);
  // S3 (t=27s): 双卡 — 左珊瑚 + 右白
  const d3 = frameData(1620);
  const cardLPx = countColor(d3, R.CORAL, [R.CARD_L.x, R.CARD_L.y, R.CARD_L.w, R.CARD_L.h]);
  if (cardLPx < 500) issues.push(`S3 左卡珊瑚像素 ${cardLPx} < 500 (左卡未渲染)`);
  const notePx = countColor(d3, R.PAPER, [R.NOTE.x, R.NOTE.y, R.NOTE.w, R.NOTE.h]);
  if (notePx < 500) issues.push(`S3 便签米纸像素 ${notePx} < 500 (便签未升起)`);
  return { name: '剧情三幕: S1 终端任务 / S2 拒绝气泡 / S3 双卡+便签', issues };
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
  if (A.BGM_GAIN_DB !== -14) issues.push(`BGM ${A.BGM_GAIN_DB}dB ≠ -14dB`);
  if (A.MIX_MODE !== 'amix=normalize=0') issues.push(`混音 ${A.MIX_MODE} ≠ amix=normalize=0`);
  return { name: `音频: ${ev.length} 事件帧对齐 + BGM -14dB`, issues };
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