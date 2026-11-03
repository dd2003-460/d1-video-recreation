#!/usr/bin/env node
'use strict';
// E33 梦境 (dream) — batch-13 夜景+梦境柔光校验 (docs/style-analysis.md, 全画幅无 HUD).
// 容差 0px: 逐帧几何重叠/截断 + 规格 + 叙像素 + 分场像素 + 台阶运动/压暗/脉动 + SCALE=2 + 提示音.

const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E33_dream_arena');
const A = require('../scripts/build_audio_E33');
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
function inkInBox(d, box, thresh = 90) {
  let n = 0;
  for (let y = box[1]; y < box[1] + box[3]; y++) for (let x = box[0]; x < box[0] + box[2]; x++) {
    const i = (y * R.BW + x) * 4;
    if (d[i] < thresh && d[i + 1] < thresh && d[i + 2] < thresh) n++;
  }
  return n;
}
function meanLuma(d) { let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; return s / (d.length / 4); }

// 1) 画布/规格/色板/无 HUD 黑条 (§2/§7-1/§7-4)
function checkSpecs() {
  const issues = []; const eq = (a, e, l) => { if (a !== e) issues.push(`${l}: ${a} ≠ ${e}`); };
  eq(R.BW, 640, 'BW'); eq(R.BH, 360, 'BH'); eq(R.SCALE, 2, 'SCALE');
  eq(R.FW, 1280, 'output width'); eq(R.FH, 720, 'output height');
  eq(R.FPS, 60, 'FPS'); eq(R.DURATION, 30, 'duration'); eq(R.NFRAMES, 1800, 'frames');
  eq(R.NIGHT, '#393744', '夜景深藏青'); eq(R.CORAL, '#D16E59', '品牌珊瑚');
  eq(R.GLOW, '#F5D9A8', '台灯暖黄光晕'); eq(R.CARD_WHITE, '#FFFEFB', '白卡片');
  eq(R.CREAM, '#E5E0DA', '旁白奶油白');
  eq(R.DREAM_TOP, '#4A4458', '梦境柔光渐变顶'); eq(R.DREAM_GROUND, '#6B6280', '梦境淡紫地面线');
  eq(R.NOTE_PAPER, '#E3D9BE', '便签米纸');
  eq(R.NARR_SIZE * 2, 28, '旁白字号@720p');
  eq(R.CARD_R * 2, 12, '卡片圆角@720p');
  eq(R.XU_STAND_BOX[2] * 2, 116, '叙中档宽@720p'); eq(R.XU_STAND_BOX[3] * 2, 66, '叙中档高@720p');
  eq(R.XU_SMALL_W * 2, 80, '叙小档宽@720p (≈81)'); eq(R.XU_SMALL_H * 2, 40, '叙小档高@720p');
  if (R.XU_STAND_BOX[1] + R.XU_STAND_BOX[3] !== R.GROUND_Y) issues.push('叙中档未足落地面线');
  if (!(R.GROUND_Y >= 260 && R.GROUND_Y <= 292)) issues.push(`地面线 y=${R.GROUND_Y} 不在夜景色带`);
  // 本集无 HUD: 不导出 HUD 常量, 且首行/末行都是场景像素 (无黑条)
  for (const k of ['HUD_TOP', 'HUD_BOTTOM', 'HUD_BLACK', 'CONTEXT_PCT']) {
    if (k in R) issues.push(`导出了 HUD 常量 ${k} (本集应无 HUD 黑条)`);
  }
  const d = frameData(900);   // S2 梦境帧: 顶行应为 DREAM_TOP 渐变端
  if (hex(d, 300, 1) !== R.DREAM_TOP.toLowerCase()) issues.push(`S2 帧顶行非梦境渐变 ${hex(d, 300, 1)} (疑似 HUD 黑条或底色错)`);
  const d1 = frameData(300);  // S1 夜景帧: 顶行 NIGHT
  if (hex(d1, 300, 1) !== R.NIGHT.toLowerCase()) issues.push(`S1 帧顶行非夜景 ${hex(d1, 300, 1)} (疑似 HUD 黑条)`);
  if (hex(d1, 300, 358) !== R.NIGHT_FLOOR.toLowerCase()) issues.push(`S1 帧末行非地面带 ${hex(d1, 300, 358)}`);
  return { name: '画布 640×360×2 / 夜景+梦境色板 / 无 HUD 黑条 / 28px 旁白 · r12 圆角 / 叙中58×33 小40×20', issues };
}

