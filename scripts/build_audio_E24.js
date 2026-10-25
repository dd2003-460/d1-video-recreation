#!/usr/bin/env node
'use strict';
// E24 重生 (rebirth) — 音频合成与封装
//   BGM : emotional_bgm.wav ×-12dB（1.5s 淡入 / 2s 淡出）
//   SFX : sfx_click.wav ×-6dB，时间点来自 render 脚本 getClickTimestamps()
//         （只有 S3 的逐字符打字；S1 无输入、S2 是系统打印，不响键盘音）
//   S2  : 日志每行一个极轻确认音（sfx_click 压到 1/3、3ms 起音）×-26dB
//   混音: JS 内确定性浮点混音（等价 ffmpeg amix=normalize=0），一次性量化到 PCM16
//   封装: libx264 + aac 192k + yuv420p，-shortest
const os = require('os');
const path = require('path');
const fs = require('fs');
const R = require('../src/render_E24_rebirth_arena');
const { readWav16, writeWav16, inspectMixNoClipping, muxVideo, getFfmpegPath } = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');
const SAMPLE_RATE = 44100;
const BGM_GAIN = Math.pow(10, -12 / 20);     // -12 dB
const SFX_GAIN = Math.pow(10, -6 / 20);      // -6 dB
const CONFIRM_GAIN = Math.pow(10, -26 / 20); // 极轻确认音 -26 dB
const CONFIRM_WAV = path.join(ROOT, 'audio', 'sfx_confirm.wav');
const CLICKS_WAV = process.env.CLICKS_WAV || path.join(os.tmpdir(), 'E24_rebirth_arena_clicks.wav');
const MIX_WAV = process.env.MIX_WAV || path.join(ROOT, 'audio', 'E24_rebirth_arena_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'E24_rebirth_arena_v1.0.mp4');
const FADE_IN = 1.5;
const FADE_OUT = 2.0;

// 确认音：sfx_click 每个采样 /3 + 3ms 起音斜坡，得到一声轻"嘀"
function makeConfirmSfx() {
  const sfx = readWav16(path.join(ROOT, 'audio', 'sfx_click.wav'));
  const src = sfx.ch[0];
  const out = new Int16Array(src.length);
  const attack = Math.round(SAMPLE_RATE * 0.003);
  for (let i = 0; i < src.length; i++) {
    const env = i < attack ? i / attack : 1;
    out[i] = Math.round((src[i] / 3) * env);
  }
  writeWav16(CONFIRM_WAV, sfx.sampleRate, 1, [out]);
  return out;
}

function buildClicksTrack() {
  const sfx = readWav16(path.join(ROOT, 'audio', 'sfx_click.wav')).ch[0];
  const confirm = makeConfirmSfx();
  const total = Math.round(R.DURATION * SAMPLE_RATE);
  const sum = new Float64Array(total);
  const place = (src, times, gain) => {
    for (const t of times) {
      const off = Math.round(t * SAMPLE_RATE);
      for (let i = 0; i < src.length && off + i < total; i++) sum[off + i] += src[i] * gain;
    }
  };
  place(sfx, R.getClickTimestamps(), 1);
  place(confirm, R.getConfirmTimestamps(), 1);
  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(sum[i]));
  const k = peak > 32767 * 0.85 ? (32767 * 0.85) / peak : 1;
  if (k < 1) console.log(`[clip-guard] click 轨峰值 ${(peak / 32768).toFixed(3)}，整体缩放 x${k.toFixed(3)}`);
  const pcm = new Int16Array(total);
  for (let i = 0; i < total; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(sum[i] * k)));
  writeWav16(CLICKS_WAV, SAMPLE_RATE, 1, [pcm]);
  return pcm;
}

