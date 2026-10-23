#!/usr/bin/env node
// scripts/build_audio_companion.js — 「Clawd 的陪伴」音频合成与 MP4 封装
//   emotional_bgm.wav × 0.3 + sfx_click.wav × 0.5 (与打字/事件同步)
//   amix=inputs=2:normalize=0, 无削波, 输出 30s 音轨
// 输出: audio/companion_arena_mix.wav (中间件 /tmp/companion_clicks.wav)

const fs = require('fs');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const companion = require('../src/render_companion_arena');

const ROOT = path.resolve(__dirname, '..');
const AUDIO = path.join(ROOT, 'audio');
const CLICKS_WAV = process.env.CLICKS_WAV || '/tmp/companion_clicks.wav';
const MIX_WAV = path.join(AUDIO, 'companion_arena_mix.wav');
const BGM = path.join(AUDIO, 'emotional_bgm.wav');
const SFX = path.join(AUDIO, 'sfx_click.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'companion_arena_v1.0.mp4');

const DURATION = companion.DURATION; // 30s
const SAMPLE_RATE = 44100;

function getFfmpegPath() {
  if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN)) {
    return process.env.FFMPEG_BIN;
  }
  const candidates = [
    '/usr/local/bin/ffmpeg',
    '/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2',
    '/home/user/.local/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    const exe = execFileSync(
      'python3',
      ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    if (exe && fs.existsSync(exe)) return exe;
  } catch (_) {}
  return 'ffmpeg';
}

// --- Minimal WAV reader (PCM 16-bit) ---
function readWav16(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error(`${file}: not RIFF`);
  if (buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${file}: not WAVE`);
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
    offset += 8 + sz + (sz % 2);
  }
  const samples = Math.floor(dataLen / (2 * channels));
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
  header.writeUInt16LE(1, 20); // PCM
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

function inspectMixNoClipping(file) {
  const wav = readWav16(file);
  let maxAbs = 0;
  let clipped = 0;
  for (let c = 0; c < wav.channels; c++) {
    const arr = wav.ch[c];
    for (let i = 0; i < arr.length; i++) {
      const a = Math.abs(arr[i]);
      if (a > maxAbs) maxAbs = a;
      if (a >= 32760) clipped++;
    }
  }
  const peak = maxAbs / 32768;
  const peakDb = peak > 0 ? 20 * Math.log10(peak) : -Infinity;
  if (clipped > 0) {
    throw new Error(`Audio clipping detected in ${file}: ${clipped} clipped samples`);
  }
  return { peak, peakDb, clipped, duration: wav.samples / wav.sampleRate };
}

function buildAudio() {
  if (!fs.existsSync(AUDIO)) fs.mkdirSync(AUDIO, { recursive: true });

  const sfx = readWav16(SFX);
  const sfxMono = sfx.ch[0];

  // 30s silence track (mono) for clicks
  const totalSamples = DURATION * SAMPLE_RATE;
  const clicks = new Int16Array(totalSamples);
  clicks.fill(0);

  const clickTimestamps = companion.getClickTimestamps();
  for (const t of clickTimestamps) {
    const offset = Math.round(t * SAMPLE_RATE);
    mixInto(clicks, sfxMono, offset, 1.0);
  }

  writeWav16(CLICKS_WAV, SAMPLE_RATE, 1, [clicks]);
  console.log(`Wrote clicks track: ${CLICKS_WAV} (${clickTimestamps.length} clicks, ${DURATION}s)`);

  // Mix with ffmpeg: BGM × 0.3 + clicks × 0.5, amix=inputs=2:normalize=0, trim to 30s
  const ffmpeg = getFfmpegPath();
  const ff = spawnSync(
    ffmpeg,
    [
      '-y',
      '-i', BGM,
      '-i', CLICKS_WAV,
      '-filter_complex',
      '[0:a]atrim=0:30,afade=t=in:st=0:d=0.6,afade=t=out:st=28.8:d=1.2,volume=0.3[a0];[1:a]volume=0.5[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]',
      '-map', '[a]',
      '-t', String(DURATION),
      '-c:a', 'pcm_s16le',
      MIX_WAV,
    ],
    { encoding: 'utf8' }
  );
  if (ff.error) throw ff.error;
  if (ff.status !== 0) {
    console.error(ff.stderr);
    throw new Error(`ffmpeg mix failed with status ${ff.status}`);
  }

  const stats = inspectMixNoClipping(MIX_WAV);
  console.log(
    `Wrote mix: ${MIX_WAV} | peak=${stats.peak.toFixed(4)} (${stats.peakDb.toFixed(2)} dBFS) | clipped=${stats.clipped} | duration=${stats.duration.toFixed(2)}s`
  );
  return { mixPath: MIX_WAV, clicksCount: clickTimestamps.length, stats };
}

function muxVideo(framesDir, outMp4 = MP4_OUT) {
  const ffmpeg = getFfmpegPath();
  fs.mkdirSync(path.dirname(outMp4), { recursive: true });
  const ff = spawnSync(
    ffmpeg,
    [
      '-y',
      '-framerate', String(companion.FPS),
      '-i', path.join(framesDir, 'f_%05d.png'),
      '-i', MIX_WAV,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'medium',
      '-crf', '18',
      '-r', String(companion.FPS),
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      outMp4,
    ],
    { encoding: 'utf8' }
  );
  if (ff.error) throw ff.error;
  if (ff.status !== 0) {
    console.error(ff.stderr);
    throw new Error(`ffmpeg mux failed with status ${ff.status}`);
  }
  console.log(`Muxed MP4: ${outMp4}`);
}

if (require.main === module) {
  buildAudio();
  if (process.argv.includes('--mux')) {
    const framesDir = process.env.FRAMES_DIR || path.join(ROOT, 'src', 'frames_companion');
    muxVideo(framesDir, MP4_OUT);
  }
}

module.exports = {
  buildAudio,
  muxVideo,
  inspectMixNoClipping,
};
