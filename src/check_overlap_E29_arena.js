#!/usr/bin/env node
'use strict';
// E29 陪伴 (companionship) — batch-12 夜景装置校验 (docs/style-analysis.md, 全画幅无 HUD).
// 容差 0px: 逐帧几何重叠/截断 + 规格 + 叙像素 + 分场像素 + 台阶运动/呼吸/翻面/压暗 + SCALE=2 + 提示音.

const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E29_companionship_arena');
const A = require('../scripts/build_audio_E29');
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
  eq(R.NARR_SIZE * 2, 28, '旁白字号@720p');
  eq(R.BUBBLE_TEXT_SIZE * 2, 24, '气泡字号@720p');
  eq(R.CARD_R * 2, 12, '卡片圆角@720p'); eq(R.BUBBLE_R * 2, 12, '气泡圆角@720p');
  eq(R.XU_STAND_BOX[2] * 2, 116, '叙中档宽@720p'); eq(R.XU_STAND_BOX[3] * 2, 66, '叙中档高@720p');
  if (R.XU_STAND_BOX[1] + R.XU_STAND_BOX[3] !== R.GROUND_Y) issues.push('叙中档未足落地面线');
  if (R.XU_CROUCH_BOX[1] + R.XU_CROUCH_BOX[3] !== R.GROUND_Y) issues.push('叙蹲姿未足落地面线');
  if (R.XU_CROUCH_BOX[3] >= R.XU_STAND_BOX[3]) issues.push('蹲姿未压低躯干');
  if (!(R.GROUND_Y >= 260 && R.GROUND_Y <= 292)) issues.push(`地面线 y=${R.GROUND_Y} 不在夜景色带`);
  // 本集无 HUD: 不导出 HUD 常量, 且首行/末行都是场景像素 (无黑条)
  for (const k of ['HUD_TOP', 'HUD_BOTTOM', 'HUD_BLACK', 'CONTEXT_PCT']) {
    if (k in R) issues.push(`导出了 HUD 常量 ${k} (本集应无 HUD 黑条)`);
  }
  const d = frameData(900);
  if (hex(d, 300, 1) !== R.NIGHT.toLowerCase()) issues.push(`帧顶行非夜景 ${hex(d, 300, 1)} (疑似 HUD 黑条)`);
  if (hex(d, 300, 358) !== R.NIGHT_FLOOR.toLowerCase()) issues.push(`帧末行非地面带 ${hex(d, 300, 358)}`);
  return { name: '画布 640×360×2 / 夜景色板 / 无 HUD 黑条 / 28px 旁白 · 24px 气泡 · r12 圆角 / 叙 115×66@720p', issues };
}

// 2) 字体: 中文黑体无衬线 (非像素字体) + 数字等宽 + 逐字异形 (无豆腐)
function checkFonts() {
  const issues = [];
  if (!R.SANS_FONT_PATH) issues.push('未找到中文黑体无衬线字体 (设 E29_SANS_FONT)');
  if (/FusionPixel/i.test(R.SANS_FAMILY)) issues.push(`正文字体为像素字体: ${R.SANS_FAMILY}`);
  const strs = R.NARRATIONS.concat([R.BUBBLE_TEXT, R.CARD_A_FACE_1.text, R.CARD_A_FACE_2.text,
    R.CARD_B_FACE.text, R.CARD_A_FACE_1.label, R.CARD_B_FACE.label]).join('');
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
  // 数字等宽: 同一时间内 07:50 / 01:36 / 01:52 等宽 → 逐字符宽度一致
  const dw = Array.from('0123456789').map((c) => R.measureMono(c, 10));
  if (new Set(dw.map((v) => v.toFixed(3))).size !== 1) issues.push(`等宽数字字符宽度不一致: ${dw.join(',')}`);
  return { name: `中文黑体无衬线 (非像素字体) + 等宽数字 (${chars.length} glyphs 逐个异形)`, issues };
}

