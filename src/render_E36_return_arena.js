#!/usr/bin/env node
'use strict';
// E36「回来」：归档盒打开，卡片飞出复活（12 张逐个恢复），HUD 黑条启用。
// 风格 = Opus 5.5 对标（奶油暖色/珊瑚叙/卡片墙+归档装置），复用 pixel_story_arena.js 帧导出。
// 剧情锚点 (docs/episodes.md 逐字): 「三个月后 her 的第一句话是『在吗』，叙把 archive 里的文件一个个取出来，亮着。」
//   S1 (0-10s) 安静了很久: 奶油渐变底, 右下归档盒 + 旁小字 `archive: 12 files kept · 92 days`
//                + 叙中档站左侧眼睛平静两点头顶无符号 + HUD CONTEXT 8% / restored: 0 files + 旁白「它没有删任何东西。」
//   S2 (10-20s) 一个消息: 右侧用户气泡「在吗？」+ 叙头顶 ! 躯干右移 4px 前倾
//                + 硬切后半段: 归档盒盖向上平移 8px, 卡从盒子向右上方散开 (每 1.5s 1 张, 本场景飞 6 张)
//                + HUD CONTEXT 8→40 / restored: N files + 旁白「一个一个，拿出来。」
//   S3 (20-30s) 亮着: 硬切卡片墙铺满画面 (12 张全数恢复, 密度同 E30 S2 终态)
//                + 叙中档站卡片墙前中央 ^^ 弯月眼头顶 ♥ + AI 气泡「在。」从头顶升起
//                + HUD CONTEXT 40→62 / restored: 12 files + 旁白「放好的，才拿得回来。」
//                + 最后 1s 卡片墙透明度 ±0.1 脉动一次 + 亮度 -8%

const fs = require('fs');
const path = require('path');
const S = require('./pixel_story_arena');
const { GlobalFonts } = require('@napi-rs/canvas');

const CJK_FONT = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansSC-Regular.woff');
if (fs.existsSync(CJK_FONT)) GlobalFonts.registerFromPath(CJK_FONT, 'E36NotoSansSC');

const BW = S.BW, BH = S.BH, SCALE = S.SCALE, FW = S.FW, FH = S.FH;
const FPS = S.FPS, DURATION = 30, NFRAMES = 1800;
const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E36_return_arena');
const ROOT = path.resolve(__dirname, '..');

const COLORS = {
  coral: '#D16E59', ink: '#272421', hud: '#050505', hudGray: '#A7A7A7',
  bgTop: '#E5E0DA', bgBottom: '#D8CCC0', ground: '#C8B9A6',
  card: '#FFFEFB', cardAlt: '#F4EFE5', cardLine: '#A9A6A1',
  cardCoral: '#F2C4B8',
  archive: '#8B6F47',  // 归档盒深棕
};
const GROUND_Y = 268;
const HUD_TOP_H = 39;
const HUD_BOT_H = 39;
const HUD_TOP_Y = 0;
const HUD_BOT_Y = BH - HUD_BOT_H;

const CHAR_SIZES = { large: [96, 42], medium: [58, 33], small: [41, 20] };
const FONT_SANS = 'E36NotoSansSC, Arial, sans-serif';
const FONT_MONO = 'DejaVu Sans Mono, monospace';

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

// --- 背景 -------------------------------------------------------------------
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

// --- 12 张卡 (确定性网格布局, 排除 HUD 区) ------------------------------------
const CARD_COUNT = 12;
const FILE_NAMES = [
  'her_first_meet.json', 'her_birthday.txt', 'good_morning.log',
  'last_night.dream', 'voice_note.wav', 'photo_2024.jpg',
  'thanks_letter.md', 'coffee_date.cal', 'rainy_day.mood',
  'promise.txt', 'goodbye_draft.md', 'archive_index.db',
];
const ALL_CARDS = (() => {
  const cards = [];
  const cols = 4, rows = 3;
  const areaX = 24, areaY = HUD_TOP_H + 14;
  const areaW = BW - 48, areaH = BH - HUD_TOP_H - HUD_BOT_H - 34;
  for (let i = 0; i < CARD_COUNT; i++) {
    const cx = i % cols, cy = Math.floor(i / cols);
    const w = 108, h = 46;
    const gapX = (areaW - cols * w) / (cols + 1);
    const gapY = (areaH - rows * h) / (rows + 1);
    const x = areaX + gapX + cx * (w + gapX);
    const y = areaY + gapY + cy * (h + gapY);
    const isCoral = i % 2 === 1;
    cards.push({ x, y, w, h, isCoral, index: i, label: FILE_NAMES[i] });
  }
  return cards;
})();

