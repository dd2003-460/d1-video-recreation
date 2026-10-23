#!/usr/bin/env node
'use strict';
// Independent final-MP4 media and A/V-sync verification for all four deliverables.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadImage, createCanvas } = require('@napi-rs/canvas');
const { readWav16, getFfmpegPath } = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');
const FFMPEG = getFfmpegPath();
const SR = 44100;
const JOBS = {
  companion: {
    script: '../src/render_companion_arena_v11', audio: './build_audio_companion_v11',
    mp4: 'outputs/companion_arena_v1.1.mp4', mix: 'audio/companion_arena_v11_mix.wav', doc: 'docs/companion-v1.1', eyeH: 8,
  },
  reboot: {
    script: '../src/render_reboot_arena', audio: './build_audio_reboot',
    mp4: 'outputs/reboot_arena_v1.0.mp4', mix: 'audio/reboot_arena_mix.wav', doc: 'docs/reboot-v1', eyeH: 8,
  },
  dialogue: {
    script: '../src/render_dialogue_arena', audio: './build_audio_dialogue',
    mp4: 'outputs/dialogue_arena_v1.0.mp4', mix: 'audio/dialogue_arena_mix.wav', doc: 'docs/dialogue-v1', eyeH: 8,
  },
  farewell: {
    script: '../src/render_farewell_arena', audio: './build_audio_farewell',
    mp4: 'outputs/farewell_arena_v1.0.mp4', mix: 'audio/farewell_arena_mix.wav', doc: 'docs/farewell-v1', eyeH: 4,
  },
};

