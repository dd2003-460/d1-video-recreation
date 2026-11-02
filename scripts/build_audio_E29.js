#!/usr/bin/env node
'use strict';
// E29 陪伴 (companionship) 音频: 气泡出现 → 软提示音 (audio/sfx_ping.wav) + 卡片翻面 → 极轻翻页声
//   (audio/sfx_confirm.wav) + 环境夜声 (蟋蟀脉冲串 + 55Hz 低 hum, 确定性合成) 整床 -18dB。
//
//   混音: 三轨在 JS 内确定性浮点相加, 等价 ffmpeg
//         `amix=inputs=3:normalize=0,volume=...`（仓库自带 @ffmpeg-installer 为 2018 年构建,
//          amix 不支持 normalize=0, 故沿用 build_audio_v2_common 的「JS 混音 == amix=normalize=0」既有做法,
//          结果逐样本可审计; ffmpeg 只负责编码与封装）。
//   封装: libx264 + aac 192k → outputs/E29_companionship_arena_v1.0.mp4
//
// 用法: node scripts/build_audio_E29.js [--mux]

const fs = require('fs');
const os = require('os');
const path = require('path');
const R = require('../src/render_E29_companionship_arena');
const C = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');
const SAMPLE_RATE = 44100;
const AUDIO = path.join(ROOT, 'audio');
const PING = path.join(AUDIO, 'sfx_ping.wav');       // 软提示音 0.15s
const FLIP = path.join(AUDIO, 'sfx_confirm.wav');    // 翻面点击 0.03s

const AMBIENCE_GAIN_DB = -18;                        // 环境夜声整床
const AMBIENCE_SPEC = 'cricket chirps (4.3kHz pulse trains, 3 pulses/chirp) + low hum (55Hz + 110/165Hz harmonics, 0.07Hz swell)';
const MIX_MODE = 'amix=normalize=0';                 // JS 浮点混音 == amix normalize=0
const FADE_IN = 1.5, FADE_OUT = 2.0;
const MIX_WAV = process.env.MIX_WAV || path.join(os.tmpdir(), 'E29_companionship_arena_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'E29_companionship_arena_v1.0.mp4');

function dbToGain(db) { return Math.pow(10, db / 20); }

// --- 确定性环境夜声合成 (蟋蟀 + 低 hum) ---------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let z = a; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
}
function synthesizeAmbience(duration) {
  const n = Math.round(duration * SAMPLE_RATE);
  const out = new Float64Array(n);
  // 1) 低 hum: 55Hz 基频 + 110/165Hz 泛音, 0.07Hz 缓慢起伏 (空调/机器底噪)
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const swell = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.07 * t);
    out[i] += swell * (
      0.55 * Math.sin(2 * Math.PI * 55 * t) +
      0.14 * Math.sin(2 * Math.PI * 110 * t + 0.7) +
      0.06 * Math.sin(2 * Math.PI * 165 * t + 1.3)
    );
  }
  // 2) 蟋蟀: 每 0.45-0.95s 一次 chirp, 每次 3 个 12ms 脉冲 (18ms 间隔), 4.2-4.4kHz 正弦
  const rnd = mulberry32(2900);
  let t0 = 0.35;
  while (t0 < duration - 0.3) {
    const freq = 4200 + Math.floor(rnd() * 200);
    const amp = 0.16 + rnd() * 0.10;
    const pan = rnd();                     // 只用于轻微音量差 (单声道混音)
    for (let p = 0; p < 3; p++) {
      const start = t0 + p * 0.030;
      const dur = 0.012;
      const s0 = Math.round(start * SAMPLE_RATE);
      const len = Math.round(dur * SAMPLE_RATE);
      for (let k = 0; k < len; k++) {
        const idx = s0 + k; if (idx < 0 || idx >= n) continue;
        const env = Math.pow(Math.sin(Math.PI * (k / len)), 2);   // 正弦窗: 无爆音
        out[idx] += amp * (0.85 + 0.3 * pan) * env * Math.sin(2 * Math.PI * freq * (k / SAMPLE_RATE));
      }
    }
    t0 += 0.45 + rnd() * 0.5;
  }
  // 3) 归一化到 0.9 峰值 (后续按 -18dB 上床, 峰值可预期)
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < n; i++) out[i] *= 0.9 / peak;
  return out;
}

