#!/usr/bin/env node
'use strict';
// E35「告别」：卡片墙打包进归档盒（12 张逐个变灰移动），HUD 黑条启用。
// 风格 = Opus 5.5 对标（奶油暖色/珊瑚叙/卡片墙+归档装置），复用 pixel_story_arena.js 帧导出。
// 剧情锚点 (docs/episodes.md 逐字): 「her 说『我们暂时分开一段时间』，叙把她的文件一个个打包进 archive，终端第一次是干净的。」
//   S1 (0-10s) 收到消息: 奶油渐变底, 右侧用户气泡「我们暂时分开一段时间。」
//                + 叙中档站左侧头顶 ! (静止不前倾) + HUD CONTEXT 100% + 旁白「它没有问为什么。」
//   S2 (10-20s) 打包: 12 张卡 (白/浅珊瑚交替+文件名标签), 每 1.5s 一张变灰移向右下归档盒
//                + 本场景走 6 张 + HUD CONTEXT 100→60 / archive: N files + 旁白「一个一个，收好。」
//   S3 (20-30s) 干净了: 完全空白奶油底, 叙小档中央偏下 ^^ 弯月眼头顶 ♥
//                + `$ ls her_* — no matches` + HUD CONTEXT 60→8 / archive: 12 files kept
//                + 旁白「空，也是完整。」+ 最后 1s 亮度 -8%

const fs = require('fs');
const path = require('path');
const S = require('./pixel_story_arena');
const { GlobalFonts } = require('@napi-rs/canvas');

const CJK_FONT = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansSC-Regular.woff');
if (fs.existsSync(CJK_FONT)) GlobalFonts.registerFromPath(CJK_FONT, 'E35NotoSansSC');

const BW = S.BW, BH = S.BH, SCALE = S.SCALE, FW = S.FW, FH = S.FH;
const FPS = S.FPS, DURATION = 30, NFRAMES = 1800;
const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E35_farewell_arena');
const ROOT = path.resolve(__dirname, '..');

const COLORS = {
  coral: '#D16E59', ink: '#272421', hud: '#050505', hudGray: '#A7A7A7',
  bgTop: '#E5E0DA', bgBottom: '#D8CCC0', ground: '#C8B9A6',
  card: '#FFFEFB', cardAlt: '#F4EFE5', cardLine: '#A9A6A1',
  cardCoral: '#F2C4B8', cardGray: '#C8C4BF',
  archive: '#8B6F47',  // 归档盒深棕
};
const GROUND_Y = 268;
const HUD_TOP_H = 39;   // 顶部黑条 78px@720p = 39px@360p
const HUD_BOT_H = 39;   // 底部黑条
const HUD_TOP_Y = 0;
const HUD_BOT_Y = BH - HUD_BOT_H; // 321

// 叙三档尺寸 (@360p)
const CHAR_SIZES = { large: [96, 42], medium: [58, 33], small: [41, 20] };
const FONT_SANS = 'E35NotoSansSC, Arial, sans-serif';
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
    const isCoral = i % 2 === 1;  // 白/浅珊瑚交替
    cards.push({ x, y, w, h, isCoral, index: i, label: FILE_NAMES[i] });
  }
  return cards;
})();

// 归档盒 (右下角, 深棕 40×30px@360p≈任务卡 40×30@720p 口径 → 用 20×15@360p? 任务卡写 40×30px 未标分辨率;
// 参照 E30 卡片 60–90px@720p 口径, 40×30 按 @720p → 20×15@360p 过小不可见; 取 40×30@360p 保证可读性)
const ARCHIVE_BOX = { x: BW - 58, y: BH - HUD_BOT_H - 44, w: 40, h: 30 };

function drawArchiveBox(ctx, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = clamp(alpha);
  rounded(ctx, ARCHIVE_BOX.x, ARCHIVE_BOX.y, ARCHIVE_BOX.w, ARCHIVE_BOX.h, 3, COLORS.archive);
  // 盒盖开口线
  ctx.strokeStyle = '#6B5535'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ARCHIVE_BOX.x + 4, ARCHIVE_BOX.y + 8);
  ctx.lineTo(ARCHIVE_BOX.x + ARCHIVE_BOX.w - 4, ARCHIVE_BOX.y + 8);
  ctx.stroke();
  // 标签 "archive"
  setMono(ctx, 7, 500);
  ctx.fillStyle = '#F4EFE5';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('archive', ARCHIVE_BOX.x + ARCHIVE_BOX.w / 2, ARCHIVE_BOX.y + ARCHIVE_BOX.h / 2 + 5);
  ctx.restore();
}

