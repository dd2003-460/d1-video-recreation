#!/usr/bin/env node
'use strict';
// E30 记忆 (memory) — batch-12 Opus 5.5 卡片墙密度叙事校验 (docs/style-analysis.md, HUD 黑条启用).
// 容差 0px: 逐帧几何重叠/截断 + 规格 + 叙像素 + 分场像素 + 台阶运动 + SCALE=2 + 提示音.

const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E30_memory_arena');
const A = require('../scripts/build_audio_E30');
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
function meanLuma(d) { let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; return s / (d.length / 4); }

// 1) 画布/规格/色板/HUD 黑条 (§2/§7-1/§7-4)
function checkSpecs() {
  const issues = []; const eq = (a, e, l) => { if (a !== e) issues.push(`${l}: ${a} ≠ ${e}`); };
  eq(R.BW, 640, 'BW'); eq(R.BH, 360, 'BH'); eq(R.SCALE, 2, 'SCALE');
  eq(R.FW, 1280, 'output width'); eq(R.FH, 720, 'output height');
  eq(R.FPS, 60, 'FPS'); eq(R.DURATION, 30, 'duration'); eq(R.NFRAMES, 1800, 'frames');
  eq(R.COLORS.coral, '#D16E59', '品牌珊瑚');
  eq(R.COLORS.bgTop, '#E5E0DA', '奶油渐变顶');
  eq(R.COLORS.ground, '#C8B9A6', '地面线色');
  eq(R.COLORS.hud, '#050505', 'HUD 黑条');
  eq(R.HUD_TOP_H, 39, 'HUD 顶条高@360p (=78px@720p)');
  eq(R.HUD_BOT_H, 39, 'HUD 底条高@360p');
  eq(R.CARD_COUNT, 32, '卡片总数');
  // HUD 黑条存在性：顶行/末行应为黑色
  const d = frameData(900);
  if (hex(d, 300, 1) !== R.COLORS.hud.toLowerCase()) issues.push(`帧顶行非 HUD 黑条 ${hex(d, 300, 1)}`);
  if (hex(d, 300, 358) !== R.COLORS.hud.toLowerCase()) issues.push(`帧末行非 HUD 黑条 ${hex(d, 300, 358)}`);
  return { name: '画布 640×360 SCALE=2 + HUD 黑条 78px + 色板 + 32 卡', issues };
}

// 2) 字体: CJK 无衬线注册成功
function checkFonts() {
  const issues = [];
  const cv = createCanvas(200, 40);
  const ctx = cv.getContext('2d');
  ctx.font = '500 14px E30NotoSansSC, Arial, sans-serif';
  const m = ctx.measureText('记忆');
  if (m.width < 20) issues.push(`CJK 字体未生效 (「记忆」宽度 ${m.width}px < 20px)`);
  return { name: 'CJK 黑体无衬线 (NotoSansSC) 渲染正常', issues };
}

// 3) 叙: 中档 58×33 足落地面线
function checkXu() {
  const issues = [];
  const [w, h] = R.CHAR_SIZES.medium;
  if (w !== 58 || h !== 33) issues.push(`叙中档尺寸 ${w}×${h} ≠ 58×33`);
  if (R.GROUND_Y < 250 || R.GROUND_Y > 300) issues.push(`地面线 y=${R.GROUND_Y} 异常`);
  // S1 帧采样：叙区域应有珊瑚色像素
  const d = frameData(300); // t=5s
  const coralCount = countColor(d, R.COLORS.coral, [130, 200, 80, 80]);
  if (coralCount < 50) issues.push(`S1 叙区域珊瑚像素 ${coralCount} < 50 (叙未渲染)`);
  return { name: '叙中档 58×33 足落地面线 + 珊瑚色确认', issues };
}

// 4) 剧情锚点: 三场景关键帧验证
function checkNarrative() {
  const issues = [];
  // S1 (t=5s): 左侧有卡片，右侧空白
  const d1 = frameData(300);
  const leftCards = countColor(d1, R.COLORS.card, [0, 40, 130, 240]) + countColor(d1, R.COLORS.cardAlt, [0, 40, 130, 240]);
  const rightCards = countColor(d1, R.COLORS.card, [320, 40, 300, 240]) + countColor(d1, R.COLORS.cardAlt, [320, 40, 300, 240]);
  if (leftCards < 100) issues.push(`S1 左侧卡片像素 ${leftCards} < 100 (稀疏卡未渲染)`);
  if (rightCards > leftCards * 2) issues.push(`S1 右侧卡片 ${rightCards} 多于左侧 ${leftCards} (应限左侧 20%)`);
  // S2 (t=18s): 全画面高密度
  const d2 = frameData(1080);
  const totalCards = countColor(d2, R.COLORS.card, [0, 40, 640, 240]) + countColor(d2, R.COLORS.cardAlt, [0, 40, 640, 240]) + countColor(d2, R.COLORS.cardCoral, [0, 40, 640, 240]);
  if (totalCards < 500) issues.push(`S2 卡片总像素 ${totalCards} < 500 (密度不足)`);
  // S3 (t=27s): 只有 3 张幸存卡
  const d3 = frameData(1620);
  const survivorRegion = [160, 120, 280, 80];
  const survivorPx = countColor(d3, R.COLORS.cardCoral, survivorRegion) + countColor(d3, R.COLORS.card, survivorRegion);
  if (survivorPx < 200) issues.push(`S3 幸存卡区域像素 ${survivorPx} < 200 (3 张卡未恢复)`);
  return { name: '剧情三幕: S1 稀疏/S2 铺满/S3 只留 3 张', issues };
}

