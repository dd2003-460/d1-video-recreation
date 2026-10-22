#!/usr/bin/env node
// scripts/build_audio.js — 「Clawd 的早安」30s 音轨生成器
// 1. 生成温暖晨间环境钢琴 + 弦乐 Pad BGM (-13dB 铺底, 30.000s)
// 2. 生成每字符 30ms 短促键盘点击音轨 (-3dB, CHAR_MS=160ms, 与画面逐字严格同步)
// 3. 使用 ffmpeg amix=inputs=2:duration=first:dropout_transition=0:normalize=0 混合

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const gm = require('../render_goodmorning');

const SR = 44100;
const DURATION = gm.DURATION; // 30s
const TOTAL_SAMPLES = SR * DURATION; // 1,323,000

const AUDIO_TMP = process.env.AUDIO_TMP || '/tmp/audio_goodmorning';
if (!fs.existsSync(AUDIO_TMP)) fs.mkdirSync(AUDIO_TMP, { recursive: true });

function getFfmpegPath() {
  if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN)) {
    return process.env.FFMPEG_BIN;
  }
  const pyFfmpeg = '/home/user/.local/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
  if (fs.existsSync(pyFfmpeg)) return pyFfmpeg;
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return 'ffmpeg';
  } catch (_) {}
  try {
    return require('@ffmpeg-installer/ffmpeg').path;
  } catch (_) {
    return 'ffmpeg';
  }
}

function writeWavMono16(filePath, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buf);
}

