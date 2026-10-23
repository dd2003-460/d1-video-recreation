#!/usr/bin/env node
'use strict';
// scripts/build_audio_v2_common.js — learning / upgrade v2.0 共用音频合成与封装
//
//   BGM : audio/emotional_bgm.wav，默认 ×0.3，1s 淡入 / 2s 淡出（增益与淡变可配置）
//   SFX : audio/sfx_click.wav，默认 ×0.5，时间点来自渲染脚本 getClickTimestamps()
//         （逐字打字每字一次、整行出现一次、字幕切换不发声；已量化到显示帧、同帧合并）
//   混合: 在 JS 内做确定性浮点混音（等价 amix=normalize=0），再一次性量化到 PCM16；
//         峰值超 -0.5 dBFS 时整体等比缩放并打印 [clip-guard]
//   封装: libx264 + aac 192k + yuv420p，-shortest
//
//   注：仓库自带的 @ffmpeg-installer/ffmpeg 为 2018 年构建，amix 不支持 normalize=0，
//       因此混音改为 JS 实现（结果确定、可逐样本审计），ffmpeg 只负责编码与封装。

const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const AUDIO = path.join(ROOT, 'audio');
const BGM = path.join(AUDIO, 'emotional_bgm.wav');
const SFX = path.join(AUDIO, 'sfx_click.wav');
const SAMPLE_RATE = 44100;

