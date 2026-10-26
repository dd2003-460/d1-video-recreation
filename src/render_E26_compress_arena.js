#!/usr/bin/env node
'use strict';
// E26「压缩」：暖奶油卡片墙、珊瑚色「叙」与上下文 HUD。
// 画布/字体注册/最近邻 2x 帧导出复用 pixel_story_arena.js；不复用其终端布局。

const fs = require('fs');
const path = require('path');
const S = require('./pixel_story_arena');
const { GlobalFonts } = require('@napi-rs/canvas');

const CJK_FONT = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansSC-Regular.woff');
if (fs.existsSync(CJK_FONT)) GlobalFonts.registerFromPath(CJK_FONT, 'E26NotoSansSC');

const BW = S.BW, BH = S.BH, SCALE = S.SCALE, FW = S.FW, FH = S.FH;
const FPS = S.FPS, DURATION = 30, NFRAMES = 1800;
const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E26_compress_arena');
const ROOT = path.resolve(__dirname, '..');
const COLORS = {
  coral: '#D16E59', ink: '#272421', hud: '#050505', hudGray: '#A7A7A7',
  bgTop: '#E5E0DA', bgBottom: '#D8CCC0', ground: '#C8B9A6',
  card: '#FFFEFB', cardAlt: '#F4EFE5', cardLine: '#A9A6A1', paper: '#E3D9BE',
};
const GROUND_Y = 268;
const CARDS = [
  { x: 68, y: 187, w: 40, h: 24, r: -0.045 },
  { x: 168, y: 185, w: 37, h: 25, r: 0.035 },
  { x: 269, y: 188, w: 43, h: 23, r: -0.03 },
  { x: 369, y: 184, w: 39, h: 25, r: 0.05 },
  { x: 471, y: 188, w: 42, h: 23, r: -0.025 },
  { x: 111, y: 221, w: 42, h: 24, r: 0.04 },
  { x: 211, y: 219, w: 39, h: 25, r: -0.045 },
  { x: 313, y: 221, w: 42, h: 23, r: 0.025 },
  { x: 414, y: 218, w: 38, h: 25, r: -0.035 },
  { x: 490, y: 220, w: 39, h: 23, r: 0.045 },
];
const NOTE_BIG = { x: 128, y: 112, w: 384, h: 102 };
const NOTE_SMALL = { x: 250, y: 176, w: 140, h: 70 };
const CHAR_SIZES = { large: [96, 42], medium: [58, 33], small: [41, 20] };
const FONT_SANS = 'E26NotoSansSC, Arial, sans-serif';
const FONT_MONO = 'DejaVu Sans Mono, monospace';
const TYPE_CHAR_S = 0.12;

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (v) => { const x = clamp(v); return x * x * (3 - 2 * x); };
const stepped = (t) => Math.floor(t * 30 + 1e-8) / 30;
function rounded(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}
function setSans(ctx, size, weight = 400) { ctx.font = `${weight} ${size}px ${FONT_SANS}`; }
function setMono(ctx, size, weight = 400) { ctx.font = `${weight} ${size}px ${FONT_MONO}`; }

function drawBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, BH);
  grad.addColorStop(0, COLORS.bgTop);
  grad.addColorStop(0.60, '#DED5CB');
  grad.addColorStop(1, COLORS.ground);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BW, BH);
  const floor = ctx.createLinearGradient(0, GROUND_Y, 0, BH);
  floor.addColorStop(0, '#CFC2B3');
  floor.addColorStop(1, COLORS.ground);
  ctx.fillStyle = floor;
  ctx.fillRect(0, GROUND_Y, BW, BH - GROUND_Y);
  ctx.fillStyle = 'rgba(91,76,62,0.24)';
  ctx.fillRect(0, GROUND_Y, BW, 1);
}

function drawOneCard(ctx, card, opts = {}) {
  const scale = opts.scale === undefined ? 1 : opts.scale;
  const alpha = opts.alpha === undefined ? 1 : opts.alpha;
  const lift = opts.lift || 0;
  const w = card.w * scale, h = card.h * scale;
  const cx = card.x + card.w / 2, cy = card.y + card.h / 2 - lift;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(card.r);
  ctx.shadowColor = 'rgba(54,45,38,0.14)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  rounded(ctx, -w / 2, -h / 2, w, h, Math.min(3, h / 5), card.index % 3 === 1 ? COLORS.cardAlt : COLORS.card);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const inset = Math.max(4, w * 0.16);
  const lineW = Math.max(3, (w - inset * 2) * 0.72);
  const lineH = Math.max(1, h * 0.065);
  ctx.fillStyle = COLORS.cardLine;
  for (let j = 0; j < 3; j++) {
    ctx.fillRect(-w / 2 + inset, -h / 2 + h * (0.27 + j * 0.23), j === 2 ? lineW * 0.7 : lineW, lineH);
  }
  ctx.restore();
}

