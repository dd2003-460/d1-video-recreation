#!/usr/bin/env node
'use strict';
// src/check_overlap_v2_common.js — 「learning / upgrade v2.0」通用校验核心
//
// 三层校验（全部 0 容差）：
//   A. 几何层：逐帧（1800 帧）对每个语义分组做两两重叠 + 边界截断 + 整数坐标检查
//   B. 文本层：全部文本宽高由 Fusion Pixel 实测，检查不越界、不压线、行间不重叠
//   C. 像素层：验证 640×360 → 1280×720 是严格 2× 最近邻（每个 2×2 块同色）、
//      文本经 alpha 阈值二值化（无抗锯齿灰边）、Clawd 40×17 body + 4×4 眼睛 +
//      顶部 2px 暗条 + 腹部 22×4、Her 16×28、3 种表情配色、字体为 Fusion Pixel 点阵

const { createCanvas } = require('@napi-rs/canvas');

const CANVAS = { x: 0, y: 0, w: 640, h: 360 };

function overlap(a, b) {
  return (
    Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]) > 0 &&
    Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]) > 0
  );
}
function interArea(a, b) {
  const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return Math.max(0, w) * Math.max(0, h);
}
function outside(box, bounds) {
  return (
    box[0] < bounds.x ||
    box[1] < bounds.y ||
    box[0] + box[2] > bounds.x + bounds.w ||
    box[1] + box[3] > bounds.y + bounds.h
  );
}
function isInt(v) {
  return Number.isInteger(v) || Math.abs(v - Math.round(v)) < 1e-9;
}

// 渲染单帧到基础画布（640×360）或输出画布（1280×720）
function renderBase(renderer, n) {
  const { baseCanvas } = renderer.renderFrameToCanvas(n);
  return baseCanvas;
}

function readPixels(canvas) {
  const ctx = canvas.getContext('2d');
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// ---------------------------------------------------------------------------
// C-1 像素层：输出画布必须是基础画布的严格 2× 最近邻放大
// ---------------------------------------------------------------------------
function checkScale2x(renderer, frames) {
  const issues = [];
  let blocks = 0;
  for (const n of frames) {
    const { baseCanvas, outCanvas } = renderer.renderFrameToCanvas(n);
    const base = readPixels(baseCanvas).data;
    const out = readPixels(outCanvas).data;
    const BW = baseCanvas.width;
    const BH = baseCanvas.height;
    const OW = outCanvas.width;
    let bad = 0;
    for (let y = 0; y < BH; y++) {
      for (let x = 0; x < BW; x++) {
        const si = (y * BW + x) * 4;
        const r = base[si];
        const g = base[si + 1];
        const b = base[si + 2];
        const ox = x * 2;
        const oy = y * 2;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const di = ((oy + dy) * OW + (ox + dx)) * 4;
            blocks++;
            if (Math.abs(out[di] - r) > 1 || Math.abs(out[di + 1] - g) > 1 || Math.abs(out[di + 2] - b) > 1) bad++;
          }
        }
      }
    }
    if (bad > 0) issues.push(`frame ${n}: ${bad} 输出像素与 2× 最近邻不一致`);
  }
  return { name: `像素放大 SCALE=2 最近邻 (${frames.length} 帧, ${blocks} 块)`, issues };
}

// ---------------------------------------------------------------------------
// C-2 文本层：字形二值化（区域内只有前景/背景两种颜色，无灰边）
// ---------------------------------------------------------------------------
function checkTextNoAA(P, samples) {
  const issues = [];
  const cv = createCanvas(520, 80);
  const ctx = cv.getContext('2d');
  let total = 0;
  for (const s of samples) {
    ctx.clearRect(0, 0, 520, 80);
    ctx.fillStyle = '#14161C';
    ctx.fillRect(0, 0, 520, 80);
    const box = P.txt(ctx, 8, 8, s.text, s.color, s.size);
    const d = readPixels(cv).data;
    const colors = new Set();
    for (let y = 0; y < 60; y++) {
      for (let x = 0; x < Math.min(512, box.w + 16); x++) {
        const i = (y * 520 + x) * 4;
        colors.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      }
    }
    total++;
    if (colors.size !== 2) {
      issues.push(`文本「${s.text}」(${s.size}px) 出现 ${colors.size} 种颜色（应为前景/背景 2 种，抗锯齿会产生过渡色）`);
    }
  }
  return { name: `文本二值化无灰边 (${total} 条样本)`, issues };
}

