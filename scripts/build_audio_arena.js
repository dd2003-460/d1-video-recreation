#!/usr/bin/env node
// scripts/build_audio_arena.js — 「Clawd 的学习」30s 音轨合成与 MP4 封装
// 1. 背景: audio/emotional_bgm.wav 截取前 30s, volume=0.3 (含柔和淡入淡出)
// 2. 点击音: audio/sfx_click.wav, 按 render_learning_arena.getClickTimestamps() 精确铺设, volume=0.5
// 3. 混音: ffmpeg amix=inputs=2:duration=first:dropout_transition=0:normalize=0 → audio/learning_arena_mix.wav
// 4. 校验: 采样峰值与零削波自动验证
// 5. 封装 (--mux): 1800 帧 PNG + audio/learning_arena_mix.wav → outputs/learning_arena_v1.0.mp4

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const learning = require('../src/render_learning_arena');

const SR = 44100;
const DURATION = learning.DURATION; // 30s
const TOTAL_SAMPLES = SR * DURATION;

const ROOT = path.join(__dirname, '..');
const BGM_SRC = path.join(ROOT, 'audio', 'emotional_bgm.wav');
const CLICK_SRC = path.join(ROOT, 'audio', 'sfx_click.wav');
const MIX_OUT = path.join(ROOT, 'audio', 'learning_arena_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'learning_arena_v1.0.mp4');
const AUDIO_TMP = process.env.AUDIO_TMP || '/tmp/audio_learning';

const BGM_VOLUME = 0.3;
const CLICK_VOLUME = 0.5;

function getFfmpegPath() {
  if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN)) {
    return process.env.FFMPEG_BIN;
  }
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
  try {
    return require('@ffmpeg-installer/ffmpeg').path;
  } catch (_) {}
  return 'ffmpeg';
}

function amixSupportsNormalize(ffmpeg) {
  try {
    const out = execFileSync(ffmpeg, ['-h', 'filter=amix']).toString();
    return out.includes('normalize');
  } catch (_) {
    return false;
  }
}

function readWavPcm16(filePath) {
  const b = fs.readFileSync(filePath);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`Not a valid WAV file: ${filePath}`);
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
  if (!fmt || !data) throw new Error(`Missing fmt/data chunk in ${filePath}`);
  if (fmt.audioFormat !== 1 || fmt.bitsPerSample !== 16) {
    throw new Error(`Only 16-bit PCM WAV supported: ${filePath}`);
  }
  const n = data.length / 2;
  const mono = new Float64Array(n);
  for (let i = 0; i < n; i++) mono[i] = data.readInt16LE(i * 2) / 32768;
  if (fmt.channels === 2) {
    const m = new Float64Array(n / 2);
    for (let i = 0; i < m.length; i++) m[i] = (mono[i * 2] + mono[i * 2 + 1]) / 2;
    return { samples: m, sampleRate: fmt.sampleRate };
  }
  if (fmt.channels !== 1) throw new Error(`Unsupported channels=${fmt.channels}: ${filePath}`);
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

function buildBgmTrack(outPath) {
  const { samples, sampleRate } = readWavPcm16(BGM_SRC);
  if (sampleRate !== SR) throw new Error(`BGM sampleRate ${sampleRate} != ${SR}`);
  const out = new Float64Array(TOTAL_SAMPLES);
  const copy = Math.min(TOTAL_SAMPLES, samples.length);
  for (let i = 0; i < copy; i++) out[i] = samples[i] * BGM_VOLUME;

  const fadeIn = Math.floor(0.8 * SR);
  const fadeOut = Math.floor(1.8 * SR);
  for (let i = 0; i < fadeIn; i++) out[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut; i++) out[TOTAL_SAMPLES - 1 - i] *= i / fadeOut;

  writeWavMono16(outPath, out);
}

