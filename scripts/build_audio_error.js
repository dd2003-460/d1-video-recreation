#!/usr/bin/env node
'use strict';
// scripts/build_audio_error.js — 「Clawd 的错误」30s 音轨合成 + MP4 封装
// 1. BGM: audio/emotional_bgm.wav 前 30s, volume=0.3 (1s 淡入 / 2s 淡出)
// 2. SFX: audio/sfx_click.wav, volume=0.5, 按 render_error_arena.getClickTimestamps() 铺设
// 3. 混音: amix=inputs=2:duration=first:normalize=0 → audio/error_arena_mix.wav (含削波保护)
// 4. --mux: 1800 帧 PNG + 音轨 → outputs/error_arena_v1.0.mp4 (h264+aac, 60fps, 1280×720)
//
// 用法:
//   node scripts/build_audio_error.js            # 只做音轨
//   node scripts/build_audio_error.js --mux      # 音轨 + 封装 mp4

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const err = require('../src/render_error_arena');

const SR = 44100;
const DURATION = err.DURATION; // 30
const TOTAL_SAMPLES = SR * DURATION;

const ROOT = path.join(__dirname, '..');
const BGM_SRC = path.join(ROOT, 'audio', 'emotional_bgm.wav');
const CLICK_SRC = path.join(ROOT, 'audio', 'sfx_click.wav');
const MIX_OUT = path.join(ROOT, 'audio', 'error_arena_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'error_arena_v1.0.mp4');
const AUDIO_TMP = process.env.AUDIO_TMP || '/tmp/audio_error';

const BGM_VOLUME = 0.3;
const CLICK_VOLUME = 0.5;
const PEAK_CEILING = 0.99;

function getFfmpegPath() {
  if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN)) return process.env.FFMPEG_BIN;
  const pyFfmpeg = '/home/user/.local/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
  if (fs.existsSync(pyFfmpeg)) return pyFfmpeg;
  try {
    const exe = execFileSync(
      'python3',
      ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    if (exe && fs.existsSync(exe)) return exe;
  } catch (_) {}
  try { return require('@ffmpeg-installer/ffmpeg').path; } catch (_) {}
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return 'ffmpeg';
  } catch (_) {}
  return 'ffmpeg';
}

// 检测 amix 是否支持 normalize 选项 (ffmpeg >= 4.3)
function amixSupportsNormalize(ffmpeg) {
  try {
    return execFileSync(ffmpeg, ['-h', 'filter=amix']).toString().includes('normalize');
  } catch (_) {
    return false;
  }
}

// --- 最小 WAV (PCM16 mono/stereo) 解析 ---
function readWavPcm16(filePath) {
  const b = fs.readFileSync(filePath);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`not a WAV file: ${filePath}`);
  }
  let off = 12;
  let fmt = null;
  let data = null;
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'fmt ') {
      fmt = {
        audioFormat: b.readUInt16LE(off + 8),
        channels: b.readUInt16LE(off + 10),
        sampleRate: b.readUInt32LE(off + 12),
        bitsPerSample: b.readUInt16LE(off + 22),
      };
    } else if (id === 'data') {
      data = b.subarray(off + 8, off + 8 + size);
    }
    off += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error(`missing fmt/data chunk: ${filePath}`);
  if (fmt.audioFormat !== 1 || fmt.bitsPerSample !== 16) throw new Error(`only PCM16 supported: ${filePath}`);
  const n = data.length / 2;
  const mono = new Float64Array(n);
  for (let i = 0; i < n; i++) mono[i] = data.readInt16LE(i * 2) / 32768;
  if (fmt.channels === 2) {
    const m = new Float64Array(n / 2);
    for (let i = 0; i < m.length; i++) m[i] = (mono[i * 2] + mono[i * 2 + 1]) / 2;
    return { samples: m, sampleRate: fmt.sampleRate };
  }
  if (fmt.channels !== 1) throw new Error(`unsupported channels=${fmt.channels}: ${filePath}`);
  return { samples: mono, sampleRate: fmt.sampleRate };
}

function writeWavMono16(filePath, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
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

function peakOf(samples) {
  let p = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > p) p = a;
  }
  return p;
}

// --- BGM: 截取前 30s + 0.3 音量 + 淡入淡出 ---
function buildBgmTrack(outPath) {
  const { samples, sampleRate } = readWavPcm16(BGM_SRC);
  if (sampleRate !== SR) throw new Error(`BGM sampleRate ${sampleRate} != ${SR}`);
  const out = new Float64Array(TOTAL_SAMPLES);
  const copy = Math.min(TOTAL_SAMPLES, samples.length);
  for (let i = 0; i < copy; i++) out[i] = samples[i] * BGM_VOLUME;
  const fadeIn = SR;
  const fadeOut = 2 * SR;
  for (let i = 0; i < fadeIn; i++) out[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut; i++) out[TOTAL_SAMPLES - 1 - i] *= i / fadeOut;
  writeWavMono16(outPath, out);
  return { peak: peakOf(out) };
}

