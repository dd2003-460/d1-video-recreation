#!/usr/bin/env node
'use strict';
// Shared 440×200 terminal layout and timeline helpers for Reboot / Dialogue / Farewell.
// Art comes directly from companion v1.1 so Clawd, Her, the room and the pixel grid
// remain identical across all four deliverables.

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const V = require('./render_companion_arena_v11');

const {
  BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES,
  TYPE_CHAR_MS, SUB_CHAR_MS, FADE,
  TERM, CONTENT, SUB, CLAWD_ROOM, HER_ROOM, C,
  px, txt, drawBackground, drawTerminal, drawClawd, drawHer,
} = V;

const TEXT_X = TERM.x + 14; // 114: 12px inside the 2px terminal border
const TEXT_RIGHT = TERM.x + TERM.w - 14; // 526
const STATUS_Y = 320;
const LINE_Y = [174, 198, 222, 246, 270, 294];
const NOTE = { x: 498, y: 64, w: 116, h: 68 };
const CANVAS_BOUNDS = { x: 0, y: 0, w: BW, h: BH };
const TITLE_BOUNDS = { x: TERM.x, y: TERM.y, w: TERM.w, h: TERM.titleH };

const measureCtx = createCanvas(BW, BH).getContext('2d');
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function easeOut(v) { return 1 - Math.pow(1 - clamp01(v), 3); }
function easeInOut(v) {
  const x = clamp01(v);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}
function textWidth(str, size = 10) { return V.measureTxt(measureCtx, str, size); }
function lineText(line) { return line.parts.map((p) => p.text).join(''); }

// Matches companion txt() positioning, with the full thresholded glyph canvas height.
function textBox(x, y, str, size = 10, align = 'left') {
  const w = textWidth(str, size);
  let dx = x;
  if (align === 'center') dx = x - w / 2 - 1;
  else if (align === 'right') dx = x - w - 2;
  return [Math.floor(dx), Math.round(y), Math.ceil(w), Math.ceil(size * 1.35)];
}

function drawParts(ctx, x, y, parts) {
  let cx = x;
  for (const part of parts) {
    txt(ctx, cx, y, part.text, part.color, 10);
    cx += textWidth(part.text, 10);
  }
  return cx;
}

// Typed lines use the exact same character clock for pixels and keyboard clicks.
function drawTypedLine(ctx, line, t) {
  const charMs = line.charMs || TYPE_CHAR_MS;
  const chars = Array.from(lineText(line));
  const n = t < line.start
    ? 0
    : Math.min(chars.length, Math.floor(((t - line.start) * 1000) / charMs) + 1);
  let remaining = n;
  let cx = TEXT_X;
  let lastColor = line.parts[0].color;
  for (const part of line.parts) {
    if (remaining <= 0) break;
    const partChars = Array.from(part.text);
    const take = Math.min(partChars.length, remaining);
    const shown = partChars.slice(0, take).join('');
    if (shown) {
      txt(ctx, cx, line.y, shown, part.color, 10);
      cx += textWidth(shown, 10);
    }
    remaining -= take;
    lastColor = part.color;
  }
  if (line.cursor !== false && n > 0 && n < chars.length && Math.floor(t * 2.5) % 2 === 0) {
    px(ctx, cx + 2, line.y, 6, 10, lastColor);
  }
  return { typed: n, total: chars.length };
}

function drawLines(ctx, lines, t) {
  for (const line of lines) {
    if (line.typed === false) {
      if (t >= line.start) drawParts(ctx, TEXT_X, line.y, line.parts);
    } else {
      drawTypedLine(ctx, line, t);
    }
  }
}

function lineClicks(lines) {
  const raw = [];
  for (const line of lines) {
    const chars = Array.from(lineText(line));
    if (line.typed === false) {
      raw.push(line.start);
    } else {
      const charMs = line.charMs || TYPE_CHAR_MS;
      for (let i = 0; i < chars.length; i++) raw.push(line.start + (i * charMs) / 1000);
    }
  }
  return raw;
}

function quantizeClicks(raw) {
  const out = [];
  const sorted = raw.filter((t) => Number.isFinite(t) && t >= 0 && t < DURATION - 0.05).sort((a, b) => a - b);
  for (const t of sorted) {
    // Text appears on the first frame whose timestamp is >= the logical event.
    const q = Math.ceil(t * FPS - 1e-9) / FPS;
    if (!out.length || q - out[out.length - 1] >= 0.035) out.push(Number(q.toFixed(6)));
  }
  return out;
}

function drawStatus(ctx, text, color = C.dim) {
  if (text) txt(ctx, TEXT_X, STATUS_Y, text, color, 10);
}

