#!/usr/bin/env node
// scripts/build_audio_goodbye.js — 「Clawd 的告别」音频合成
//   emotional_bgm.wav × 0.3 + sfx_click.wav × 0.5 (与打字/事件同步)
//   amix=inputs=2:normalize=0, 无削波, 输出 30s 立体声/单声道 wav
// 输出: audio/goodbye_arena_mix.wav (中间件 audio/goodbye_clicks.wav)

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const goodbye = require('../src/render_goodbye_arena');

const ROOT = path.resolve(__dirname, '..');
const AUDIO = path.join(ROOT, 'audio');
const CLICKS_WAV = path.join(AUDIO, 'goodbye_clicks.wav');
const MIX_WAV = path.join(AUDIO, 'goodbye_arena_mix.wav');
const BGM = path.join(AUDIO, 'emotional_bgm.wav');
const SFX = path.join(AUDIO, 'sfx_click.wav');

const DURATION = 30;
const SAMPLE_RATE = 44100;

// --- Minimal WAV reader (PCM 16-bit) ---
function readWav16(file) {
  const buf = fs.readFileSync(file);
  // RIFF header
  if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error(`${file}: not RIFF`);
  if (buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${file}: not WAVE`);
  // find data chunk
  let offset = 12;
  let dataLen = 0;
  let dataOff = 0;
  let channels = 1;
  let sampleRate = SAMPLE_RATE;
  let bits = 16;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const sz = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      const audioFormat = buf.readUInt16LE(offset + 8);
      channels = buf.readUInt16LE(offset + 10);
      sampleRate = buf.readUInt32LE(offset + 12);
      bits = buf.readUInt16LE(offset + 22);
      if (audioFormat !== 1) throw new Error(`${file}: not PCM`);
      if (bits !== 16) throw new Error(`${file}: not 16-bit`);
    } else if (id === 'data') {
      dataOff = offset + 8;
      dataLen = sz;
    }
    offset += 8 + sz;
  }
  const samples = dataLen / 2; // int16 samples (per channel)
  const ch = new Array(channels);
  for (let c = 0; c < channels; c++) ch[c] = new Int16Array(samples);
  for (let s = 0; s < samples; s++) {
    for (let c = 0; c < channels; c++) {
      ch[c][s] = buf.readInt16LE(dataOff + (s * channels + c) * 2);
    }
  }
  return { channels, sampleRate, bits, samples, ch };
}

// --- Minimal WAV writer (PCM 16-bit) ---
function writeWav16(file, sampleRate, channels, ch) {
  const samples = ch[0].length;
  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const dataSize = samples * channels * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);        // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  const out = Buffer.alloc(44 + dataSize);
  header.copy(out);
  for (let s = 0; s < samples; s++) {
    for (let c = 0; c < channels; c++) {
      out.writeInt16LE(ch[c][s], 44 + (s * channels + c) * 2);
    }
  }
  fs.writeFileSync(file, out);
}

// Saturating mix (no clipping) into int16 buffer
function mixInto(dst, src, offset, gain) {
  const n = src.length;
  for (let i = 0; i < n; i++) {
    const idx = offset + i;
    if (idx < 0 || idx >= dst.length) continue;
    let v = dst[idx] + Math.round(src[i] * gain);
    if (v > 32767) v = 32767;
    if (v < -32768) v = -32768;
    dst[idx] = v;
  }
}

function main() {
  if (!fs.existsSync(AUDIO)) fs.mkdirSync(AUDIO, { recursive: true });

  const sfx = readWav16(SFX);
  const sfxMono = sfx.ch[0]; // mono click

  // 30s silence track (mono) for clicks
  const totalSamples = DURATION * SAMPLE_RATE;
  const clicks = new Int16Array(totalSamples);
  clicks.fill(0);

  const clickTimestamps = goodbye.getClickTimestamps();
  for (const t of clickTimestamps) {
    const offset = Math.round(t * SAMPLE_RATE);
    mixInto(clicks, sfxMono, offset, 1.0);
  }

  writeWav16(CLICKS_WAV, SAMPLE_RATE, 1, [clicks]);
  console.log(`Wrote clicks track: ${CLICKS_WAV} (${clickTimestamps.length} clicks, ${DURATION}s)`);

  // Mix with ffmpeg: BGM × 0.3 + clicks × 0.5, amix=inputs=2:normalize=0, trim to 30s
  const ff = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-i', BGM,
      '-i', CLICKS_WAV,
      '-filter_complex',
      '[0:a]atrim=0:30,volume=0.3[a0];[1:a]volume=0.5[a1];[a0][a1]amix=inputs=2:normalize=0[a]',
      '-map', '[a]',
      '-t', String(DURATION),
      MIX_WAV,
    ],
    { encoding: 'utf8' }
  );
  if (ff.error) throw ff.error;
  if (ff.status !== 0) {
    console.error(ff.stderr);
    throw new Error(`ffmpeg mix failed with status ${ff.status}`);
  }
  console.log(`Wrote mix: ${MIX_WAV}`);
  console.log(ff.stdout || ff.stderr);
}

main();
