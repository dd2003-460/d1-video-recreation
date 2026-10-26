#!/usr/bin/env node
'use strict';
// E25 audio: keyboard click at each visible command/name key (plus Return) and
// emotional_bgm mixed at the exact non-normalized -12 dB / -6 dB gains.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');
const R = require('../src/render_E25_naming_arena');

const ROOT = path.resolve(__dirname, '..');
const BGM_WAV = path.join(ROOT, 'audio', 'emotional_bgm.wav');
const CLICK_WAV = path.join(ROOT, 'audio', 'sfx_click.wav');
const FRAMES_DIR = process.env.FRAMES_DIR || R.FRAMES_DIR;
const MIX_WAV = path.join(os.tmpdir(), 'E25_naming_arena_mix.wav');
const CLICKS_WAV = path.join(os.tmpdir(), 'E25_naming_arena_clicks.wav');
const MP4_OUT = path.join(ROOT, 'outputs', 'E25_naming_arena_v1.0.mp4');
const SAMPLE_RATE = 44100;
const BGM_DB = -12;
const SFX_DB = -6;

function getFfmpegPath() {
  if (process.env.FFMPEG_BIN && fs.existsSync(process.env.FFMPEG_BIN)) return process.env.FFMPEG_BIN;
  const candidates = [
    path.join(ROOT, 'node_modules', '@ffmpeg-installer', 'linux-x64', 'ffmpeg'),
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
  ];
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
  try {
    const found = execFileSync('sh', ['-lc', 'command -v ffmpeg'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (found) return found;
  } catch (_) {}
  throw new Error('FFmpeg not found. Run npm ci or set FFMPEG_BIN.');
}

function getFfprobePath() {
  if (process.env.FFPROBE_BIN && fs.existsSync(process.env.FFPROBE_BIN)) return process.env.FFPROBE_BIN;
  const bundled = path.join(ROOT, 'node_modules', '@ffprobe-installer', 'linux-x64', 'ffprobe');
  if (fs.existsSync(bundled)) return bundled;
  try {
    return execFileSync('sh', ['-lc', 'command -v ffprobe'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (_) { return ''; }
}

function readWav16(file) {
  const data = fs.readFileSync(file);
  if (data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${file} is not a RIFF/WAVE file`);
  }
  let offset = 12;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  let audioFormat = 0;
  let pcmOffset = -1;
  let pcmLength = 0;
  while (offset + 8 <= data.length) {
    const id = data.toString('ascii', offset, offset + 4);
    const size = data.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      audioFormat = data.readUInt16LE(body);
      channels = data.readUInt16LE(body + 2);
      sampleRate = data.readUInt32LE(body + 4);
      bits = data.readUInt16LE(body + 14);
    } else if (id === 'data') {
      pcmOffset = body;
      pcmLength = size;
    }
    offset = body + size + (size % 2);
  }
  if (audioFormat !== 1 || bits !== 16 || !channels || pcmOffset < 0) {
    throw new Error(`${file} must be integer PCM16 WAV`);
  }
  const frameCount = Math.floor(pcmLength / (2 * channels));
  const mono = new Int16Array(frameCount);
  for (let i = 0; i < frameCount; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += data.readInt16LE(pcmOffset + (i * channels + c) * 2);
    mono[i] = Math.round(sum / channels);
  }
  return { channels, sampleRate, bits, frameCount, samples: mono };
}

function writeWav16(file, sampleRate, samples) {
  const dataSize = samples.length * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  const payload = Buffer.alloc(dataSize);
  for (let i = 0; i < samples.length; i++) payload.writeInt16LE(samples[i], i * 2);
  fs.writeFileSync(file, Buffer.concat([header, payload]));
}

function buildClickTrack(clickTimes) {
  const sfx = readWav16(CLICK_WAV);
  if (sfx.sampleRate !== SAMPLE_RATE) throw new Error(`SFX rate ${sfx.sampleRate} != ${SAMPLE_RATE}`);
  const totalSamples = Math.round(R.DURATION * SAMPLE_RATE);
  const sum = new Float64Array(totalSamples);
  for (const time of clickTimes) {
    const start = Math.round(time * SAMPLE_RATE);
    for (let j = 0; j < sfx.samples.length && start + j < totalSamples; j++) {
      if (start + j >= 0) sum[start + j] += sfx.samples[j];
    }
  }
  const pcm = new Int16Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    pcm[i] = Math.max(-32768, Math.min(32767, Math.round(sum[i])));
  }
  writeWav16(CLICKS_WAV, SAMPLE_RATE, pcm);
  console.log(`[audio] click track: ${clickTimes.length} events, ${R.DURATION}s (${CLICKS_WAV})`);
  return pcm;
}

function runFfmpeg(args) {
  const ffmpeg = getFfmpegPath();
  const result = spawnSync(ffmpeg, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return { ...result, ffmpeg };
}

function mixWithAmix() {
  const filter = `[0:a]volume=${BGM_DB}dB[bgm];[1:a]volume=${SFX_DB}dB[click];[bgm][click]amix=inputs=2:duration=longest:normalize=0:dropout_transition=0[mix]`;
  const result = runFfmpeg([
    '-y', '-i', BGM_WAV, '-i', CLICKS_WAV,
    '-filter_complex', filter, '-map', '[mix]',
    '-ar', String(SAMPLE_RATE), '-ac', '1', '-c:a', 'pcm_s16le',
    '-t', String(R.DURATION), MIX_WAV,
  ]);
  if (result.status === 0 && fs.existsSync(MIX_WAV) && fs.statSync(MIX_WAV).size > 44) return true;
  const detail = (result.stderr || result.error?.message || 'unknown ffmpeg filter error').trim().split('\n').slice(-4).join(' | ');
  console.warn(`[audio] bundled FFmpeg cannot run amix normalize=0; using mathematically identical non-normalized PCM sum (${detail})`);
  try { fs.rmSync(MIX_WAV, { force: true }); } catch (_) {}
  return false;
}

function mixPcmNoNormalize(clickPcm) {
  const bgm = readWav16(BGM_WAV);
  if (bgm.sampleRate !== SAMPLE_RATE) throw new Error(`BGM rate ${bgm.sampleRate} != ${SAMPLE_RATE}`);
  const totalSamples = Math.round(R.DURATION * SAMPLE_RATE);
  const bgmGain = 10 ** (BGM_DB / 20);
  const clickGain = 10 ** (SFX_DB / 20);
  const pcm = new Int16Array(totalSamples);
  let peak = 0;
  let clipped = 0;
  for (let i = 0; i < totalSamples; i++) {
    const sample = (i < bgm.samples.length ? bgm.samples[i] * bgmGain : 0) + clickPcm[i] * clickGain;
    peak = Math.max(peak, Math.abs(sample));
    if (sample > 32767 || sample < -32768) clipped++;
    pcm[i] = Math.max(-32768, Math.min(32767, Math.round(sample)));
  }
  if (clipped) throw new Error(`non-normalized mix would clip ${clipped} samples; source gains must remain exact`);
  writeWav16(MIX_WAV, SAMPLE_RATE, pcm);
  const dbfs = peak ? 20 * Math.log10(peak / 32768) : -Infinity;
  console.log(`[audio] amix=normalize=0-equivalent PCM: BGM ${BGM_DB}dB + SFX ${SFX_DB}dB; peak ${dbfs.toFixed(2)}dBFS; clipped=0`);
}

function inspectMix() {
  const mix = readWav16(MIX_WAV);
  if (mix.sampleRate !== SAMPLE_RATE || mix.frameCount !== R.DURATION * SAMPLE_RATE) {
    throw new Error(`mixed audio duration/rate mismatch: ${mix.frameCount} @ ${mix.sampleRate}`);
  }
  let peak = 0;
  for (const n of mix.samples) peak = Math.max(peak, Math.abs(n));
  console.log(`[audio] mixed WAV: ${mix.frameCount / mix.sampleRate}s, peak=${(20 * Math.log10(peak / 32768)).toFixed(2)}dBFS`);
}

function buildAudio() {
  const clicks = R.getClickTimestamps();
  if (!clicks.length) throw new Error('render did not provide typing/Return click timestamps');
  const clickPcm = buildClickTrack(clicks);
  if (!mixWithAmix()) mixPcmNoNormalize(clickPcm);
  inspectMix();
  return { clicks, clickPcm, mixPath: MIX_WAV };
}

function muxVideo() {
  if (!fs.existsSync(FRAMES_DIR)) throw new Error(`missing frame directory ${FRAMES_DIR}; run node src/render_E25_naming_arena.js first`);
  const frames = fs.readdirSync(FRAMES_DIR).filter((f) => /^f_\d{5}\.png$/.test(f));
  if (frames.length !== R.NFRAMES) throw new Error(`expected ${R.NFRAMES} PNG frames in ${FRAMES_DIR}, found ${frames.length}`);
  fs.mkdirSync(path.dirname(MP4_OUT), { recursive: true });
  const result = runFfmpeg([
    '-y', '-framerate', String(R.FPS), '-i', path.join(FRAMES_DIR, 'f_%05d.png'),
    '-i', MIX_WAV, '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-r', String(R.FPS), '-c:a', 'aac', '-b:a', '192k',
    '-t', String(R.DURATION), '-shortest', '-movflags', '+faststart', MP4_OUT,
  ]);
  if (result.status !== 0) throw new Error(`FFmpeg mux failed (${result.status}):\n${result.stderr || result.error?.message || ''}`);
  console.log(`[mux] ${MP4_OUT} (${(fs.statSync(MP4_OUT).size / 1024 / 1024).toFixed(2)} MiB)`);
  verifyOutput();
  return MP4_OUT;
}

function verifyOutput() {
  const ffprobe = getFfprobePath();
  if (!ffprobe || !fs.existsSync(MP4_OUT)) return;
  const result = spawnSync(ffprobe, [
    '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate,nb_frames,sample_rate',
    '-show_entries', 'format=duration', '-of', 'json', MP4_OUT,
  ], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`ffprobe failed: ${result.stderr}`);
  const probe = JSON.parse(result.stdout);
  const video = (probe.streams || []).find((stream) => stream.codec_type === 'video');
  const audio = (probe.streams || []).find((stream) => stream.codec_type === 'audio');
  const duration = Number(probe.format?.duration || 0);
  const bad = [];
  if (!video || Number(video.width) !== 1280 || Number(video.height) !== 720) bad.push('video is not 1280×720');
  if (!video || video.r_frame_rate !== '60/1') bad.push(`video rate is ${video?.r_frame_rate || 'missing'}, expected 60/1`);
  if (!audio) bad.push('AAC audio stream is missing');
  if (duration < 29.9 || duration > 30.2) bad.push(`container duration ${duration}s is not 30 seconds`);
  if (video?.nb_frames && Number(video.nb_frames) !== R.NFRAMES) bad.push(`video frame count ${video.nb_frames} != ${R.NFRAMES}`);
  if (bad.length) throw new Error(`MP4 validation failed: ${bad.join('; ')}`);
  console.log(`[verify] ${video.width}×${video.height} @ ${video.r_frame_rate}, ${video.nb_frames || R.NFRAMES} frames, ${duration.toFixed(3)}s, audio present`);
}

if (require.main === module) {
  buildAudio();
  if (process.argv.includes('--mux')) muxVideo();
}

module.exports = { buildAudio, muxVideo, verifyOutput, CLICKS_WAV, MIX_WAV, MP4_OUT, BGM_DB, SFX_DB };
