#!/usr/bin/env node
'use strict';
// E25 zero-tolerance overlap and frame-timeline acceptance checks.
const fs = require('fs');
const R = require('./render_E25_naming_arena');

const issues = [];
let checks = 0;
let failedChecks = 0;
function check(name, fn) {
  checks++;
  const found = fn() || [];
  if (found.length) {
    failedChecks++;
    issues.push(...found.map((m) => `${name}: ${m}`));
    console.log(`[FAILED] ${name} (${found.length} issue${found.length === 1 ? '' : 's'})`);
    for (const msg of found.slice(0, 20)) console.log(`  - ${msg}`);
    if (found.length > 20) console.log(`  ... ${found.length - 20} more`);
  } else {
    console.log(`[PASSED] ${name}`);
  }
}
function near(a, b, epsilon = 1e-6) { return Math.abs(a - b) <= epsilon; }
function overlap(a, b) {
  const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return w > 0 && h > 0;
}
function outside(box, bound) {
  return box[0] < bound.x - 1e-6 || box[1] < bound.y - 1e-6 ||
    box[0] + box[2] > bound.x + bound.w + 1e-6 ||
    box[1] + box[3] > bound.y + bound.h + 1e-6;
}
check('640×360 / SCALE=2 / 1280×720 / 1800 frames @60fps', () => {
  const bad = [];
  const expected = { BW: 640, BH: 360, SCALE: 2, FW: 1280, FH: 720, FPS: 60, DURATION: 30, NFRAMES: 1800 };
  for (const [key, value] of Object.entries(expected)) if (R[key] !== value) bad.push(`${key}=${R[key]}, expected ${value}`);
  if (R.NFRAMES !== R.DURATION * R.FPS) bad.push('frame count does not equal duration×fps');
  if (R.CHARACTER_SIZES.medium.width * R.SCALE !== 115 || R.CHARACTER_SIZES.medium.height * R.SCALE !== 66) {
    bad.push('medium character size is not exactly 115×66 @720p');
  }
  return bad;
});

check('唯一珊瑚色 / 叙的矩形块 / 眼睛尺寸', () => {
  const bad = [];
  if (R.COLORS.coral !== '#D16E59') bad.push(`coral=${R.COLORS.coral}`);
  if (R.MEDIUM_BLOCKS.length !== 9) bad.push(`character has ${R.MEDIUM_BLOCKS.length} blocks, expected 9`);
  const eyes = R.MEDIUM_BLOCKS.filter((b) => b.kind === 'eye');
  if (eyes.length !== 2) bad.push(`eye blocks=${eyes.length}, expected 2`);
  for (const [i, eye] of eyes.entries()) {
    if (eye.w * R.SCALE !== 8 || eye.h * R.SCALE !== 13) bad.push(`eye ${i + 1} is not 8×13 @720p`);
  }
  if (R.MEDIUM_BLOCKS.some((b) => !['body', 'side', 'leg', 'eye'].includes(b.kind))) bad.push('unknown character block');
  return bad;
});

check('S1 空白 / 0% / 空气泡 / 字幕渐显', () => {
  const bad = [];
  const start = R.layoutAt(0);
  const end = R.layoutAt(599 / R.FPS);
  if (start.scene !== 1 || end.scene !== 1) bad.push('S1 does not occupy frames 0–599');
  if (start.progress !== 0 || end.progress !== 0) bad.push('S1 context is not 0%');
  if (start.bubble.text || end.bubble.text) bad.push('S1 air bubble is not empty');
  if (start.toolChars || start.nameChars) bad.push('S1 contains tool/name output');
  if (start.character.x !== R.HERO_HOME.x || start.character.y !== R.HERO_HOME.y) bad.push('S1 character is not at its medium-size home pose');
  if (start.subtitle !== null) bad.push('S1 subtitle is visible before its fade-in');
  if (!end.subtitle || end.subtitle.text !== R.QUESTION_SUBTITLE.text || end.subtitle.alpha < 0.99) bad.push('S1 end keyframe lacks fully visible “你是谁？”');
  const hud = end.groups.hudTop.find((item) => item.name === 'progress-track');
  if (!hud || hud.box[2] !== 72) bad.push('S1 progress track missing');
  return bad;
});

