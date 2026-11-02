#!/usr/bin/env node
'use strict';
// E30 记忆 (memory) 音频: 卡片落点音 (audio/sfx_confirm.wav) + 消散音 (sfx_ping.wav 降调)
//   + 环境 BGM (emotional_bgm.wav -14dB) 整床。
//
//   混音: 三轨在 JS 内确定性浮点相加, 等价 ffmpeg amix=normalize=0.
//   封装: libx264 + aac 192k → outputs/E30_memory_arena_v1.0.mp4
//
// 用法: node scripts/build_audio_E30.js [--mux]

const fs = require('fs');
const os = require('os');
const path = require('path');
const R = require('../src/render_E30_memory_arena');
const C = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');
const SAMPLE_RATE = 44100;
const AUDIO = path.join(ROOT, 'audio');
const CARD_DROP = path.join(AUDIO, 'sfx_confirm.wav');  // 卡片落点 0.03s
const PING = path.join(AUDIO, 'sfx_ping.wav');          // 恢复提示 0.15s
const BGM = path.join(AUDIO, 'emotional_bgm.wav');      // 环境 BGM

const BGM_GAIN_DB = -14;                                // 任务卡指定 -14dB
const MIX_MODE = 'amix=normalize=0';                    // JS 浮点混音 == amix normalize=0
const FADE_IN = 1.0, FADE_OUT = 2.5;
const MIX_WAV = process.env.MIX_WAV || path.join(os.tmpdir(), 'E30_memory_arena_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'E30_memory_arena_v1.0.mp4');

function dbToGain(db) { return Math.pow(10, db / 20); }

function loadMono(file) { return C.readWav16(file).ch[0]; }

// --- 混音 (等价 amix=normalize=0) ---------------------------------------------
function buildMix() {
  const duration = R.DURATION;
  const n = Math.round(duration * SAMPLE_RATE);
  const events = R.getSfxEvents();
  const bgm = loadMono(BGM);
  const drop = loadMono(CARD_DROP);
  const ping = loadMono(PING);
  const mix = new Float64Array(n);

  // 轨 1: 环境 BGM (-14dB, 1s 淡入 / 2.5s 淡出)
  const bgmGain = dbToGain(BGM_GAIN_DB);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let g = bgmGain;
    if (t < FADE_IN) g *= t / FADE_IN;
    if (t > duration - FADE_OUT) g *= Math.max(0, (duration - t) / FADE_OUT);
    const srcIdx = i % bgm.length; // BGM loop
    mix[i] += bgm[srcIdx] * g * (1 / 32768);
  }

  // 轨 2/3: 卡片落点音 + 恢复提示 (帧对齐时间来自渲染脚本)
  for (const e of events) {
    const src = e.kind === 'bubble_ping' ? ping : drop;
    const gain = dbToGain(e.gainDb) * (1 / 32768);
    const off = Math.round(e.t * SAMPLE_RATE);
    for (let k = 0; k < src.length; k++) {
      const idx = off + k; if (idx < 0 || idx >= n) continue;
      mix[idx] += src[k] * gain;
    }
  }

  // 峰值保护 -0.5 dBFS
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
  console.log(`音频事件: ${events.length} 个 (card_drop ×${events.filter(e => e.kind === 'card_drop').length}, card_fade ×${events.filter(e => e.kind === 'card_fade').length}, bubble_ping ×${events.filter(e => e.kind === 'bubble_ping').length})`);
  console.log(`BGM: emotional_bgm.wav @ ${BGM_GAIN_DB}dB (fade ${FADE_IN}/${FADE_OUT}s)`);
  console.log(`混音: ${MIX_WAV} | ${MIX_MODE} | peak=${stats.peakDb.toFixed(2)} dBFS | clipped=0 | ${stats.duration.toFixed(2)}s`);
  if (process.argv.includes('--mux')) {
    C.muxVideo({ framesDir: process.env.FRAMES_DIR || R.OUT_DIR, mixPath: MIX_WAV, outMp4: MP4_OUT, fps: R.FPS });
  }
}

module.exports = { BGM_GAIN_DB, MIX_MODE, MIX_WAV, MP4_OUT, FADE_IN, FADE_OUT, buildMix };