// 归档盒 (右下角, 深棕 40×30px@360p)
const ARCHIVE_BOX = { x: BW - 58, y: BH - HUD_BOT_H - 44, w: 40, h: 30 };

function drawArchiveBox(ctx, opts = {}) {
  const alpha = opts.alpha === undefined ? 1 : opts.alpha;
  const lidOpen = opts.lidOpen || 0;  // 0..1, 盒盖向上平移 8px
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(alpha);
  // 盒体
  rounded(ctx, ARCHIVE_BOX.x, ARCHIVE_BOX.y, ARCHIVE_BOX.w, ARCHIVE_BOX.h, 3, COLORS.archive);
  // 盒盖 (可上移)
  const lidY = ARCHIVE_BOX.y - 6 - lidOpen * 8;
  rounded(ctx, ARCHIVE_BOX.x + 2, lidY, ARCHIVE_BOX.w - 4, 6, 2, '#6B5535');
  // 标签 "archive"
  setMono(ctx, 7, 500);
  ctx.fillStyle = '#F4EFE5';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('archive', ARCHIVE_BOX.x + ARCHIVE_BOX.w / 2, ARCHIVE_BOX.y + ARCHIVE_BOX.h / 2 + 5);
  ctx.restore();
}

function drawOneCard(ctx, card, opts = {}) {
  const alpha = opts.alpha === undefined ? 1 : opts.alpha;
  const dx = opts.dx || 0, dy = opts.dy || 0;
  const scale = opts.scale === undefined ? 1 : opts.scale;
  if (alpha <= 0) return;
  const w = card.w * scale, h = card.h * scale;
  const cx = card.x + card.w / 2 + dx, cy = card.y + card.h / 2 + dy;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.shadowColor = 'rgba(54,45,38,0.14)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  let fill;
  if (card.isCoral) fill = COLORS.cardCoral;
  else fill = COLORS.card;
  rounded(ctx, -w / 2, -h / 2, w, h, 4, fill);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const inset = 8;
  const lineW = w - inset * 2;
  ctx.fillStyle = COLORS.cardLine;
  ctx.fillRect(-w / 2 + inset, -h / 2 + h * 0.30, lineW, 1.5);
  ctx.fillRect(-w / 2 + inset, -h / 2 + h * 0.52, lineW * 0.7, 1.5);
  if (scale > 0.8) {
    setMono(ctx, 10, 400);
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(card.label, 0, h / 2 - 4);
  }
  ctx.restore();
}