check('S2 查询 / 空输出保持2秒 / 叙右移6px / 0%', () => {
  const bad = [];
  const sceneStart = R.layoutAt(10);
  const beforeTilt = R.layoutAt(ceilToStep(R.ENTER_RAW_TIME) + 2 - 1 / R.FPS);
  const tilted = R.layoutAt(ceilToStep(R.ENTER_RAW_TIME) + 2);
  const sceneEnd = R.layoutAt(1199 / R.FPS);
  if (sceneStart.scene !== 2 || sceneEnd.scene !== 2) bad.push('S2 does not occupy frames 600–1199');
  if (sceneStart.nameChars || sceneEnd.nameChars) bad.push('S2 has a name output');
  if (sceneStart.bubble.text || sceneEnd.bubble.text) bad.push('S2 air bubble is not empty');
  if (sceneStart.progress !== 0 || sceneEnd.progress !== 0) bad.push('S2 context is not held at 0%');
  if (sceneEnd.toolChars !== Array.from(R.TOOL_LINE.text).length) bad.push('$ whoami is not fully visible at the S2 end keyframe');
  if (beforeTilt.tilted || beforeTilt.character.x !== R.HERO_HOME.x) bad.push('character tilted before the full 2-second blank wait');
  if (!tilted.tilted || tilted.character.x !== R.HERO_HOME.x + 6) bad.push('character did not shift exactly 6px after the blank wait');
  if (tilted.character.eye !== 'unchanged-8x13-at-720p') bad.push('eye shape changed during the tilt');
  if (sceneEnd.subtitle !== null) bad.push('S2 unexpectedly contains a subtitle');
  return bad;
});

check('S3 命名 / 逐字符叙 / 珊瑚字气泡 / 1%', () => {
  const bad = [];
  const beforeName = R.layoutAt(22.366667);
  const firstName = R.layoutAt(22.4);
  const end = R.layoutAt(1799 / R.FPS);
  if (R.layoutAt(20).scene !== 3 || end.scene !== 3) bad.push('S3 does not occupy frames 1200–1799');
  if (beforeName.nameChars !== 0 || beforeName.progress !== 0 || beforeName.bubble.text) bad.push('name appears before its first key event');
  if (firstName.nameChars !== 1 || firstName.progress !== 1 || firstName.bubble.text !== '叙') bad.push('name, bubble, and 1% HUD do not switch together');
  if (firstName.character.y !== R.HERO_HOME.y + 2) bad.push('character did not move down exactly 2px after the final character key');
  if (firstName.character.x !== R.HERO_HOME.x + 6) bad.push('S2 head tilt was not held into S3');
  if (end.toolChars !== Array.from(R.TOOL_LINE.text).length || end.nameChars !== 1) bad.push('S3 final two-line tool output is incomplete');
  if (!end.subtitle || end.subtitle.text !== R.NAME_SUBTITLE.text || end.subtitle.alpha < 0.99) bad.push('S3 end keyframe lacks “叙。叙述的叙。”');
  return bad;
});

function ceilToStep(t) { return Math.ceil(t * 30 - 1e-9) / 30; }

check('60fps台阶运动 / 30fps可见事件 / 键盘音帧同步', () => {
  const bad = [];
  for (let n = 0; n < R.NFRAMES; n++) {
    const layout = R.layoutAt(n / R.FPS);
    if (!near(layout.time * 30, Math.round(layout.time * 30))) {
      bad.push(`frame ${n}: visible state is not quantized to 30fps`);
      break;
    }
  }
  const clicks = R.getClickTimestamps();
  if (clicks.length !== 10) bad.push(`expected 10 key sounds (9 characters + Return), found ${clicks.length}`);
  for (let i = 0; i < clicks.length; i++) {
    if (!near(clicks[i] * R.FPS, Math.round(clicks[i] * R.FPS), 1e-4)) bad.push(`click ${clicks[i]} is off the 60fps frame grid`);
    if (!near(clicks[i] * 30, Math.round(clicks[i] * 30), 1e-4)) bad.push(`click ${clicks[i]} is not on a held 30fps step`);
    if (i > 0 && clicks[i] <= clicks[i - 1]) bad.push(`click order is not increasing at ${clicks[i]}`);
  }
  const commandClicks = clicks.filter((t) => t >= 10 && t < 20);
  const namingClicks = clicks.filter((t) => t >= 20 && t < 30);
  if (commandClicks.length !== 9 || namingClicks.length !== 1) bad.push('clicks are not restricted to command typing / Return / first name character');
  return bad;
});