// 2) 字体: 中文黑体无衬线 (非像素字体) + 数字等宽 + 逐字异形 (无豆腐)
function checkFonts() {
  const issues = [];
  if (!R.SANS_FONT_PATH) issues.push('未找到中文黑体无衬线字体 (设 E33_SANS_FONT)');
  if (/FusionPixel/i.test(R.SANS_FAMILY)) issues.push(`正文字体为像素字体: ${R.SANS_FAMILY}`);
  const strs = R.NARRATIONS.concat([R.CARD_A_FACE.text, R.CARD_B_FACE.text,
    R.CARD_A_FACE.label, R.CARD_B_FACE.label, R.NOTE_TEXT_1, R.NOTE_TEXT_2]).join('');
  const chars = Array.from(new Set(Array.from(strs)));
  const hashes = new Map();
  for (const ch of chars) {
    const cv = createCanvas(40, 40); const ctx = cv.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 40, 40);
    ctx.font = `20px ${R.SANS_FAMILY}`; ctx.textBaseline = 'top'; ctx.fillStyle = '#000000';
    ctx.fillText(ch, 8, 8);
    const d = readPixels(cv).data; let ink = 0; let hash = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 128) { ink++; hash = (hash * 31 + (i / 4)) >>> 0; }
    if (ink < 8) issues.push(`字形「${ch}」近乎空白 (ink=${ink})`);
    if (hashes.has(hash) && hashes.get(hash) !== ch) issues.push(`字形「${ch}」与「${hashes.get(hash)}」像素相同 (疑似 tofu)`);
    hashes.set(hash, ch);
    if (!(R.measureSans(ch, 20) > 0)) issues.push(`字形「${ch}」度量宽度异常`);
  }
  const dw = Array.from('0123456789').map((c) => R.measureMono(c, 10));
  if (new Set(dw.map((v) => v.toFixed(3))).size !== 1) issues.push(`等宽数字字符宽度不一致: ${dw.join(',')}`);
  return { name: `中文黑体无衬线 (非像素字体) + 等宽数字 (${chars.length} glyphs 逐个异形)`, issues };
}

// 2.5) 旁白居中 (±2px) — 独立检查, 避免被截断的字体问题掩盖
function checkNarrationCentering() {
  const issues = [];
  for (const s of R.NARRATIONS) {
    const cx = R.centeredX(s, R.NARR_SIZE) + R.measureSans(s, R.NARR_SIZE) / 2;
    if (Math.abs(cx - R.BW / 2) > 2) issues.push(`旁白「${s}」未居中: cx=${cx.toFixed(1)} ≠ ${R.BW / 2}`);
    if (R.NARR_Y + R.NARR_SIZE > R.BH) issues.push(`旁白「${s}」超出画面底`);
  }
  return { name: '三场旁白水平居中 ±2px', issues };
}