function drawStickyNote(ctx, title, sub, t, appear = 1, box = NOTE) {
  if (appear <= 0) return;
  const { x, y, w, h } = box;
  ctx.save();
  ctx.globalAlpha = clamp01(appear);
  px(ctx, x + 2, y + 2, w, h, 'rgba(0,0,0,0.14)');
  px(ctx, x, y, w, h, C.cardBg);
  px(ctx, x, y, w, 2, C.cardBd);
  px(ctx, x, y + h - 2, w, 2, C.cardBd);
  px(ctx, x, y, 2, h, C.cardBd);
  px(ctx, x + w - 2, y, 2, h, C.cardBd);
  px(ctx, x + w / 2 - 3, y + 5, 6, 6, C.red);
  px(ctx, x + w / 2 - 1, y + 6, 2, 2, C.pink);
  txt(ctx, x + w / 2, y + 20, title, C.cardTx, 10, 'center');
  if (sub) txt(ctx, x + w / 2, y + 42, sub, C.cardSub, 10, 'center');
  ctx.restore();
}

function drawSubtitle(ctx, lines, windows, t) {
  px(ctx, SUB.x, SUB.y, SUB.w, SUB.h, C.subtitleBg);
  px(ctx, SUB.x, SUB.y, SUB.w, 1, 'rgba(255,255,255,0.14)');
  for (let i = 0; i < lines.length; i++) {
    const w = windows[i];
    if (t >= w.start && t < w.end) {
      const chars = Array.from(lines[i]);
      const shown = Math.min(chars.length, Math.floor(((t - w.start) * 1000) / SUB_CHAR_MS) + 1);
      const visible = chars.slice(0, shown).join('');
      if (visible) txt(ctx, BW / 2, SUB.y + 3, visible, C.white, 10, 'center');
      return;
    }
  }
}

// Standard 0.25s outgoing + 0.25s incoming black transitions at 10s and 20s.
function renderScenes(ctx, t, scenes) {
  let blackAlpha = 0;
  const [s0, s1, s2] = scenes;
  if (t < s1.start) {
    s0.draw(ctx, t);
    if (t >= s1.start - FADE) blackAlpha = (t - (s1.start - FADE)) / FADE;
  } else if (t < s1.start + FADE) {
    s1.draw(ctx, t);
    blackAlpha = 1 - (t - s1.start) / FADE;
  } else if (t < s2.start) {
    s1.draw(ctx, t);
    if (t >= s2.start - FADE) blackAlpha = (t - (s2.start - FADE)) / FADE;
  } else if (t < s2.start + FADE) {
    s2.draw(ctx, t);
    blackAlpha = 1 - (t - s2.start) / FADE;
  } else {
    s2.draw(ctx, t);
  }
  if (blackAlpha > 0) px(ctx, 0, 0, BW, BH, `rgba(0,0,0,${clamp01(blackAlpha).toFixed(3)})`);
}

