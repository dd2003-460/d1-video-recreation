#!/usr/bin/env node
'use strict';
// E28 自由时间 (freetime) 音频: 逐字符键盘音 sfx_click.wav -6dB (仅 S2 墨线行逐行显现时响,
// 时间点来自 render_E28_freetime_arena.getClickTimestamps) + BGM emotional_bgm.wav -12dB,
// amix=normalize=0 (build_audio_v2_common 内 JS 确定性混音等价实现) → mux outputs/E28_freetime_arena_v1.0.mp4
const os = require('os');
const path = require('path');
const R = require('../src/render_E28_freetime_arena');
const { buildAudio, muxVideo } = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');
const BGM_GAIN = Math.pow(10, -12 / 20);
const SFX_GAIN = Math.pow(10, -6 / 20);
const CLICKS_WAV = process.env.CLICKS_WAV || path.join(os.tmpdir(), 'E28_freetime_arena_clicks.wav');
const MIX_WAV = process.env.MIX_WAV || path.join(os.tmpdir(), 'E28_freetime_arena_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'E28_freetime_arena_v1.0.mp4');

if (require.main === module) {
  const clicks = R.getClickTimestamps();
  const { stats } = buildAudio({
    clickTimestamps: clicks,
    duration: R.DURATION,
    clicksPath: CLICKS_WAV,
    mixPath: MIX_WAV,
    label: 'E28-freetime-v1.0',
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