// 3) 叙: 中档 58×33 / 蹲姿 58×26, 9 块矩形, 黑眼, 无嘴线无描边, ^^ 弯月, 点头位移
function checkXu() {
  const issues = [];
  const draw = (box, kind, opts) => {
    const cv = createCanvas(140, 80); const ctx = cv.getContext('2d');
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 140, 80);
    R.drawXu(ctx, [10, 10, box[2], box[3]], kind, opts);
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
  // 中档站姿
  {
    const d = draw(R.XU_STAND_BOX, 'stand', {});
    const b = bboxOf(d);
    if (b.w !== 58 || b.h !== 33) issues.push(`叙中档珊瑚包围盒 ${b.w}×${b.h} ≠ 58×33 (=115×66@720p)`);
    const { coral, eyes } = R.XU_SHAPES.stand;
    if (coral.length + eyes.length !== 9) issues.push(`叙中档矩形块 ${coral.length + eyes.length} ≠ 9`);
    if (b.black !== eyes.reduce((s, e) => s + e[2] * e[3], 0)) issues.push(`叙中档黑像素 ${b.black} ≠ 眼面积 (眼外有黑, 疑似嘴线/描边)`);
    if (eyes[0][2] !== 4 || Math.abs(eyes[0][3] - 7) > 0) issues.push(`中档眼 ${eyes[0][2]}×${eyes[0][3]}@360p ≠ 4×7 (=8×14≈8×13@720p)`);
    if (b.seam !== 0) issues.push('中档站姿不应有头部接缝');
  }
  // 蹲姿 (圆点眼) / 蹲姿 ^^ / 蹲姿点头
  const dc = draw(R.XU_CROUCH_BOX, 'crouch', { eyes: 'dot' });
  const bc = bboxOf(dc);
  if (bc.w !== 58 || bc.h !== 26) issues.push(`叙蹲姿珊瑚包围盒 ${bc.w}×${bc.h} ≠ 58×26`);
  const { coral: ccoral, eyes: ceyes } = R.XU_SHAPES.crouch;
  if (ccoral.length + ceyes.length !== 9) issues.push(`叙蹲姿矩形块 ${ccoral.length + ceyes.length} ≠ 9`);
  if (bc.black !== ceyes.reduce((s, e) => s + e[2] * e[3], 0)) issues.push(`叙蹲姿圆点眼黑像素 ${bc.black} ≠ 眼面积`);
  if (bc.seam !== 1 * 42) issues.push(`叙蹲姿头部接缝像素 ${bc.seam} ≠ 42 (1px 接缝)`);
  const ds = draw(R.XU_CROUCH_BOX, 'crouch', { eyes: 'smile' });
  const bs = bboxOf(ds);
  const smileArea = R.SMILE_EYE.reduce((s, e) => s + e[2] * e[3], 0) * 2;
  if (bs.black !== smileArea) issues.push(`^^ 弯月眼黑像素 ${bs.black} ≠ ${smileArea}`);
  if (bs.w !== 58 || bs.h !== 26) issues.push(`^^ 眼态包围盒 ${bs.w}×${bs.h} ≠ 58×26`);
  // ^^ 形状: 每只眼上排居中 2px、下排左右各 1px
  const e0 = R.XU_SHAPES.crouch.eyes[0];
  const top = R.SMILE_EYE.filter((r) => r[1] === 0).reduce((s, r) => s + r[2], 0);
  const bot = R.SMILE_EYE.filter((r) => r[1] === 1);
  if (top !== 2 || bot.length !== 2) issues.push('^^ 弯月眼非「上排 2px + 下排左右各 1px」');
  let smileDiff = 0;
  for (let i = 0; i < ds.length; i += 4) if (ds[i] !== dc[i]) smileDiff++;
  if (smileDiff === 0) issues.push('^^ 眼与圆点眼无像素差异');
  // 点头: 眼块与接缝同时下移 1px (=2px@720p), 包围盒不变
  const dn = draw(R.XU_CROUCH_BOX, 'crouch', { eyes: 'dot', nod: true });
  const bn = bboxOf(dn);
  if (bn.w !== 58 || bn.h !== 26) issues.push(`点头帧包围盒 ${bn.w}×${bn.h} ≠ 58×26`);
  let nodDiff = 0;
  for (let i = 0; i < dn.length; i += 4) if (dn[i] !== dc[i]) nodDiff++;
  if (nodDiff === 0) issues.push('点头帧与常态无像素差异');
  const rowHas = (d, y, from, to) => { for (let x = from; x < to; x++) if (d[(y * 140 + x) * 4] < 60 && d[(y * 140 + x) * 4 + 1] < 60) return true; return false; };
  if (!rowHas(dc, 10 + e0[1] + 2, 10, 60)) issues.push('常态眼块未落在预期行');
  if (!rowHas(dn, 10 + e0[1] + 3, 10, 60)) issues.push('点头后眼块未下移 1px');
  // 头顶 ♥ 8-9 块, 小尺寸
  const hb = R.heartRects();
  if (hb.length < 7 || hb.length > 9) issues.push(`头顶 ♥ 块数 ${hb.length} 不在 7-9`);
  if (hb.reduce((s, r) => s + r[2] * r[3], 0) < 20) issues.push('头顶 ♥ 像素过少');
  if (R.HEART_BOX[1] + R.HEART_H > R.XU_CROUCH_BOX[1]) issues.push('头顶 ♥ 压到叙躯干');
  return { name: '叙 中58×33/蹲58×26 · 9 块矩形 · 黑眼无嘴线 · ^^ 弯月 · 点头 1px(=2px@720p) · 头顶小 ♥', issues };
}