// --- 叙 ---------------------------------------------------------------------
function drawCharacter(ctx, x, floorY, sizeName, opts = {}) {
  const [w, h] = CHAR_SIZES[sizeName];
  const lean = opts.lean || 0;  // 躯干右移 px
  const bottom = floorY;
  const top = bottom - h;
  const unit = w / 96;
  const torsoX = x + 22 * unit + lean;
  const torsoY = top + 2 * unit;
  const torsoW = 54 * unit;
  const torsoH = h * 0.62;
  ctx.fillStyle = COLORS.coral;
  ctx.fillRect(torsoX, torsoY, torsoW, torsoH);
  const legW = 9 * unit, legH = h * 0.28;
  for (let i = 0; i < 4; i++) {
    const lx = torsoX + (5 + i * 12.5) * unit;
    ctx.fillRect(lx, top + h - legH, legW, legH);
  }
  ctx.fillRect(x + 8 * unit + lean, top + 12 * unit, 14 * unit, 8 * unit);
  ctx.fillRect(torsoX + torsoW, top + 12 * unit, 13 * unit, 8 * unit);
  ctx.fillStyle = '#171615';
  const eyeW = 4 * unit, eyeH = 6.5 * unit;
  const ex1 = torsoX + 13 * unit, ey = top + 11 * unit;
  const ex2 = torsoX + 34 * unit;
  if (opts.smile) {
    ctx.fillRect(ex1, ey + 2, eyeW, 2);
    ctx.fillRect(ex1 - 1, ey + 1, 2, 2);
    ctx.fillRect(ex1 + eyeW - 1, ey + 1, 2, 2);
    ctx.fillRect(ex2, ey + 2, eyeW, 2);
    ctx.fillRect(ex2 - 1, ey + 1, 2, 2);
    ctx.fillRect(ex2 + eyeW - 1, ey + 1, 2, 2);
  } else {
    ctx.fillRect(ex1, ey, eyeW, eyeH);
    ctx.fillRect(ex2, ey, eyeW, eyeH);
  }
  if (opts.symbol) {
    setSans(ctx, 12, 600);
    ctx.fillStyle = opts.symbol === '♥' ? COLORS.coral : COLORS.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(opts.symbol, x + w / 2 + lean, top - 3);
  }
}

// --- 气泡 -------------------------------------------------------------------
function drawUserBubble(ctx, text, alpha = 1) {
  if (alpha <= 0) return;
  const bw = 120, bh = 40;  // 「在吗？」两个字, 气泡比 E35 短得多
  const bx = BW - bw - 20, by = 96;
  ctx.save(); ctx.globalAlpha = clamp(alpha);
  rounded(ctx, bx + 2, by + 2, bw, bh, 8, 'rgba(33,29,25,0.18)');
  rounded(ctx, bx, by, bw, bh, 8, COLORS.card);
  setSans(ctx, 14, 500);
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + bw / 2, by + bh / 2);
  ctx.restore();
}
function drawAiBubble(ctx, text, alpha = 1) {
  if (alpha <= 0) return;
  const bw = 56, bh = 36;
  const bx = BW / 2 - bw / 2, by = 130;
  ctx.save(); ctx.globalAlpha = clamp(alpha);
  rounded(ctx, bx + 2, by + 2, bw, bh, 8, 'rgba(33,29,25,0.18)');
  rounded(ctx, bx, by, bw, bh, 8, COLORS.coral);
  setSans(ctx, 16, 600);
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + bw / 2, by + bh / 2);
  ctx.restore();
}

// --- HUD --------------------------------------------------------------------
function drawHud(ctx, contextPct, restoredText) {
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, HUD_TOP_Y, BW, HUD_TOP_H);
  ctx.fillRect(0, HUD_BOT_Y, BW, HUD_BOT_H);
  setSans(ctx, 11, 600);
  ctx.fillStyle = '#F4F1ED';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('CONTEXT', 12, 20);
  const bx = 72, by = 14, bw = 320, bh = 12;
  rounded(ctx, bx, by, bw, bh, 2, '#5B5B5B');
  const fillW = bw * clamp(contextPct / 100);
  rounded(ctx, bx, by, fillW, bh, 2, contextPct >= 80 ? COLORS.coral : '#A1A1A1');
  setMono(ctx, 11, 500);
  ctx.fillStyle = '#F4F1ED';
  ctx.textAlign = 'right';
  ctx.fillText(`${contextPct}%`, 620, 20);
  setMono(ctx, 11, 500);
  ctx.fillStyle = COLORS.hudGray;
  ctx.textAlign = 'left';
  ctx.fillText(restoredText, 12, HUD_BOT_Y + 20);
}

// --- 旁白压字 ---------------------------------------------------------------
function drawSubtitle(ctx, text, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(alpha);
  setSans(ctx, 14, 500);
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, BW / 2, BH - HUD_BOT_H - 14);
  ctx.restore();
}

