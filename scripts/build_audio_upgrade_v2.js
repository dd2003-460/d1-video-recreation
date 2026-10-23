#!/usr/bin/env node
'use strict';
// scripts/build_audio_upgrade_v2.js — 「Clawd 的升级」v2.0 音轨合成 + MP4 封装
//
//   点击音时间轴 100% 来自 src/render_upgrade_arena_v2.js#getClickTimestamps()：
//     · U1/U3 终端逐字打字 140ms/字；U2 安装日志 70ms/字（真实滚动日志节奏）
//     · 每步日志完成打 ✓、进度条、脚注出现：各一次 click，已量化到显示帧
//     · 字幕切换：不发声
//   BGM ×0.3（1s 淡入 / 2s 淡出）+ click ×0.5，non-normalized amix，含削波自检
//
// 用法: node scripts/build_audio_upgrade_v2.js
//       node scripts/build_audio_upgrade_v2.js --mux
//       FRAMES_DIR=/tmp/frames_upgrade_v2 node ... --mux

const path = require('path');
const U = require('../src/render_upgrade_arena_v2');
const { buildAudio, muxVideo } = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');

const CLICKS_WAV = process.env.CLICKS_WAV || '/tmp/upgrade_v2_clicks.wav';
const MIX_WAV = path.join(ROOT, 'audio', 'upgrade_arena_v2_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'upgrade_arena_v2.0.mp4');

if (require.main === module) {
  const clicks = U.getClickTimestamps();
  const { stats } = buildAudio({
    clickTimestamps: clicks,
    duration: U.DURATION,
    clicksPath: CLICKS_WAV,
    mixPath: MIX_WAV,
    label: 'upgrade-v2.0',
  });
  console.log(`点击统计: ${clicks.length} 次 / ${U.DURATION}s`);
  if (process.argv.includes('--mux')) {
    muxVideo({
      framesDir: process.env.FRAMES_DIR || path.join(ROOT, 'src', 'frames_upgrade_v2'),
      mixPath: MIX_WAV,
      outMp4: MP4_OUT,
      fps: U.FPS,
    });
  }
  if (stats.peak > 0.95) process.exitCode = 2;
}

module.exports = { CLICKS_WAV, MIX_WAV, MP4_OUT };