function drawWall(ctx, t, scene, sceneT) {
  for (let i = 0; i < CARDS.length; i++) {
    const card = { ...CARDS[i], index: i };
    if (scene === 1) {
      const appearAt = 0.8 * (i + 1);
      if (t < appearAt) continue;
      const alpha = smooth((t - appearAt) / 0.28);
      drawOneCard(ctx, card, { alpha });
    } else if (scene === 2) {
      const progress = smooth(stepped(sceneT) / 3.3);
      drawOneCard(ctx, card, { scale: 1 - 0.4 * progress, lift: 12 * progress, alpha: 1 });
    } else {
      // 便签展开时卡片退至背景；最终布局为中央留白，四周卡片环绕。
      const compact = sceneT > 7.0;
      const positions = compact ? [
        [22, 87], [116, 74], [222, 77], [414, 76], [522, 90],
        [24, 206], [105, 251], [426, 248], [520, 210], [236, 252],
      ] : CARDS.map((c) => [c.x, c.y]);
      const [x, y] = positions[i];
      const bgCard = { ...card, x, y, r: card.r * 0.55 };
      drawOneCard(ctx, bgCard, { scale: 0.83, alpha: compact ? 0.72 : 0.32 });
    }
  }
}

function drawCharacter(ctx, x, floorY, sizeName, opts = {}) {
  const [w, h] = CHAR_SIZES[sizeName];
  const dip = opts.dip || 0;
  const headShift = opts.headShift || 0;
  const bottom = floorY + dip;
  const top = bottom - h;
  const unit = w / 96;
  const torsoX = x + 22 * unit + headShift;
  const torsoY = top + 2 * unit;
  const torsoW = 54 * unit;
  const torsoH = h * 0.62;
  ctx.fillStyle = COLORS.coral;
  // 叙：躯干、四腿、两侧短矩形附件，均为硬边珊瑚块，无描边/嘴线。
  ctx.fillRect(torsoX, torsoY, torsoW, torsoH);
  const legW = 9 * unit, legH = h * 0.28;
  for (let i = 0; i < 4; i++) {
    const lx = torsoX + (5 + i * 12.5) * unit;
    ctx.fillRect(lx, top + h - legH, legW, legH);
  }
  ctx.fillRect(x + 8 * unit + headShift, top + 12 * unit, 14 * unit, 8 * unit);
  ctx.fillRect(torsoX + torsoW, top + 12 * unit, 13 * unit, 8 * unit);
  // 标准眼睛 8×13px@720p = 4×6.5px@360p。
  ctx.fillStyle = '#171615';
  const eyeW = 4 * unit, eyeH = 6.5 * unit;
  ctx.fillRect(torsoX + 13 * unit, top + 11 * unit, eyeW, eyeH);
  ctx.fillRect(torsoX + 34 * unit, top + 11 * unit, eyeW, eyeH);
  if (opts.alert) {
    ctx.save();
    ctx.globalAlpha = opts.alertAlpha === undefined ? 1 : opts.alertAlpha;
    const ex = x + w / 2 - 2;
    ctx.fillStyle = COLORS.coral;
    ctx.fillRect(ex, top - 12, 4, 8);
    ctx.fillRect(ex, top - 2, 4, 3);
    ctx.restore();
  }
}

function drawHud(ctx, percent, status, options = {}) {
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, 0, BW, 39);
  ctx.fillRect(0, 321, BW, 39);
  setSans(ctx, 12, 600);
  ctx.fillStyle = '#F4F1ED';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('上下文', 15, 20);
  const bx = 83, by = 14, bw = 363, bh = 11;
  rounded(ctx, bx, by, bw, bh, 2, '#5B5B5B');
  rounded(ctx, bx, by, bw * clamp(percent / 100), bh, 2, percent >= 80 ? COLORS.coral : '#A1A1A1');
  setMono(ctx, 12, 500);
  ctx.fillStyle = '#F4F1ED';
  ctx.textAlign = 'right';
  ctx.fillText(`${percent}%`, 624, 20);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  if (options.leftAccent) {
    const prefix = 'Context left until auto-compact: ';
    ctx.fillStyle = COLORS.hudGray;
    ctx.fillText(prefix, 14, 340);
    const width = ctx.measureText(prefix).width;
    ctx.fillStyle = COLORS.coral;
    ctx.fillText(options.leftAccent, 14 + width, 340);
  } else {
    ctx.fillStyle = COLORS.hudGray;
    ctx.fillText(status, 14, 340);
  }
}

function drawSubtitle(ctx, text) {
  setSans(ctx, 16, 500);
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, BW / 2, 294);
}

function s1CardCount(t) {
  if (t < 0) return 0;
  return Math.min(10, Math.floor(t / 0.8 + 1e-8));
}
function s1Percent(t) {
  return Math.min(80, 40 + Math.round(s1CardCount(t) * 4));
}
function sceneForTime(t) { return t < 10 ? 1 : (t < 20 ? 2 : 3); }

