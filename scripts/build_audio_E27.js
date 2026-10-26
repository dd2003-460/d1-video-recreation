#!/usr/bin/env node
'use strict';
// E27 Time — 音频合成与封装
// BGM: audio/emotional_bgm.wav ×(-12dB)，1s 淡入 / 2s 淡出
// SFX: audio/sfx_click.wav ×(-6dB)，仅打字/敲键时响（时间覆盖 5 + 珊瑚气泡 4 + 用户气泡 18 = 27 次）
// 混音: build_audio_v2_common 内 JS 确定性浮点混音（等价 ffmpeg amix=normalize=0，带削波保护）

const os = require('os');
const path = require('path');
const R = require('../src/render_E27_time_arena');
const { buildAudio, muxVideo } = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');
const BGM_GAIN = Math.pow(10, -12 / 20); // -12dB ≈ 0.2512
const SFX_GAIN = Math.pow(10, -6 / 20);  // -6dB  ≈ 0.5012
const CLICKS_WAV = process.env.CLICKS_WAV || path.join(os.tmpdir(), 'E27_time_arena_clicks.wav');
const MIX_WAV = process.env.MIX_WAV || path.join(os.tmpdir(), 'E27_time_arena_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'E27_time_arena_v1.0.mp4');

if (require.main === module) {
  const clicks = R.getClickTimestamps();
  const { stats } = buildAudio({
    clickTimestamps: clicks,
    duration: R.DURATION,
    clicksPath: CLICKS_WAV,
    mixPath: MIX_WAV,
    label: 'E27-time-v1.0',
    bgmGain: BGM_GAIN,
    sfxGain: SFX_GAIN,
    fadeIn: 1,
    fadeOut: 2,
  });
  console.log(`Clicks: ${clicks.length}; BGM=-12dB SFX=-6dB; peak=${stats.peakDb.toFixed(2)} dBFS; clipped=${stats.clipped}`);
  if (process.argv.includes('--mux')) {
    muxVideo({
      framesDir: process.env.FRAMES_DIR || R.OUT_DIR,
      mixPath: MIX_WAV,
      outMp4: MP4_OUT,
      fps: R.FPS,
    });
  }
}

module.exports = { CLICKS_WAV, MIX_WAV, MP4_OUT, BGM_GAIN, SFX_GAIN, FADE_IN: 1, FADE_OUT: 2 };