function buildClickTrack(outPath) {
  const { samples, sampleRate } = readWavPcm16(CLICK_SRC);
  if (sampleRate !== SR) throw new Error(`Click sampleRate ${sampleRate} != ${SR}`);
  const kernel = Float64Array.from(samples, (v) => v * CLICK_VOLUME);
  const out = new Float64Array(TOTAL_SAMPLES);
  const timestamps = learning.getClickTimestamps();
  for (const tSec of timestamps) {
    const start = Math.round(tSec * SR);
    for (let i = 0; i < kernel.length; i++) {
      const idx = start + i;
      if (idx >= 0 && idx < TOTAL_SAMPLES) out[idx] += kernel[i];
    }
  }
  writeWavMono16(outPath, out);
  return { timestamps, clickMs: (kernel.length / SR) * 1000 };
}

function inspectMixNoClipping(wavPath) {
  const { samples } = readWavPcm16(wavPath);
  let peak = 0;
  let clipped = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
    if (a >= 0.999) clipped++;
  }
  if (clipped > 0) {
    throw new Error(`Audio clipping detected: ${clipped} samples clipped (peak=${peak.toFixed(4)})`);
  }
  return { peak, clipped, durationSec: samples.length / SR };
}

function buildFinalAudio() {
  fs.mkdirSync(AUDIO_TMP, { recursive: true });
  fs.mkdirSync(path.dirname(MIX_OUT), { recursive: true });

  const bgmPath = path.join(AUDIO_TMP, 'learning_bgm_30s.wav');
  const clicksPath = path.join(AUDIO_TMP, 'learning_clicks_30s.wav');

  buildBgmTrack(bgmPath);
  const { timestamps, clickMs } = buildClickTrack(clicksPath);

  const ffmpeg = getFfmpegPath();
  const filter = amixSupportsNormalize(ffmpeg)
    ? '[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0:normalize=0'
    : '[0:a]volume=2.0[a];[1:a]volume=2.0[b];[a][b]amix=inputs=2:duration=first:dropout_transition=0';

  execFileSync(
    ffmpeg,
    [
      '-y',
      '-i', bgmPath,
      '-i', clicksPath,
      '-filter_complex', filter,
      '-c:a', 'pcm_s16le',
      MIX_OUT,
    ],
    { stdio: 'inherit' }
  );

  const stats = inspectMixNoClipping(MIX_OUT);
  console.log(`Built ${MIX_OUT}`);
  console.log(`  BGM: ${path.basename(BGM_SRC)} × ${BGM_VOLUME} (30.00s)`);
  console.log(`  SFX: ${path.basename(CLICK_SRC)} × ${CLICK_VOLUME} (${clickMs.toFixed(1)}ms × ${timestamps.length} synced clicks)`);
  console.log(`  Mix: amix=inputs=2:normalize=0 | peak=${stats.peak.toFixed(4)} | clipped=${stats.clipped}`);
  return { mixPath: MIX_OUT, timestamps, stats };
}

function composeVideo(framesDir, outPath = MP4_OUT) {
  const ffmpeg = getFfmpegPath();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  execFileSync(
    ffmpeg,
    [
      '-y',
      '-framerate', String(learning.FPS),
      '-i', path.join(framesDir, 'f_%05d.png'),
      '-i', MIX_OUT,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'medium',
      '-crf', '18',
      '-r', String(learning.FPS),
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      outPath,
    ],
    { stdio: 'inherit' }
  );
  console.log(`Composed ${outPath}`);
}

if (require.main === module) {
  buildFinalAudio();
  if (process.argv.includes('--mux')) {
    const framesDir = process.env.FRAMES_DIR || '/tmp/frames_learning';
    composeVideo(framesDir, MP4_OUT);
  }
}

module.exports = {
  BGM_VOLUME,
  CLICK_VOLUME,
  buildFinalAudio,
  composeVideo,
  inspectMixNoClipping,
  readWavPcm16,
  writeWavMono16,
};