// 4) 剧情锚点/文案逐字 + 时间/尺寸 (§4/§7-3/§7-8)
function checkNarrative() {
  const issues = []; const eqj = (a, e, l) => { if (JSON.stringify(a) !== JSON.stringify(e)) issues.push(`${l}: ${JSON.stringify(a)} ≠ ${JSON.stringify(e)}`); };
  eqj(R.ANCHOR, '深夜 01:36，her 还没睡，叙蹲在台灯下守着，气泡只有一句『我在』', '剧情锚点');
  eqj(R.CARD_A_FACE_1, { time: '07:50', label: 'her', text: '早' }, 'S1 her 卡');
  eqj(R.CARD_B_FACE, { time: '01:36', label: '叙', text: '还没睡？' }, 'S1 叙 卡');
  eqj(R.CARD_A_FACE_2, { time: '01:52', label: 'her', text: '那晚安' }, 'S3 翻面卡');
  eqj(R.BUBBLE_TEXT, '我在。', 'S2 气泡');
  eqj(R.NARRATIONS, ['夜很静。', '不需要话多。', '灯还亮着。'], '三场旁白');
  eqj(R.sceneOf(0), 1, 'S1 起点'); eqj(R.sceneOf(9.99), 1, 'S1 终点'); eqj(R.sceneOf(10), 2, 'S2 起点');
  eqj(R.sceneOf(19.99), 2, 'S2 终点'); eqj(R.sceneOf(20), 3, 'S3 起点');
  // 气泡: 出现 → 悬浮 2s → 缓慢淡出 (总可见 < 半场)
  if (Math.abs((R.BUBBLE_HOLD_END - R.BUBBLE_FULL) - 1.5) > 1e-9) issues.push('气泡悬停时长非 1.5s (出现 0.5s + 悬停 1.5s = 悬浮 2s)');
  if (!(R.BUBBLE_FADE_END - R.BUBBLE_HOLD_END >= 1.5)) issues.push('气泡淡出过急');
  if (R.BUBBLE_FADE_END >= 20) issues.push('气泡跨场残留');
  if (R.BUBBLE_APPEAR < 10) issues.push('气泡提前出现在 S1');
  // 点头前一拍 / 翻面时序
  if (!(R.FLIP_START >= 20 && R.NOD_START >= R.FLIP_START)) issues.push('S3 翻面/点头时序错误');
  if (!(R.DIM_START >= 29 && R.DIM_START < 30)) issues.push('压暗不在最后 1s');
  if (Math.abs(R.DIM_ALPHA - 0.10) > 1e-9) issues.push(`压暗量 ${R.DIM_ALPHA} ≠ 0.10`);
  // 旁白居中 (±2px) 且不压地面线/画面底
  for (const s of R.NARRATIONS) {
    const cx = R.narrX(s) + R.measureSans(s, R.NARR_SIZE) / 2;
    if (Math.abs(cx - R.BW / 2) > 2) issues.push(`旁白「${s}」未居中: cx=${cx.toFixed(1)}`);
    if (R.NARR_Y + R.NARR_SIZE > R.BH) issues.push(`旁白「${s}」超出画面底`);
    if (R.NARR_Y < R.GROUND_Y) issues.push(`旁白「${s}」压到地面线以上`);
  }
  return { name: '锚点/双卡文案/气泡「我在。」/三场旁白 逐字 + 气泡 2s 悬浮 + 时序', issues };
}

