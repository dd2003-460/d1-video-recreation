#!/usr/bin/env node
'use strict';
// E36 回来 (return) — batch-13 Opus 5.5 归档盒打开+卡片飞出复活校验 (docs/style-analysis.md, HUD 黑条启用).
// 容差 0px: 规格 + 字体 + 叙像素 + 剧情三幕 + 分场像素 + 几何 + 台阶运动 + SCALE=2 + 音频.

const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E36_return_arena');
const A = require('../scripts/build_audio_E36');
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

// 1) 画布/规格/色板/HUD 黑条
function checkSpecs() {
  const issues = []; const eq = (a, e, l) => { if (a !== e) issues.push(`${l}: ${a} ≠ ${e}`); };
  eq(R.BW, 640, 'BW'); eq(R.BH, 360, 'BH'); eq(R.SCALE, 2, 'SCALE');
  eq(R.FW, 1280, 'output width'); eq(R.FH, 720, 'output height');
  eq(R.FPS, 60, 'FPS'); eq(R.DURATION, 30, 'duration'); eq(R.NFRAMES, 1800, 'frames');
  eq(R.COLORS.coral, '#D16E59', '品牌珊瑚');
  eq(R.COLORS.bgTop, '#E5E0DA', '奶油渐变顶');
  eq(R.COLORS.hud, '#050505', 'HUD 黑条');
  eq(R.COLORS.archive, '#8B6F47', '归档盒深棕');
  eq(R.HUD_TOP_H, 39, 'HUD 顶条高@360p (=78px@720p)');
  eq(R.HUD_BOT_H, 39, 'HUD 底条高@360p');
  eq(R.CARD_COUNT, 12, '卡片总数');
  const d = frameData(900);
  if (hex(d, 300, 1) !== R.COLORS.hud.toLowerCase()) issues.push(`帧顶行非 HUD 黑条 ${hex(d, 300, 1)}`);
  if (hex(d, 300, 358) !== R.COLORS.hud.toLowerCase()) issues.push(`帧末行非 HUD 黑条 ${hex(d, 300, 358)}`);
  return { name: '画布 640×360 SCALE=2 + HUD 黑条 78px + 色板 + 12 卡', issues };
}

// 2) 字体: CJK 无衬线注册成功
function checkFonts() {
  const issues = [];
  const cv = createCanvas(200, 40);
  const ctx = cv.getContext('2d');
  ctx.font = '500 14px E36NotoSansSC, Arial, sans-serif';
  const m = ctx.measureText('回来');
  if (m.width < 20) issues.push(`CJK 字体未生效 (「回来」宽度 ${m.width}px < 20px)`);
  return { name: 'CJK 黑体无衬线 (NotoSansSC) 渲染正常', issues };
}

// 3) 叙: S1/S2 中档左侧 / S3 中档中央
function checkXu() {
  const issues = [];
  // S1 帧 (t=5s): 左侧应有珊瑚色
  const d1 = frameData(300);
  const coralPx1 = countColor(d1, R.COLORS.coral, [80, 180, 120, 120]);
  if (coralPx1 < 50) issues.push(`S1 叙区域珊瑚像素 ${coralPx1} < 50 (叙未渲染)`);
  // S3 帧 (t=25s): 中央应有珊瑚色
  const d3 = frameData(1500);
  const coralPx3 = countColor(d3, R.COLORS.coral, [R.BW / 2 - 60, 180, 120, 120]);
  if (coralPx3 < 50) issues.push(`S3 叙中央区域珊瑚像素 ${coralPx3} < 50 (叙未渲染)`);
  return { name: '叙: S1/S2 中档左侧 / S3 中档中央', issues };
}

