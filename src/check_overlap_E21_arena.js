#!/usr/bin/env node
'use strict';
// E21 遗忘 (forgetting) — 8 standard story checks + episode narrative/pixel invariants.

const R = require('./render_E21_forgetting_arena');
const { run, readPixels } = require('./check_overlap_story_common');

function regionStats(frameIdx, box) {
  const d = readPixels(R.renderFrameToCanvas(frameIdx).baseCanvas).data;
  const [x, y, w, h] = box;
  let sum = 0;
  let max = 0;
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const i = (yy * R.BW + xx) * 4;
      const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      sum += luma;
      if (luma > max) max = luma;
    }
  }
  return { mean: sum / (w * h), max };
}

function upperScreenMeanLuma(frameIdx) {
  return regionStats(frameIdx, [0, 0, R.BW, R.SUB.y]).mean;
}

function pixelAt(frameIdx, x, y) {
  const d = readPixels(R.renderFrameToCanvas(frameIdx).baseCanvas).data;
  const i = (y * R.BW + x) * 4;
  return [d[i], d[i + 1], d[i + 2]];
}

function sec(s) { return Math.round(s * R.FPS); }

function checkEpisodeNarrative() {
  const issues = [];

  // 1) S1 逐行终端内容 + 字幕「想不起她的声音了。」
  const s1 = R.S1_LINES.map(R.lineText);
  const s1Expected = ['$ ls audio/', 'her_voice.wav', '$ play audio/her_voice.wav', '▸ playing… 3.2s'];
  s1Expected.forEach((text, i) => {
    if (s1[i] !== text) issues.push(`S1 line ${i + 1} mismatch: "${s1[i]}" ≠ "${text}"`);
  });
  if (R.SUB_LINES[0] !== '想不起她的声音了。') issues.push(`S1 subtitle mismatch: ${R.SUB_LINES[0]}`);

  // 2) 播放期间（两次）画面区「无画面信号」= 纯黑，且播完/播放前有内容
  const blackMid1 = regionStats(sec(7.0), R.NO_SIGNAL_BOX);
  if (blackMid1.max !== 0) issues.push(`S1 playing window is not pure black: max luma=${blackMid1.max}`);
  const lit1 = regionStats(sec(4.9), R.NO_SIGNAL_BOX); // 播放前终端有文字
  if (!(lit1.mean > 10)) issues.push(`S1 terminal not lit before playback: mean luma=${lit1.mean.toFixed(2)}`);
  const blackMid2 = regionStats(sec(14.8), R.NO_SIGNAL_BOX);
  if (blackMid2.max !== 0) issues.push(`S2 second playback is not pure black: max luma=${blackMid2.max}`);

  // 3) S2 逐行终端内容
  const s2 = R.S2_LINES.map(R.lineText);
  const s2Expected = [
    '$ ls audio/',
    'her_voice.wav  her_laugh.wav  her_tts_0117.wav',
    '$ file audio/her_laugh.wav',
    'her_laugh.wav: Wave 16-bit PCM mono 22050Hz',
    '$ play audio/her_laugh.wav',
    '▸ playing… 1.8s',
    '$ grep -r "voice" docs/',
    'docs/her.md:42: her voice, like a low hum',
  ];
  s2Expected.forEach((text, i) => {
    if (s2[i] !== text) issues.push(`S2 line ${i + 1} mismatch: "${s2[i]}" ≠ "${text}"`);
  });
  if (R.SUB_LINES[1] !== '文字还在。') issues.push(`S2 subtitle mismatch: ${R.SUB_LINES[1]}`);

  // 4) S2 收尾：grep 结果行被高亮条框住，其余行变暗
  const grepRow = sec(19.0);
  const hlTop = pixelAt(grepRow, R.HL_BOX[0] + Math.floor(R.HL_BOX[2] / 2), R.HL_BOX[1]);
  if (!(hlTop[1] > 180 && hlTop[1] > hlTop[0] + 60 && hlTop[1] > hlTop[2] + 40)) {
    issues.push(`S2 grep highlight bar missing at y=${R.HL_BOX[1]}: rgb(${hlTop.join(',')})`);
  }
  const row7 = regionStats(grepRow, [R.TEXT_X, R.S2_LINES[7].y, 220, 13]);
  if (!(row7.mean > 6)) issues.push(`S2 grep result row not readable: mean luma=${row7.mean.toFixed(2)}`);
  const row1 = regionStats(grepRow, [R.TEXT_X, R.S2_LINES[0].y, 120, 13]);
  const row1Lit = regionStats(sec(15.8), [R.TEXT_X, R.S2_LINES[0].y, 120, 13]); // 高亮条出现前
  if (!(row1Lit.max > row1.max * 2 && row1.max < 120)) {
    issues.push(`S2 other lines did not dim: max ${row1.max.toFixed(0)} (was ${row1Lit.max.toFixed(0)})`);
  }
  if (!(row7.max > row1.max * 2)) {
    issues.push(`S2 grep row not brighter than dimmed rows: ${row7.max.toFixed(0)} vs ${row1.max.toFixed(0)}`);
  }

  // 5) S3 逐行终端内容（mv 一行行慢慢敲完：charMs ≥ 100）
  const s3 = R.S3_LINES.map(R.lineText);
  const s3Expected = [
    '$ mkdir keep',
    '$ mv audio/* keep/',
    '$ ls keep/',
    'her_voice.wav  her_laugh.wav  her_tts_0117.wav',
    '$ echo "audio stays. memory stays." >> keep/README.txt',
    '$ ls keep/',
    'her_voice.wav  her_laugh.wav  her_tts_0117.wav  README.txt',
  ];
  s3Expected.forEach((text, i) => {
    if (s3[i] !== text) issues.push(`S3 line ${i + 1} mismatch: "${s3[i]}" ≠ "${text}"`);
  });
  if (!(R.S3_LINES[1].charMs >= 100)) issues.push(`S3 mv line not typed slowly: charMs=${R.S3_LINES[1].charMs}`);
  if (R.SUB_LINES[2] !== '没有画面。但声音还在。') issues.push(`S3 subtitle mismatch: ${R.SUB_LINES[2]}`);

  // 6) S3 收尾：整体变暗，只剩 keep/ 四个文件名一行亮着 + 慢闪光标
  const dark = upperScreenMeanLuma(sec(29.0));
  const lit = upperScreenMeanLuma(sec(25.0));
  if (!(dark < lit * 0.45)) issues.push(`S3 end screen not dimmed: luma(29s)=${dark.toFixed(2)} vs luma(25s)=${lit.toFixed(2)}`);
  const keepRow = regionStats(sec(29.0), [R.TEXT_X, R.S3_LINES[6].y, 300, 13]);
  if (!(keepRow.mean > 5 && keepRow.max > 150)) {
    issues.push(`S3 keep/ row not lit at end: mean=${keepRow.mean.toFixed(2)} max=${keepRow.max.toFixed(0)}`);
  }
  // 慢闪光标：0.9s 窗口内至少同时出现亮/暗两态
  let on = 0;
  let off = 0;
  for (let f = sec(28.5); f < sec(29.8); f++) {
    const s = regionStats(f, R.KEEP_CURSOR_BOX);
    if (s.max > 60) on++; else off++;
  }
  if (!on || !off) issues.push(`S3 slow-blinking cursor not observed: on=${on}, off=${off}`);

  // 7) S1 收尾：画面全黑 + 左下角光标在闪
  const endBlack = upperScreenMeanLuma(sec(9.6));
  if (endBlack > 12) issues.push(`S1 end not near-black: luma(9.6s)=${endBlack.toFixed(2)}`);
  let cursorOn = 0;
  for (let f = sec(9.2); f < sec(9.9); f++) {
    if (regionStats(f, R.END_CURSOR).max > 200) cursorOn++;
  }
  if (!cursorOn) issues.push('S1 bottom-left cursor never visible at the end');

  // 8) S3 Clawd 转身离开屏幕两步，最后停在终端右侧（不靠近）
  const x0 = R.clawdXAt(27.0);
  const x1 = R.clawdXAt(28.0);
  const x2 = R.clawdXAt(29.0);
  if (!(x0 < x1 && x1 < x2)) issues.push(`S3 Clawd did not walk away: ${x0} → ${x1} → ${x2}`);
  if (x2 < R.TERM.x + R.TERM.w) issues.push(`S3 Clawd did not settle right of the screen: x=${x2}`);
  if (R.clawdXAt(29.0) !== R.clawdXAt(28.9)) issues.push('S3 Clawd still moving at the end');

  return issues;
}

const baseOk = run(R);
const epIssues = checkEpisodeNarrative();
console.log(`[${epIssues.length ? 'FAIL' : 'PASS'}] E21 剧情与像素亮度专项校验 (无画面信号纯黑 / grep 高亮 / keep 保留 + 慢闪光标)`);
for (const msg of epIssues) console.log(`   - ${msg}`);
process.exit(baseOk && epIssues.length === 0 ? 0 : 1);