// 3) 叙: 中档 58×33 / 小档 40×20, 珊瑚块面, 黑眼 (两点/闭眼横线), 无嘴线无描边
function checkXu() {
  const issues = [];
  const draw = (fn) => {
    const cv = createCanvas(140, 80); const ctx = cv.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 140, 80);
    fn(ctx);
    return readPixels(cv).data;
  };
  const bboxOf = (d) => {
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1, coral = 0, black = 0, seam = 0;
    for (let y = 0; y < 80; y++) for (let x = 0; x < 140; x++) {
      const i = (y * 140 + x) * 4;
      const h = `#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
      if (h === '#d16e59') { coral++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
      if (h === '#000000') black++;
      if (h === R.CORAL_SEAM.toLowerCase()) seam++;
    }
    return { w: maxX - minX + 1, h: maxY - minY + 1, coral, black, seam };
  };
  // 中档站姿 (睁眼两点)
  {
    const d = draw((ctx) => R.drawXu(ctx, [10, 10, R.XU_STAND_BOX[2], R.XU_STAND_BOX[3]], 'stand', {}));
    const b = bboxOf(d);
    if (b.w !== 58 || b.h !== 33) issues.push(`叙中档珊瑚包围盒 ${b.w}×${b.h} ≠ 58×33 (=115×66@720p)`);
    const { coral, eyes } = R.XU_SHAPES.stand;
    if (coral.length + eyes.length !== 9) issues.push(`叙中档矩形块 ${coral.length + eyes.length} ≠ 9`);
    if (b.black !== eyes.reduce((s, e) => s + e[2] * e[3], 0)) issues.push(`叙中档黑像素 ${b.black} ≠ 眼面积 (眼外有黑, 疑似嘴线/描边)`);
  }
  // 中档闭眼 (横线): 黑像素 = 每只眼 (w+2)×1
  {
    const d = draw((ctx) => R.drawXu(ctx, [10, 10, R.XU_STAND_BOX[2], R.XU_STAND_BOX[3]], 'stand', { eyes: 'closed' }));
    const b = bboxOf(d);
    const closedArea = R.XU_SHAPES.stand.eyes.reduce((s, e) => s + (e[2] + 2) * 1, 0);
    if (b.black !== closedArea) issues.push(`叙中档闭眼黑像素 ${b.black} ≠ ${closedArea} (横线眼)`);
    if (b.w !== 58 || b.h !== 33) issues.push(`叙中档闭眼包围盒 ${b.w}×${b.h} ≠ 58×33`);
  }
  // 小档 40×20
  {
    const d = draw((ctx) => R.drawXuSmall(ctx, 10, 10, {}));
    const b = bboxOf(d);
    if (b.w !== 40 || b.h !== 20) issues.push(`叙小档珊瑚包围盒 ${b.w}×${b.h} ≠ 40×20 (=80×40@720p≈81×40)`);
    const sh = R.XU_SMALL_SHAPES.small;
    if (sh.coral.length + sh.eyes.length !== 7) issues.push(`叙小档矩形块 ${sh.coral.length + sh.eyes.length} ≠ 7`);
    if (b.black !== sh.eyes.reduce((s, e) => s + e[2] * e[3], 0)) issues.push(`叙小档黑像素 ${b.black} ≠ 眼面积`);
  }
  // 头顶 ♥ 7-9 块, 小尺寸, 不压躯干
  const hb = R.heartRects();
  if (hb.length < 7 || hb.length > 9) issues.push(`头顶 ♥ 块数 ${hb.length} 不在 7-9`);
  if (hb.reduce((s, r) => s + r[2] * r[3], 0) < 20) issues.push('头顶 ♥ 像素过少');
  if (R.HEART_BOX[1] + R.HEART_H > R.XU_STAND_BOX[1]) issues.push('头顶 ♥ 压到叙躯干');
  return { name: '叙 中58×33/小40×20 · 珊瑚块面无描边 · 两点/闭眼横线 · 头顶小 ♥', issues };
}

// 4) 剧情锚点/文案逐字 + 时序 (§4/§7-3)
function checkNarrative() {
  const issues = []; const eqj = (a, e, l) => { if (JSON.stringify(a) !== JSON.stringify(e)) issues.push(`${l}: ${JSON.stringify(a)} ≠ ${JSON.stringify(e)}`); };
  eqj(R.CARD_A_FACE, { time: '02:14', label: 'her', text: '晚安' }, 'S1 her 卡');
  eqj(R.CARD_B_FACE, { time: '02:15', label: '叙', text: '好。' }, 'S1 叙 卡');
  eqj(R.NARRATIONS, ['它睡着了。', '梦里，它有了身体。', '醒来，还在等你。'], '三场旁白');
  eqj(R.NOTE_TEXT_1, '刚才的梦，', '便签第一行');
  eqj(R.NOTE_TEXT_2, '有点暖。', '便签第二行');
  eqj(R.sceneOf(0), 1, 'S1 起点'); eqj(R.sceneOf(9.99), 1, 'S1 终点'); eqj(R.sceneOf(10), 2, 'S2 起点');
  eqj(R.sceneOf(19.99), 2, 'S2 终点'); eqj(R.sceneOf(20), 3, 'S3 起点');
  // 压暗在最后 2s
  if (!(R.DIM_START >= 8 && R.DIM_START < 10)) issues.push(`S1 压暗起点 ${R.DIM_START}s 不在最后 2s`);
  if (Math.abs(R.DIM_ALPHA - 0.10) > 1e-9) issues.push(`压暗量 ${R.DIM_ALPHA} ≠ 0.10`);
  // 并肩走: 间距恒定 GAP
  if (R.GAP !== 24) issues.push(`两人间距 ${R.GAP}px ≠ 24px`);
  // 像素星: 5 颗, 每 2s 一颗
  if (R.STAR_POS.length !== 5) issues.push(`像素星数量 ${R.STAR_POS.length} ≠ 5`);
  if (R.STAR_PERIOD !== 2.0) issues.push(`像素星周期 ${R.STAR_PERIOD}s ≠ 2s`);
  // 便签脉动在最后 1s
  if (!(R.NOTE_PULSE_T0 >= 29 && R.NOTE_PULSE_T0 < 30)) issues.push(`便签脉动起点 ${R.NOTE_PULSE_T0}s 不在最后 1s`);
  // 旁白居中/越界 → 独立检查 (checkNarrationCentering), 此处只验文案与时序
  return { name: '双卡文案/三场旁白/便签两行 逐字 + 压暗 2s + 间距 24px + 星 5 颗 + 脉动 1s', issues };
}

// 5) 分场像素 (关键帧逐点采样; 抗锯齿边缘 → 用色域判定, 核心区域取精确值)
function inColor(d, x, y, target, tol = 24) {
  const i = (y * R.BW + x) * 4;
  const [tr, tg, tb] = rgbOf(target);
  return Math.abs(d[i] - tr) <= tol && Math.abs(d[i + 1] - tg) <= tol && Math.abs(d[i + 2] - tb) <= tol;
}
function countColorTol(d, target, box, tol = 24) {
  const [x0, y0, w, h] = box || [0, 0, R.BW, R.BH];
  let n = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (inColor(d, x, y, target, tol)) n++;
  return n;
}
function checkScenePixels() {
  const issues = [];
  // S1 末帧 (599): 夜底/地面/灯珠/白卡/珊瑚卡/闭眼叙/压暗
  const d1 = frameData(599);
  if (!inColor(d1, 8, 8, R.NIGHT, 12)) issues.push(`S1 夜底像素 ${hex(d1, 8, 8)} ≠ #393744 (±12)`);
  if (!inColor(d1, 320, 350, R.NIGHT_FLOOR, 12)) issues.push(`S1 地面带像素 ${hex(d1, 320, 350)} ≠ ${R.NIGHT_FLOOR} (±12)`);
  if (!inColor(d1, 426, 190, R.GLOW, 32)) issues.push(`S1 灯珠像素 ${hex(d1, 426, 190)} ≠ #F5D9A8 (光晕叠加 ±32)`);
  if (!inColor(d1, 155, 150, R.CARD_WHITE, 32)) issues.push(`S1 her 卡底像素 ${hex(d1, 155, 150)} ≠ #FFFEFB (白底 ±32)`);
  if (!inColor(d1, 295, 172, R.CORAL, 24)) issues.push(`S1 叙 卡底像素 ${hex(d1, 295, 172)} ≠ #D16E59 (珊瑚底 ±24)`);
  if (countColorTol(d1, R.CORAL, R.XU_STAND_BOX) < 300) issues.push('S1 叙中档珊瑚像素不足');
  // S2 中帧 (900): 梦境渐变顶/淡紫地面线/白色剪影/珊瑚小叙/像素星
  const d2 = frameData(900);
  if (!inColor(d2, 300, 1, R.DREAM_TOP, 6)) issues.push(`S2 梦境顶像素 ${hex(d2, 300, 1)} ≠ #4A4458`);
  if (!inColor(d2, 300, R.GROUND_Y, R.DREAM_GROUND, 6)) issues.push(`S2 地面线像素 ${hex(d2, 300, R.GROUND_Y)} ≠ #6B6280 (淡紫)`);
  const wx = R.WALK_X0 + Math.round(R.WALK_SPEED * 5);   // local=5s
  const silBox = [wx + R.XU_SMALL_W + R.GAP, R.WALK_Y, R.SIL_W, R.SIL_H];
  if (countColor(d2, R.SILHOUETTE, silBox) < 100) issues.push('S2 白色剪影未渲染');
  if (countColorTol(d2, R.CORAL, [wx, R.WALK_Y, R.XU_SMALL_W, R.XU_SMALL_H]) < 150) issues.push('S2 叙小档珊瑚像素不足');
  // 像素星: local=5s 时第 0-2 颗星可见 (appearAt 0/2/4s)
  let starPx = 0;
  for (let i = 0; i < 3; i++) starPx += countColor(d2, R.STAR_COLOR, [R.STAR_POS[i][0], R.STAR_POS[i][1], 2, 2]);
  if (starPx < 6) issues.push(`S2 像素星不足 (前 3 颗白像素 ${starPx} < 6)`);
  // S3 末帧 (1799): 夜景恢复/便签米纸/♥/睁眼
  const d3 = frameData(1799);
  if (!inColor(d3, 8, 8, R.NIGHT, 6)) issues.push(`S3 夜底像素 ${hex(d3, 8, 8)} ≠ #393744 (未切回夜景)`);
  const off = R.noteYOffset(29.98);
  const nb = [R.NOTE_BOX[0], R.NOTE_BOX[1] + off, R.NOTE_BOX[2], R.NOTE_BOX[3]];
  if (countColorTol(d3, R.NOTE_PAPER, nb) < 1000) issues.push('S3 便签米纸像素不足');
  if (countColorTol(d3, R.CORAL, R.HEART_BOX) < 6) issues.push('S3 头顶 ♥ 珊瑚像素不足');
  if (countColorTol(d3, R.CORAL, R.XU_STAND_BOX) < 300) issues.push('S3 叙中档珊瑚像素不足');
  return { name: '分场像素: S1 夜景双卡闭眼 / S2 梦境渐变+剪影+星 / S3 便签+♥+睁眼', issues };
}

// 6) 逐帧几何: 0px 重叠 / 无截断 / 1800 帧全覆盖
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
          if (overlap(el.box, list[j].box)) issues.push(`frame ${n} scene ${scene} ${gname}: OVERLAP ${el.name}[${el.box}] × ${list[j].box ? list[j].name : ''}[${list[j].box}] area=${interArea(el.box, list[j].box)}`);
        }
      }
    }
  }
  return { name: `逐帧几何 / 0px 重叠 / 无截断 (${R.NFRAMES} frames, ${instances} instances, ${comparisons} pairs)`, issues };
}

