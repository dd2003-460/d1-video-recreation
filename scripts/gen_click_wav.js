const fs = require('fs');
const path = require('path');

// Read click times
const times = fs.readFileSync('/tmp/click_times.txt', 'utf8').split('\n').map(Number);
const totalDur = 86.481;
const sr = 44100;
const totalSamples = Math.ceil(totalDur * sr);

// Read sfx_click.wav
const sfxPath = 'audio/sfx_click.wav';
const sfxBuf = fs.readFileSync(sfxPath);
// Parse WAV header
const sampleRate = sfxBuf.readUInt32LE(24);
const dataOffset = sfxBuf.indexOf('data') + 4;
const dataLen = sfxBuf.readUInt32LE(sfxBuf.indexOf('data') + 4);
const sfxSamples = dataLen / 2; // 16-bit mono
const sfxData = new Float32Array(sfxSamples);
for (let i = 0; i < sfxSamples; i++) {
  sfxData[i] = sfxBuf.readInt16LE(dataOffset + i * 2) / 32768;
}

// Create output buffer (float)
const out = new Float32Array(totalSamples).fill(0);

// Volume: -8dB relative = 0.398
const vol = Math.pow(10, -8/20);

// Place each click
for (const t of times) {
  const startSample = Math.floor(t * sr);
  for (let i = 0; i < sfxSamples; i++) {
    const idx = startSample + i;
    if (idx < totalSamples) {
      out[idx] += sfxData[i] * vol;
    }
  }
}

// Clamp and convert to 16-bit
const outBuf = Buffer.alloc(44 + totalSamples * 2);
// WAV header
outBuf.write('RIFF', 0);
outBuf.writeUInt32LE(36 + totalSamples * 2, 4);
outBuf.write('WAVE', 8);
outBuf.write('fmt ', 12);
outBuf.writeUInt32LE(16, 16); // fmt chunk size
outBuf.writeUInt16LE(1, 20); // PCM
outBuf.writeUInt16LE(1, 22); // mono
outBuf.writeUInt32LE(sr, 24);
outBuf.writeUInt32LE(sr * 2, 28); // byte rate
outBuf.writeUInt16LE(2, 32); // block align
outBuf.writeUInt16LE(16, 34); // bits per sample
outBuf.write('data', 36);
outBuf.writeUInt32LE(totalSamples * 2, 40);
for (let i = 0; i < totalSamples; i++) {
  const v = Math.max(-1, Math.min(1, out[i]));
  outBuf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
}

fs.writeFileSync('audio/s1_clicks_v13.wav', outBuf);
console.log('Wrote audio/s1_clicks_v13.wav:', outBuf.length, 'bytes');
console.log('Duration:', totalDur, 's, Clicks:', times.length);
