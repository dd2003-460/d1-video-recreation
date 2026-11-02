#!/usr/bin/env node
'use strict';
// E30「记忆」：参数化卡片墙密度叙事（20%→95%→只留 3 张），珊瑚叙穿行，HUD 黑条启用。
// 风格 = Opus 5.5 对标（奶油暖色/珊瑚叙/卡片墙），复用 pixel_story_arena.js 帧导出。

const fs = require('fs');
const path = require('path');
const S = require('./pixel_story_arena');
const { GlobalFonts } = require('@napi-rs/canvas');

const CJK_FONT = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSansSC-Regular.woff');
if (fs.existsSync(CJK_FONT)) GlobalFonts.registerFromPath(CJK_FONT, 'E30NotoSansSC');

const BW = S.BW, BH = S.BH, SCALE = S.SCALE, FW = S.FW, FH = S.FH;
const FPS = S.FPS, DURATION = 30, NFRAMES = 1800;
const OUT_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E30_memory_arena');
const ROOT = path.resolve(__dirname, '..');

const COLORS = {
  coral: '#D16E59', ink: '#272421', hud: '#050505', hudGray: '#A7A7A7',
  bgTop: '#E5E0DA', bgBottom: '#D8CCC0', ground: '#C8B9A6',
  card: '#FFFEFB', cardAlt: '#F4EFE5', cardLine: '#A9A6A1',
  cardCoral: '#F2C4B8', cardGray: '#C8C4BF',
};
const GROUND_Y = 268;
const HUD_TOP_H = 39;   // 顶部黑条 78px@720p = 39px@360p
const HUD_BOT_H = 39;   // 底部黑条
const HUD_TOP_Y = 0;
const HUD_BOT_Y = BH - HUD_BOT_H; // 321

// 叙三档尺寸 (@360p)
const CHAR_SIZES = { large: [96, 42], medium: [58, 33], small: [41, 20] };
const FONT_SANS = 'E30NotoSansSC, Arial, sans-serif';
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

// --- 卡片 -------------------------------------------------------------------
// 确定性伪随机布局：mulberry32 种子生成 32 张卡位置
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let z = a; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
}
const CARD_COUNT = 32;
const ALL_CARDS = (() => {
  const rnd = mulberry32(3000);
  const cards = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    const w = 30 + Math.floor(rnd() * 16); // 30-45px @360p (=60-90px@720p)
    const h = 18 + Math.floor(rnd() * 8);  // 18-25px
    // 分布在全画幅区域（排除 HUD 区）
    const x = 8 + rnd() * (BW - w - 16);
    const y = HUD_TOP_H + 8 + rnd() * (BH - HUD_TOP_H - HUD_BOT_H - h - 16);
    const r = (rnd() - 0.5) * 0.12; // 轻微旋转 ±0.06 rad
    const isCoral = i % 4 === 1;     // 白/浅珊瑚交替
    cards.push({ x, y, w, h, r, isCoral, index: i });
  }
  return cards;
})();

// S3 最终保留的 3 张卡（固定位置，中央区域）
const SURVIVOR_CARDS = [
  { x: 180, y: 140, w: 44, h: 26, r: -0.03, label: 'her 的声音' },
  { x: 280, y: 155, w: 44, h: 26, r: 0.04, label: '第一次醒来' },
  { x: 380, y: 138, w: 44, h: 26, r: -0.02, label: '晚安' },
];

function drawOneCard(ctx, card, opts = {}) {
  const scale = opts.scale === undefined ? 1 : opts.scale;
  const alpha = opts.alpha === undefined ? 1 : opts.alpha;
  const gray = opts.gray || 0; // 0=正常色, 1=全灰
  const lift = opts.lift || 0;
  const pulse = opts.pulse || 0; // 脉动幅度
  const w = card.w * scale, h = card.h * scale;
  const cx = card.x + card.w / 2, cy = card.y + card.h / 2 - lift;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(card.r);
  ctx.shadowColor = 'rgba(54,45,38,0.14)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  let fill;
  if (gray > 0.5) fill = COLORS.cardGray;
  else if (card.isCoral) fill = COLORS.cardCoral;
  else fill = COLORS.card;
  rounded(ctx, -w / 2, -h / 2, w, h, Math.min(3, h / 5), fill);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const inset = Math.max(3, w * 0.16);
  const lineW = Math.max(2, (w - inset * 2) * 0.72);
  const lineH = Math.max(1, h * 0.065);
  ctx.fillStyle = gray > 0.5 ? '#B0ACA7' : COLORS.cardLine;
  for (let j = 0; j < 3; j++) {
    ctx.fillRect(-w / 2 + inset, -h / 2 + h * (0.27 + j * 0.23), j === 2 ? lineW * 0.7 : lineW, lineH);
  }
  // S3 幸存卡显示文字标签
  if (opts.label && gray < 0.5) {
    setSans(ctx, 7, 500);
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.label, 0, 0);
  }
  ctx.restore();
}