function ffprobe(file) {
  const local = path.join(ROOT, 'node_modules/@ffprobe-installer/linux-x64/ffprobe');
  const bin = fs.existsSync(local) ? local : 'ffprobe';
  const r = spawnSync(bin, [
    '-v', 'error', '-show_entries', 'format=duration,size,bit_rate',
    '-show_entries', 'stream=codec_name,profile,width,height,pix_fmt,r_frame_rate,nb_frames,sample_rate,channels,duration',
    '-of', 'json', file,
  ], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe failed: ${r.stderr}`);
  return JSON.parse(r.stdout);
}
function decodeFrame(mp4, n, out) {
  const r = spawnSync(FFMPEG, ['-y', '-v', 'error', '-i', mp4, '-vf', `select=eq(n\\,${n})`, '-vframes', '1', out], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`frame decode failed: ${r.stderr}`);
  return out;
}
async function framePixels(file) {
  const img = await loadImage(file);
  const cv = createCanvas(img.width, img.height);
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return { w: img.width, h: img.height, d: ctx.getImageData(0, 0, img.width, img.height).data };
}
function sameness2x(im, box) {
  const at = (x, y) => {
    const i = (y * im.w + x) * 4;
    return [im.d[i], im.d[i + 1], im.d[i + 2]];
  };
  const near = (a, b) => Math.abs(a[0] - b[0]) <= 14 && Math.abs(a[1] - b[1]) <= 14 && Math.abs(a[2] - b[2]) <= 14;
  let same = 0, total = 0;
  for (let y = box.y; y < box.y + box.h - 1; y += 2) for (let x = box.x; x < box.x + box.w - 1; x += 2) {
    const a = at(x, y); total++;
    if (near(a, at(x + 1, y)) && near(a, at(x, y + 1)) && near(a, at(x + 1, y + 1))) same++;
  }
  return { ratio: same / total, samples: total };
}
function darkBlockSize(im, box) {
  const at = (x, y) => {
    const i = (y * im.w + x) * 4;
    return [im.d[i], im.d[i + 1], im.d[i + 2]];
  };
  for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) {
    if (at(x, y).every((v) => v < 70)) {
      let w = 0, h = 0;
      while (w < 40 && at(x + w, y).every((v) => v < 90)) w++;
      while (h < 40 && at(x, y + h).every((v) => v < 90)) h++;
      return { w, h, at: [x, y] };
    }
  }
  return null;
}
function decodeAudio(mp4, out) {
  const r = spawnSync(FFMPEG, ['-y', '-v', 'error', '-i', mp4, '-vn', '-ac', '1', '-ar', String(SR), '-c:a', 'pcm_s16le', out], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`audio decode failed: ${r.stderr}`);
  return readWav16(out);
}
function audioStats(wav) {
  const arr = wav.ch[0];
  let peak = 0, clipped = 0, sumSq = 0;
  for (let i = 0; i < arr.length; i++) {
    const a = Math.abs(arr[i]); peak = Math.max(peak, a);
    if (a >= 32760) clipped++;
    sumSq += (arr[i] / 32768) ** 2;
  }
  const rms = Math.sqrt(sumSq / arr.length);
  return {
    sampleRate: wav.sampleRate, channels: wav.channels, duration: arr.length / wav.sampleRate,
    peak: peak / 32768, peakDb: 20 * Math.log10(peak / 32768), rmsDb: 20 * Math.log10(rms), clipped, samples: arr,
  };
}
function correlate(a, b) {
  const n = Math.min(a.length, b.length);
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] / 32768, y = b[i] / 32768;
    sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y;
  }
  const cov = sab / n - (sa / n) * (sb / n);
  return cov / Math.sqrt((saa / n - (sa / n) ** 2) * (sbb / n - (sb / n) ** 2));
}
function detectOnsets(mono, bgm, cfg, duration) {
  const win = Math.round(SR * 0.01);
  const nWin = Math.floor((duration * SR) / win);
  const energy = new Float64Array(nWin);
  for (let w = 0; w < nWin; w++) {
    let e = 0;
    for (let i = w * win; i < (w + 1) * win && i < mono.length; i++) {
      const t = i / SR;
      let g = cfg.BGM_GAIN;
      if (t < cfg.FADE_IN) g *= t / cfg.FADE_IN;
      if (t > duration - cfg.FADE_OUT) g *= Math.max(0, (duration - t) / cfg.FADE_OUT);
      const bg = i < bgm.length ? (bgm[i] / 32768) * g : 0;
      const v = mono[i] / 32768 - bg;
      e += v * v;
    }
    energy[w] = Math.sqrt(e / win);
  }
  const onsets = [];
  let lastW = -99;
  for (let w = 1; w < nWin - 1; w++) {
    const e = energy[w];
    if (e < 0.012 || energy[w - 1] > e || w - lastW <= 2) continue;
    onsets.push({ t: (w * win) / SR, e }); lastW = w;
  }
  return onsets;
}
function checkSync(decoded, bgm, expected, cfg, duration, fps) {
  const onsets = detectOnsets(decoded, bgm, cfg, duration);
  const used = new Set();
  let missed = 0, maxOffset = 0, matched = 0;
  for (const t of expected) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < onsets.length; i++) {
      if (used.has(i)) continue;
      const d = Math.abs(onsets[i].t - t);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0 && bestD <= 0.06) {
      used.add(best); matched++; maxOffset = Math.max(maxOffset, bestD);
    } else missed++;
  }
  const offGrid = expected.filter((t) => Math.abs(t * fps - Math.round(t * fps)) > 5e-3);
  return {
    onsets: onsets.length, unmatchedOnsets: onsets.length - used.size,
    matched, missed, maxOffsetMs: maxOffset * 1000, offGrid: offGrid.length,
    ok: missed === 0 && maxOffset * 1000 < 2 * (1000 / fps) && offGrid.length === 0,
  };
}
async function meanLuma(mp4, n, tag) {
  const file = decodeFrame(mp4, n, `/tmp/story_${tag}_luma_${n}.png`);
  const im = await framePixels(file);
  let sum = 0;
  for (let i = 0; i < im.d.length; i += 4) sum += 0.299 * im.d[i] + 0.587 * im.d[i + 1] + 0.114 * im.d[i + 2];
  return sum / (im.d.length / 4);
}

async function verify(name) {
  const job = JOBS[name];
  const R = require(path.join(__dirname, job.script));
  const audioCfg = require(path.join(__dirname, job.audio));
  const mp4 = path.join(ROOT, job.mp4);
  if (!fs.existsSync(mp4)) throw new Error(`missing ${job.mp4}`);
  const issues = [], checks = [];

  const probe = ffprobe(mp4);
  const v = probe.streams.find((s) => s.codec_name === 'h264') || {};
  const a = probe.streams.find((s) => s.codec_name === 'aac') || {};
  const spec = {
    codec: v.codec_name, profile: v.profile, width: v.width, height: v.height, pix_fmt: v.pix_fmt,
    fps: v.r_frame_rate, frames: Number(v.nb_frames), duration: Number(probe.format.duration),
    audio: { codec: a.codec_name, sampleRate: Number(a.sample_rate), channels: a.channels },
  };
  const specIssues = [];
  if (spec.width !== 1280 || spec.height !== 720) specIssues.push('resolution is not 1280×720');
  if (spec.fps !== '60/1' || spec.frames !== 1800) specIssues.push(`fps/frames ${spec.fps}/${spec.frames}`);
  if (Math.abs(spec.duration - 30) > 0.02) specIssues.push(`duration ${spec.duration}`);
  if (spec.codec !== 'h264' || spec.pix_fmt !== 'yuv420p') specIssues.push('not h264/yuv420p');
  if (spec.audio.sampleRate !== 44100 || spec.audio.channels !== 1) specIssues.push('audio is not 44.1kHz mono');
  issues.push(...specIssues); checks.push({ name: '容器/编码 1280×720@60fps · 1800帧 · 30s', ok: !specIssues.length, detail: spec });

  const im = await framePixels(decodeFrame(mp4, 120, `/tmp/story_${name}_f120.png`));
  const room = sameness2x(im, { x: 0, y: 400, w: 180, h: 280 });
  const term = sameness2x(im, { x: 200, y: 280, w: 880, h: 400 });
  const eye = darkBlockSize(im, { x: 84, y: 490, w: 100, h: 70 });
  let mullion = 0;
  for (let x = 620; x < 660; x++) {
    // y=260 (base y=130) stays above the enlarged terminal, which starts at output y=280.
    const i = (260 * im.w + x) * 4;
    const p = [im.d[i], im.d[i + 1], im.d[i + 2]];
    if (p[0] > 80 && p[0] < 210 && p[1] > 60 && p[2] > 40) mullion++;
  }
  const pixelIssues = [];
  if (room.ratio < 0.995 || term.ratio < 0.995) pixelIssues.push(`2× sameness room=${room.ratio}, term=${term.ratio}`);
  if (!eye || eye.w !== 8 || eye.h !== job.eyeH) pixelIssues.push(`eye ${eye ? `${eye.w}×${eye.h}` : 'missing'} ≠ 8×${job.eyeH}`);
  if (mullion !== 12) pixelIssues.push(`window mullion ${mullion}px ≠ 12px`);
  issues.push(...pixelIssues);
  checks.push({ name: '成片像素网格 / Clawd 眼睛 / 12px 窗棂', ok: !pixelIssues.length, detail: { room2x: room.ratio, terminal2x: term.ratio, eye, mullion } });

  const decoded = decodeAudio(mp4, `/tmp/story_${name}_decoded.wav`);
  const au = audioStats(decoded);
  const mix = readWav16(path.join(ROOT, job.mix));
  const corr = correlate(au.samples, mix.ch[0]);
  const audioIssues = [];
  if (au.peak >= 0.99 || au.clipped) audioIssues.push(`clipping peak=${au.peak}, samples=${au.clipped}`);
  if (Math.abs(au.duration - 30) > 0.05) audioIssues.push(`audio duration ${au.duration}`);
  if (corr < 0.995) audioIssues.push(`AAC/mix correlation ${corr}`);
  issues.push(...audioIssues);
  checks.push({ name: '音频无削波 / 30s / 与 PCM 混音一致', ok: !audioIssues.length, detail: {
    duration: au.duration, peak: au.peak, peakDbFS: au.peakDb, rmsDbFS: au.rmsDb,
    clippedSamples: au.clipped, correlationWithMix: corr, bgmGain: audioCfg.BGM_GAIN, sfxGain: audioCfg.SFX_GAIN,
  } });

  const lum = [];
  for (const n of [0, 24, 585, 600, 615, 1190, 1200, 1210, 1230, 1799]) {
    lum.push({ frame: n, luma: await meanLuma(mp4, n, name) });
  }
  const L = (n) => lum.find((x) => x.frame === n).luma;
  const fadeIssues = [];
  if (L(0) >= 2 || L(1799) >= 2) fadeIssues.push(`opening/closing black ${L(0)}/${L(1799)}`);
  if (name === 'reboot') {
    // R2 is intentionally black at 10.25s; R3 fades in until 20.5s.
    if (L(24) <= 20 || L(615) >= 2 || L(1230) <= 20) fadeIssues.push('Reboot blackout/boot fade timing mismatch');
  } else if (L(24) <= 20 || L(615) <= 20 || L(1210) <= 20) {
    fadeIssues.push('fade-in recovery missing');
  }
  if (L(600) >= 2 || L(1200) >= 2) fadeIssues.push(`transition black ${L(600)}/${L(1200)}`);
  issues.push(...fadeIssues); checks.push({ name: '片头片尾与场景黑场', ok: !fadeIssues.length, detail: lum });

  const expected = R.getClickTimestamps();
  const bgm = readWav16(path.join(ROOT, 'audio/emotional_bgm.wav'));
  const sync = checkSync(decoded.ch[0], bgm.ch[0], expected, audioCfg, R.DURATION, R.FPS);
  if (!sync.ok) issues.push(`A/V sync missed=${sync.missed}, maxOffset=${sync.maxOffsetMs}ms, offGrid=${sync.offGrid}`);
  checks.push({ name: '键盘音 ↔ 文字显示帧同步', ok: sync.ok, detail: sync });

  const pass = issues.length === 0;
  fs.mkdirSync(path.join(ROOT, job.doc), { recursive: true });
  const common = { generatedAt: new Date().toISOString(), source: job.mp4 };
  fs.writeFileSync(path.join(ROOT, job.doc, 'media-report.json'), JSON.stringify({
    ...common, status: pass ? 'PASSED' : 'FAILED', sizeBytes: fs.statSync(mp4).size,
    video: spec, checks: checks.filter((c) => c.name !== '键盘音 ↔ 文字显示帧同步'), issues,
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(ROOT, job.doc, 'sync-report.json'), JSON.stringify({
    ...common, status: sync.ok ? 'PASSED' : 'FAILED', expectedClicks: expected.length,
    detectedOnsets: sync.onsets, matched: sync.matched, missed: sync.missed,
    unmatchedOnsets: sync.unmatchedOnsets, maxOffsetMs: sync.maxOffsetMs,
    maxOffsetFrames: sync.maxOffsetMs / (1000 / R.FPS), allTimestampsOnDisplayFrames: sync.offGrid === 0,
  }, null, 2) + '\n');

  console.log(`\n=== ${name}: ${pass ? 'PASSED' : 'FAILED'} ===`);
  for (const c of checks) console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.name}`);
  for (const issue of issues) console.log(`  - ${issue}`);
  console.log(`  ${spec.width}×${spec.height} ${spec.fps} ${spec.frames} frames ${spec.duration.toFixed(3)}s; audio peak ${au.peakDb.toFixed(2)}dBFS clipped=${au.clipped}`);
  console.log(`  sync ${sync.matched}/${expected.length}, missed=${sync.missed}, maxOffset=${sync.maxOffsetMs.toFixed(1)}ms`);
  return pass;
}

(async () => {
  const which = process.argv[2] || 'all';
  const names = which === 'all' ? Object.keys(JOBS) : [which];
  let ok = true;
  for (const name of names) {
    if (!JOBS[name]) throw new Error(`unknown job ${name}`);
    ok = (await verify(name)) && ok;
  }
  process.exit(ok ? 0 : 1);
})().catch((err) => { console.error(err.stack || err); process.exit(1); });