// --- 键盘/事件音轨: sfx_click.wav × N, 0.5 音量, 时间戳来自渲染脚本 ---
function buildClickTrack(outPath) {
  const { samples, sampleRate } = readWavPcm16(CLICK_SRC);
  if (sampleRate !== SR) throw new Error(`click sampleRate ${sampleRate} != ${SR}`);
  const kernel = Float64Array.from(samples, (v) => v * CLICK_VOLUME);
  const out = new Float64Array(TOTAL_SAMPLES);
  const timestamps = err.getClickTimestamps();
  for (const tSec of timestamps) {
    const start = Math.round(tSec * SR);
    for (let i = 0; i < kernel.length; i++) {
      const idx = start + i;
      if (idx >= 0 && idx < TOTAL_SAMPLES) out[idx] += kernel[i];
    }
  }
  writeWavMono16(outPath, out);
  return { timestamps, clickMs: (kernel.length / SR) * 1000, peak: peakOf(out) };
}

// --- 混音 + 削波校验 ---
function buildFinalAudio() {
  if (!fs.existsSync(AUDIO_TMP)) fs.mkdirSync(AUDIO_TMP, { recursive: true });
  fs.mkdirSync(path.dirname(MIX_OUT), { recursive: true });
  const bgmPath = path.join(AUDIO_TMP, 'error_bgm_30s.wav');
  const clicksPath = path.join(AUDIO_TMP, 'error_clicks_30s.wav');

  buildBgmTrack(bgmPath);
  const click = buildClickTrack(clicksPath);

  const ffmpeg = getFfmpegPath();
  const filter = amixSupportsNormalize(ffmpeg)
    ? '[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0:normalize=0'
    // 旧版 ffmpeg 兜底: 旧 amix 默认 1/n 衰减, volume=2 补偿, 数学上等效 normalize=0
    : '[0:a]volume=2.0[a];[1:a]volume=2.0[b];[a][b]amix=inputs=2:duration=first:dropout_transition=0';
  execFileSync(
    ffmpeg,
    ['-y', '-i', bgmPath, '-i', clicksPath, '-filter_complex', filter, '-c:a', 'pcm_s16le', MIX_OUT],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );

  const mix = readWavPcm16(MIX_OUT);
  const mixPeak = peakOf(mix.samples);
  let clipped = 0;
  for (let i = 0; i < mix.samples.length; i++) if (Math.abs(mix.samples[i]) >= 0.999) clipped++;

  if (mixPeak > PEAK_CEILING || clipped > 0) {
    const g = (PEAK_CEILING / mixPeak) * 0.999;
    const scaled = new Float64Array(mix.samples.length);
    for (let i = 0; i < scaled.length; i++) scaled[i] = mix.samples[i] * g;
    writeWavMono16(MIX_OUT, scaled);
    console.log(`  [clip-guard] peak=${mixPeak.toFixed(4)} → 整体 ×${g.toFixed(4)}`);
  }

  const finalMix = readWavPcm16(MIX_OUT);
  const finalPeak = peakOf(finalMix.samples);
  const dbfs = 20 * Math.log10(finalPeak);
  let finalClipped = 0;
  for (let i = 0; i < finalMix.samples.length; i++) if (Math.abs(finalMix.samples[i]) >= 0.999) finalClipped++;

  console.log(`Built ${MIX_OUT}`);
  console.log(`  BGM: ${path.basename(BGM_SRC)} × ${BGM_VOLUME} (30s, 1s fade-in / 2s fade-out)`);
  console.log(`  SFX: ${path.basename(CLICK_SRC)} × ${CLICK_VOLUME} (${click.clickMs.toFixed(1)}ms × ${click.timestamps.length} clicks)`);
  console.log(`  mix: amix=inputs=2:normalize=0`);
  console.log(`  peak: ${finalPeak.toFixed(4)} (${dbfs.toFixed(2)} dBFS), clipped samples: ${finalClipped}`);

  if (finalClipped > 0) throw new Error('clipping detected in final mix');
  return MIX_OUT;
}

// --- 帧序列 + 音轨 → 最终 mp4 ---
function composeVideo(framesDir, outPath) {
  const ffmpeg = getFfmpegPath();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  execFileSync(
    ffmpeg,
    [
      '-y',
      '-framerate', String(err.FPS),
      '-i', path.join(framesDir, 'f_%05d.png'),
      '-i', MIX_OUT,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'medium',
      '-crf', '18',
      '-r', String(err.FPS),
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', String(SR),
      '-shortest',
      outPath,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  );
  console.log(`Composed ${outPath}`);
}

if (require.main === module) {
  buildFinalAudio();
  if (process.argv.includes('--mux')) {
    const framesDir = process.env.FRAMES_DIR || path.join(ROOT, 'outputs', 'frames_error');
    composeVideo(framesDir, MP4_OUT);
  }
}

module.exports = {
  BGM_VOLUME,
  CLICK_VOLUME,
  buildFinalAudio,
  composeVideo,
  readWavPcm16,
  writeWavMono16,
  peakOf,
  getFfmpegPath,
  getClickTimestamps: err.getClickTimestamps,
};