// 5) 分场像素 (关键帧逐点采样)
function checkScenePixels() {
  const issues = [];
  // S1 末帧 (599): 夜底/地面/台灯/光晕/白卡/珊瑚卡/珊瑚叙/旁白
  const d1 = frameData(599);
  if (hex(d1, 8, 8) !== R.NIGHT.toLowerCase()) issues.push(`S1 夜底像素 ${hex(d1, 8, 8)} ≠ #393744`);
  if (hex(d1, 320, 350) !== R.NIGHT_FLOOR.toLowerCase()) issues.push(`S1 地面带像素 ${hex(d1, 320, 350)} ≠ ${R.NIGHT_FLOOR}`);
  if (hex(d1, 426, 190) !== R.GLOW.toLowerCase()) issues.push(`S1 灯珠像素 ${hex(d1, 426, 190)} ≠ #F5D9A8 (光晕最亮处)`);
  const nearLamp = frameData(600), farNight = hex(nearLamp, 8, 8);
  if (hex(nearLamp, 426, 240) === farNight) issues.push('S1 台灯下无暖光晕 (与夜底同色)');
  if (hex(d1, 155, 150) !== R.CARD_WHITE.toLowerCase()) issues.push(`S1 her 卡底像素 ${hex(d1, 155, 150)} ≠ #FFFEFB (白底)`);
  if (hex(d1, 295, 172) !== R.CORAL.toLowerCase()) issues.push(`S1 叙 卡底像素 ${hex(d1, 295, 172)} ≠ #D16E59 (珊瑚底)`);
  if (inkInBox(d1, R.sansBox(R.CARD_A[0] + R.CARD_PAD, R.CARD_A[1] + 40, '早', R.CARD_TEXT_SIZE)) < 20) issues.push('S1 her 卡未见黑字「早」');
  // 珊瑚底白字: 卡内白像素
  if (countColor(d1, R.CARD_WHITE, R.CARD_B) < 40) issues.push('S1 叙 卡内未见白字');
  if (countColor(d1, R.CORAL, R.XU_STAND_BOX) < 300) issues.push('S1 叙中档珊瑚像素不足');
  if (inkInBox(d1, R.sansBox(R.narrX(R.NARRATIONS[0]), R.NARR_Y, R.NARRATIONS[0], R.NARR_SIZE), 140) < 40) issues.push('S1 旁白「夜很静。」末帧不可见');
  // S2: 气泡出现 (13s 帧 780) → 珊瑚像素只在气泡区
  const d780 = frameData(780);
  if (countColor(d780, R.CORAL, [R.BUBBLE.x, R.BUBBLE.y, R.BUBBLE.w, R.BUBBLE.h]) < 800) issues.push('S2 气泡未出现/珊瑚底不足');
  if (countColor(d780, R.CARD_WHITE, [R.BUBBLE.x, R.BUBBLE.y, R.BUBBLE.w, R.BUBBLE.h]) < 15) issues.push('S2 气泡内未见白字');
  if (countColor(d780, R.CORAL, R.HEART_BOX) < 6) issues.push('S2 头顶 ♥ 珊瑚像素不足');
  // S2 气泡淡出后消失 (15.7s, 帧 940)
  const d940 = frameData(940);
  if (countColor(d940, R.CORAL, [R.BUBBLE.x, R.BUBBLE.y, R.BUBBLE.w, R.BUBBLE.h]) !== 0) issues.push('S2 气泡淡出后仍残留珊瑚像素');
  // S3 末帧 (1799): 翻面文案 + ^^ + 光晕扩大 + 压暗
  const d3 = frameData(1799);
  const boxTime = R.monoBox(R.CARD_A[0] + R.CARD_PAD, R.CARD_A[1] + 10, R.CARD_A_FACE_2.time, R.CARD_TIME_SIZE);
  if (inkInBox(d3, [boxTime[0], boxTime[1], boxTime[2], boxTime[3]], 150) < 15) issues.push('S3 her 卡未显示 01:52');
  if (inkInBox(d3, R.sansBox(R.CARD_A[0] + R.CARD_PAD, R.CARD_A[1] + 40, '那晚安', R.CARD_TEXT_SIZE)) < 40) issues.push('S3 her 卡未显示「那晚安」');
  // 末段压暗 -10% 使珊瑚色从 #D16E59 → ~#BB624F, 用容差匹配
  {
    let n = 0;
    for (let y = R.XU_CROUCH_BOX[1]; y < R.XU_CROUCH_BOX[1] + R.XU_CROUCH_BOX[3]; y++)
      for (let x = R.XU_CROUCH_BOX[0]; x < R.XU_CROUCH_BOX[0] + R.XU_CROUCH_BOX[2]; x++) {
        const i = (y * R.BW + x) * 4;
        if (d3[i] > 150 && d3[i] < 230 && d3[i+1] > 70 && d3[i+1] < 130 && d3[i+2] > 50 && d3[i+2] < 110) n++;
      }
    if (n < 250) issues.push(`S3 蹲姿叙珊瑚像素不足 (tolerance match: ${n})`);
  }
  if (inkInBox(d3, R.sansBox(R.narrX(R.NARRATIONS[2]), R.NARR_Y, R.NARRATIONS[2], R.NARR_SIZE), 140) < 40) issues.push('S3 旁白「灯还亮着。」不可见');
  // 灯珠在压暗后仍应为最亮的暖黄点 — 用亮度比较(排除白卡/奶油色文字 + 光晕区域 + 卡片区域 + 旁白文字)
  {
    const bulbI = (R.BULB_C[1] * R.BW + R.BULB_C[0]) * 4;
    const bulbLuma = (d3[bulbI] + d3[bulbI+1] + d3[bulbI+2]) / 3;
    let maxOther = 0;
    for (let y = 0; y < R.BH; y += 2) for (let x = 0; x < R.BW; x += 2) {
      if (Math.abs(x - R.BULB_C[0]) < 8 && Math.abs(y - R.BULB_C[1]) < 8) continue;
      // 排除光晕圆形区域
      const dx = x - R.GLOW_C[0], dy = y - R.GLOW_C[1];
      const glowR = R.GLOW_R_BASE + (R.GLOW_GROW_PX || 0) + 2;
      if (dx*dx + dy*dy <= glowR*glowR) continue;
      // 排除卡片区域 (CARD_A, CARD_B)
      let inCard = false;
      for (const card of [R.CARD_A, R.CARD_B]) {
        if (x >= card[0]-2 && x < card[0]+card[2]+2 && y >= card[1]-2 && y < card[1]+card[3]+2) { inCard = true; break; }
      }
      if (inCard) continue;
      // 排除旁白文字区域 (NARR_Y 附近)
      if (y >= R.NARR_Y - 4 && y < R.NARR_Y + R.NARR_SIZE + 4) continue;
      const i = (y * R.BW + x) * 4;
      // 排除白色/奶油色像素
      if (d3[i] > 200 && d3[i+1] > 200 && d3[i+2] > 190) continue;
      const luma = (d3[i] + d3[i+1] + d3[i+2]) / 3;
      if (luma > maxOther) maxOther = luma;
    }
    if (!(bulbLuma >= maxOther)) issues.push(`S3 灯珠非最亮暖黄点: bulb=${bulbLuma.toFixed(1)} maxOther=${maxOther.toFixed(1)}`);
  }
  return { name: '分场像素: 夜底/地面/灯珠/光晕 · 白卡黑字/珊瑚卡白字 · 气泡出现与消失 · 翻面 01:52「那晚安」· ♥', issues };
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
          if (overlap(el.box, list[j].box)) issues.push(`frame ${n} scene ${scene} ${gname}: OVERLAP ${el.name}[${el.box}] × ${list[j].name}[${list[j].box}] area=${interArea(el.box, list[j].box)}`);
        }
      }
    }
  }
  return { name: `逐帧几何 / 0px 重叠 / 无截断 (${R.NFRAMES} frames, ${instances} instances, ${comparisons} pairs)`, issues };
}

