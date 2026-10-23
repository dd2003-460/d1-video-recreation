#!/usr/bin/env node
'use strict';
// E03 悲伤 (sorrow) — BGM -12dB + 低沉键盘音。
// 与其它集共用同一套确定性 JS 混音管线（等价 amix=normalize=0 + 削波保护），
// 差别只在 SFX：先把 sfx_click.wav 以 0.78× 速度重采样（音高降低约 4.3 个半音、时长变长），
// 再做 3-tap 平滑让起音变软，最后整体 -12dB（= 标准 -6dB 再低 6dB）。
const fs = require('fs');
const path = require('path');
const R = require('../src/render_E03_sorrow_arena');
const {
  muxVideo, readWav16, writeWav16, inspectMixNoClipping,
} = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');
const BGM_GAIN = Math.pow(10, -12 / 20); // -12 dB
const SFX_GAIN = Math.pow(10, -12 / 20); // 低沉：-6dB 标准再降 6dB
const PITCH = 0.78;
const SAMPLE_RATE = 44100;
const CLICKS_WAV = process.env.CLICKS_WAV || '/tmp/E03_clicks.wav';
const MIX_WAV = path.join(ROOT, 'audio', 'E03_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'E03_sorrow_arena_v1.0.mp4');

// --- lower, softer click ---------------------------------------------------
function lowClick() {
  const src = readWav16(path.join(ROOT, 'audio', 'sfx_click.wav'));
  const inS = src.ch[0];
  const n = Math.floor(inS.length / PITCH);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const x = i * PITCH;
    const i0 = Math.floor(x);
    const i1 = Math.min(inS.length - 1, i0 + 1);
    const f = x - i0;
    out[i] = Math.round(inS[i0] * (1 - f) + inS[i1] * f);
  }
  // 3-tap smoothing: softens the attack so it reads as a heavy, low keypress.
  const sm = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const a = out[Math.max(0, i - 1)];
    const b = out[i];
    const c = out[Math.min(n - 1, i + 1)];
    sm[i] = Math.round((a + 2 * b + c) / 4);
  }
  return sm;
}

function buildAudio() {
  const duration = R.DURATION;
  const clickTimestamps = R.getClickTimestamps();
  const totalSamples = Math.round(duration * SAMPLE_RATE);
  const click = lowClick();

  // 1) click track at unity, with a clip guard for machine-gun backspaces
  const sum = new Int32Array(totalSamples);
  for (const t of clickTimestamps) {
    const offset = Math.round(t * SAMPLE_RATE);
    for (let i = 0; i < click.length; i++) {
      const idx = offset + i;
      if (idx >= 0 && idx < totalSamples) sum[idx] += click[i];
    }
  }
  let rawPeak = 0;
  for (let i = 0; i < totalSamples; i++) rawPeak = Math.max(rawPeak, Math.abs(sum[i]));
  const clickGuard = rawPeak > 32767 * 0.85 ? (32767 * 0.85) / rawPeak : 1;
  if (clickGuard < 1) console.log(`[clip-guard] click 轨理论峰值 ${(rawPeak / 32768).toFixed(3)}，整体缩放 x${clickGuard.toFixed(3)}`);
  const clicks = new Int16Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    clicks[i] = Math.max(-32768, Math.min(32767, Math.round(sum[i] * clickGuard)));
  }
  writeWav16(CLICKS_WAV, SAMPLE_RATE, 1, [clicks]);
  console.log(`[E03-sorrow] 点击轨: ${CLICKS_WAV} (${clickTimestamps.length} clicks, pitch ${PITCH}×, ${duration}s)`);

  // 2) deterministic mix: BGM -12dB with 1s in / 2s out, clicks at SFX_GAIN
  const bgm = readWav16(path.join(ROOT, 'audio', 'emotional_bgm.wav'));
  if (bgm.sampleRate !== SAMPLE_RATE || bgm.bits !== 16) {
    throw new Error(`BGM 规格不符: ${bgm.sampleRate}Hz / ${bgm.bits}bit`);
  }
  const bgmMono = bgm.ch[0];
  const fadeIn = 1;
  const fadeOut = 2;
  const mix = new Float64Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    let g = BGM_GAIN;
    if (t < fadeIn) g *= t / fadeIn;
    const fadeOutStart = duration - fadeOut;
    if (t > fadeOutStart) g *= Math.max(0, (duration - t) / fadeOut);
    const b = i < bgmMono.length ? bgmMono[i] : 0;
    mix[i] = (b / 32768) * g + (clicks[i] / 32768) * SFX_GAIN;
  }

  let peak = 0;
  for (let i = 0; i < totalSamples; i++) peak = Math.max(peak, Math.abs(mix[i]));
  const LIMIT = 0.944; // ≈ -0.5 dBFS
  if (peak > LIMIT) {
    const k = LIMIT / peak;
    console.log(`[clip-guard] 混音峰值 ${peak.toFixed(4)} 超限，整体缩放 x${k.toFixed(3)}`);
    for (let i = 0; i < totalSamples; i++) mix[i] *= k;
  }

  const out = new Int16Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    out[i] = Math.max(-32768, Math.min(32767, Math.round(mix[i] * 32767)));
  }
  writeWav16(MIX_WAV, SAMPLE_RATE, 1, [out]);
  const stats = inspectMixNoClipping(MIX_WAV);
  if (stats.clipped > 0) throw new Error(`检测到削波：${stats.clipped} samples`);
  console.log(`[E03-sorrow] 混音: ${MIX_WAV} | peak=${stats.peak.toFixed(4)} (${stats.peakDb.toFixed(2)} dBFS) | clipped=0 | ${stats.duration.toFixed(2)}s | click=${clickTimestamps.length}`);
  return { clickTimestamps, stats };
}

if (require.main === module) {
  const { clickTimestamps, stats } = buildAudio();
  console.log(`Clicks: ${clickTimestamps.length}; BGM=-12dB SFX=-12dB (低沉 -6dB rel.); peak=${stats.peakDb.toFixed(2)} dBFS; clipped=${stats.clipped}`);
  if (process.argv.includes('--mux')) {
    muxVideo({
      framesDir: process.env.FRAMES_DIR || path.join(ROOT, 'src', 'frames_E03_sorrow_arena'),
      mixPath: MIX_WAV,
      outMp4: MP4_OUT,
      fps: R.FPS,
    });
  }
}

module.exports = { CLICKS_WAV, MIX_WAV, MP4_OUT, BGM_GAIN, SFX_GAIN, PITCH, lowClick, buildAudio };
