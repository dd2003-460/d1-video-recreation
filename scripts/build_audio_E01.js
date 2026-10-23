#!/usr/bin/env node
'use strict';
// E01 好奇 (curiosity) — BGM -12dB + 键盘音 -6dB, 与逐字打字时间戳同步。
const path = require('path');
const R = require('../src/render_E01_curiosity_arena');
const { buildAudio, muxVideo } = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');
const BGM_GAIN = Math.pow(10, -12 / 20);
const SFX_GAIN = Math.pow(10, -6 / 20);
const CLICKS_WAV = process.env.CLICKS_WAV || '/tmp/E01_clicks.wav';
const MIX_WAV = path.join(ROOT, 'audio', 'E01_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'E01_curiosity_arena_v1.0.mp4');

if (require.main === module) {
  const clicks = R.getClickTimestamps();
  const { stats } = buildAudio({
    clickTimestamps: clicks,
    duration: R.DURATION,
    clicksPath: CLICKS_WAV,
    mixPath: MIX_WAV,
    label: 'E01-curiosity',
    bgmGain: BGM_GAIN,
    sfxGain: SFX_GAIN,
    fadeIn: 1,
    fadeOut: 2,
  });
  console.log(`Clicks: ${clicks.length}; BGM=-12dB SFX=-6dB; peak=${stats.peakDb.toFixed(2)} dBFS; clipped=${stats.clipped}`);
  if (process.argv.includes('--mux')) {
    muxVideo({
      framesDir: process.env.FRAMES_DIR || path.join(ROOT, 'src', 'frames_E01_curiosity_arena'),
      mixPath: MIX_WAV,
      outMp4: MP4_OUT,
      fps: R.FPS,
    });
  }
}

module.exports = { CLICKS_WAV, MIX_WAV, MP4_OUT, BGM_GAIN, SFX_GAIN, FADE_IN: 1, FADE_OUT: 2 };