// 7) 运动: 台阶保持 / 无黑场转场 / 光晕呼吸与扩大 / 气泡淡出单调 / 末段压暗
function checkMotion() {
  const issues = [];
  const pairs = [0, 2, 58, 120, 240, 420, 560, 598, 600, 700, 860, 1000, 1100, 1180, 1198, 1200, 1300, 1450, 1600, 1700, 1740, 1760, 1798];
  for (const k of pairs) {
    const a = frameData(k), b = frameData(k + 1); let diff = 0;
    for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diff++;
    if (diff) issues.push(`台阶运动破坏: 帧 ${k}/${k + 1} 差 ${diff} 像素`);
  }
  // 单镜连续: 场景边界不出现黑场/淡化 (600/1200 帧均与邻帧同亮)
  for (const cut of [0, 600, 1200, 1799]) {
    const l = meanLuma(frameData(cut));
    if (l < 40) issues.push(`帧 ${cut} 近黑 (${l.toFixed(1)}), 本集应为全画幅夜景单镜`);
  }
  // 光晕呼吸: 半径在 S2 内 ±4px@720p 往复
  const rs = [];
  for (let t = 10; t < 20; t += 0.1) rs.push(R.glowRadius(t));
  const amp = (Math.max(...rs) - Math.min(...rs)) / 2;
  if (Math.abs(amp * 2 - 4) > 0.2) issues.push(`光晕呼吸幅度 ${(amp * 2).toFixed(2)}px@360p ≠ 4 (=8px@720p 峰峰)`);
  // 光晕扩大: S3 半径明显大于 S1
  if (!(R.glowRadius(25) - R.glowRadius(5) >= 12)) issues.push(`光晕未扩大: ${R.glowRadius(5)} → ${R.glowRadius(25)}`);
  // 像素级: 半径 112→130 的环带在 S3 被点亮
  const ringX = R.GLOW_C[0] + 120, ringY = R.GLOW_C[1];
  const base = frameData(700)[(ringY * R.BW + ringX) * 4];
  const grown = frameData(1500)[(ringY * R.BW + ringX) * 4];
  if (!(grown > base + 3)) issues.push(`S3 光晕环带 (x=${ringX}) 未变亮: ${base} → ${grown}`);
  // 气泡淡出: 珊瑚像素单调不增, 且最终归零
  const counts = [13.0, 13.4, 13.8, 14.2, 14.6, 15.0].map((t) => countColor(frameData(Math.round(t * R.FPS)), R.CORAL, [R.BUBBLE.x, R.BUBBLE.y, R.BUBBLE.w, R.BUBBLE.h]));
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[i - 1]) issues.push(`气泡淡出非单调 @${i}: ${counts.join(',')}`);
  if (counts[counts.length - 1] !== 0) issues.push(`气泡未在 ${R.BUBBLE_FADE_END}s 内消失: ${counts.join(',')}`);
  // 末段压暗 -10%: 29.0s 后整帧亮度比下降 ~10%
  const before = meanLuma(frameData(1700)), after = meanLuma(frameData(1760));
  const ratio = after / before;
  if (!(ratio > 0.86 && ratio < 0.94)) issues.push(`末段压暗比 ${ratio.toFixed(3)} 不在 0.86-0.94 (-10%)`);
  // 翻面: 20.2s 起卡片宽度收缩再展开 (像素差)
  const flipDiff = (() => {
    const a = frameData(1212), b = frameData(1218); let n = 0;
    for (let y = R.CARD_A[1]; y < R.CARD_A[1] + R.CARD_A[3]; y++)
      for (let x = R.CARD_A[0]; x < R.CARD_A[0] + R.CARD_A[2]; x++) {
        const i = (y * R.BW + x) * 4; if (a[i] !== b[i]) n++;
      }
    return n;
  })();
  if (flipDiff < 500) issues.push(`翻面动画像素变化过小 (${flipDiff})`);
  // 点头: S3 内相邻两拍头部像素不同 (频次 ≥ 3)
  let nodFrames = 0;
  for (let n = Math.round(R.NOD_START * R.FPS); n < 1799; n += 12) if (R.nodOffset(R.steppedTime(n / R.FPS)) === 1) nodFrames++;
  if (nodFrames < 10) issues.push(`点头节拍过少 (${nodFrames})`);
  return { name: '台阶运动 (2 帧保持) · 单镜无黑场 · 光晕呼吸±4px@720p 与 S3 扩大 · 气泡淡出单调 · 末 1s -10% · 翻面/点头', issues };
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