function getFfmpegPath() {
  if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN)) return process.env.FFMPEG_BIN;
  const candidates = [
    path.join(ROOT, 'node_modules/@ffmpeg-installer/linux-x64/ffmpeg'),
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  try {
    const exe = execFileSync('python3', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (exe && fs.existsSync(exe)) return exe;
  } catch (_) {}
  return 'ffmpeg';
}

// --- 最小 WAV 读写（PCM 16-bit） ---
function readWav16(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error(`${file}: not RIFF`);
  if (buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${file}: not WAVE`);
  let offset = 12;
  let dataLen = 0;
  let dataOff = 0;
  let channels = 1;
  let sampleRate = SAMPLE_RATE;
  let bits = 16;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const sz = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      const audioFormat = buf.readUInt16LE(offset + 8);
      channels = buf.readUInt16LE(offset + 10);
      sampleRate = buf.readUInt32LE(offset + 12);
      bits = buf.readUInt16LE(offset + 22);
      if (audioFormat !== 1) throw new Error(`${file}: not PCM`);
      if (bits !== 16) throw new Error(`${file}: not 16-bit`);
    } else if (id === 'data') {
      dataOff = offset + 8;
      dataLen = sz;
    }
    offset += 8 + sz + (sz % 2);
  }
  const samples = Math.floor(dataLen / (2 * channels));
  const ch = [];
  for (let c = 0; c < channels; c++) ch.push(new Int16Array(samples));
  for (let s = 0; s < samples; s++) {
    for (let c = 0; c < channels; c++) ch[c][s] = buf.readInt16LE(dataOff + (s * channels + c) * 2);
  }
  return { channels, sampleRate, bits, samples, ch };
}

function writeWav16(file, sampleRate, channels, ch) {
  const samples = ch[0].length;
  const dataSize = samples * channels * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  const out = Buffer.alloc(44 + dataSize);
  header.copy(out);
  for (let s = 0; s < samples; s++) {
    for (let c = 0; c < channels; c++) out.writeInt16LE(ch[c][s], 44 + (s * channels + c) * 2);
  }
  fs.writeFileSync(file, out);
}

function mixInto(dst, src, offset, gain) {
  for (let i = 0; i < src.length; i++) {
    const idx = offset + i;
    if (idx < 0 || idx >= dst.length) continue;
    let v = dst[idx] + Math.round(src[i] * gain);
    if (v > 32767) v = 32767;
    if (v < -32768) v = -32768;
    dst[idx] = v;
  }
}

function inspectMixNoClipping(file) {
  const wav = readWav16(file);
  let maxAbs = 0;
  let clipped = 0;
  for (let c = 0; c < wav.channels; c++) {
    const arr = wav.ch[c];
    for (let i = 0; i < arr.length; i++) {
      const a = Math.abs(arr[i]);
      if (a > maxAbs) maxAbs = a;
      if (a >= 32760) clipped++;
    }
  }
  const peak = maxAbs / 32768;
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
  return { peak, peakDb, clipped, duration: wav.samples / wav.sampleRate };
}

/**
 * 合成整条音轨
 * @param {object} opts
 * @param {number[]} opts.clickTimestamps 来自渲染脚本
 * @param {number} opts.duration 秒
 * @param {string} opts.clicksPath 中间点击轨
 * @param {string} opts.mixPath 输出混音轨
 * @param {string} opts.label 日志标签
 * @param {number} [opts.bgmGain=0.3] BGM 线性增益（-12dB ≈ 0.2511886）
 * @param {number} [opts.sfxGain=0.5] SFX 线性增益（-6dB ≈ 0.5011872）
 * @param {number} [opts.fadeIn=1] BGM 淡入秒数
 * @param {number} [opts.fadeOut=2] BGM 淡出秒数
 */
function buildAudio(opts) {
  const {
    clickTimestamps, duration, clicksPath, mixPath, label,
    bgmGain = 0.3, sfxGain = 0.5, fadeIn = 1.0, fadeOut = 2.0,
  } = opts;
  if (!fs.existsSync(AUDIO)) fs.mkdirSync(AUDIO, { recursive: true });

  const sfx = readWav16(SFX);
  const sfxMono = sfx.ch[0];

  const totalSamples = Math.round(duration * SAMPLE_RATE);
  const clicks = new Int16Array(totalSamples);

  // 1) 点击轨：先按 1.0 叠加并记录理论峰值，用于 clip-guard
  const sum = new Int32Array(totalSamples);
  for (const t of clickTimestamps) {
    const offset = Math.round(t * SAMPLE_RATE);
    for (let i = 0; i < sfxMono.length; i++) {
      const idx = offset + i;
      if (idx >= 0 && idx < totalSamples) sum[idx] += sfxMono[i];
    }
  }
  let rawPeak = 0;
  for (let i = 0; i < totalSamples; i++) rawPeak = Math.max(rawPeak, Math.abs(sum[i]));
  const clickGuard = rawPeak > 32767 * 0.85 ? (32767 * 0.85) / rawPeak : 1;
  if (clickGuard < 1) {
    console.log(`[clip-guard] click 轨理论峰值 ${(rawPeak / 32768).toFixed(3)}，整体缩放 x${clickGuard.toFixed(3)}`);
  }
  for (let i = 0; i < totalSamples; i++) {
    clicks[i] = Math.max(-32768, Math.min(32767, Math.round(sum[i] * clickGuard)));
  }
  writeWav16(clicksPath, SAMPLE_RATE, 1, [clicks]);
  console.log(`[${label}] 点击轨: ${clicksPath} (${clickTimestamps.length} clicks, ${duration}s)`);

  // 2) 在 JS 内做确定性混音（BGM x0.3 + click x0.5）。
  //    与 ffmpeg amix 输出等价，但不受 ffmpeg 版本/滤波器参数差异影响，且可精确做削波保护。
  const bgm = readWav16(BGM);
  if (bgm.sampleRate !== SAMPLE_RATE || bgm.bits !== 16) {
    throw new Error(`BGM 规格不符: ${bgm.sampleRate}Hz / ${bgm.bits}bit`);
  }
  const bgmMono = bgm.ch[0];
  const BGM_GAIN = bgmGain;
  const SFX_GAIN = sfxGain;
  const FADE_IN_S = fadeIn;
  const FADE_OUT_S = fadeOut;

  const mix = new Float64Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    let g = BGM_GAIN;
    if (t < FADE_IN_S) g *= t / FADE_IN_S;
    const fadeOutStart = duration - FADE_OUT_S;
    if (t > fadeOutStart) g *= Math.max(0, (duration - t) / FADE_OUT_S);
    const b = i < bgmMono.length ? bgmMono[i] : 0;
    mix[i] = (b / 32768) * g + (clicks[i] / 32768) * SFX_GAIN;
  }

  // 3) 峰值保护：超过 -0.5 dBFS 则整体等比缩放
  let peak = 0;
  for (let i = 0; i < totalSamples; i++) peak = Math.max(peak, Math.abs(mix[i]));
  const LIMIT = 0.944; // ≈ -0.5 dBFS
  if (peak > LIMIT) {
    const k = LIMIT / peak;
    console.log(`[clip-guard] 混音峰值 ${peak.toFixed(4)} 超限，整体缩放 x${k.toFixed(3)}`);
    for (let i = 0; i < totalSamples; i++) mix[i] *= k;
    peak = LIMIT;
  }

  const out = new Int16Array(totalSamples);
  let clipped = 0;
  for (let i = 0; i < totalSamples; i++) {
    let v = Math.round(mix[i] * 32767);
    if (v > 32767) {
      v = 32767;
      clipped++;
    }
    if (v < -32768) {
      v = -32768;
      clipped++;
    }
    out[i] = v;
  }
  writeWav16(mixPath, SAMPLE_RATE, 1, [out]);

  const stats = inspectMixNoClipping(mixPath);
  if (stats.clipped > 0) throw new Error(`检测到削波：${stats.clipped} samples`);
  console.log(
    `[${label}] 混音: ${mixPath} | peak=${stats.peak.toFixed(4)} (${stats.peakDb.toFixed(2)} dBFS) | clipped=0 | ${stats.duration.toFixed(2)}s | click=${clickTimestamps.length}`
  );
  return { mixPath, clicksCount: clickTimestamps.length, stats };
}

function muxVideo(opts) {
  const { framesDir, mixPath, outMp4, fps } = opts;
  const ffmpeg = getFfmpegPath();
  fs.mkdirSync(path.dirname(outMp4), { recursive: true });
  const ff = spawnSync(
    ffmpeg,
    [
      '-y',
      '-framerate', String(fps),
      '-i', path.join(framesDir, 'f_%05d.png'),
      '-i', mixPath,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'medium',
      '-crf', '18',
      '-r', String(fps),
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-movflags', '+faststart',
      outMp4,
    ],
    { encoding: 'utf8' }
  );
  if (ff.error) throw ff.error;
  if (ff.status !== 0) {
    console.error(ff.stderr);
    throw new Error(`ffmpeg mux failed with status ${ff.status}`);
  }
  console.log(`封装完成: ${outMp4}`);
  return outMp4;
}

module.exports = { buildAudio, muxVideo, inspectMixNoClipping, readWav16, writeWav16, getFfmpegPath };