// 等价 ffmpeg: [bgm]volume=-12dB[bgm]; [sfx]volume=-6dB[sfx]; amix=inputs=2:normalize=0
function buildEpisodeAudio() {
  const clicks = buildClicksTrack();
  const bgm = readWav16(path.join(ROOT, 'audio', 'emotional_bgm.wav'));
  if (bgm.sampleRate !== SAMPLE_RATE || bgm.bits !== 16) {
    throw new Error(`BGM 规格不符: ${bgm.sampleRate}Hz / ${bgm.bits}bit`);
  }
  const total = Math.round(R.DURATION * SAMPLE_RATE);
  const mix = new Float64Array(total);
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    let g = BGM_GAIN;
    if (t < FADE_IN) g *= t / FADE_IN;
    const fo = R.DURATION - FADE_OUT;
    if (t > fo) g *= Math.max(0, (R.DURATION - t) / FADE_OUT);
    const b = i < bgm.ch[0].length ? bgm.ch[0][i] : 0;
    mix[i] = (b / 32768) * g + (clicks[i] / 32768) * SFX_GAIN;
  }
  // 确认音单独再压到 -26dB：先按 -6dB 叠加，再整体回退 20dB 补偿
  const confirm = readWav16(CONFIRM_WAV).ch[0];
  const ratio = CONFIRM_GAIN / SFX_GAIN;
  for (const t of R.getConfirmTimestamps()) {
    const off = Math.round(t * SAMPLE_RATE);
    for (let i = 0; i < confirm.length && off + i < total; i++) mix[off + i] += (confirm[i] / 32768) * (SFX_GAIN * (ratio - 1));
  }
  let peak = 0;
  for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(mix[i]));
  const LIMIT = 0.944; // ≈ -0.5 dBFS
  if (peak > LIMIT) {
    const k = LIMIT / peak;
    console.log(`[clip-guard] 混音峰值 ${peak.toFixed(4)} 超限，整体缩放 x${k.toFixed(3)}`);
    for (let i = 0; i < total; i++) mix[i] *= k;
  }
  const out = new Int16Array(total);
  for (let i = 0; i < total; i++) out[i] = Math.max(-32768, Math.min(32767, Math.round(mix[i] * 32767)));
  writeWav16(MIX_WAV, SAMPLE_RATE, 1, [out]);
  const stats = inspectMixNoClipping(MIX_WAV);
  if (stats.clipped > 0) throw new Error(`检测到削波：${stats.clipped} samples`);
  return { stats };
}

if (require.main === module) {
  const { stats } = buildEpisodeAudio();
  console.log(
    `[E24-rebirth-v1.0] 混音: ${MIX_WAV} | peak=${stats.peak.toFixed(4)} (${stats.peakDb.toFixed(2)} dBFS) | clipped=0 | ${stats.duration.toFixed(2)}s`
  );
  console.log(
    `BGM ×${BGM_GAIN.toFixed(4)} (-12dB, fade ${FADE_IN}s/${FADE_OUT}s) · 键盘音 ×${SFX_GAIN.toFixed(4)} (-6dB) × ${R.getClickTimestamps().length} 次 (S3 逐字) · 确认音 ×${CONFIRM_GAIN.toFixed(4)} (-26dB) × ${R.getConfirmTimestamps().length} 次 (S2 日志行)`
  );
  if (process.argv.includes('--mux')) {
    muxVideo({
      framesDir: process.env.FRAMES_DIR || R.OUT_DIR,
      mixPath: MIX_WAV,
      outMp4: MP4_OUT,
      fps: R.FPS,
    });
    console.log(`MP4: ${MP4_OUT} (${(fs.statSync(MP4_OUT).size / 1024 / 1024).toFixed(2)} MB) via ${getFfmpegPath()}`);
  }
}

module.exports = {
  CLICKS_WAV, MIX_WAV, MP4_OUT, CONFIRM_WAV,
  BGM_GAIN, SFX_GAIN, CONFIRM_GAIN, FADE_IN, FADE_OUT,
  buildClicksTrack, buildEpisodeAudio,
};