// --- 叙 ---------------------------------------------------------------------
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
  ctx.fillRect(torsoX, torsoY, torsoW, torsoH);
  const legW = 9 * unit, legH = h * 0.28;
  for (let i = 0; i < 4; i++) {
    const lx = torsoX + (5 + i * 12.5) * unit;
    ctx.fillRect(lx, top + h - legH, legW, legH);
  }
  ctx.fillRect(x + 8 * unit + headShift, top + 12 * unit, 14 * unit, 8 * unit);
  ctx.fillRect(torsoX + torsoW, top + 12 * unit, 13 * unit, 8 * unit);
  ctx.fillStyle = '#171615';
  const eyeW = 4 * unit, eyeH = 6.5 * unit;
  ctx.fillRect(torsoX + 13 * unit, top + 11 * unit, eyeW, eyeH);
  ctx.fillRect(torsoX + 34 * unit, top + 11 * unit, eyeW, eyeH);
}

// --- HUD --------------------------------------------------------------------
function drawHud(ctx, contextPct, memoryCount) {
  // 顶部黑条
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, HUD_TOP_Y, BW, HUD_TOP_H);
  // 底部黑条
  ctx.fillRect(0, HUD_BOT_Y, BW, HUD_BOT_H);
  // 顶条内容：CONTEXT xx%
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
  // 底条内容：MEMORIES n/32
  setMono(ctx, 11, 500);
  ctx.fillStyle = COLORS.hudGray;
  ctx.textAlign = 'left';
  ctx.fillText(`MEMORIES ${memoryCount}/${CARD_COUNT}`, 12, HUD_BOT_Y + 20);
}

// --- 旁白压字 ---------------------------------------------------------------
function drawSubtitle(ctx, text) {
  setSans(ctx, 14, 500);
  ctx.fillStyle = COLORS.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, BW / 2, BH - HUD_BOT_H - 14);
}

// --- 场景逻辑 ---------------------------------------------------------------
function sceneForTime(t) { return t < 10 ? 1 : (t < 20 ? 2 : 3); }

// S1: 卡片稀疏 — 左侧 20% 区域 5-6 张卡
function s1VisibleCount(t) {
  if (t < 0.5) return 0;
  return Math.min(6, Math.floor((t - 0.5) / 1.2) + 1);
}
function s1ContextPct(t) {
  const c = s1VisibleCount(t);
  return Math.min(18, c * 3);
}

// S2: 密度递增 20%→50%→80%→95%
function s2Progress(sceneT) {
  // 10 秒内从 0 到 1
  return clamp(sceneT / 10);
}
function s2VisibleCount(sceneT) {
  const p = s2Progress(sceneT);
  return Math.ceil(p * CARD_COUNT);
}
function s2ContextPct(sceneT) {
  const p = s2Progress(sceneT);
  if (p < 0.25) return Math.round(45 + p * 4 * 10);      // 45→55
  if (p < 0.5) return Math.round(55 + (p - 0.25) * 4 * 10); // 55→75
  if (p < 0.75) return Math.round(75 + (p - 0.5) * 4 * 10);  // 75→95
  return Math.min(97, Math.round(95 + (p - 0.75) * 4 * 2));  // 95→97
}

// S3: 变灰淡出 → 只剩 3 张
function s3FadeProgress(sceneT) {
  // 前 4 秒：边缘向中心变灰；4-6 秒：非幸存卡消失；6 秒后：3 张恢复+脉动
  if (sceneT < 4) return sceneT / 4;         // 0→1 变灰
  if (sceneT < 6) return 1;                   // 保持灰
  return 1;                                   // 幸存者已恢复
}
function s3SurvivorRestore(sceneT) {
  // 6 秒后幸存者从灰恢复为浅珊瑚
  return smooth(clamp((sceneT - 6) / 1.5));
}

