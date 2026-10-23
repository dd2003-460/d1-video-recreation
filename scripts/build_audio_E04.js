#!/usr/bin/env node
'use strict';
// E04 愤怒 (anger) — BGM -12dB + 变重的键盘音 (-2dB)。
// 每集都自带 build 脚本（不共享状态）：E04 的 SFX 只要 -2dB 标准增益，
// 节奏变重由渲染脚本的 charMs（80ms → 45ms、S2 80ms/char）决定。
const path = require('path');
const R = require('../src/render_E04_anger_arena');
const { buildAudio, muxVideo } = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');
const BGM_GAIN = Math.pow(10, -12 / 20); // -12 dB
const SFX_GAIN = Math.pow(10, -2 / 20); // -2 dB：比其它集重 4dB
const CLICKS_WAV = process.env.CLICKS_WAV || '/tmp/E04_clicks.wav';
const MIX_WAV = path.join(ROOT, 'audio', 'E04_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'E04_anger_arena_v1.0.mp4');

if (require.main === module) {
  const clicks = R.getClickTimestamps();
  const { stats } = buildAudio({
    clickTimestamps: clicks,
    duration: R.DURATION,
    clicksPath: CLICKS_WAV,
    mixPath: MIX_WAV,
    label: 'E04-anger',
    bgmGain: BGM_GAIN,
    sfxGain: SFX_GAIN,
    fadeIn: 1,
    fadeOut: 2,
  });
  console.log(`Clicks: ${clicks.length}; BGM=-12dB SFX=-2dB (重); peak=${stats.peakDb.toFixed(2)} dBFS; clipped=${stats.clipped}`);
  if (process.argv.includes('--mux')) {
    muxVideo({
      framesDir: process.env.FRAMES_DIR || path.join(ROOT, 'src', 'frames_E04_anger_arena'),
      mixPath: MIX_WAV,
      outMp4: MP4_OUT,
      fps: R.FPS,
    });
  }
}

module.exports = { CLICKS_WAV, MIX_WAV, MP4_OUT, BGM_GAIN, SFX_GAIN, FADE_IN: 1, FADE_OUT: 2 };