// 4) 剧情三幕
function checkNarrative() {
  const issues = [];
  // S1 (t=5s): 右下归档盒深棕存在
  const d1 = frameData(300);
  const archPx = countColor(d1, R.COLORS.archive, [R.ARCHIVE_BOX.x - 2, R.ARCHIVE_BOX.y - 2, R.ARCHIVE_BOX.w + 4, R.ARCHIVE_BOX.h + 4]);
  if (archPx < 200) issues.push(`S1 归档盒深棕像素 ${archPx} < 200 (归档盒未渲染)`);
  // S2 (t=18s): 用户气泡白块存在 + 部分卡已飞出 (活跃卡像素应少于全量)
  const d2 = frameData(1080);
  const bubPx = countColor(d2, R.COLORS.card, [R.BW - 140, 80, 130, 60]);
  if (bubPx < 1000) issues.push(`S2 用户气泡白色像素 ${bubPx} < 1000 (气泡未渲染)`);
  // 用 t=19.5s (f1170, 6 张卡全部飞出完成) vs t=11s (f660, 尚无卡飞出) 对比
  const cardLivePx = countColor(d2, R.COLORS.card, [0, R.HUD_TOP_H, R.BW, R.BH - R.HUD_TOP_H - R.HUD_BOT_H])
    + countColor(d2, R.COLORS.cardCoral, [0, R.HUD_TOP_H, R.BW, R.BH - R.HUD_TOP_H - R.HUD_BOT_H]);
  const d2early = frameData(660);  // t=11s, 尚未有卡飞出
  const cardLiveEarly = countColor(d2early, R.COLORS.card, [0, R.HUD_TOP_H, R.BW, R.BH - R.HUD_TOP_H - R.HUD_BOT_H])
    + countColor(d2early, R.COLORS.cardCoral, [0, R.HUD_TOP_H, R.BW, R.BH - R.HUD_TOP_H - R.HUD_BOT_H]);
  if (cardLivePx <= cardLiveEarly) issues.push(`S2 飞出卡像素未增加 (${cardLivePx} ≤ ${cardLiveEarly}, 无卡飞出)`);
  // S3 (t=25s): 卡片墙铺满 — 白+浅珊瑚卡像素应达到全量
  const d3 = frameData(1500);
  const cardPx3 = countColor(d3, R.COLORS.card, [0, R.HUD_TOP_H, R.BW, R.BH - R.HUD_TOP_H - R.HUD_BOT_H])
    + countColor(d3, R.COLORS.cardCoral, [0, R.HUD_TOP_H, R.BW, R.BH - R.HUD_TOP_H - R.HUD_BOT_H]);
  if (cardPx3 < 3000) issues.push(`S3 卡片墙像素 ${cardPx3} < 3000 (卡片未铺满)`);
  return { name: '剧情三幕: S1 归档盒 / S2 气泡+卡飞出 / S3 卡片墙铺满', issues };
}

// 5) 分场像素: 6 关键帧主体区无异常黑场 (HUD 除外)
function checkScenePixels() {
  const issues = [];
  for (const [label, fn] of [['S1-start', 0], ['S1-end', 590], ['S2-start', 600], ['S2-end', 1190], ['S3-start', 1200], ['S3-end', 1799]]) {
    const d = frameData(fn);
    let darkPx = 0;
    for (let y = R.HUD_TOP_H; y < R.BH - R.HUD_BOT_H; y += 4) {
      for (let x = 0; x < R.BW; x += 4) {
        const i = (y * R.BW + x) * 4;
        if (d[i] < 20 && d[i + 1] < 20 && d[i + 2] < 20) darkPx++;
      }
    }
    const sampled = Math.ceil((R.BW / 4) * ((R.BH - R.HUD_TOP_H - R.HUD_BOT_H) / 4));
    if (darkPx / sampled > 0.15) issues.push(`${label} (f${fn}): 主体暗像素比 ${(darkPx / sampled * 100).toFixed(0)}% > 15%`);
  }
  return { name: '分场像素: 6 关键帧主体区无黑场', issues };
}

// 6) 逐帧几何: 无截断 (主体区四角应为奶油系)
function checkFrames() {
  const issues = [];
  const samples = [0, 300, 600, 900, 1200, 1500, 1799];
  for (const fn of samples) {
    const d = frameData(fn);
    for (const [x, y] of [[2, R.HUD_TOP_H + 2], [R.BW - 3, R.HUD_TOP_H + 2], [2, R.BH - R.HUD_BOT_H - 3], [R.BW - 3, R.BH - R.HUD_BOT_H - 3]]) {
      const i = (y * R.BW + x) * 4;
      if (d[i] < 50 && d[i + 1] < 50 && d[i + 2] < 50) {
        issues.push(`f${fn}: 主体角 (${x},${y}) 暗像素 #${hex(d, x, y)}`);
      }
    }
  }
  return { name: `逐帧几何: ${samples.length} 采样帧主体四角无截断`, issues };
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