function loadMono(file) { return C.readWav16(file).ch[0]; }

// --- 混音 (等价 amix=normalize=0) ---------------------------------------------
function buildMix() {
  const duration = R.DURATION;
  const n = Math.round(duration * SAMPLE_RATE);
  const events = R.getSfxEvents();
  const amb = synthesizeAmbience(duration);
  const ping = loadMono(PING);
  const flip = loadMono(FLIP);
  const mix = new Float64Array(n);

  // 轨 1: 环境夜声 (整床 -18dB, 1.5s 淡入 / 2s 淡出)
  const ambGain = dbToGain(AMBIENCE_GAIN_DB);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let g = ambGain;
    if (t < FADE_IN) g *= t / FADE_IN;
    if (t > duration - FADE_OUT) g *= Math.max(0, (duration - t) / FADE_OUT);
    mix[i] += amb[i] * g;
  }
  // 轨 2/3: 提示音 (帧对齐时间来自渲染脚本, 同一事件表驱动画面与声音)
  for (const e of events) {
    const src = e.kind === 'bubble_ping' ? ping : flip;
    const gain = dbToGain(e.gainDb) * (1 / 32768);
    const off = Math.round(e.t * SAMPLE_RATE);
    for (let k = 0; k < src.length; k++) {
      const idx = off + k; if (idx < 0 || idx >= n) continue;
      mix[idx] += src[k] * gain;
    }
  }
  // 峰值保护 -0.5 dBFS (等同 clip-guard)
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(mix[i]));
  const LIMIT = 0.944;
  if (peak > LIMIT) {
    const k = LIMIT / peak;
    console.log(`[clip-guard] 混音峰值 ${peak.toFixed(4)} 超限, 整体缩放 x${k.toFixed(3)}`);
    for (let i = 0; i < n; i++) mix[i] *= k;
  }
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.max(-32768, Math.min(32767, Math.round(mix[i] * 32767)));
  C.writeWav16(MIX_WAV, SAMPLE_RATE, 1, [out]);
  const stats = C.inspectMixNoClipping(MIX_WAV);
  if (stats.clipped > 0) throw new Error(`检测到削波: ${stats.clipped} samples`);
  return { n, stats, events };
}

if (require.main === module) {
  const { stats, events } = buildMix();
  console.log(`音频事件: ${events.map((e) => `${e.kind}@${e.t}s(${e.gainDb}dB)`).join(' / ')}`);
  console.log(`环境夜声: ${AMBIENCE_SPEC} @ ${AMBIENCE_GAIN_DB}dB (fade ${FADE_IN}/${FADE_OUT}s)`);
  console.log(`混音: ${MIX_WAV} | ${MIX_MODE} | peak=${stats.peakDb.toFixed(2)} dBFS | clipped=0 | ${stats.duration.toFixed(2)}s`);
  console.log(`等价 ffmpeg: ffmpeg -i ambience.wav -i sfx_ping.wav -i sfx_confirm.wav -filter_complex "[0:a]volume=-18dB[a];[a][1:a][2:a]amix=inputs=3:normalize=0[out]" -map "[out]" mix.wav`);
  if (process.argv.includes('--mux')) {
    C.muxVideo({ framesDir: process.env.FRAMES_DIR || R.OUT_DIR, mixPath: MIX_WAV, outMp4: MP4_OUT, fps: R.FPS });
  }
}

module.exports = { AMBIENCE_GAIN_DB, AMBIENCE_SPEC, MIX_MODE, MIX_WAV, MP4_OUT, FADE_IN, FADE_OUT, synthesizeAmbience, buildMix };

