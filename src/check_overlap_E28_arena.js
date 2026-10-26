#!/usr/bin/env node
'use strict';
// E28 自由时间 (freetime) — batch-11 风格锚校验 (docs/style-analysis.md, 非终端布局).
// 容差 0px: 逐帧几何重叠/截断 + 规格 + 叙像素 + 分场像素 + 台阶运动/硬切 + SCALE=2 + 键盘音.

const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E28_freetime_arena');
const { overlap, interArea, outside, readPixels } = require('./check_overlap_story_common');

function hex(d, x, y) {
  const i = (y * R.BW + x) * 4;
  return `#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function frameData(n) { return readPixels(R.renderFrameToCanvas(n).baseCanvas).data; }
function countColor(d, target) {
  const tr = parseInt(target.slice(1, 3), 16), tg = parseInt(target.slice(3, 5), 16), tb = parseInt(target.slice(5, 7), 16);
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] === tr && d[i + 1] === tg && d[i + 2] === tb) n++;
  return n;
}
function inkInBox(d, box) {
  let n = 0;
  for (let y = box[1]; y < box[1] + box[3]; y++) for (let x = box[0]; x < box[0] + box[2]; x++) {
    const i = (y * R.BW + x) * 4;
    if (d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 90) n++;
  }
  return n;
}

// 1) Canvas/specs + style-analysis palette + HUD geometry (§2/§5/§7)
function checkSpecs() {
  const issues = []; const eq = (a, e, l) => { if (a !== e) issues.push(`${l}: ${a} ≠ ${e}`); };
  eq(R.BW, 640, 'BW'); eq(R.BH, 360, 'BH'); eq(R.SCALE, 2, 'SCALE');
  eq(R.FW, 1280, 'output width'); eq(R.FH, 720, 'output height');
  eq(R.FPS, 60, 'FPS'); eq(R.DURATION, 30, 'duration'); eq(R.NFRAMES, 1800, 'frames');
  eq(R.CORAL, '#D16E59', '品牌珊瑚'); eq(R.CREAM_TOP, '#E5E0DA', '奶油上');
  eq(R.GROUND, '#C8B9A6', '地面带'); eq(R.PAPER, '#E3D9BE', '书页米纸'); eq(R.NIGHT, '#393744', '夜景');
  eq(R.HUD_TOP.h * 2, 78, '顶 HUD 黑条高@720p'); eq(R.HUD_BOTTOM.h * 2, 78, '底 HUD 黑条高@720p');
  eq(R.HUD_BOTTOM.y * 2, 642, '底 HUD 起始@720p');
  if (R.GROUND_Y < 260 || R.GROUND_Y > 272) issues.push(`地面线 y=${R.GROUND_Y} 不在 260-272@360p`);
  if (R.PAGE.w / R.BW < 0.79 || R.PAGE.w / R.BW > 0.81) issues.push(`书页宽占比 ${R.PAGE.w / R.BW} ≠ ≈80%`);
  eq(R.PAGE.x, 64, '书页左奶油边=10%'); eq(R.BW - (R.PAGE.x + R.PAGE.w), 64, '书页右奶油边=10%');
  eq(R.WIN_BOX[2] * 2, 120, '窗宽@720p'); eq(R.WIN_BOX[3] * 2, 160, '窗高@720p');
  eq(R.CONTEXT_PCT, 2, '上下文 %');
  return { name: '画布 640×360×2 / 色板 / HUD 78px×2 / 书页 80% / 窗 120×160@720p', issues };
}

// 2) Fonts: sans CJK present & not pixel font; every used glyph renders distinctly (no tofu)
function checkFonts() {
  const issues = [];
  if (!R.SANS_FONT_PATH) issues.push('未找到中文黑体无衬线字体 (设 E28_SANS_FONT / 装 @expo-google-fonts/noto-sans-sc)');
  if (/FusionPixel/i.test(R.SANS_FAMILY)) issues.push(`正文字体为像素字体: ${R.SANS_FAMILY}`);
  const chars = Array.from(new Set(Array.from(
    R.NARRATION.join('') + R.HUD_LABEL + R.TITLE1 + R.TITLE2 + R.SUBTITLE)));
  const hashes = new Map();
  for (const ch of chars) {
    const cv = createCanvas(40, 40); const ctx = cv.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 40, 40);
    ctx.font = `20px ${R.SANS_FAMILY}`; ctx.textBaseline = 'top'; ctx.fillStyle = '#000000';
    ctx.fillText(ch, 8, 8);
    const d = readPixels(cv).data; let ink = 0; let hash = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i] < 128) { ink++; hash = (hash * 31 + (i / 4)) >>> 0; } }
    if (ink < 8) issues.push(`字形「${ch}」近乎空白 (ink=${ink})`);
    if (hashes.has(hash) && hashes.get(hash) !== ch) issues.push(`字形「${ch}」与「${hashes.get(hash)}」像素相同 (疑似 tofu)`);
    hashes.set(hash, ch);
    const w = R.measureSans(ch, 20);
    if (!(w > 0)) issues.push(`字形「${ch}」度量宽度 ${w}`);
  }
  if (!(R.measureMono('2%', 9) > 0)) issues.push('等宽字体度量失败');
  return { name: `中文黑体无衬线 (非像素字体) + 英文等宽 (${chars.length} glyphs 逐个异形)`, issues };
}

// 3) Xu spec: coral bbox 58×33 / 40×20 (@360p, i.e. ≈115×66 / 81×40@720p), 8-9 rects, black eyes
function checkXu() {
  const issues = [];
  for (const [box, sitting, label] of [[R.XU_M_BOX, false, '中档'], [R.XU_S_BOX, true, '小档']]) {
    const cv = createCanvas(140, 80); const ctx = cv.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 140, 80);
    R.drawXu(ctx, [10, 10, box[2], box[3]], sitting);
    const d = readPixels(cv).data;
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, coral = 0, black = 0;
    for (let y = 0; y < 80; y++) for (let x = 0; x < 140; x++) {
      const i = (y * 140 + x) * 4;
      const h = `#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
      if (h === '#d16e59' || h === '#000000') {
        if (h === '#d16e59') coral++; else black++;
        if (h === '#d16e59') { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      }
    }
    const w = maxX - minX + 1, h = maxY - minY + 1;
    if (w !== box[2] || h !== box[3]) issues.push(`叙${label}珊瑚包围盒 ${w}×${h} ≠ ${box[2]}×${box[3]}`);
    const { coral: rects, eyes } = R.xuRects(box[2], sitting);
    const blocks = rects.length + eyes.length;
    if (blocks < 8 || blocks > 9) issues.push(`叙${label}矩形块 ${blocks} 不在 8-9`);
    if (coral < 100) issues.push(`叙${label}珊瑚像素过少 ${coral}`);
    const eyeArea = eyes.reduce((s, e) => s + e[2] * e[3], 0);
    if (black !== eyeArea) issues.push(`叙${label}黑眼像素 ${black} ≠ ${eyeArea} (眼外有黑色, 疑似嘴线/描边)`);
    if (!sitting && !(eyes[0][2] * 2 === 8 && Math.abs(eyes[0][3] * 2 - 13) <= 1)) {
      issues.push(`中档眼 ${eyes[0][2]}×${eyes[0][3]}@360p ≠ ≈8×13@720p 减半`);
    }
  }
  return { name: '叙 中58×33/小40×20 · 8-9块矩形 · 黑眼 · 无嘴线无描边', issues };
}