function createFrameRenderer(renderAt, outDir, opts = {}) {
  const fadeIn = opts.fadeIn === undefined ? 0.4 : opts.fadeIn;
  const fadeOut = opts.fadeOut === undefined ? 0.8 : opts.fadeOut;
  const baseCanvas = createCanvas(BW, BH);
  const baseCtx = baseCanvas.getContext('2d');
  const outCanvas = createCanvas(FW, FH);
  const outCtx = outCanvas.getContext('2d');
  outCtx.imageSmoothingEnabled = false;

  function renderFrameToCanvas(n) {
    const t = n / FPS;
    baseCtx.clearRect(0, 0, BW, BH);
    renderAt(baseCtx, t);
    let alpha = 1;
    if (t < fadeIn) alpha = t / fadeIn;
    else if (t > DURATION - fadeOut) alpha = (DURATION - t) / fadeOut;
    if (alpha < 1) px(baseCtx, 0, 0, BW, BH, `rgba(0,0,0,${(1 - clamp01(alpha)).toFixed(3)})`);
    outCtx.clearRect(0, 0, FW, FH);
    outCtx.imageSmoothingEnabled = false;
    outCtx.drawImage(baseCanvas, 0, 0, FW, FH);
    return { baseCanvas, outCanvas };
  }

  function renderAllFrames(dir = outDir) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Canvas ${BW}×${BH} SCALE=${SCALE} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
    console.log(`Terminal ${TERM.w}×${TERM.h} @ (${TERM.x},${TERM.y}); fonts: ${V.FONT_10} / ${V.FONT_14}`);
    console.log(`Frames: ${dir}`);
    const started = Date.now();
    for (let i = 0; i < NFRAMES; i++) {
      renderFrameToCanvas(i);
      fs.writeFileSync(path.join(dir, `f_${String(i).padStart(5, '0')}.png`), outCanvas.toBuffer('image/png'));
      if (i % 300 === 0 || i === NFRAMES - 1) {
        const elapsed = (Date.now() - started) / 1000;
        console.log(`  frame ${i}/${NFRAMES}; elapsed=${elapsed.toFixed(1)}s`);
      }
    }
    console.log(`Rendered ${NFRAMES} frames in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
  return { baseCanvas, baseCtx, outCanvas, outCtx, renderFrameToCanvas, renderAllFrames };
}

function foregroundLayout(opts = {}) {
  const list = [];
  if (opts.terminal !== false) list.push({ name: 'terminal', box: [TERM.x, TERM.y, TERM.w, TERM.h] });
  if (opts.clawd !== false) list.push({ name: 'clawd', box: [CLAWD_ROOM.x, CLAWD_ROOM.y - 1, 40, 25] });
  if (opts.her !== false) list.push({ name: 'her', box: [HER_ROOM.x, HER_ROOM.y - 1, 16, 29] });
  if (opts.note) {
    const n = opts.note === true ? NOTE : opts.note;
    list.push({ name: 'note', box: [n.x, n.y, n.w + 2, n.h + 2] });
  }
  list.push({ name: 'subtitleBar', box: [SUB.x, SUB.y, SUB.w, SUB.h] });
  return list.concat(opts.extra || []);
}

function titleLayout(title) {
  return [
    { name: 'btn_red', box: [TERM.x + 8, TERM.y + 7, 6, 6] },
    { name: 'btn_amber', box: [TERM.x + 18, TERM.y + 7, 6, 6] },
    { name: 'btn_green', box: [TERM.x + 28, TERM.y + 7, 6, 6] },
    { name: 'title_txt', box: textBox(TERM.x + TERM.w / 2, TERM.y + 5, title, 10, 'center') },
  ];
}

function contentLayout(lines, status) {
  const list = [];
  lines.forEach((line, i) => {
    const full = lineText(line);
    list.push({ name: `row_${i + 1}`, box: textBox(TEXT_X, line.y, full, 10) });
    if (line.typed !== false && line.cursor !== false) {
      list.push({ name: `cursor_${i + 1}`, box: [TEXT_X + textWidth(full, 10) + 2, line.y, 6, 10] });
    }
  });
  if (status) list.push({ name: 'status', box: textBox(TEXT_X, STATUS_Y, status, 10) });
  return list;
}

function noteLayout(title, sub, box = NOTE) {
  const list = [
    { name: 'pin', box: [box.x + box.w / 2 - 3, box.y + 5, 6, 6] },
    { name: 'note_title', box: textBox(box.x + box.w / 2, box.y + 20, title, 10, 'center') },
  ];
  if (sub) list.push({ name: 'note_sub', box: textBox(box.x + box.w / 2, box.y + 42, sub, 10, 'center') });
  return list;
}

function subtitleLayout(lines, windows, t) {
  for (let i = 0; i < lines.length; i++) {
    if (t >= windows[i].start && t < windows[i].end) {
      return [{ name: `subtitle_${i + 1}`, box: textBox(BW / 2, SUB.y + 3, lines[i], 10, 'center') }];
    }
  }
  return [];
}

function baseLayout(opts) {
  const noteBox = opts.note ? (opts.note === true ? NOTE : opts.note) : null;
  const groups = {
    foreground: foregroundLayout(opts),
    titleBar: titleLayout(opts.title),
    content: contentLayout(opts.lines || [], opts.status),
    subtitle: subtitleLayout(opts.subLines, opts.subWindows, opts.t),
  };
  const bounds = {
    foreground: CANVAS_BOUNDS,
    titleBar: TITLE_BOUNDS,
    content: CONTENT,
    subtitle: SUB,
  };
  if (noteBox) {
    groups.note = noteLayout(opts.noteTitle, opts.noteSub, noteBox);
    bounds.note = noteBox;
  }
  if (opts.extraGroups) Object.assign(groups, opts.extraGroups);
  if (opts.extraBounds) Object.assign(bounds, opts.extraBounds);
  return { scene: opts.scene, groups, bounds };
}

module.exports = {
  BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES,
  TYPE_CHAR_MS, SUB_CHAR_MS, FADE,
  TERM, CONTENT, SUB, CLAWD_ROOM, HER_ROOM, C,
  TEXT_X, TEXT_RIGHT, STATUS_Y, LINE_Y, NOTE,
  CANVAS_BOUNDS, TITLE_BOUNDS,
  FONT_10: V.FONT_10, FONT_14: V.FONT_14,
  px, txt, drawBackground, drawTerminal, drawClawd, drawHer,
  clamp01, easeOut, easeInOut, textWidth, lineText, textBox,
  drawParts, drawTypedLine, drawLines, drawStatus, drawStickyNote, drawSubtitle,
  lineClicks, quantizeClicks, renderScenes, createFrameRenderer,
  foregroundLayout, titleLayout, contentLayout, noteLayout, subtitleLayout, baseLayout,
  art: V,
};