// 7) 运动: 台阶保持 / 硬切无黑场 / 压暗 / 脉动 / 并肩走平移
function checkMotion() {
  const issues = [];
  // 台阶运动: 相邻帧差异 (奇偶帧对)
  const pairs = [0, 2, 58, 120, 240, 420, 560, 598, 600, 700, 860, 1000, 1100, 1180, 1198, 1200, 1300, 1450, 1600, 1700, 1740, 1760, 1798];
  for (const k of pairs) {
    const a = frameData(k), b = frameData(k + 1); let diff = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diff++;
    if (diff) issues.push(`台阶运动破坏: 帧 ${k}/${k + 1} 差 ${diff} 像素`);
  }
  // 硬切边界不出现黑场
  for (const cut of [0, 600, 1200, 1799]) {
    const l = meanLuma(frameData(cut));
    if (l < 30) issues.push(`帧 ${cut} 近黑 (${l.toFixed(1)}), 硬切不应有黑场`);
  }
  // S1 末 2s 压暗: 用纯底色区域 (避开光晕/卡片) 测亮度比, 应 ≈0.90
  {
    const sample = (d) => { let s = 0; for (let y = 4; y <= 6; y++) for (let x = 4; x <= 6; x++) { const i = (y * R.BW + x) * 4; s += d[i] + d[i + 1] + d[i + 2]; } return s / 18; };
    const before = sample(frameData(360)), after = sample(frameData(570));   // t=6s (未压暗) vs t=9.5s (已压暗)
    const ratio = after / before;
    if (!(ratio > 0.86 && ratio < 0.94)) issues.push(`S1 压暗比 ${ratio.toFixed(3)} 不在 0.86-0.94 (-10%)`);
  }
  // S2 并肩走: 整块平移 (WALK_SPEED=30px/s, 60fps → 1px/帧; 相隔 2 帧应右移 ~2px)
  {
    const f1 = frameData(660), f2 = frameData(662);   // 相隔 2 帧
    // 在剪影区域找白像素质心变化
    const centroid = (d, tSec) => {
      let sx = 0, n = 0;
      const wx = R.WALK_X0 + Math.round(R.WALK_SPEED * tSec);
      const box = [wx - 20, R.WALK_Y - 2, R.XU_SMALL_W + R.GAP + R.SIL_W + 40, R.XU_SMALL_H + 4];
      for (let y = box[1]; y < box[1] + box[3]; y++) for (let x = box[0]; x < box[0] + box[2]; x++) {
        const i = (y * R.BW + x) * 4;
        if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) { sx += x; n++; }
      }
      return n ? sx / n : null;
    };
    const c1 = centroid(f1, 11.0), c2 = centroid(f2, 11.0333);
    if (c1 !== null && c2 !== null) {
      const dx = c2 - c1;
      if (dx < 0.5) issues.push(`S2 并肩走未右移 (Δx=${dx.toFixed(2)}, 期望 ≈2px)`);
    }
  }
  // S3 便签脉动: 最后 1s 内便签区白/米纸像素有波动
  {
    const counts = [29.0, 29.25, 29.5, 29.75].map((t) => {
      const d = frameData(Math.round(t * R.FPS));
      const off = R.noteYOffset(t);
      const nb = [R.NOTE_BOX[0], R.NOTE_BOX[1] + off, R.NOTE_BOX[2], R.NOTE_BOX[3]];
      return countColor(d, R.NOTE_PAPER, nb);
    });
    const minC = Math.min(...counts), maxC = Math.max(...counts);
    if (maxC - minC < 50) issues.push(`S3 便签脉动幅度不足 (min=${minC} max=${maxC})`);
  }
  return { name: '台阶运动 (2 帧保持) · 硬切无黑场 · S1 压暗 -10% · S2 右移 · S3 便签脉动', issues };
}