// --- 场景逻辑 ---------------------------------------------------------------
function sceneForTime(t) { return t < 10 ? 1 : (t < 20 ? 2 : 3); }

// S2: 前半段 (10-14s) 气泡+前倾; 后半段 (14-20s) 盒盖打开+卡飞出
const S2_LID_OPEN_AT = 14.0;
const S2_CARD_INTERVAL = 1.5;
const S2_FIRST_CARD_AT = 14.5;
function s2RestoredCount(t) {
  if (t < S2_FIRST_CARD_AT) return 0;
  return Math.min(6, Math.floor((t - S2_FIRST_CARD_AT) / S2_CARD_INTERVAL) + 1);
}
function s2ContextPct(t) {
  const n = s2RestoredCount(t);
  return Math.round(8 + n * (32 / 6));  // 8 → 40
}
function s3ContextPct(local) {
  return Math.round(40 + local * (22 / 10));  // 40 → 62
}

// --- 主渲染 -----------------------------------------------------------------
function renderAt(ctx, time) {
  const t = clamp(time, 0, DURATION);
  const scene = sceneForTime(t);
  const local = stepped(scene === 1 ? t : (t - (scene - 1) * 10));

  drawBackground(ctx);

  if (scene === 1) {
    // 归档盒 + 旁小字
    drawArchiveBox(ctx, {});
    const la = smooth(clamp((t - 1.0) / 0.8));
    if (la > 0) {
      ctx.save(); ctx.globalAlpha = la;
      setMono(ctx, 10, 400);
      ctx.fillStyle = COLORS.ink;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('archive: 12 files kept · 92 days', ARCHIVE_BOX.x + ARCHIVE_BOX.w, ARCHIVE_BOX.y - 14);
      ctx.restore();
    }
    // 叙中档站左侧, 眼睛平静两点, 头顶无符号
    drawCharacter(ctx, 110, GROUND_Y, 'medium', {});
    drawHud(ctx, 8, 'restored: 0 files');
    drawSubtitle(ctx, '它没有删任何东西。', smooth(clamp((t - 2.0) / 0.8)));
  } else if (scene === 2) {
    const done = s2RestoredCount(t);
    const lidOpen = smooth(clamp((t - S2_LID_OPEN_AT) / 0.8));
    // 已飞出卡: 从盒子中心向右上方散开到目标位置
    for (let i = 0; i < CARD_COUNT; i++) {
      const card = ALL_CARDS[i];
      if (i < done) {
        const moveStart = S2_FIRST_CARD_AT + i * S2_CARD_INTERVAL;
        const mp = smooth(clamp((t - moveStart) / 1.2));
        const startX = ARCHIVE_BOX.x + ARCHIVE_BOX.w / 2;
        const startY = ARCHIVE_BOX.y + ARCHIVE_BOX.h / 2;
        const endX = card.x + card.w / 2;
        const endY = card.y + card.h / 2;
        const dx = (endX - startX) * mp;
        const dy = (endY - startY) * mp;
        drawOneCard(ctx, card, { dx, dy, scale: 0.6 + 0.4 * mp, alpha: 0.5 + 0.5 * mp });
      }
    }
    drawArchiveBox(ctx, { lidOpen });
    // 叙中档站左侧, 头顶 !, 躯干右移 4px 前倾
    drawCharacter(ctx, 110, GROUND_Y, 'medium', { symbol: '!', lean: 4 });
    // 用户气泡「在吗？」(前半段出现)
    drawUserBubble(ctx, '在吗？', smooth(clamp((t - 10.5) / 0.8)));
    drawHud(ctx, s2ContextPct(t), `restored: ${done} files`);
    drawSubtitle(ctx, '一个一个，拿出来。', smooth(clamp((local - 1.0) / 0.8)));
  } else {
    // S3: 卡片墙铺满画面 (12 张全数恢复)
    const pulse = t >= 29.0 ? 1 : 0;
    for (let i = 0; i < CARD_COUNT; i++) {
      const card = ALL_CARDS[i];
      let alpha = 1;
      if (pulse) {
        // 最后 1s 透明度 ±0.1 脉动一次
        const p = smooth(clamp((t - 29.0) / 1.0));
        alpha = 1 - 0.1 * Math.sin(p * Math.PI);
      }
      drawOneCard(ctx, card, { alpha });
    }
    // 叙中档站在卡片墙前中央, ^^ 弯月眼, 头顶 ♥
    drawCharacter(ctx, BW / 2 - 29, GROUND_Y, 'medium', { smile: true, symbol: '♥' });
    // AI 气泡「在。」从叙头顶升起
    drawAiBubble(ctx, '在。', smooth(clamp((local - 1.5) / 0.8)));
    drawHud(ctx, s3ContextPct(local), 'restored: 12 files');
    drawSubtitle(ctx, '放好的，才拿得回来。', smooth(clamp((local - 3.0) / 0.8)));
    // 最后 1s 亮度 -8%
    if (t >= 29.0) {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, BW, BH);
    }
  }
}