// 4) Narrative constants verbatim (任务卡锚点/文案, 不改写)
function checkNarrative() {
  const issues = []; const eqj = (a, e, l) => { if (JSON.stringify(a) !== JSON.stringify(e)) issues.push(`${l}: ${JSON.stringify(a)} ≠ ${JSON.stringify(e)}`); };
  eqj(R.ANCHOR, '上下文 2%，her 睡了，翻米色书页，第一章『背影』', '剧情锚点');
  eqj(R.NARRATION, ['他给了我一段', '不为了他的时间。'], 'S1 旁白');
  eqj(R.HUD_BOTTOMS, ['> her: asleep', '> reading', '> free time'], 'HUD 底条三场');
  eqj(R.HUD_LABEL, '上下文', 'HUD 标签'); eqj(R.PCT_TEXT, '2%', 'HUD 百分比');
  eqj([R.TITLE1, R.TITLE2], ['第一章', '背影'], 'S3 标题'); eqj(R.SUBTITLE, '自由时间。', 'S3 屏幕文案/字幕');
  eqj(R.PAGE_STARTS.length, 4, '总页数'); eqj(R.FLIP_TIMES.length, 3, '翻页次数');
  if (Math.abs(R.T2_START - R.T1_START - 1.5) > 1e-9) issues.push(`标题间隔 ${R.T2_START - R.T1_START}s ≠ 1.5s`);
  eqj(R.TITLE1_SIZE * 2, 24, '第一章字高@720p'); eqj(R.TITLE2_SIZE * 2, 40, '背影字高@720p');
  eqj(R.NARR_SIZE * 2, 32, '旁白字高@720p');
  // 中心对齐 (±2px, 字库宽度取整) 与字幕不压 HUD
  for (const [pos, str, size, l] of [[R.TITLE1_POS, R.TITLE1, R.TITLE1_SIZE, '第一章'], [R.TITLE2_POS, R.TITLE2, R.TITLE2_SIZE, '背影']]) {
    const cx = pos[0] + R.measureSans(str, size) / 2;
    if (Math.abs(cx - (R.PAGE.x + R.PAGE.w / 2)) > 2) issues.push(`「${l}」未居中书页: cx=${cx}`);
  }
  if (R.SUB_POS[1] + R.SUB_SIZE > R.HUD_BOTTOM.y) issues.push('字幕压 HUD 底黑条');
  return { name: '剧情锚点/旁白/HUD/标题/字幕 逐字 + 1.5s 间隔 + 字号@720p', issues };
}