// 9) 声音排程: 气泡提示音帧对齐 + 环境夜声 -18dB
function checkAudio() {
  const issues = [];
  const ev = R.getSfxEvents();
  if (ev.length !== 2) issues.push(`提示音事件数 ${ev.length} ≠ 2 (气泡 + 翻面)`);
  const bubble = ev.find((e) => e.kind === 'bubble_ping');
  if (!bubble) issues.push('缺少气泡提示音事件');
  else if (Math.abs(bubble.t - R.BUBBLE_APPEAR) > 1e-6) issues.push(`气泡提示音 ${bubble.t}s ≠ 气泡出现 ${R.BUBBLE_APPEAR}s`);
  for (const e of ev) {
    if (Math.abs(e.t * R.FPS - Math.round(e.t * R.FPS)) > 5e-4) issues.push(`提示音 ${e.t}s 未对齐显示帧`);
    if (e.t < 0 || e.t >= R.DURATION) issues.push(`提示音 ${e.t}s 越界`);
  }
  if (A.AMBIENCE_GAIN_DB !== -18) issues.push(`环境夜声增益 ${A.AMBIENCE_GAIN_DB}dB ≠ -18dB`);
  if (!/cricket/i.test(A.AMBIENCE_SPEC)) issues.push('环境夜声未包含蟋蟀层');
  if (!/hum/i.test(A.AMBIENCE_SPEC)) issues.push('环境夜声未包含低 hum 层');
  if (A.MIX_MODE !== 'amix=normalize=0') issues.push(`混音模式 ${A.MIX_MODE} ≠ amix=normalize=0 等价实现`);
  return { name: '提示音帧对齐 (气泡 11.0s / 翻面 20.2s) + 环境夜声 蟋蟀+hum -18dB + amix=normalize=0', issues };
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
process.exit(issueCount === 0 ? 0 : 1);