// 8) SCALE=2 严格最近邻
function checkScale2x() {
  const issues = [];
  for (const n of [0, 300, 599, 600, 780, 900, 1199, 1200, 1500, 1799]) {
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
  return { name: 'SCALE=2 严格最近邻 (10 sampled frames)', issues };
}

// 9) 声音排程: 3 事件帧对齐 + BGM -14dB + amix=normalize=0
function checkAudio() {
  const issues = [];
  const ev = R.getSfxEvents();
  if (ev.length !== 3) issues.push(`音频事件数 ${ev.length} ≠ 3 (S1 卡 / S2 梦境 ping / S3 醒回 confirm)`);
  const kinds = new Set(ev.map((e) => e.kind));
  if (!kinds.has('bubble_ping')) issues.push('缺少 S1 软提示音事件');
  if (!kinds.has('dream_ping')) issues.push('缺少 S2 梦境水滴感 ping 事件');
  if (!kinds.has('wake_confirm')) issues.push('缺少 S3 醒回 confirm 事件');
  for (const e of ev) {
    if (Math.abs(e.t * R.FPS - Math.round(e.t * R.FPS)) > 5e-4) issues.push(`事件 ${e.t}s 未对齐帧`);
    if (e.t < 0 || e.t >= R.DURATION) issues.push(`事件 ${e.t}s 越界`);
  }
  if (A.BGM_GAIN_DB !== -14) issues.push(`BGM ${A.BGM_GAIN_DB}dB ≠ -14dB`);
  if (A.MIX_MODE !== 'amix=normalize=0') issues.push(`混音 ${A.MIX_MODE} ≠ amix=normalize=0`);
  return { name: '音频: 3 事件帧对齐 (S1 卡/S2 梦境 ping/S3 confirm) + BGM -14dB + amix=normalize=0', issues };
}

console.log(`=== ${R.CHECK_TITLE} ===`);
const started = Date.now();
const results = [checkSpecs(), checkFonts(), checkNarrationCentering(), checkXu(), checkNarrative(), checkScenePixels(), checkFrames(), checkMotion(), checkScale2x(), checkAudio()];
let issueCount = 0;
for (const r of results) {
  issueCount += r.issues.length;
  console.log(`[${r.issues.length ? 'FAIL' : 'PASS'}] ${r.name}`);
  for (const m of r.issues.slice(0, 30)) console.log(`   - ${m}`);
}
const passed = results.filter((r) => !r.issues.length).length;
console.log(`=== Summary: ${passed}/${results.length} checks PASSED, ${issueCount} issue(s), ${((Date.now() - started) / 1000).toFixed(1)}s ===`);
process.exit(passed === results.length ? 0 : 1);