#!/usr/bin/env node
'use strict';
// scripts/build_audio_learning_v2.js — 「Clawd 的学习」v2.0 音轨合成 + MP4 封装
//
//   点击音时间轴 100% 来自 src/render_learning_arena_v2.js#getClickTimestamps()：
//     · 终端逐字打字：每个字符出现的那一帧一次 click（140ms/字）
//     · 整行/进度条/标签出现：每次一次 click，已量化到显示帧
//     · 字幕切换：不发声
//   BGM ×0.3（1s 淡入 / 2s 淡出）+ click ×0.5，non-normalized amix，含削波自检
//
// 用法: node scripts/build_audio_learning_v2.js            → 只生成 audio/learning_arena_v2_mix.wav
//       node scripts/build_audio_learning_v2.js --mux      → 同时封装 outputs/learning_arena_v2.0.mp4
//       FRAMES_DIR=/tmp/frames_learning_v2 node ... --mux

const path = require('path');
const L = require('../src/render_learning_arena_v2');
const { buildAudio, muxVideo } = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');

const CLICKS_WAV = process.env.CLICKS_WAV || '/tmp/learning_v2_clicks.wav';
const MIX_WAV = path.join(ROOT, 'audio', 'learning_arena_v2_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'learning_arena_v2.0.mp4');

if (require.main === module) {
  const clicks = L.getClickTimestamps();
  const { stats } = buildAudio({
    clickTimestamps: clicks,
    duration: L.DURATION,
    clicksPath: CLICKS_WAV,
    mixPath: MIX_WAV,
    label: 'learning-v2.0',
  });
  console.log(`点击统计: ${clicks.length} 次 / ${L.DURATION}s（含逐字打字 ${clicks.filter((c) => c < 30).length} 个时间点）`);
  if (process.argv.includes('--mux')) {
    muxVideo({
      framesDir: process.env.FRAMES_DIR || path.join(ROOT, 'src', 'frames_learning_v2'),
      mixPath: MIX_WAV,
      outMp4: MP4_OUT,
      fps: L.FPS,
    });
  }
  if (stats.peak > 0.95) process.exitCode = 2;
}

module.exports = { CLICKS_WAV, MIX_WAV, MP4_OUT };
