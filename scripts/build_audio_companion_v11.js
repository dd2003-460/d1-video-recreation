#!/usr/bin/env node
'use strict';
// Companion v1.1: preserve v1.0 BGM/SFX gains and 0.6s/1.2s fades.
const path = require('path');
const R = require('../src/render_companion_arena_v11');
const { buildAudio, muxVideo } = require('./build_audio_v2_common');
const ROOT = path.resolve(__dirname, '..');
const CLICKS_WAV = process.env.CLICKS_WAV || '/tmp/companion_v11_clicks.wav';
const MIX_WAV = path.join(ROOT, 'audio', 'companion_arena_v11_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'companion_arena_v1.1.mp4');

if (require.main === module) {
  const clicks = R.getClickTimestamps();
  const { stats } = buildAudio({
    clickTimestamps: clicks, duration: R.DURATION, clicksPath: CLICKS_WAV, mixPath: MIX_WAV,
    label: 'companion-v1.1', bgmGain: 0.3, sfxGain: 0.5, fadeIn: 0.6, fadeOut: 1.2,
  });
  console.log(`Clicks: ${clicks.length}; peak=${stats.peakDb.toFixed(2)} dBFS; clipped=${stats.clipped}`);
  if (process.argv.includes('--mux')) muxVideo({
    framesDir: process.env.FRAMES_DIR || path.join(ROOT, 'src', 'frames_companion_v11'),
    mixPath: MIX_WAV, outMp4: MP4_OUT, fps: R.FPS,
  });
}
module.exports = { CLICKS_WAV, MIX_WAV, MP4_OUT, BGM_GAIN: 0.3, SFX_GAIN: 0.5, FADE_IN: 0.6, FADE_OUT: 1.2 };
