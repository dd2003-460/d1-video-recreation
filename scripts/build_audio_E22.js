#!/usr/bin/env node
'use strict';
// E22 audio: every rendered terminal character gets a frame-quantized click.
// emotional_bgm.wav at -12dB + sfx_click.wav at -6dB; summed without normalization
// (the shared deterministic PCM mixer is equivalent to ffmpeg amix=normalize=0).
const os = require('os');
const path = require('path');
const R = require('../src/render_E22_identity_arena');
const { buildAudio, muxVideo } = require('./build_audio_v2_common');

const ROOT = path.resolve(__dirname, '..');
const BGM_GAIN = Math.pow(10, -12 / 20);
const SFX_GAIN = Math.pow(10, -6 / 20);
const CLICKS_WAV = process.env.CLICKS_WAV || path.join(os.tmpdir(), 'E22_identity_arena_clicks.wav');
const MIX_WAV = process.env.MIX_WAV || path.join(os.tmpdir(), 'E22_identity_arena_mix.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'E22_identity_arena_v1.0.mp4');

if (require.main === module) {
  const clicks = R.getClickTimestamps();
  const { stats } = buildAudio({
    clickTimestamps: clicks,
    duration: R.DURATION,
    clicksPath: CLICKS_WAV,
    mixPath: MIX_WAV,
    label: 'E22-identity-v1.0',
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