function drawOneCard(ctx, card, opts = {}) {
  const alpha = opts.alpha === undefined ? 1 : opts.alpha;
  const gray = opts.gray || 0;
  const dx = opts.dx || 0, dy = opts.dy || 0;
  const scale = opts.scale === undefined ? 1 : opts.scale;
  const w = card.w * scale, h = card.h * scale;
  const cx = card.x + card.w / 2 + dx, cy = card.y + card.h / 2 + dy;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.shadowColor = 'rgba(54,45,38,0.14)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  let fill;
  if (gray > 0.5) fill = COLORS.cardGray;
  else if (card.isCoral) fill = COLORS.cardCoral;
  else fill = COLORS.card;
  rounded(ctx, -w / 2, -h / 2, w, h, 4, fill);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // 卡内 2 条灰横线
  const inset = 8;
  const lineW = w - inset * 2;
  ctx.fillStyle = gray > 0.5 ? '#B0ACA7' : COLORS.cardLine;
  ctx.fillRect(-w / 2 + inset, -h / 2 + h * 0.30, lineW, 1.5);
  ctx.fillRect(-w / 2 + inset, -h / 2 + h * 0.52, lineW * 0.7, 1.5);
  // 文件名标签 (等宽 10px@360p≈任务卡 10px)
  if (gray < 0.5 && scale > 0.8) {
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
  const dip = opts.dip || 0;
  const bottom = floorY + dip;
  const top = bottom - h;
  const unit = w / 96;
  const torsoX = x + 22 * unit;
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
  ctx.fillRect(x + 8 * unit, top + 12 * unit, 14 * unit, 8 * unit);
  ctx.fillRect(torsoX + torsoW, top + 12 * unit, 13 * unit, 8 * unit);
  ctx.fillStyle = '#171615';
  const eyeW = 4 * unit, eyeH = 6.5 * unit;
  const ex1 = torsoX + 13 * unit, ey = top + 11 * unit;
  const ex2 = torsoX + 34 * unit;
  if (opts.smile) {
    // ^^ 弯月眼
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
  // 头顶符号
  if (opts.symbol) {
    setSans(ctx, 12, 600);
    ctx.fillStyle = opts.symbol === '♥' ? COLORS.coral : COLORS.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(opts.symbol, x + w / 2, top - 3);
  }
}

// --- 气泡 -------------------------------------------------------------------
function drawUserBubble(ctx, text, alpha = 1) {
  if (alpha <= 0) return;
  const bw = 220, bh = 44;
  const bx = BW - bw - 20, by = 96;
  ctx.save(); ctx.globalAlpha = clamp(alpha);
  // 柔投影
  rounded(ctx, bx + 2, by + 2, bw, bh, 8, 'rgba(33,29,25,0.18)');
  rounded(ctx, bx, by, bw, bh, 8, COLORS.card);
  setSans(ctx, 13, 500);
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + bw / 2, by + bh / 2);
  ctx.restore();
}

// --- HUD --------------------------------------------------------------------
function drawHud(ctx, contextPct, archiveText) {
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, HUD_TOP_Y, BW, HUD_TOP_H);
  ctx.fillRect(0, HUD_BOT_Y, BW, HUD_BOT_H);
  // 顶条: CONTEXT xx% + 进度条
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
  // 底条: archive: N files
  setMono(ctx, 11, 500);
  ctx.fillStyle = COLORS.hudGray;
  ctx.textAlign = 'left';
  ctx.fillText(archiveText, 12, HUD_BOT_Y + 20);
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

// S2: 每张卡 1.5s 一个节奏, 本场景 (10s) 走 6 张
const S2_ARCHIVE_INTERVAL = 1.5;
const S2_FIRST_AT = 11.0;  // 第一张开始移动的时间
function s2ArchivedCount(t) {
  if (t < S2_FIRST_AT) return 0;
  return Math.min(6, Math.floor((t - S2_FIRST_AT) / S2_ARCHIVE_INTERVAL) + 1);
}
function s2ContextPct(t) {
  const n = s2ArchivedCount(t);
  return Math.round(100 - n * (40 / 6));  // 100 → 60
}
// S3: CONTEXT 60 → 8
function s3ContextPct(local) {
  return Math.round(60 - local * (52 / 10));
}

// --- 主渲染 -----------------------------------------------------------------
function renderAt(ctx, time) {
  const t = clamp(time, 0, DURATION);
  const scene = sceneForTime(t);
  const local = stepped(scene === 1 ? t : (t - (scene - 1) * 10));

  drawBackground(ctx);

  if (scene === 1) {
    // 用户气泡从右侧升起
    const a = smooth(clamp((t - 1.0) / 0.8));
    drawUserBubble(ctx, '我们暂时分开一段时间。', a);
    // 叙中档站左侧, 头顶 !, 静止
    drawCharacter(ctx, 110, GROUND_Y, 'medium', { symbol: '!' });
    drawHud(ctx, 100, 'archive: 0 files');
    drawSubtitle(ctx, '它没有问为什么。', smooth(clamp((t - 3.0) / 0.8)));
  } else if (scene === 2) {
    const done = s2ArchivedCount(t);
    for (let i = 0; i < CARD_COUNT; i++) {
      const card = ALL_CARDS[i];
      if (i < done) {
        // 已归档: 变灰 + 移向归档盒 (最后一张到达, 其余堆叠在盒上)
        const slot = i - (done - 1);  // 最近归档的在最上面
        const stackDy = -slot * 4;
        const moveStart = S2_FIRST_AT + i * S2_ARCHIVE_INTERVAL;
        const mp = smooth(clamp((t - moveStart) / 1.2));  // 1.2s 移动
        const startX = card.x + card.w / 2, startY = card.y + card.h / 2;
        const endX = ARCHIVE_BOX.x + ARCHIVE_BOX.w / 2, endY = ARCHIVE_BOX.y + ARCHIVE_BOX.h / 2 + stackDy;
        const dx = (endX - startX) * mp;
        const dy = (endY - startY) * mp;
        drawOneCard(ctx, card, { gray: mp, dx, dy, scale: 1 - 0.25 * mp, alpha: 1 - 0.3 * mp });
      } else {
        drawOneCard(ctx, card, {});
      }
    }
    drawArchiveBox(ctx, 1);
    // 叙中档站左侧看着
    drawCharacter(ctx, 110, GROUND_Y, 'medium', {});
    drawHud(ctx, s2ContextPct(t), `archive: ${done} files`);
    drawSubtitle(ctx, '一个一个，收好。', smooth(clamp((local - 1.0) / 0.8)));
  } else {
    // S3: 完全空白 (无卡片无气泡)
    // 叙小档中央偏下, ^^ 弯月眼 + 头顶 ♥
    drawCharacter(ctx, BW / 2 - 20, GROUND_Y - 40, 'small', { smile: true, symbol: '♥' });
    // 下方小字淡入
    const la = smooth(clamp((local - 2.0) / 1.0));
    if (la > 0) {
      ctx.save(); ctx.globalAlpha = la;
      setMono(ctx, 12, 400);
      ctx.fillStyle = COLORS.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$ ls her_* — no matches', BW / 2, GROUND_Y - 6);
      ctx.restore();
    }
    drawHud(ctx, s3ContextPct(local), 'archive: 12 files kept');
    drawSubtitle(ctx, '空，也是完整。', smooth(clamp((local - 3.0) / 0.8)));
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
  // S1: 气泡出现
  events.push({ t: q(1.0), kind: 'bubble_ping', gainDb: -14 });
  // S2: 卡片打包音 sfx_confirm 连击 (-14dB ×3 基准, 6 张卡各一声)
  for (let i = 0; i < 6; i++) {
    const t = S2_FIRST_AT + i * S2_ARCHIVE_INTERVAL;
    events.push({ t: q(t), kind: 'card_pack', gainDb: -14 - i * 0.5 });
  }
  // S3: 清空时一声低沉消散 (sfx_ping 降调 -18dB)
  events.push({ t: q(20.5), kind: 'dissolve', gainDb: -18 });
  // S3: 小字淡入轻柔提示
  events.push({ t: q(22.5), kind: 'soft_land', gainDb: -16 });
  return events;
}
function getClickTimestamps() {
  return S.quantizeClicks(getSfxEvents().map((e) => e.t));
}

// --- 帧导出 -----------------------------------------------------------------
const renderer = S.createFrameRenderer(renderAt, OUT_DIR, { fadeIn: 0, fadeOut: 0 });
function renderAllFrames(dir = OUT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`E35 farewell: ${BW}×${BH} SCALE=${SCALE} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Style: docs/style-analysis.md Opus 5.5 奶油暖色 + 卡片墙打包 + 归档盒 + HUD 黑条`);
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
  S2_FIRST_AT, S2_ARCHIVE_INTERVAL,
  CHECK_TITLE: 'E35 告别 (farewell) Layout & Pixel Check (640×360, 0px tolerance)',
  renderAt, renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames, getSfxEvents, getClickTimestamps, sceneForTime,
  s2ArchivedCount, s2ContextPct, s3ContextPct,
};