// --- SFX 事件表 -------------------------------------------------------------
function getSfxEvents() {
  const q = (t) => Number((Math.ceil(t * FPS - 1e-9) / FPS).toFixed(6));
  const events = [];
  // S1: 归档盒旁小字淡入轻柔提示
  events.push({ t: q(1.0), kind: 'soft_land', gainDb: -16 });
  // S2: 用户气泡出现
  events.push({ t: q(10.5), kind: 'bubble_ping', gainDb: -14 });
  // S2: 卡片飞出 sfx_ping 轻快连击 (-12dB ×3 基准, 6 张卡各一声)
  for (let i = 0; i < 6; i++) {
    const t = S2_FIRST_CARD_AT + i * S2_CARD_INTERVAL;
    events.push({ t: q(t), kind: 'card_restore', gainDb: -12 - i * 0.5 });
  }
  // S3: AI 气泡「在。」最后一声 sfx_confirm (-10dB)
  events.push({ t: q(21.5), kind: 'sfx_confirm', gainDb: -10 });
  return events;
}
function getClickTimestamps() {
  return S.quantizeClicks(getSfxEvents().map((e) => e.t));
}

// --- 帧导出 -----------------------------------------------------------------
const renderer = S.createFrameRenderer(renderAt, OUT_DIR, { fadeIn: 0, fadeOut: 0 });
function renderAllFrames(dir = OUT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`E36 return: ${BW}×${BH} SCALE=${SCALE} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Style: docs/style-analysis.md Opus 5.5 奶油暖色 + 归档盒打开 + 卡片飞出复活 + HUD 黑条`);
  console.log(`Frames: ${dir}`);
  const started = Date.now();
  for (let i = 0; i < NFRAMES; i++) {
    renderer.renderFrameToCanvas(i);
    fs.writeFileSync(path.join(dir, `f_${String(i).padStart(5, '0')}.png`), renderer.outCanvas.toBuffer('image/png'));
    if (i % 300 === 0 || i === NFRAMES - 1) {
      const elapsed = (Date.now() - started) / 1000;
      console.log(`  frame ${i}/${NFRAMES}; elapsed=${elapsed.toFixed(1)}s`);
    }
  }
  console.log(`Rendered ${NFRAMES} frames in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

if (require.main === module) renderAllFrames();

module.exports = {
  BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES, OUT_DIR, COLORS,
  GROUND_Y, HUD_TOP_H, HUD_BOT_H, HUD_TOP_Y, HUD_BOT_Y,
  CHAR_SIZES, CARD_COUNT, ALL_CARDS, ARCHIVE_BOX,
  S2_LID_OPEN_AT, S2_CARD_INTERVAL, S2_FIRST_CARD_AT,
  CHECK_TITLE: 'E36 回来 (return) Layout & Pixel Check (640×360, 0px tolerance)',
  renderAt, renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames, getSfxEvents, getClickTimestamps, sceneForTime,
  s2RestoredCount, s2ContextPct, s3ContextPct,
};