check('0px 全帧重叠 / HUD与舞台边界', () => {
  const bad = [];
  let compared = 0;
  for (let n = 0; n < R.NFRAMES; n++) {
    const layout = R.layoutAt(n / R.FPS);
    const all = [];
    for (const [groupName, entries] of Object.entries(layout.groups)) {
      const bound = layout.bounds[groupName];
      for (const item of entries) {
        const box = item.box;
        if (!box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) {
          bad.push(`frame ${n} ${item.name}: invalid box ${JSON.stringify(box)}`);
          continue;
        }
        if (outside(box, bound)) bad.push(`frame ${n} ${item.name}: OUT OF BOUNDS ${JSON.stringify(box)} vs ${JSON.stringify(bound)}`);
        all.push({ name: item.name, box });
      }
    }
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        compared++;
        if (overlap(all[i].box, all[j].box)) {
          bad.push(`frame ${n}: OVERLAP ${all[i].name} ${JSON.stringify(all[i].box)} × ${all[j].name} ${JSON.stringify(all[j].box)}`);
        }
      }
    }
    if (bad.length > 100) break;
  }
  if (!bad.length && compared === 0) bad.push('no object pairs were checked');
  return bad;
});

check('SCALE=2严格最近邻输出', () => {
  const bad = [];
  const samples = [0, 240, 599, 600, 900, 1199, 1200, 1500, 1799];
  for (const n of samples) {
    const { baseCanvas, outCanvas } = R.renderFrameToCanvas(n);
    const layout = R.layoutAt(n / R.FPS);
    const base = baseCanvas.getContext('2d').getImageData(0, 0, R.BW, R.BH).data;
    const out = outCanvas.getContext('2d').getImageData(0, 0, R.FW, R.FH).data;
    const textZones = [
      [18, 12, 145, 14], // high-resolution top HUD label, bar and percentage
      [18, 330, 190, 18], // high-resolution footer copy
    ];
    for (const item of layout.groups.foreground) {
      if (item.name.includes('tool-row') || item.name.includes('name-output') || item.name.includes('subtitle')) {
        textZones.push([item.box[0] - 1, item.box[1] - 1, item.box[2] + 2, item.box[3] + 2]);
      }
    }
    if (layout.bubble.text) textZones.push([layout.bubble.x - 1, layout.bubble.y - 1, layout.bubble.w + 2, layout.bubble.h + 2]);
    let mismatches = 0;
    for (let y = 0; y < R.BH; y++) {
      for (let x = 0; x < R.BW; x++) {
        if (textZones.some((b) => x >= b[0] && x < b[0] + b[2] && y >= b[1] && y < b[1] + b[3])) continue;
        const si = (y * R.BW + x) * 4;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const di = ((y * 2 + dy) * R.FW + x * 2 + dx) * 4;
            if (out[di] !== base[si] || out[di + 1] !== base[si + 1] || out[di + 2] !== base[si + 2] || out[di + 3] !== base[si + 3]) mismatches++;
          }
        }
      }
    }
    if (mismatches) bad.push(`frame ${n}: ${mismatches} non-text output pixels differ from exact nearest-neighbor 2×`);
  }
  return bad;
});

check('MP4交付物存在', () => {
  const output = R.OUTPUT_MP4;
  if (!fs.existsSync(output)) return [`missing ${output}; render, mix audio and mux before checking`];
  if (fs.statSync(output).size <= 0) return [`${output} is empty`];
  return [];
});

console.log(`=== E25 Naming overlap check: ${checks - failedChecks}/${checks} checks PASSED; ${issues.length} issue(s) ===`);
if (issues.length) process.exit(1);
