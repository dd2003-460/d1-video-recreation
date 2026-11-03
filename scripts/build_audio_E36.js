#!/usr/bin/env node
'use strict';
// E36 回来 (return) — batch-13 音频: S2 卡片飞出恢复音 sfx_ping 轻快连击 (-12dB ×3, 6 张卡)
//   + S3 AI 气泡「在。」最后一声 sfx_confirm (-10dB). 环境 BGM (emotional_bgm.wav -14dB). amix=normalize=0.
//
//   混音: JS 内确定性浮点相加, 等价 ffmpeg `amix=inputs=N:normalize=0`
//         (仓库自带 @ffmpeg-installer 为 2018 年构建, amix 不支持 normalize=0,
//          沿用 build_audio_v2_common 的「JS 混音 == amix=normalize=0」既有做法).
//   封装: libx264 + aac 128k → outputs/E36_return_arena_v1.0.mp4
//
// 用法: node scripts/build_audio_E36.js [--mux]

const path = require('path');
const { execFileSync } = require('child_process');
const C = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.E36_AUDIO_OUT || path.join(ROOT, 'audio/E36_return_arena_mix.wav');
const FFMPEG = C.getFfmpegPath();

// --- 源文件 -------------------------------------------------------------------
const SOURCES = [
  { file: 'sfx_ping.wav', t: 1.0, gainDb: -16, label: 'S1 归档盒旁小字淡入' },
  { file: 'sfx_ping.wav', t: 10.5, gainDb: -14, label: 'S2 用户气泡出现' },
  { file: 'sfx_ping.wav', t: 14.5, gainDb: -12, label: 'S2 卡片飞出 #1 (轻快)' },
  { file: 'sfx_ping.wav', t: 16.0, gainDb: -12.5, label: 'S2 卡片飞出 #2' },
  { file: 'sfx_ping.wav', t: 17.5, gainDb: -13, label: 'S2 卡片飞出 #3' },
  { file: 'sfx_ping.wav', t: 19.0, gainDb: -13.5, label: 'S2 卡片飞出 #4' },
  { file: 'sfx_ping.wav', t: 20.5, gainDb: -14, label: 'S2 卡片飞出 #5' },
  { file: 'sfx_ping.wav', t: 22.0, gainDb: -14.5, label: 'S2 卡片飞出 #6' },
  { file: 'sfx_confirm.wav', t: 21.5, gainDb: -10, label: 'S3 AI 气泡「在。」(最后确认)' },
];
const BGM_FILE = 'emotional_bgm.wav';
const BGM_GAIN_DB = -14;
const MIX_MODE = 'amix=normalize=0';

// --- 渲染: JS float mix → wav --------------------------------------------------
function renderMix() {
  const DURATION = 30, SR = 44100;
  const N = Math.ceil(DURATION * SR);
  const out = new Float32Array(N);
  let peak = 0;
  for (const s of SOURCES) {
    const src = C.readWav16(path.join(ROOT, 'audio', s.file));
    if (!src) throw new Error(`missing audio source: ${s.file}`);
    const gain = Math.pow(10, s.gainDb / 20);
    const start = Math.round(s.t * SR);
    const len = Math.min(src.ch[0].length, N - start);
    for (let i = 0; i < len; i++) {
      const v = (src.ch[0][i] / 32768) * gain;
      out[start + i] += v;
      peak = Math.max(peak, Math.abs(v));
    }
  }
  // BGM
  const bgm = C.readWav16(path.join(ROOT, 'audio', BGM_FILE));
  if (bgm) {
    const gain = Math.pow(10, BGM_GAIN_DB / 20);
    const len = Math.min(bgm.ch[0].length, N);
    for (let i = 0; i < len; i++) {
      const v = (bgm.ch[0][i] / 32768) * gain;
      out[i] += v;
      peak = Math.max(peak, Math.abs(v));
    }
  } else {
    console.warn(`[E36] WARNING: ${BGM_FILE} missing`);
  }
  let maxAbs = 1e-9;
  for (let i = 0; i < out.length; i++) { const a = Math.abs(out[i]); if (a > maxAbs) maxAbs = a; }
  const norm = maxAbs > 1 ? 1 / maxAbs : 1;
  const ch = [new Int16Array(out.length)];
  for (let i = 0; i < out.length; i++) ch[0][i] = Math.round(out[i] * norm * 32767);
  C.writeWav16(OUT, SR, 1, ch);
  console.log(`[E36] mixed → ${OUT} (${DURATION}s, ${SR}Hz, peak=${maxAbs.toFixed(3)}, norm=${norm.toFixed(3)})`);
}

// --- Mux: ffmpeg 合成 mp4 -------------------------------------------------------
function muxMp4(framesDir, videoOut) {
  const framePattern = path.join(framesDir, 'f_%05d.png');
  const args = ['-y', '-framerate', '60', '-i', framePattern, '-i', OUT,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', videoOut];
  execFileSync(FFMPEG, args, { stdio: 'pipe' });
  console.log(`[E36] muxed → ${videoOut}`);
}

if (require.main === module) {
  renderMix();
  if (process.argv.includes('--mux')) {
    const framesDir = process.env.FRAMES_DIR || path.join(__dirname, '..', 'src', 'frames_E36_return_arena');
    const videoOut = process.env.E36_VIDEO_OUT || path.join(ROOT, 'outputs', 'E36_return_arena_v1.0.mp4');
    muxMp4(framesDir, videoOut);
  }
}

module.exports = { SOURCES, BGM_FILE, BGM_GAIN_DB, MIX_MODE, renderMix, muxMp4 };