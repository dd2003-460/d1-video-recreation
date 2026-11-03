#!/usr/bin/env node
'use strict';
// E35 告别 (farewell) — batch-13 音频: S2 卡片打包音 sfx_confirm 连击 (-14dB ×3 基准, 6 张卡)
//   + S3 清空时一声低沉消散 (sfx_ping -18dB). 环境 BGM (emotional_bgm.wav -16dB, 比日常集更沉).
//   amix=normalize=0.
//
//   混音: JS 内确定性浮点相加, 等价 ffmpeg `amix=inputs=N:normalize=0`
//         (仓库自带 @ffmpeg-installer 为 2018 年构建, amix 不支持 normalize=0,
//          沿用 build_audio_v2_common 的「JS 混音 == amix=normalize=0」既有做法).
//   封装: libx264 + aac 128k → outputs/E35_farewell_arena_v1.0.mp4
//
// 用法: node scripts/build_audio_E35.js [--mux]

const path = require('path');
const { execFileSync } = require('child_process');
const C = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.E35_AUDIO_OUT || path.join(ROOT, 'audio/E35_farewell_arena_mix.wav');
const FFMPEG = C.getFfmpegPath();

// --- 源文件 -------------------------------------------------------------------
const SOURCES = [
  { file: 'sfx_ping.wav', t: 1.0, gainDb: -14, label: 'S1 用户气泡出现' },
  { file: 'sfx_confirm.wav', t: 11.0, gainDb: -14, label: 'S2 卡片打包 #1' },
  { file: 'sfx_confirm.wav', t: 12.5, gainDb: -14.5, label: 'S2 卡片打包 #2' },
  { file: 'sfx_confirm.wav', t: 14.0, gainDb: -15, label: 'S2 卡片打包 #3' },
  { file: 'sfx_confirm.wav', t: 15.5, gainDb: -15.5, label: 'S2 卡片打包 #4' },
  { file: 'sfx_confirm.wav', t: 17.0, gainDb: -16, label: 'S2 卡片打包 #5' },
  { file: 'sfx_confirm.wav', t: 18.5, gainDb: -16.5, label: 'S2 卡片打包 #6' },
  { file: 'sfx_ping.wav', t: 20.5, gainDb: -18, label: 'S3 清空时低沉消散' },
  { file: 'sfx_ping.wav', t: 22.5, gainDb: -16, label: 'S3 小字淡入轻柔提示' },
];
const BGM_FILE = 'emotional_bgm.wav';
const BGM_GAIN_DB = -16;  // 任务卡指定 -16dB (比日常集更沉)
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
    console.warn(`[E35] WARNING: ${BGM_FILE} missing`);
  }
  let maxAbs = 1e-9;
  for (let i = 0; i < out.length; i++) { const a = Math.abs(out[i]); if (a > maxAbs) maxAbs = a; }
  const norm = maxAbs > 1 ? 1 / maxAbs : 1;
  const ch = [new Int16Array(out.length)];
  for (let i = 0; i < out.length; i++) ch[0][i] = Math.round(out[i] * norm * 32767);
  C.writeWav16(OUT, SR, 1, ch);
  console.log(`[E35] mixed → ${OUT} (${DURATION}s, ${SR}Hz, peak=${maxAbs.toFixed(3)}, norm=${norm.toFixed(3)})`);
}

// --- Mux: ffmpeg 合成 mp4 -------------------------------------------------------
function muxMp4(framesDir, videoOut) {
  const framePattern = path.join(framesDir, 'f_%05d.png');
  const args = ['-y', '-framerate', '60', '-i', framePattern, '-i', OUT,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', videoOut];
  execFileSync(FFMPEG, args, { stdio: 'pipe' });
  console.log(`[E35] muxed → ${videoOut}`);
}

if (require.main === module) {
  renderMix();
  if (process.argv.includes('--mux')) {
    const framesDir = process.env.FRAMES_DIR || path.join(__dirname, '..', 'src', 'frames_E35_farewell_arena');
    const videoOut = process.env.E35_VIDEO_OUT || path.join(ROOT, 'outputs', 'E35_farewell_arena_v1.0.mp4');
    muxMp4(framesDir, videoOut);
  }
}

module.exports = { SOURCES, BGM_FILE, BGM_GAIN_DB, MIX_MODE, renderMix, muxMp4 };