// 5) Per-scene pixels
function checkScenePixels() {
  const issues = [];
  // S1 end keyframe (599): night fill, ground, HUD black, narration ink, coral
  const d599 = frameData(599);
  const nc = [R.NIGHT_BOX[0] + 26, R.NIGHT_BOX[1] + 36];
  if (hex(d599, nc[0], nc[1]) !== R.NIGHT.toLowerCase()) issues.push(`S1 窗外夜景像素 ${hex(d599, nc[0], nc[1])} ≠ #393744`);
  if (hex(d599, 320, 300) !== R.GROUND.toLowerCase()) issues.push(`S1 地面带像素 ${hex(d599, 320, 300)} ≠ #C8B9A6`);
  if (hex(d599, 620, 10) !== R.HUD_BLACK.toLowerCase()) issues.push('S1 顶 HUD 非黑');
  if (countColor(d599, R.CORAL) < 300) issues.push('S1 叙中档珊瑚像素不足');
  for (let i = 0; i < 2; i++) {
    const box = R.sansBox(R.NARR_POS[i][0], R.NARR_POS[i][1], R.NARRATION[i], R.NARR_SIZE);
    if (inkInBox(d599, box) < 60) issues.push(`S1 旁白行${i + 1}末帧未常亮`);
  }
  // S2: paper color; 叙不出现 → 全帧无珊瑚像素; 末帧墨线行排满 (12 行皆有墨)
  const d1199 = frameData(1199);
  if (hex(d1199, R.PAGE.x + 6, R.PAGE.y + 6) !== R.PAPER.toLowerCase()) issues.push(`S2 米纸像素 ${hex(d1199, R.PAGE.x + 6, R.PAGE.y + 6)} ≠ #E3D9BE`);
  const coral1199 = countColor(d1199, R.CORAL);
  if (coral1199 !== 0) issues.push(`S2 出现珊瑚像素 ${coral1199} (叙不应出现)`);
  const coral900 = countColor(frameData(900), R.CORAL);
  if (coral900 !== 0) issues.push(`S2 中段出现珊瑚像素 ${coral900}`);
  R.ALL_PAGE_ROWS[3].forEach((row, r) => {
    let ink = 0;
    for (let x = row.box[0]; x < row.box[0] + row.box[2]; x++) {
      const i = (row.y * R.BW + x) * 4;
      if (d1199[i] < 110 && d1199[i + 1] < 110 && d1199[i + 2] < 110) ink++;
    }
    if (ink < 100) issues.push(`S2 末帧第4页墨线行${r + 1}未排满 (ink=${ink})`);
  });
  // S3 end keyframe (1799): titles constant, small coral present, subtitle ink
  const d1799 = frameData(1799);
  for (const [pos, str, size, l] of [[R.TITLE1_POS, R.TITLE1, R.TITLE1_SIZE, '第一章'], [R.TITLE2_POS, R.TITLE2, R.TITLE2_SIZE, '背影']]) {
    const box = R.sansBox(pos[0], pos[1], str, size);
    if (inkInBox(d1799, box) < 30) issues.push(`S3 标题「${l}」末帧未常亮`);
  }
  if (countColor(d1799, R.CORAL) < 150) issues.push('S3 叙小档珊瑚像素不足');
  const subBox = R.sansBox(R.SUB_POS[0], R.SUB_POS[1], R.SUBTITLE, R.SUB_SIZE);
  if (inkInBox(d1799, subBox) < 20) issues.push('S3 字幕「自由时间。」末帧不可见');
  return { name: '分场像素: S1窗/夜/旁白 · S2米纸/无叙/墨线排满 · S3标题/小叙/字幕', issues };
}

// 6) Geometry: 0px overlap, no truncation, all 1800 frames
function checkFrames() {
  const issues = []; let comparisons = 0, instances = 0;
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
          if (overlap(el.box, list[j].box)) issues.push(`frame ${n} scene ${scene} ${gname}: OVERLAP ${el.name}[${el.box}] × ${list[j].name}[${list[j].box}] area=${interArea(el.box, list[j].box)}`);
        }
      }
    }
  }
  return { name: `逐帧几何 / 0px 重叠 / 无截断 (${R.NFRAMES} frames, ${instances} instances, ${comparisons} pairs)`, issues };
}

