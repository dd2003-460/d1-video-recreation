#!/usr/bin/env node
'use strict';
// E27 Time — batch-11 新风格锚（Opus 5.5 奶油暖色 UI）零容差校验。
// 独立于 d1 的 check_overlap_story_common（后者硬编码 440×200 终端 / Clawd 40×17 / Fusion Pixel）。
// 验收：几何 0px 重叠/截断 + 风格色板 + 叙两档规格 + 三场景剧情关键帧 + 台阶运动 + 音频时钟。

const { createCanvas } = require('@napi-rs/canvas');
const R = require('./render_E27_time_arena');

const CHECK_TITLE = 'E27 Time (时间) — batch-11 Opus 5.5 风格零容差校验';

function readPixels(canvas) {
  return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
}
function hexAt(d, w, x, y) {
  const i = (y * w + x) * 4;
  return `#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function colorDist(a, b) {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}
function overlap(a, b) {
  return Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]) > 0 &&
    Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]) > 0;
}
function outside(box, b) {
  return box[0] < b.x || box[1] < b.y || box[0] + box[2] > b.x + b.w || box[1] + box[3] > b.y + b.h;
}

const results = [];
function record(name, issues) {
  results.push({ name, issues });
}

// 1) 管线常量 ----------------------------------------------------------------
function checkConstants() {
  const issues = [];
  const eq = (a, b, label) => { if (a !== b) issues.push(`${label}: ${a} ≠ ${b}`); };
  eq(R.BW, 640, 'BW'); eq(R.BH, 360, 'BH'); eq(R.SCALE, 2, 'SCALE');
  eq(R.FW, 1280, 'FW'); eq(R.FH, 720, 'FH');
  eq(R.FPS, 60, 'FPS'); eq(R.DURATION, 30, 'DURATION'); eq(R.NFRAMES, 1800, 'NFRAMES');
  eq(R.SCENE_FRAMES, 600, 'frames per scene');
  // 剧情锚点逐字（docs/episodes.md 唯一事实源）
  eq(R.TIME_FROM, '01:36', 'TIME_FROM');
  eq(R.TIME_TO, '23:59', 'TIME_TO');
  eq(R.AI_TEXT, '几点了？', 'AI bubble text');
  eq(R.USER_LINES.join('|'), '你不在的时候，|我这边连「等」都没有。', 'user bubble lines');
  eq(R.SUBTITLE_TEXT, '几点了。', 'subtitle');
  eq(R.FOOTER.S1, '> sleep', 'footer S1');
  eq(R.FOOTER.S2, '> wake', 'footer S2');
  eq(R.FOOTER.S3, '> message received', 'footer S3');
  eq(R.PCT.S1, 12, 'context S1/S2'); eq(R.PCT.S3, 31, 'context S3');
  return issues;
}

// 2) 字体：黑体无衬线 + 等宽，正文禁用像素字体 --------------------------------
function checkFonts() {
  const issues = [];
  if (!/StoryHei/.test(R.FONT_HEI)) issues.push(`中文黑体未注册: ${R.FONT_HEI}`);
  if (!/StoryMono/.test(R.FONT_MONO)) issues.push(`等宽字体未注册: ${R.FONT_MONO}`);
  for (const f of [R.FONT_HEI, R.FONT_MONO]) {
    if (/pixel|fusion/i.test(f)) issues.push(`正文禁用像素字体，实际: ${f}`);
  }
  return issues;
}

// 3) 文字阈值二值化（无抗锯齿灰边，每样本仅前景/背景两色） ----------------------
function checkTextBinary() {
  const issues = [];
  const samples = [
    { text: '几点了？', color: R.C.ink, bg: R.C.bubbleWhite, size: 12, family: R.FONT_HEI },
    { text: '23:59', color: R.C.ink, bg: R.C.bubbleWhite, size: 12, family: R.FONT_MONO },
    { text: '上下文', color: R.C.white, bg: R.C.hudBlack, size: 8, family: R.FONT_HEI },
    { text: '> wake', color: R.C.hudDim, bg: R.C.hudBlack, size: 8, family: R.FONT_MONO },
    { text: '几点了。', color: R.C.ink, bg: R.C.creamTop, size: 16, family: R.FONT_HEI },
  ];
  const cv = createCanvas(220, 60);
  const ctx = cv.getContext('2d');
  for (const s of samples) {
    ctx.fillStyle = s.bg;
    ctx.fillRect(0, 0, cv.width, cv.height);
    R.txt(ctx, 8, 8, s.text, s.color, s.size, s.family);
    const colors = new Set();
    const d = readPixels(cv);
    for (let i = 0; i < d.length; i += 4) colors.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    if (colors.size !== 2) issues.push(`「${s.text}」出现 ${colors.size} 色（期望前景/背景二值）`);
  }
  return issues;
}

// 4) 风格色板（style-analysis §2 采样值） --------------------------------------
function checkPalette() {
  const issues = [];
  const { baseCanvas } = R.renderFrameToCanvas(300);
  const d = readPixels(baseCanvas);
  const top = hexAt(d, R.BW, 320, 60);
  const ground = hexAt(d, R.BW, 320, 300);
  const hud = hexAt(d, R.BW, 10, 10);
  if (colorDist(top, R.C.creamTop) > 8) issues.push(`奶油顶色 ${top} ≠ ${R.C.creamTop}`);
  if (colorDist(ground, R.C.ground) > 8) issues.push(`地面带色 ${ground} ≠ ${R.C.ground}`);
  if (colorDist(hud, R.C.hudBlack) > 8) issues.push(`HUD 黑条 ${hud} ≠ ${R.C.hudBlack}`);
  // 地面过渡带 y260..272：带上方仍是奶油、带下方已是地面色
  if (colorDist(hexAt(d, R.BW, 320, 255), R.C.creamTop) > 10) issues.push('地面线上缘(y255)不是奶油色');
  if (colorDist(hexAt(d, R.BW, 320, 278), R.C.ground) > 10) issues.push('地面线下缘(y278)不是地面色');
  if (R.GROUND_Y < 260 || R.GROUND_Y > 272) issues.push(`地面基线 y=${R.GROUND_Y} 超出 260..272`);
  // 品牌色唯一：高饱和像素（HSL s>0.35，暖灰/奶油/黑/白自动排除）必须落在珊瑚近邻
  const [cr, cg, cb] = rgb(R.C.coral);
  let saturated = 0;
  let offHue = 0;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = (mx + mn) / 2;
    const s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
    // 极暗（HUD 黑条）/极亮（白气泡）明度端 HSL 饱和度数值不稳定，排除后只校验中间调彩色
    if (s > 0.35 && l > 0.08 && l < 0.92) {
      saturated++;
      const R8 = d[i], G8 = d[i + 1], B8 = d[i + 2];
      if (!(R8 > cr - 25 && R8 < cr + 25 && G8 > cg - 25 && G8 < cg + 25 && B8 > cb - 25 && B8 < cb + 25)) offHue++;
    }
  }
  if (saturated === 0) issues.push('帧内找不到珊瑚品牌色像素');
  if (offHue > 0) issues.push(`发现 ${offHue} 个非珊瑚高饱和像素（品牌色不唯一）`);
  return issues;
}

// 5) 叙：两档包围盒 / 黑眼 / 下看眼位 / 无描边 --------------------------------
function drawXuOnCream(pose, lookDown) {
  const cv = createCanvas(R.BW, R.BH);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = R.C.creamTop;
  ctx.fillRect(0, 0, R.BW, R.BH);
  R.drawXu(ctx, pose, lookDown);
  return cv;
}
function bboxOf(cv, targetHex) {
  const d = readPixels(cv);
  const target = targetHex.toLowerCase();
  let minX = 999, maxX = -1, minY = 999, maxY = -1;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    if (hexAt(d, cv.width, x, y) === target) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  return { minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
function checkXu() {
  const issues = [];
  const sit = bboxOf(drawXuOnCream('sit'), R.C.coral);
  if (sit.w !== R.XU_SIT.w || sit.h !== R.XU_SIT.h) {
    issues.push(`小档蹲坐珊瑚包围盒 ${sit.w}×${sit.h} ≠ ${R.XU_SIT.w}×${R.XU_SIT.h}（@360p，×2≈81×40@720p）`);
  }
  const stand = bboxOf(drawXuOnCream('stand'), R.C.coral);
  if (stand.w !== R.XU_STAND.w || stand.h !== R.XU_STAND.h) {
    issues.push(`中档站立珊瑚包围盒 ${stand.w}×${stand.h} ≠ ${R.XU_STAND.w}×${R.XU_STAND.h}（@360p，×2≈115×66@720p）`);
  }
  // 黑眼存在且为 4×7（中档）
  const cv = drawXuOnCream('stand');
  const eye = bboxOf(cv, R.C.eye);
  if (eye.h !== 7) issues.push(`黑眼高度 ${eye.h} ≠ 7（×2≈13px@720p）`);
  // 下看：黑眼整体下移 2px
  const cvDown = drawXuOnCream('stand', true);
  const eyeDown = bboxOf(cvDown, R.C.eye);
  if (eyeDown.minY - eye.minY !== 2) issues.push(`下看眼位位移 ${eyeDown.minY - eye.minY} ≠ 2px`);
  // 无描边：珊瑚块上边缘外接一行仍是奶油背景
  const d = readPixels(cv);
  if (hexAt(d, cv.width, stand.minX + 2, stand.minY - 1) !== R.C.creamTop.toLowerCase()) {
    issues.push('叙躯干上边缘外存在非背景像素（疑似描边）');
  }
  return issues;
}

// 6) 逐帧几何：整数 box / 0px 重叠 / 无截断（1800 帧） -------------------------
function checkGeometry() {
  const issues = [];
  let instances = 0;
  let pairs = 0;
  for (let n = 0; n < R.NFRAMES; n++) {
    const { scene, groups, bounds, flash } = R.layoutAt(n / R.FPS);
    if (flash) continue;
    for (const [gname, list] of Object.entries(groups)) {
      const bound = bounds[gname];
      for (let i = 0; i < list.length; i++) {
        const el = list[i];
        instances++;
        if (el.box.some((v) => !Number.isInteger(v))) issues.push(`f${n} ${gname}/${el.name} 非整数 box`);
        if (outside(el.box, bound)) issues.push(`f${n} ${scene} ${gname}/${el.name} 截断 [${el.box}] 越出 ${JSON.stringify(bound)}`);
        for (let j = i + 1; j < list.length; j++) {
          pairs++;
          if (overlap(el.box, list[j].box)) issues.push(`f${n} ${scene} ${gname} 重叠 ${el.name} × ${list[j].name}`);
        }
      }
    }
  }
  console.log(`   geometry: ${instances} instances, ${pairs} pairs across ${R.NFRAMES} frames`);
  return issues;
}

// 7) 三场景剧情关键帧 ----------------------------------------------------------
function checkStoryBeats() {
  const issues = [];
  // S1 结束帧 f599：蹲坐 + 01:36 + 气泡在最高点(y210) + 12%
  const t599 = R.steppedTime(599);
  if (R.timeTextAt(t599) !== '01:36') issues.push(`f599 时间文本 ${R.timeTextAt(t599)} ≠ 01:36`);
  const b599 = R.timeBubbleBox(599);
  if (b599.y !== R.TIME_BUBBLE.yBase - 4) issues.push(`f599 气泡未静止在最高点: y=${b599.y}`);
  const l599 = R.layoutAt(599 / R.FPS);
  if (!l599.groups.stage.some((e) => e.name === 'xu_sit')) issues.push('f599 缺蹲坐姿态');
  if (l599.pct !== 12) issues.push(`f599 上下文 ${l599.pct} ≠ 12%`);
  if (l599.groups.stage.some((e) => e.name === 'subtitle')) issues.push('S1 不应有屏幕文案');

  // f600：硬切白闪 1 帧（整帧纯白）
  const flash = R.renderFrameToCanvas(600);
  const fd = readPixels(flash.baseCanvas);
  for (const [x, y] of [[10, 10], [320, 180], [630, 350]]) {
    if (hexAt(fd, R.BW, x, y) !== '#ffffff') issues.push(`f600 白闪帧 (${x},${y}) 非纯白`);
  }

  // S2 中途 f660（t=11.0）：覆盖进行中；结束帧 f1199：23:59 常亮 + 珊瑚气泡 + 中档站立
  const t660 = R.steppedTime(660);
  const mid = R.timeTextAt(t660);
  if (mid === '01:36' || mid === '23:59') issues.push(`f660 覆盖未进行中: ${mid}`);
  const t1199 = R.steppedTime(1199);
  if (R.timeTextAt(t1199) !== '23:59') issues.push(`f1199 时间文本 ≠ 23:59: ${R.timeTextAt(t1199)}`);
  if (R.aiTypedCount(t1199) !== R.AI_TEXT.length) issues.push('f1199 珊瑚气泡「几点了？」未打完');
  const l1199 = R.layoutAt(1199 / R.FPS);
  if (!l1199.groups.stage.some((e) => e.name === 'xu_stand')) issues.push('f1199 缺中档站立');
  if (!l1199.groups.stage.some((e) => e.name === 'ai_bubble')) issues.push('f1199 缺珊瑚 AI 气泡');
  if (l1199.pct !== 12) issues.push(`f1199 上下文 ${l1199.pct} ≠ 12%（S2 不变）`);

  // S3 结束帧 f1799：用户气泡两行全显 + ？常亮 + 眼下看 + 31% + 字幕
  const t1799 = R.steppedTime(1799);
  const typed = R.userTyped(t1799);
  if (typed[0] !== R.USER_LINES[0].length || typed[1] !== R.USER_LINES[1].length) {
    issues.push(`f1799 用户气泡未两行全显: [${typed}]`);
  }
  if (R.qMarkAlpha(t1799) !== 1) issues.push(`f1799 头顶？未常亮: alpha=${R.qMarkAlpha(t1799)}`);
  const l1799 = R.layoutAt(1799 / R.FPS);
  if (l1799.pct !== 31) issues.push(`f1799 上下文 ${l1799.pct} ≠ 31%`);
  if (!l1799.groups.stage.some((e) => e.name === 'q_mark')) issues.push('f1799 layout 缺 q_mark');
  if (!l1799.groups.stage.some((e) => e.name === 'user_bubble')) issues.push('f1799 缺用户气泡');
  if (!l1799.groups.stage.some((e) => e.name === 'subtitle')) issues.push('f1799 缺字幕「几点了。」');
  // ？缓亮缓灭过程中必须存在熄灭帧（f1284 → t2=21.4s 落在灭段）
  if (R.qMarkAlpha(R.steppedTime(1284)) !== 0) issues.push('f1284 问号应处于熄灭段');
  // 字幕不压 HUD 底黑条
  const sub = l1799.groups.stage.find((e) => e.name === 'subtitle');
  if (sub.box[1] + sub.box[3] > R.HUD_BOT_BOX.y) issues.push('字幕压入 HUD 底黑条');
  return issues;
}

// 8) SCALE=2 严格最近邻 --------------------------------------------------------
function checkScale2x() {
  const issues = [];
  for (const n of [0, 300, 599, 601, 900, 1200, 1500, 1799]) {
    const { baseCanvas, outCanvas } = R.renderFrameToCanvas(n);
    const base = readPixels(baseCanvas);
    const out = readPixels(outCanvas);
    let bad = 0;
    for (let y = 0; y < R.BH; y++) for (let x = 0; x < R.BW; x++) {
      const si = (y * R.BW + x) * 4;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const di = ((y * 2 + dy) * R.FW + x * 2 + dx) * 4;
        if (out[di] !== base[si] || out[di + 1] !== base[si + 1] || out[di + 2] !== base[si + 2]) bad++;
      }
    }
    if (bad) issues.push(`f${n}: ${bad} 输出像素不符合严格 2× 最近邻`);
  }
  return issues;
}

// 9) 台阶运动：每 2 帧保持 1 帧（奇偶同帧像素一致，白闪帧除外） ----------------
function checkSteppedMotion() {
  const issues = [];
  for (const [a, b] of [[100, 101], [300, 301], [598, 599], [900, 901], [1500, 1501]]) {
    const da = readPixels(R.renderFrameToCanvas(a).baseCanvas);
    const db = readPixels(R.renderFrameToCanvas(b).baseCanvas);
    let diff = 0;
    for (let i = 0; i < da.length; i += 4) {
      if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) diff++;
    }
    if (diff !== 0) issues.push(`f${a}/f${b} 台阶保持失败: ${diff} 像素差异`);
  }
  return issues;
}

// 10) 键盘音时钟：帧对齐 / 有序去重 / 27 次（5+4+7+11） ------------------------
function checkClicks() {
  const issues = [];
  const clicks = R.getClickTimestamps();
  if (clicks.length !== 27) issues.push(`键盘音次数 ${clicks.length} ≠ 27（时间5+气泡4+用户18）`);
  for (let i = 0; i < clicks.length; i++) {
    const t = clicks[i];
    if (Math.abs(t * R.FPS - Math.round(t * R.FPS)) > 5e-4) issues.push(`click ${t}s 未对齐显示帧`);
    if (i && (t <= clicks[i - 1] || t - clicks[i - 1] < 0.035 - 1e-6)) issues.push(`click 顺序/去重错误 @${t}s`);
    if (t < 10 || t >= 30) issues.push(`click ${t}s 落在打字场景之外`);
  }
  return issues;
}

record('画布 640×360 / SCALE=2 → 1280×720 / 60fps / 1800 帧 + 剧情锚点逐字', checkConstants());
record('字体：黑体无衬线 + 英文等宽，正文无像素字体', checkFonts());
record('文字阈值二值化、无抗锯齿灰边', checkTextBinary());
record('奶油渐变/地面带/HUD 黑条/珊瑚唯一品牌色', checkPalette());
record('叙：小档 41×20 蹲坐 / 中档 58×33 站立 / 黑眼 / 下看 2px / 无描边', checkXu());
record('逐帧几何：整数 box / 0px 重叠 / 无截断', checkGeometry());
record('三场景剧情关键帧（停滞→白闪醒来→回答）', checkStoryBeats());
record('SCALE=2 严格最近邻输出', checkScale2x());
record('台阶运动（每 2 帧保持 1 帧的 30fps 定格感）', checkSteppedMotion());
record('键盘音帧对齐 / 有序去重 / 27 次', checkClicks());

let issueCount = 0;
console.log(`=== ${CHECK_TITLE} ===`);
for (const r of results) {
  issueCount += r.issues.length;
  console.log(`[${r.issues.length ? 'FAIL' : 'PASS'}] ${r.name}`);
  for (const m of r.issues.slice(0, 30)) console.log(`   - ${m}`);
}
const passed = results.filter((r) => !r.issues.length).length;
console.log(`=== Summary: ${passed}/${results.length} checks PASSED, ${issueCount} issue(s) ===`);
process.exit(issueCount === 0 ? 0 : 1);
