#!/usr/bin/env node
'use strict';
// E24 重生 (rebirth) — 8 standard story checks + episode narrative/pixel invariants.

const R = require('./render_E24_rebirth_arena');
const { run, readPixels } = require('./check_overlap_story_common');

const frame = (n) => readPixels(R.renderFrameToCanvas(n).baseCanvas).data;
const at = (d, x, y) => {
  const i = (Math.round(y) * R.BW + Math.round(x)) * 4;
  return [d[i], d[i + 1], d[i + 2]];
};

function meanLuma(d, x0, y0, x1, y1) {
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * R.BW + x) * 4;
      sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      n++;
    }
  }
  return sum / n;
}

const upperLuma = (n) => meanLuma(frame(n), 0, 0, R.BW, R.SUB.y);

// 区域里与目标色（各通道 ±tol）一致的像素数
function countColor(d, target, tol, x0, y0, x1, y1) {
  let count = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const [r, g, b] = at(d, x, y);
      if (Math.abs(r - target[0]) <= tol && Math.abs(g - target[1]) <= tol && Math.abs(b - target[2]) <= tol) count++;
    }
  }
  return count;
}

function checkEpisodeNarrative() {
  const issues = [];

  // ---- S1 (0-10s): 全黑 + 终端轮廓线 + 4×4 硬盘灯，Clawd 不出现，无字幕 ----
  const blackFrame = frame(120); // 2.0s
  if (upperLuma(120) > 3.0) issues.push(`S1 screen not near-black: luma(2s)=${upperLuma(120).toFixed(2)}`);
  if (at(blackFrame, 200, 300).join(',') !== '0,0,0') {
    issues.push(`S1 terminal interior is not black: ${at(blackFrame, 200, 300)}`);
  }
  if (R.SUB_LINES[0] !== '') issues.push(`S1 must have no subtitle: ${R.SUB_LINES[0]}`);
  if (at(blackFrame, 320, 210)[1] !== 0) issues.push('S1 hard-disk LED visible before 5s');
  if (R.clawdS2X(0) !== null && R.clawdS2X(9.9) !== null) issues.push('Clawd must not appear in S1');

  // 缓亮缓灭两次 → 常亮：6.05s / 8.15s 峰值，7.10s 谷值，9.4s 及以后常亮
  const gPeak1 = at(frame(Math.round(6.05 * 60)), 320, 210)[1];
  const gTrough = at(frame(Math.round(7.10 * 60)), 320, 210)[1];
  const gPeak2 = at(frame(Math.round(8.15 * 60)), 320, 210)[1];
  const gLock = at(frame(Math.round(9.5 * 60)), 320, 210)[1];
  if (!(gPeak1 > 180 && gPeak2 > 180)) issues.push(`S1 LED did not pulse twice: peaks=${gPeak1}/${gPeak2}`);
  if (gTrough > 40) issues.push(`S1 LED did not dim between pulses: g=${gTrough}`);
  if (gLock !== 231) issues.push(`S1 LED not steady-on at 9.5s: g=${gLock}`);

  // ---- S2 (10-20s): 三行系统日志、无键盘音、像素点放大 16×16、Clawd 走入 ----
  const lines = R.S2_LINES.map(R.lineText);
  const expect = ['[fs] format /dev/disk0 … ok', '[fs] write 0x00 … ok', '[fs] 1 byte written'];
  expect.forEach((txt, i) => {
    if (lines[i] !== txt) issues.push(`S2 line ${i + 1} mismatch: "${lines[i]}"`);
  });
  if (!R.S2_LINES.every((l) => l.typed === false)) issues.push('S2 system lines must print instantly (no user typing)');

  const clicks = R.getClickTimestamps();
  const inS2 = clicks.filter((t) => t >= 10 && t < 20);
  if (inS2.length) issues.push(`S2 must be silent of keyboard clicks: ${inS2.join(', ')}`);
  const confirm = R.getConfirmTimestamps();
  if (confirm.length !== 3 || confirm.some((t, i) => Math.abs(t - R.S2_LINES[i].start) > 0.02)) {
    issues.push(`S2 confirm tones mismatch: ${confirm.join(', ')}`);
  }

  const dS1End = frame(Math.round(9.8 * 60));
  if (at(dS1End, 313, 203)[1] > 40) issues.push('S1 dot must still be 4×4 (pixel at 313,203 lit)');
  const dS2End = frame(Math.round(19.6 * 60));
  if (at(dS2End, 313, 203)[1] < 180 || at(dS2End, 327, 217)[1] < 180) {
    issues.push(`S2 dot did not expand to 16×16: ${at(dS2End, 313, 203)} / ${at(dS2End, 327, 217)}`);
  }
  // Clawd 已停在像素点右上 1/4，低头看像素点 = thinking 配色（叠加 S2 压暗层）
  const dim = R.dimAt(19.6);
  const scaled = (rgb) => rgb.map((v) => Math.round(v * (1 - dim)));
  const thinking = scaled([107, 91, 149]);
  const clawdPixels = countColor(dS2End, thinking, 3, 460, 96, 570, 138);
  if (clawdPixels < 200) issues.push(`S2 Clawd (head down / thinking) missing at dot's upper-right quarter: ${clawdPixels}px of ${thinking}`);
  if (!(R.antennaRise(19.6) === 1)) issues.push('S2 antenna did not finish rising');

  // ---- S3 (20-30s): 280ms/字、hello、5 圈像素环、Clawd 让开中心 -------------
  const s3 = R.TYPING_SCHEDULE.map((x) => x.charMs);
  if (s3.some((ms) => ms !== R.TYPE_CHAR_MS * 2)) {
    issues.push(`S3 typing must be 50% slower (${R.TYPE_CHAR_MS * 2}ms/char): ${s3.join(',')}`);
  }
  if (R.lineText(R.S3_LINES[1]) !== 'hello') issues.push('S3 output line is not "hello"');
  if (R.RING_TIMES.length !== 5) issues.push(`S3 must emit 5 rings: ${R.RING_TIMES.length}`);
  if (R.SUB_LINES[2] !== 'hello。') issues.push(`S3 subtitle mismatch: ${R.SUB_LINES[2]}`);

  const beforeRings = frame(Math.round(22.5 * 60));
  if (at(beforeRings, 302, 210)[1] > 60) issues.push('S3 ring visible before `hello` is typed');
  const afterRings = frame(Math.round(29.0 * 60));
  if (at(afterRings, 302, 210)[1] < 60) issues.push(`S3 5th ring missing at 29s: ${at(afterRings, 302, 210)}`);
  if (R.ringDiameter(4, 29.0) !== 36 || R.ringDiameter(4, 30) !== 36) {
    issues.push(`S3 halo must stop at 36px: ${R.ringDiameter(4, 29.0)}/${R.ringDiameter(4, 30)}`);
  }
  // 最后 2 秒静止：28.3s 与 29.0s 的光晕区域逐像素一致
  const a = frame(Math.round(28.3 * 60));
  const b = frame(Math.round(29.0 * 60));
  let diff = 0;
  for (let y = 190; y < 230; y++) {
    for (let x = 300; x < 340; x++) {
      if (at(a, x, y).join() !== at(b, x, y).join()) diff++;
    }
  }
  if (diff) issues.push(`S3 halo still moving in last 2s: ${diff} pixels changed 28.3s→29.0s`);

  // Clawd 终态：画面右侧 1/4，正面朝观众（本体原色，S3 压暗层已归零）
  const dEnd = frame(Math.round(29.0 * 60));
  const bodyPure = [217, 119, 87];
  const rightQuarter = countColor(dEnd, bodyPure, 2, 480, 96, 640, 138);
  const centerZone = countColor(dEnd, bodyPure, 2, 200, 96, 460, 138);
  if (rightQuarter < 200) issues.push(`S3 Clawd missing from right quarter: ${rightQuarter}px`);
  if (centerZone > 0) issues.push(`S3 Clawd did not clear the center: ${centerZone}px coral at x=200..460`);
  if (R.clawdS3X(30) !== R.CLAWD_REST_X) issues.push(`S3 Clawd rest x=${R.clawdS3X(30)} ≠ ${R.CLAWD_REST_X}`);

  // ---- 全片：从黑里亮起来（亮度单调回升） ----------------------------------
  const l11 = upperLuma(Math.round(11.0 * 60));
  const l19 = upperLuma(Math.round(19.0 * 60));
  const l25 = upperLuma(Math.round(25.0 * 60));
  if (!(l11 < l19 && l19 < l25)) {
    issues.push(`Screen did not brighten out of black: luma(11s)=${l11.toFixed(1)}, 19s=${l19.toFixed(1)}, 25s=${l25.toFixed(1)}`);
  }

  return issues;
}

const baseOk = run(R);
const epIssues = checkEpisodeNarrative();
console.log(`[${epIssues.length ? 'FAIL' : 'PASS'}] E24 剧情与像素专项校验 (blank+LED / 3 fs lines+16px byte / hello+5 rings+clawd)`);
for (const msg of epIssues) console.log(`   - ${msg}`);
process.exit(baseOk && epIssues.length === 0 ? 0 : 1);