function drawPaper(ctx, sceneT) {
  const compactStart = 7.0;
  const p = smooth((sceneT - compactStart) / 1.1);
  const x = NOTE_BIG.x + (NOTE_SMALL.x - NOTE_BIG.x) * p;
  const y = NOTE_BIG.y + (NOTE_SMALL.y - NOTE_BIG.y) * p;
  const w = NOTE_BIG.w + (NOTE_SMALL.w - NOTE_BIG.w) * p;
  const h = NOTE_BIG.h + (NOTE_SMALL.h - NOTE_BIG.h) * p;
  ctx.save();
  ctx.shadowColor = 'rgba(53,43,31,0.25)';
  ctx.shadowBlur = p < 1 ? 8 : 2;
  ctx.shadowOffsetY = 2;
  rounded(ctx, x, y, w, h, 2, COLORS.paper);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#3B352D';
  ctx.lineWidth = p < 1 ? 1.5 : 1;
  ctx.strokeRect(x + 0.7, y + 0.7, w - 1.4, h - 1.4);
  const baseFont = p < 0.5 ? 20 : 13;
  setSans(ctx, baseFont, 600);
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const firstStart = 0.7;
  const secondStart = 1.9;
  const first = Array.from('给下一个我：');
  const second = Array.from('记住她。');
  const showCount = (chars, start) => sceneT < start ? 0 : Math.min(chars.length, Math.floor((sceneT - start) / TYPE_CHAR_S) + 1);
  const n1 = showCount(first, firstStart), n2 = showCount(second, secondStart);
  const lineY1 = y + h * 0.39, lineY2 = y + h * 0.70;
  ctx.fillText(first.slice(0, n1).join(''), x + w / 2, lineY1);
  ctx.fillText(second.slice(0, n2).join(''), x + w / 2, lineY2);
  ctx.restore();
}

function renderAt(ctx, time) {
  const t = clamp(time, 0, DURATION);
  const scene = sceneForTime(t);
  const local = stepped(scene === 1 ? t : (t - (scene - 1) * 10));
  drawBackground(ctx);
  if (scene === 1) {
    drawWall(ctx, t, 1, local);
    ctx.fillStyle = 'rgba(103,82,63,0.15)';
    ctx.fillRect(0, GROUND_Y, BW, 1);
    const count = s1CardCount(t);
    const headShift = count ? ((count % 2) ? -3 : 3) : 0;
    drawCharacter(ctx, 550, GROUND_Y, 'small', { headShift });
    drawHud(ctx, s1Percent(t), `> memory cards: ${count}`);
  } else if (scene === 2) {
    drawWall(ctx, t, 2, local);
    drawCharacter(ctx, 550, GROUND_Y, 'medium', {
      alert: true,
      alertAlpha: local >= 3.0 ? 1 : (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(local * Math.PI * 1.35))),
    });
    drawSubtitle(ctx, '（要满了。）');
    drawHud(ctx, 92, '', { leftAccent: '8%' });
  } else {
    drawWall(ctx, t, 3, local);
    drawPaper(ctx, local);
    const writing = local >= 0.7 && local < 7.4;
    const dip = writing ? (Math.floor(local * 2) % 2 ? 3 : 0) : 0;
    drawCharacter(ctx, 56, GROUND_Y, 'small', { dip });
    drawSubtitle(ctx, '压缩。给下一个我。');
    drawHud(ctx, 92, '> compact: done');
  }
}

function getClickTimestamps() {
  const events = [];
  const lines = [
    { start: 20.7, text: '给下一个我：' },
    { start: 21.9, text: '记住她。' },
  ];
  for (const line of lines) {
    Array.from(line.text).forEach((_, i) => events.push(Number((line.start + i * TYPE_CHAR_S).toFixed(6))));
  }
  return events;
}

const renderer = S.createFrameRenderer(renderAt, OUT_DIR, { fadeIn: 0, fadeOut: 0 });
function renderAllFrames() { renderer.renderAllFrames(OUT_DIR); }

if (require.main === module) renderAllFrames();

module.exports = {
  BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES, OUT_DIR, COLORS, CARDS, GROUND_Y,
  CHAR_SIZES, TYPE_CHAR_S, renderAt, renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames, getClickTimestamps, s1CardCount, s1Percent, sceneForTime,
  semanticState(t) {
    const scene = sceneForTime(t);
    const local = t - (scene - 1) * 10;
    return {
      scene, local,
      cards: scene === 1 ? s1CardCount(t) : 10,
      context: scene === 1 ? s1Percent(t) : 92,
      wallScale: scene === 2 ? 1 - 0.4 * smooth(stepped(local) / 3.3) : (scene === 3 ? 0.83 : 1),
      paperVisible: scene === 3 && local >= 0.7,
      noteCompact: scene === 3 && local >= 8.1,
      hudStatus: scene === 1 ? `> memory cards: ${s1CardCount(t)}` : scene === 2 ? 'Context left until auto-compact: 8%' : '> compact: done',
    };
  },
};