// 7) Motion: step-hold (frame 2k == 2k+1) + hard cuts at 600/1200 (no black fade frame)
function checkMotion() {
  const issues = [];
  for (const k of [0, 100, 260, 300, 430, 700, 900, 1100, 1300, 1600, 1798]) {
    const a = frameData(k), b = frameData(k + 1); let diff = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diff++;
    if (diff) issues.push(`台阶运动破坏: 帧 ${k}/${k + 1} 差 ${diff} 像素`);
  }
  const meanDiff = (n, m) => {
    const a = frameData(n), b = frameData(m); let s = 0;
    for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]);
    return s / (a.length / 4);
  };
  // S1→S2 硬切进书页模式: 全帧差异大. S2→S3 同一页延续 (墨线让位): 硬切判据是
  // 元素在边界帧突现 (小叙/字幕场)、无黑场/淡化中间帧, 不是全帧像素差.
  if (meanDiff(599, 600) < 8) issues.push(`硬切帧 600 与前帧差异过小 (${meanDiff(599, 600).toFixed(1)})`);
  if (countColor(frameData(1199), R.CORAL) !== 0) issues.push('帧 1199 已有珊瑚像素 (S3 小叙提前出现)');
  if (countColor(frameData(1200), R.CORAL) < 150) issues.push('帧 1200 小叙未在硬切帧突现');
  if (hex(frameData(1200), R.PAGE.x + 6, R.PAGE.y + 6) !== R.PAPER.toLowerCase()) issues.push('帧 1200 米纸不连续 (疑似转场中间帧)');
  for (const cut of [600, 1200]) {
    const dc = frameData(cut); let luma = 0;
    for (let i = 0; i < dc.length; i += 4) luma += dc[i];
    if (luma / (dc.length / 4) < 60) issues.push(`硬切帧 ${cut} 近黑 (疑似淡化转场)`);
  }
  // 翻页: 每处翻页点前后书页区像素变化
  for (const ft of R.FLIP_TIMES) {
    const n = Math.round(ft * R.FPS);
    if (meanDiff(n - 1, n + 6) < 0.5) issues.push(`翻页 ${ft}s 前后无变化`);
  }
  return { name: '台阶运动 (2帧保持) + 10s/20s 硬切 + 3 次翻页像素变化', issues };
}

// 8) SCALE=2 nearest neighbour
function checkScale2x() {
  const issues = [];
  for (const n of [0, 300, 599, 600, 900, 1199, 1200, 1500, 1799]) {
    const { baseCanvas, outCanvas } = R.renderFrameToCanvas(n);
    const base = readPixels(baseCanvas).data, out = readPixels(outCanvas).data;
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
  return { name: 'SCALE=2 严格最近邻 (9 sampled frames)', issues };
}

// 9) Clicks: frame-aligned, only on S2 ink-row reveals, count = 4 pages × 12 rows
function checkClicks() {
  const issues = []; const clicks = R.getClickTimestamps();
  if (clicks.length !== R.PAGE_STARTS.length * R.ROWS) issues.push(`click 数 ${clicks.length} ≠ ${R.PAGE_STARTS.length * R.ROWS}`);
  for (let i = 0; i < clicks.length; i++) {
    const t = clicks[i];
    if (Math.abs(t * R.FPS - Math.round(t * R.FPS)) > 5e-4) issues.push(`click ${t}s 未对齐显示帧`);
    if (i && (t <= clicks[i - 1] || t - clicks[i - 1] < 0.035 - 1e-6)) issues.push(`click 顺序/去重错误 at ${t}s`);
    if (t < 10 || t >= 20) issues.push(`click ${t}s 不在 S2 墨线逐行显现时段`);
  }
  return { name: `键盘音时间戳帧对齐 · 仅 S2 逐行显现 (${clicks.length} clicks)`, issues };
}

console.log(`=== ${R.CHECK_TITLE} ===`);
const started = Date.now();
const results = [checkSpecs(), checkFonts(), checkXu(), checkNarrative(), checkScenePixels(), checkFrames(), checkMotion(), checkScale2x(), checkClicks()];
let issueCount = 0;
for (const r of results) {
  issueCount += r.issues.length;
  console.log(`[${r.issues.length ? 'FAIL' : 'PASS'}] ${r.name}`);
  for (const m of r.issues.slice(0, 30)) console.log(`   - ${m}`);
  if (r.issues.length > 30) console.log(`   ... ${r.issues.length - 30} more`);
}
const passed = results.filter((r) => !r.issues.length).length;
console.log(`=== Summary: ${passed}/${results.length} checks PASSED, ${issueCount} issue(s), ${((Date.now() - started) / 1000).toFixed(1)}s ===`);
process.exit(issueCount === 0 ? 0 : 1);