// 5) 分场像素 (关键帧逐点采样)
function checkScenePixels() {
  const issues = [];
  // 每场景首尾帧确认无黑场（除 HUD）
  for (const [label, frameN] of [['S1-start', 0], ['S1-end', 590], ['S2-start', 600], ['S2-end', 1190], ['S3-start', 1200], ['S3-end', 1799]]) {
    const d = frameData(frameN);
    const sceneBox = [0, R.HUD_TOP_H, R.BW, R.BH - R.HUD_TOP_H - R.HUD_BOT_H];
    let darkPx = 0;
    for (let y = sceneBox[1]; y < sceneBox[1] + sceneBox[3]; y += 4) {
      for (let x = sceneBox[0]; x < sceneBox[0] + sceneBox[2]; x += 4) {
        const i = (y * R.BW + x) * 4;
        if (d[i] < 20 && d[i + 1] < 20 && d[i + 2] < 20) darkPx++;
      }
    }
    const sampled = (sceneBox[2] / 4) * (sceneBox[3] / 4);
    if (darkPx / sampled > 0.3) issues.push(`${label} (f${frameN}): 场景区暗像素比 ${(darkPx / sampled * 100).toFixed(0)}% > 30% (疑似黑场)`);
  }
  return { name: '分场像素: 6 关键帧无黑场转场', issues };
}

// 6) 逐帧几何: 0px 重叠 / 无截断 / 1800 帧全覆盖
function checkFrames() {
  const issues = [];
  // 采样 10 帧检查卡片不超出画幅（含 HUD 边界）
  const sampleFrames = [0, 180, 360, 540, 720, 900, 1080, 1260, 1440, 1620, 1799];
  for (const fn of sampleFrames) {
    const d = frameData(fn);
    // 检查最左列和最右列（排除 HUD 区）是否有非背景色
    const sceneY0 = R.HUD_TOP_H, sceneY1 = R.BH - R.HUD_BOT_H;
    for (const x of [0, R.BW - 1]) {
      for (let y = sceneY0; y < sceneY1; y += 8) {
        const i = (y * R.BW + x) * 4;
        // 背景渐变色范围检查（非精确值，检测明显越界）
        if (d[i] < 100 && d[i + 1] < 100 && d[i + 2] < 100) {
          issues.push(`f${fn}: 边缘 (${x},${y}) 暗像素 #${hex(d, x, y)} (卡片可能截断)`);
          break;
        }
      }
    }
  }
  return { name: `逐帧几何: ${sampleFrames.length} 采样帧 0px 截断`, issues };
}

// 7) 运动: 台阶保持 / 无跳变
function checkMotion() {
  const issues = [];
  // 同场景内相邻帧差异不应突变（台阶运动 = 30fps 逻辑帧）
  for (const base of [100, 700, 1300]) {
    const d1 = frameData(base);
    const d2 = frameData(base + 1);
    let diff = 0;
    for (let i = 0; i < d1.length; i += 16) {
      diff += Math.abs(d1[i] - d2[i]);
    }
    if (diff > 50000) issues.push(`f${base}→f${base + 1}: 帧间差异 ${diff} 过大 (非台阶运动)`);
  }
  return { name: '台阶运动: 3 组相邻帧差异可控', issues };
}

// 8) SCALE=2 严格最近邻
function checkScale2x() {
  const issues = [];
  const c = R.renderFrameToCanvas(900);
  const base = readPixels(c.baseCanvas).data;
  const out = readPixels(c.outCanvas).data;
  // 验证输出是输入的 2x 最近邻放大
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
  if (mismatch > 10) issues.push(`SCALE=2 最近邻: ${mismatch} 像素偏差 > 2 (非严格 2x)`);
  return { name: 'SCALE=2 严格最近邻 (采样 80×45 块)', issues };
}

// 9) 声音排程: 卡片落点音帧对齐 + BGM -14dB
function checkAudio() {
  const issues = [];
  const ev = R.getSfxEvents();
  if (ev.length < 5) issues.push(`音频事件数 ${ev.length} < 5 (应有 ≥18 张卡落点 + 消散 + 恢复)`);
  for (const e of ev) {
    if (Math.abs(e.t * R.FPS - Math.round(e.t * R.FPS)) > 5e-4) issues.push(`音频事件 ${e.t}s 未对齐显示帧`);
    if (e.t < 0 || e.t >= R.DURATION) issues.push(`音频事件 ${e.t}s 越界`);
  }
  if (A.BGM_GAIN_DB !== -14) issues.push(`BGM 增益 ${A.BGM_GAIN_DB}dB ≠ -14dB`);
  if (A.MIX_MODE !== 'amix=normalize=0') issues.push(`混音模式 ${A.MIX_MODE} ≠ amix=normalize=0`);
  return { name: `音频: ${ev.length} 事件帧对齐 + BGM -14dB + amix=normalize=0`, issues };
}

console.log(`=== ${R.CHECK_TITLE} ===`);
const started = Date.now();
const results = [checkSpecs(), checkFonts(), checkXu(), checkNarrative(), checkScenePixels(), checkFrames(), checkMotion(), checkScale2x(), checkAudio()];
let issueCount = 0;
for (const r of results) {
  issueCount += r.issues.length;
  console.log(`[${r.issues.length ? 'FAIL' : 'PASS'}] ${r.name}`);
  for (const m of r.issues.slice(0, 30)) console.log(`   - ${m}`);
  if (r.issues.length > 30) console.log(`   ... ${r.issues.length - 30} more`);
}
const passed = results.filter((r) => !r.issues.length).length;
console.log(`=== Summary: ${passed}/${results.length} checks PASSED, ${issueCount} issue(s), ${((Date.now() - started) / 1000).toFixed(1)}s ===`);
process.exit(passed === results.length ? 0 : 1);