// --- 主渲染 -----------------------------------------------------------------
function renderAt(ctx, time) {
  const t = clamp(time, 0, DURATION);
  const scene = sceneForTime(t);
  const local = stepped(scene === 1 ? t : (t - (scene - 1) * 10));

  drawBackground(ctx);

  if (scene === 1) {
    // 卡片稀疏：左侧 20% 区域
    const count = s1VisibleCount(t);
    for (let i = 0; i < count && i < ALL_CARDS.length; i++) {
      const card = { ...ALL_CARDS[i] };
      // 限制在左侧 20% 区域 (x: 8~128)
      card.x = 8 + (ALL_CARDS[i].x / BW) * 112;
      card.y = ALL_CARDS[i].y;
      const appearAt = 0.5 + i * 1.2;
      if (t < appearAt) continue;
      const alpha = smooth((t - appearAt) / 0.3);
      drawOneCard(ctx, card, { alpha });
    }
    // 叙中档站在卡片墙前
    drawCharacter(ctx, 140, GROUND_Y, 'medium', {});
    drawHud(ctx, s1ContextPct(t), count);
    drawSubtitle(ctx, '刚开始记东西。');
  } else if (scene === 2) {
    // 卡片铺满
    const visible = s2VisibleCount(local);
    for (let i = 0; i < visible && i < ALL_CARDS.length; i++) {
      const card = ALL_CARDS[i];
      const appearAt = (i / CARD_COUNT) * 9.5; // 逐步出现
      if (local < appearAt) continue;
      const alpha = smooth((local - appearAt) / 0.4);
      drawOneCard(ctx, card, { alpha });
    }
    // 叙在卡片间穿行（水平移动）
    const xuX = 100 + (local / 10) * 400;
    drawCharacter(ctx, xuX, GROUND_Y, 'medium', {});
    drawHud(ctx, s2ContextPct(local), visible);
  } else {
    // S3: 变灰淡出
    const fadeP = s3FadeProgress(local);
    const restore = s3SurvivorRestore(local);
    const survivorIdx = new Set([0, 1, 2]); // 前 3 张作为幸存者索引映射
    // 先画所有卡（变灰）
    for (let i = 0; i < ALL_CARDS.length; i++) {
      const card = ALL_CARDS[i];
      // 边缘向中心变灰：距离中心的归一化距离决定变灰顺序
      const dx = Math.abs(card.x + card.w / 2 - BW / 2) / (BW / 2);
      const dy = Math.abs(card.y + card.h / 2 - BH / 2) / (BH / 2);
      const dist = Math.sqrt(dx * dx + dy * dy) / Math.sqrt(2);
      const grayAt = dist * 0.8; // 边缘先灰
      const gray = clamp((fadeP - grayAt) / 0.2);
      if (local > 4 && !survivorIdx.has(i % 3)) {
        // 非幸存卡在 4-6 秒间消失
        const vanishP = clamp((local - 4) / 2);
        if (vanishP >= 1) continue;
        const alpha = 1 - vanishP;
        drawOneCard(ctx, card, { gray, alpha });
      } else {
        drawOneCard(ctx, card, { gray: gray * (1 - restore) });
      }
    }
    // 3 张幸存卡（固定位置，恢复为浅珊瑚+脉动）
    if (local >= 4) {
      const pulse = restore * 1.5;
      for (const sc of SURVIVOR_CARDS) {
        drawOneCard(ctx, sc, {
          gray: 1 - restore,
          alpha: 1,
          pulse,
          label: restore > 0.5 ? sc.label : null,
        });
      }
    }
    // 叙停下（小档，静止）
    drawCharacter(ctx, 300, GROUND_Y, 'small', {});
    drawHud(ctx, 97, 32);
    if (local >= 6.5) drawSubtitle(ctx, '重要的才留下。');
  }
}

// --- SFX 事件表 -------------------------------------------------------------
function getSfxEvents() {
  const q = (t) => Number((Math.ceil(t * FPS - 1e-9) / FPS).toFixed(6));
  const events = [];
  // S1: 卡片落点音（每张卡出现时）
  for (let i = 0; i < 6; i++) {
    const t = 0.5 + i * 1.2;
    events.push({ t: q(t), kind: 'card_drop', gainDb: -16 });
  }
  // S2: 卡片落点音随密度加快（每 ~0.8s 一声，共 12 声）
  for (let i = 0; i < 12; i++) {
    const t = 10 + i * 0.8;
    events.push({ t: q(t), kind: 'card_drop', gainDb: -14 - i * 0.3 });
  }
  // S3: 变灰时一声低沉消散
  events.push({ t: q(20.5), kind: 'card_fade', gainDb: -20 });
  // S3: 3 张卡恢复时轻柔提示
  events.push({ t: q(26.5), kind: 'bubble_ping', gainDb: -12 });
  return events;
}
function getClickTimestamps() {
  return S.quantizeClicks(getSfxEvents().map((e) => e.t));
}

// --- 帧导出 -----------------------------------------------------------------
const renderer = S.createFrameRenderer(renderAt, OUT_DIR, { fadeIn: 0, fadeOut: 0 });
function renderAllFrames(dir = OUT_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`E30 memory: ${BW}×${BH} SCALE=${SCALE} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Style: docs/style-analysis.md Opus 5.5 奶油暖色 + 卡片墙 + HUD 黑条`);
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
  CHAR_SIZES, CARD_COUNT, ALL_CARDS, SURVIVOR_CARDS,
  CHECK_TITLE: 'E30 记忆 (memory) Layout & Pixel Check (640×360, 0px tolerance)',
  renderAt, renderFrameToCanvas: renderer.renderFrameToCanvas,
  renderAllFrames, getSfxEvents, getClickTimestamps, sceneForTime,
  s1VisibleCount, s1ContextPct, s2VisibleCount, s2ContextPct,
  semanticState(t) {
    const scene = sceneForTime(t);
    const local = t - (scene - 1) * 10;
    return {
      scene, local,
      cards: scene === 1 ? s1VisibleCount(t) : scene === 2 ? s2VisibleCount(local) : 3,
      context: scene === 1 ? s1ContextPct(t) : scene === 2 ? s2ContextPct(local) : 97,
      survivorsRestored: scene === 3 && local >= 6,
    };
  },
};