// --- 1. Synthesize 30ms Crisp Mechanical Key Click (-3dB) ---
function createClickKernel30ms() {
  const clickSamples = Math.round(0.030 * SR); // 1323 samples = exact 30.00ms
  const ker = new Float64Array(clickSamples);
  // Deterministic PRNG (mulberry32) so output is 100% reproducible
  let seed = 20261022;
  function rand() {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  let prevNoise = 0;
  for (let i = 0; i < clickSamples; i++) {
    const t = i / SR;
    // Crisp high-passed contact transient (first ~5ms)
    const rawNoise = rand() * 2 - 1;
    const hpNoise = rawNoise - prevNoise;
    prevNoise = rawNoise;
    const tick = hpNoise * Math.exp(-t / 0.0018) * 0.55;

    // Warm keycap thock (~195Hz + 390Hz fast exponential decay within 30ms)
    const thock = (
      Math.sin(2 * Math.PI * 195 * t) * 0.75 +
      Math.sin(2 * Math.PI * 390 * t) * 0.30 +
      Math.sin(2 * Math.PI * 920 * t) * 0.18 * Math.exp(-t / 0.0025)
    ) * Math.exp(-t / 0.0052);

    // Smooth zero-crossing window at 30ms tail
    const tailFade = i > clickSamples - 64 ? (clickSamples - i) / 64 : 1.0;
    ker[i] = (tick + thock) * tailFade;
  }

  // Normalize kernel to unit peak, then apply -3dB (0.7079)
  let peak = 0;
  for (let i = 0; i < clickSamples; i++) {
    const a = Math.abs(ker[i]);
    if (a > peak) peak = a;
  }
  const gainMinus3dB = Math.pow(10, -3 / 20); // ~0.70794578
  for (let i = 0; i < clickSamples; i++) {
    ker[i] = (ker[i] / (peak || 1)) * gainMinus3dB;
  }
  return ker;
}

function buildClickTrack(outPath) {
  const out = new Float64Array(TOTAL_SAMPLES);
  const ker = createClickKernel30ms();
  const timestamps = gm.getClickTimestamps();

  for (const tSec of timestamps) {
    const startIdx = Math.round(tSec * SR);
    for (let i = 0; i < ker.length; i++) {
      const idx = startIdx + i;
      if (idx >= 0 && idx < TOTAL_SAMPLES) {
        out[idx] += ker[i];
      }
    }
  }

  writeWavMono16(outPath, out);
  return { timestamps, clickDurationMs: (ker.length / SR) * 1000 };
}

// --- 2. Synthesize Warm Morning Piano + Pad BGM (aligned with gen_emotional_bgm.py) ---
function midiFreq(m) {
  return 440.0 * Math.pow(2.0, (m - 69) / 12.0);
}

function addPianoNote(buf, startSec, midi, durSec, level = 0.5) {
  const s0 = Math.round(startSec * SR);
  const n = Math.round(durSec * SR);
  const f0 = midiFreq(midi);
  const harmonics = [[1, 1.0], [2, 0.48], [3, 0.25], [4, 0.13], [5, 0.06]];
  const atk = Math.round(0.008 * SR);

  for (let i = 0; i < n; i++) {
    const idx = s0 + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / SR;
    let v = 0;
    for (const [h, amp] of harmonics) {
      const fh = f0 * h;
      if (fh < SR / 2) {
        v += amp * Math.sin(2 * Math.PI * fh * t) * Math.exp(-t * (2.0 + 1.05 * h));
      }
    }
    if (i < atk) {
      const r = i / atk;
      v *= r * r;
    }
    buf[idx] += v * level;
  }
}

function addWarmPad(buf, startSec, durSec, midis, level = 0.25) {
  const s0 = Math.round(startSec * SR);
  const n = Math.round(durSec * SR);
  const atk = Math.round(0.9 * SR);
  const rel = Math.round(1.4 * SR);

  for (let i = 0; i < n; i++) {
    const idx = s0 + i;
    if (idx >= TOTAL_SAMPLES) break;
    const t = i / SR;
    let env = 1.0;
    if (i < atk) env = i / atk;
    else if (i > n - rel) env = (n - i) / rel;

    let v = 0;
    for (const m of midis) {
      const f0 = midiFreq(m);
      v += Math.sin(2 * Math.PI * f0 * t) * Math.exp(-t * 0.18);
      v += 0.30 * Math.sin(4 * Math.PI * f0 * t) * Math.exp(-t * 0.28);
    }
    buf[idx] += (v / midis.length) * env * level;
  }
}

function applyGentleReverb(buf) {
  const out = Float64Array.from(buf);
  const taps = [
    { delaySamples: Math.round(0.28 * SR), gain: 0.28 },
    { delaySamples: Math.round(0.45 * SR), gain: 0.18 },
  ];
  for (const { delaySamples, gain } of taps) {
    for (let i = delaySamples; i < TOTAL_SAMPLES; i++) {
      out[i] += out[i - delaySamples] * gain * 0.55;
    }
  }
  return out;
}

function buildBgmTrack(outPath) {
  let buf = new Float64Array(TOTAL_SAMPLES);

  // Scene G1 (0-10s): Bright Morning Window — Cadd9 -> G/B
  addWarmPad(buf, 0.0, 5.8, [48, 55, 62, 64], 0.30);
  addWarmPad(buf, 5.0, 5.8, [47, 55, 62, 67], 0.28);
  const g1Notes = [
    [0.6, 60, 1.8, 0.48], [1.9, 64, 1.6, 0.42], [3.2, 67, 1.8, 0.44],
    [4.6, 74, 2.0, 0.40], [6.2, 71, 1.8, 0.42], [7.8, 67, 2.0, 0.38],
  ];
  for (const [st, m, d, lv] of g1Notes) addPianoNote(buf, st, m, d, lv);

  // Scene G2 (10-20s): Warm Message Bubbles — Fmaj7 -> G6
  addWarmPad(buf, 10.0, 5.8, [41, 53, 57, 64], 0.30);
  addWarmPad(buf, 15.0, 5.8, [43, 55, 59, 64], 0.30);
  const g2Notes = [
    [10.4, 65, 1.6, 0.44], [12.2, 69, 1.6, 0.42], [14.2, 72, 1.8, 0.45],
    [15.8, 71, 1.6, 0.42], [17.4, 67, 1.8, 0.40], [18.8, 64, 1.8, 0.36],
  ];
  for (const [st, m, d, lv] of g2Notes) addPianoNote(buf, st, m, d, lv);

  // Scene G3 (20-30s): Golden Warm Ending — Am7 -> Cmaj9
  addWarmPad(buf, 20.0, 5.2, [45, 52, 60, 64], 0.30);
  addWarmPad(buf, 24.5, 5.5, [48, 55, 60, 64, 74], 0.32);
  const g3Notes = [
    [20.6, 69, 1.8, 0.44], [22.2, 72, 1.8, 0.42], [23.8, 67, 1.8, 0.40],
    [25.2, 64, 2.2, 0.42], [26.8, 72, 2.6, 0.38], [27.6, 74, 2.2, 0.34],
  ];
  for (const [st, m, d, lv] of g3Notes) addPianoNote(buf, st, m, d, lv);

  buf = applyGentleReverb(buf);

  // Smooth fade-in (1.0s) and fade-out (2.2s)
  const fadeIn = Math.round(1.0 * SR);
  const fadeOut = Math.round(2.2 * SR);
  for (let i = 0; i < fadeIn; i++) buf[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut; i++) buf[TOTAL_SAMPLES - 1 - i] *= i / fadeOut;

  // Normalize BGM to -13.1 dBFS (0.22 peak) so -3dB (0.708) clicks sit cleanly above without clipping
  let peak = 0;
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    const a = Math.abs(buf[i]);
    if (a > peak) peak = a;
  }
  const targetPeak = 0.22;
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    buf[i] = (buf[i] / (peak || 1)) * targetPeak;
  }

  writeWavMono16(outPath, buf);
}

function buildFinalAudio() {
  const bgmPath = path.join(AUDIO_TMP, 'bgm_30s.wav');
  const clicksPath = path.join(AUDIO_TMP, 'clicks_30s.wav');
  const mixPath = path.join(AUDIO_TMP, 'final_mix_goodmorning.wav');

  buildBgmTrack(bgmPath);
  const { timestamps, clickDurationMs } = buildClickTrack(clicksPath);

  const ffmpeg = getFfmpegPath();
  // Mix using amix normalize=0 as strictly specified
  execFileSync(ffmpeg, [
    '-y',
    '-i', bgmPath,
    '-i', clicksPath,
    '-filter_complex',
    '[0:a]volume=1.0[main];[1:a]volume=1.0[clicks];[main][clicks]amix=inputs=2:duration=first:dropout_transition=0:normalize=0',
    '-c:a', 'pcm_s16le',
    mixPath,
  ], { stdio: 'inherit' });

  console.log(`Built ${mixPath}: ${timestamps.length} clicks (${clickDurationMs.toFixed(1)}ms each @ -3dB), CHAR_MS=${gm.CHAR_MS}ms, amix normalize=0`);
  return mixPath;
}

if (require.main === module) {
  buildFinalAudio();
}

module.exports = { buildFinalAudio };