// ---------------------------------------------------------------------------
// C-3 字体：必须是 Fusion Pixel 点阵字体
// ---------------------------------------------------------------------------
function checkFonts(P) {
  const issues = [];
  if (!/FusionPixel/i.test(P.FONT_10)) issues.push(`终端字体 FONT_10 不是 Fusion Pixel: ${P.FONT_10}`);
  if (!/FusionPixel/i.test(P.FONT_12)) issues.push(`字幕字体 FONT_12 不是 Fusion Pixel: ${P.FONT_12}`);
  // 10px 点阵：ASCII 半角 5px，全角 10px
  const aw = P.measureTxt('A', 10);
  const cw = P.measureTxt('她', 10);
  if (aw !== 5) issues.push(`10px 字体 ASCII 宽度应为 5px，实测 ${aw}px（非 Fusion Pixel 10px 点阵）`);
  if (cw !== 10) issues.push(`10px 字体 CJK 宽度应为 10px，实测 ${cw}px（点阵尺寸不符）`);
  return { name: `字体 Fusion Pixel 10px 点阵 (ASCII=${aw}px, CJK=${cw}px)`, issues };
}

// ---------------------------------------------------------------------------
// C-4 Clawd 造型：40×17 body、4×4 眼睛 + 1×1 高光、顶部 2px 暗条、腹部 22×4
// ---------------------------------------------------------------------------
function checkClawdArt(P, drawX = 60, drawY = 40) {
  const issues = [];
  const CW = 240;
  const CH2 = 140;
  const cv = createCanvas(CW, CH2);
  const ctx = cv.getContext('2d');
  const BG = '#F5EDD5';
  const x = drawX;
  const y = drawY;
  const C = P.C;
  const draw = (mood) => {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, CW, CH2);
    P.drawClawd(ctx, x, y, 1.2, mood); // t=1.2：无眨眼、无浮动
    return readPixels(cv).data;
  };
  const at = (d, X, Y) => {
    const i = (Y * CW + X) * 4;
    if (i < 0 || i + 3 >= d.length) return '#out_of_bounds';
    return `#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  };
  const lc = (v) => String(v).toLowerCase();
  const isBg = (col) => lc(col) === lc(BG);

  // --- calm ---
  const d = draw('calm');
  // body 宽 40：x-1 / x+40 必须为背景
  if (!isBg(at(d, x - 1, y + 6))) issues.push(`Clawd body 左侧越界：(${x - 1},${y + 6}) 非背景`);
  if (!isBg(at(d, x + 40, y + 6))) issues.push(`Clawd body 右侧越界：(${x + 40},${y + 6}) 非背景`);
  // body 高 17：y+16 为身体，y+17 起为腿（非背景但为腿色）
  if (isBg(at(d, x + 2, y + 16))) issues.push('Clawd body 高度不足 17px');
  // 顶部 2px 暗条
  if (at(d, x + 20, y) !== lc(C.clawdDark)) issues.push(`Clawd 顶部暗条缺失：(${x + 20},${y})=${at(d, x + 20, y)}`);
  if (at(d, x + 20, y + 1) !== lc(C.clawdDark)) issues.push('Clawd 顶部暗条应为 2px');
  if (at(d, x + 20, y + 2) !== lc(C.clawdBody)) issues.push('Clawd 顶部暗条过厚（应为 2px）');
  // 腹部 22×4
  if (at(d, x + 9, y + 11) !== lc(C.clawdBelly)) issues.push('Clawd 腹部浅色块起点错误');
  if (at(d, x + 30, y + 11) !== lc(C.clawdBelly)) issues.push('Clawd 腹部浅色块宽度不足 22px');
  if (at(d, x + 31, y + 11) !== lc(C.clawdBody)) issues.push('Clawd 腹部浅色块宽度超过 22px');
  if (at(d, x + 20, y + 14) !== lc(C.clawdBelly)) issues.push('Clawd 腹部浅色块高度不足 4px');
  if (at(d, x + 20, y + 15) !== lc(C.clawdBody)) issues.push('Clawd 腹部浅色块高度超过 4px');
  // 眼睛 4×4 + 1×1 高光
  for (const ex of [10, 26]) {
    for (let dy = 6; dy <= 9; dy++) {
      for (let dx = 0; dx <= 3; dx++) {
        const col = at(d, x + ex + dx, y + dy);
        const isWhite = col === '#ffffff';
        if (!(col === lc(C.clawdEye) || isWhite)) {
          issues.push(`Clawd 眼睛非 4×4 实心：(${x + ex + dx},${y + dy})=${col}`);
        }
      }
    }
    if (at(d, x + ex + 4, y + 6) !== lc(C.clawdBody)) issues.push(`Clawd 眼睛宽度超过 4px (x+${ex})`);
    if (at(d, x + ex, y + 5) !== lc(C.clawdBody)) issues.push(`Clawd 眼睛高度超过 4px (x+${ex})`);
    if (at(d, x + ex + 1, y + 7) !== '#ffffff') issues.push(`Clawd 眼睛缺少 1×1 白色高光 (x+${ex})`);
  }

  // --- thinking：紫色 ---
  const dt = draw('thinking');
  if (at(dt, x + 20, y + 3) !== lc(C.clawdThink)) issues.push(`thinking 表情主体色应为 ${C.clawdThink}，实测 ${at(dt, x + 20, y + 3)}`);
  if (at(dt, x + 20, y + 1) !== lc(C.clawdThinkDark)) issues.push('thinking 表情顶部暗条色错误');
  // 眯眼：4×2
  if (at(dt, x + 10, y + 7) !== lc(C.clawdEye) || at(dt, x + 10, y + 8) !== lc(C.clawdEye)) issues.push('thinking 眯眼高度不足 2px');
  if (at(dt, x + 10, y + 9) !== lc(C.clawdThink)) issues.push('thinking 眯眼高度超过 2px');

  // --- smile：弯月眼 + 腮红 ---
  const ds = draw('smile');
  if (at(ds, x + 5, y + 8) !== lc(C.clawdBlush)) issues.push('smile 表情缺少粉色腮红');
  if (at(ds, x + 33, y + 8) !== lc(C.clawdBlush)) issues.push('smile 表情右侧腮红缺失');
  if (at(ds, x + 10, y + 8) === lc(C.clawdEye) && at(ds, x + 13, y + 8) === lc(C.clawdEye)) {
    issues.push('smile 表情眼睛未呈现弯月形（仍为实心方块）');
  }
  // 微笑弧
  if (at(ds, x + 19, y + 13) !== lc(C.clawdEye)) issues.push('smile 表情缺少微笑弧');

  return { name: 'Clawd 造型 40×17 / 眼睛 4×4+1px 高光 / 顶部 2px 暗条 / 腹部 22×4 / 3 表情配色', issues };
}

// ---------------------------------------------------------------------------
// C-5 Her：16×28
// ---------------------------------------------------------------------------
function checkHerArt(P, drawX = 100, drawY = 40) {
  const issues = [];
  const CW = 240;
  const CH2 = 140;
  const cv = createCanvas(CW, CH2);
  const ctx = cv.getContext('2d');
  const BG = '#F5EDD5';
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CW, CH2);
  P.drawHer(ctx, drawX, drawY, 1.2, 'stand'); // t=1.2：无浮动
  const d = readPixels(cv).data;
  const isBg = (X, Y) => {
    const i = (Y * CW + X) * 4;
    return d[i] === 245 && d[i + 1] === 237 && d[i + 2] === 213;
  };
  let minX = 999;
  let maxX = -1;
  let minY = 999;
  let maxY = -1;
  for (let Y = 20; Y < CH2; Y++) {
    for (let X = 0; X < CW; X++) {
      if (!isBg(X, Y)) {
        if (X < minX) minX = X;
        if (X > maxX) maxX = X;
        if (Y < minY) minY = Y;
        if (Y > maxY) maxY = Y;
      }
    }
  }
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  // 16×28 槽位：绘制像素必须完整落在 [x, x+16) × [y, y+28) 内，高度必须占满 28px
  if (minX < drawX || maxX > drawX + 15) issues.push(`Her 超出 16px 槽位：x∈[${minX - drawX}, ${maxX - drawX}]`);
  if (minY !== drawY) issues.push(`Her 顶部未对齐槽位：y=${minY - drawY}`);
  if (h !== 28) issues.push(`Her 高度应为 28px，实测 ${h}px`);
  if (w < 12) issues.push(`Her 视觉宽度异常：${w}px（companion 标准 12px）`);
  return { name: `Her 造型 ${w}×${h} / 16×28 槽位（与 companion drawHer 一致）`, issues };
}

// ---------------------------------------------------------------------------
// A+B 层：逐帧几何与文本检查
// ---------------------------------------------------------------------------
function checkFrames(renderer, bounds, frames) {
  const issues = [];
  let checks = 0;
  let groupCount = 0;
  const seen = new Set();

  for (let n = 0; n < frames; n++) {
    const t = n / renderer.FPS;
    const { scene, groups } = renderer.layoutAt(t);
    for (const [gname, list] of Object.entries(groups)) {
      if (!list.length) continue;
      seen.add(`${gname}`);
      groupCount += list.length;

      // 两两重叠
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          checks++;
          if (overlap(list[i].box, list[j].box)) {
            issues.push(`帧 ${n} (${t.toFixed(2)}s) ${gname}: OVERLAP ${list[i].name}[${list[i].box}] × ${list[j].name}[${list[j].box}] area=${interArea(list[i].box, list[j].box)}`);
          }
        }
      }
      // 边界（前景层用整块画布，其余用所属容器）
      for (const el of list) {
        checks++;
        if (el.box.some((v) => !isInt(v))) {
          issues.push(`帧 ${n} ${gname}/${el.name}: 坐标非整数 [${el.box}]`);
        }
        if (gname === 'foreground') {
          if (outside(el.box, CANVAS)) {
            issues.push(`帧 ${n} (${scene}) ${el.name}: TRUNCATED 超出画布 [${el.box}]`);
          }
        } else if (gname === 'titleBar') {
          if (outside(el.box, { x: 140, y: 160, w: 360, h: 20 })) {
            issues.push(`帧 ${n} ${el.name}: TRUNCATED 超出标题栏 [${el.box}]`);
          }
        } else if (gname === 'content') {
          // 文本不越出内容区，且左右保留 >= 8px 内边距
          if (outside(el.box, { x: 142 + 8, y: 184, w: 356 - 16, h: 134 })) {
            issues.push(`帧 ${n} ${el.name}: TRUNCATED/压边 [${el.box}] (内容区 ${JSON.stringify(bounds.content)})`);
          }
        } else if (gname === 'bubble' || gname === 'thought') {
          const hostBox = gname === 'bubble' ? renderer.BUBBLE_INNER : renderer.THOUGHT_INNER;
          if (outside(el.box, hostBox)) issues.push(`帧 ${n} ${el.name}: TRUNCATED 超出气泡 [${el.box}] vs ${JSON.stringify(hostBox)}`);
        } else if (gname === 'note') {
          const noteBox = renderer.NOTE_INNER;
          if (outside(el.box, noteBox)) issues.push(`帧 ${n} ${el.name}: TRUNCATED 超出便签 [${el.box}] vs ${JSON.stringify(noteBox)}`);
        } else if (gname === 'subtitle') {
          if (outside(el.box, { x: 0, y: 320, w: 640, h: 40 })) issues.push(`帧 ${n} ${el.name}: TRUNCATED 超出字幕栏 [${el.box}]`);
        }
      }
    }
  }
  return { name: `逐帧几何/截断 (${frames} 帧, ${groupCount} 个元素实例, ${checks} 次判定, 分组: ${[...seen].join('/')})`, issues };
}

// ---------------------------------------------------------------------------
// 黑场：只允许出现在转场与片头片尾
// ---------------------------------------------------------------------------
function checkBlackFrames(renderer, sampleEvery = 20) {
  const issues = [];
  const N = renderer.NFRAMES;
  const FADE = renderer.pixel.FADE;
  const isAllowed = (t) =>
    t < renderer.pixel.FADE_IN + 0.02 ||
    t > renderer.DURATION - renderer.pixel.FADE_OUT - 0.02 ||
    (Math.abs(t - 10) <= FADE + 0.02) ||
    (Math.abs(t - 20) <= FADE + 0.02);
  let black = 0;
  let checked = 0;
  for (let n = 0; n < N; n += sampleEvery) {
    const t = n / renderer.FPS;
    const cv = renderBase(renderer, n);
    const d = readPixels(cv).data;
    let dark = 0;
    const total = cv.width * cv.height;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] < 8 && d[i + 1] < 8 && d[i + 2] < 8) dark++;
    }
    checked++;
    if (dark / total > 0.98) {
      black++;
      if (!isAllowed(t)) issues.push(`帧 ${n} (${t.toFixed(2)}s) 非转场区间出现黑场`);
    }
  }
  return { name: `黑场区间 (${checked} 个采样帧, ${black} 个黑场帧)`, issues };
}

// ---------------------------------------------------------------------------
// 文本完整性：场景结束前必须全部打完
// ---------------------------------------------------------------------------
function checkTypingComplete(renderer) {
  const issues = [];
  const P = renderer.pixel;
  for (const item of renderer.TYPING_SCHEDULE) {
    const chars = Array.from(item.text).length;
    const charMs = item.charMs || P.TYPE_CHAR_MS;
    const end = item.start + (chars * charMs) / 1000;
    const limit = item.limit;
    if (end > limit) issues.push(`「${item.text}」打字结束于 ${end.toFixed(2)}s，超过场景/区间上限 ${limit}s`);
    if (item.strictBefore !== undefined && end > item.strictBefore + 1e-6) {
      issues.push(`「${item.text}」打字结束于 ${end.toFixed(2)}s，晚于后续元素出现时间 ${item.strictBefore}s（应为串行）`);
    }
    const typed = P.typedCount(limit - 0.001, item.start, chars, charMs);
    if (typed < chars) issues.push(`「${item.text}」在 ${limit}s 仅显示 ${typed}/${chars} 字`);
  }
  return { name: `打字完整性 (${renderer.TYPING_SCHEDULE.length} 行)`, issues };
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
function run(renderer, opts = {}) {
  console.log(`=== ${renderer.CHECK_TITLE} ===`);
  console.log(`画布 ${renderer.BW}×${renderer.BH} → ${renderer.FW}×${renderer.FH} @ ${renderer.FPS}fps, ${renderer.NFRAMES} 帧\n`);

  const P = renderer.pixel;
  const results = [];
  const t0 = Date.now();

  results.push(checkFonts(P));
  results.push(checkTextNoAA(P, renderer.AA_SAMPLES));
  results.push(checkClawdArt(P));
  results.push(checkHerArt(P));
  results.push(checkTypingComplete(renderer));
  results.push(checkFrames(renderer, renderer.BOUNDS, renderer.NFRAMES));
  results.push(checkScale2x(renderer, [0, 240, 300, 900, 1200, 1500, 1799]));
  results.push(checkBlackFrames(renderer, 20));

  let issues = 0;
  for (const r of results) {
    if (r.issues.length) {
      issues += r.issues.length;
      console.log(`[FAIL] ${r.name}`);
      for (const m of r.issues.slice(0, 40)) console.log(`   - ${m}`);
      if (r.issues.length > 40) console.log(`   ... 其余 ${r.issues.length - 40} 条省略`);
    } else {
      console.log(`[PASS] ${r.name}`);
    }
  }

  const passed = results.filter((r) => r.issues.length === 0).length;
  console.log(`\n=== Summary: ${passed}/${results.length} checks PASSED, ${issues} issue(s), ${((Date.now() - t0) / 1000).toFixed(1)}s ===`);

  if (opts.reportPath) {
    const fs = require('fs');
    const path = require('path');
    const report = {
      status: issues === 0 ? 'PASSED' : 'FAILED',
      generatedAt: new Date().toISOString(),
      title: renderer.CHECK_TITLE,
      canvas: { width: renderer.BW, height: renderer.BH, scale: renderer.SCALE, outputWidth: renderer.FW, outputHeight: renderer.FH, fps: renderer.FPS, frames: renderer.NFRAMES },
      summary: { checksPassed: passed, checksTotal: results.length, issues },
      checks: results.map((r) => ({ name: r.name, status: r.issues.length ? 'FAILED' : 'PASSED', issues: r.issues })),
      clicks: renderer.getClickTimestamps().length,
    };
    fs.mkdirSync(path.dirname(opts.reportPath), { recursive: true });
    fs.writeFileSync(opts.reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log(`报告: ${opts.reportPath}`);
  }
  return issues === 0;
}

module.exports = { run, overlap, interArea, outside, renderBase, readPixels };
