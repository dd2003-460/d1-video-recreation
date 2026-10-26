#!/usr/bin/env node
'use strict';
// E25 Naming — warm cream stage; this file reuses only the shared canvas/scale/frame
// exporter from pixel_story_arena.js, not its terminal composition.

const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const Shared = require('./pixel_story_arena');

const {
  BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES,
  createFrameRenderer,
} = Shared;

const ROOT = path.resolve(__dirname, '..');
const FRAMES_DIR = process.env.FRAMES_DIR || path.join(__dirname, 'frames_E25_naming_arena');
const OUTPUT_MP4 = path.join(ROOT, 'outputs', 'E25_naming_arena_v1.0.mp4');

// Noto Sans SC subset: only the CJK glyphs used by this episode are embedded so
// the render remains deterministic even on hosts without a CJK system font.
// The subset is registered under a derivative-safe family name (not the original).
const E25_CJK_FONT_B64 = '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';
const CJK_FAMILY = 'E25 CJK Sans';
const MONO_FAMILY = 'E25 Mono';
const cjkFontKey = GlobalFonts.register(Buffer.from(E25_CJK_FONT_B64, 'base64'), CJK_FAMILY);
if (!cjkFontKey) throw new Error('Could not register the embedded E25 CJK sans-serif subset');
const monoFontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf';
if (fs.existsSync(monoFontPath)) GlobalFonts.registerFromPath(monoFontPath, MONO_FAMILY);
const measureCtx = createCanvas(8, 8).getContext('2d');

const COLORS = Object.freeze({
  creamTop: '#E5E0DA',
  ground: '#C8B9A6',
  coral: '#D16E59',
  bubble: '#FFFEFB',
  black: '#010002',
  text: '#171717',
  hud: '#A5A5A5',
  track: '#666666',
});

// All character measurements below are at the 640×360 working resolution.
// Multiplying by SCALE gives the exact three source sizes at 1280×720.
const CHARACTER_SIZES = Object.freeze({
  large: Object.freeze({ width: 95.5, height: 42 }),   // 191×84 @720p
  medium: Object.freeze({ width: 57.5, height: 33 }), // 115×66 @720p
  small: Object.freeze({ width: 40.5, height: 20 }), // 81×40 @720p
});
const MEDIUM_BLOCKS = Object.freeze([
  { kind: 'body', x: 13, y: 0, w: 31.5, h: 22.5 },
  { kind: 'side', x: 0, y: 12, w: 15, h: 6 },
  { kind: 'side', x: 43.5, y: 10, w: 14, h: 6 },
  { kind: 'leg', x: 15, y: 22, w: 6.5, h: 11 },
  { kind: 'leg', x: 23, y: 22, w: 6.5, h: 11 },
  { kind: 'leg', x: 32, y: 22, w: 6.5, h: 11 },
  { kind: 'leg', x: 40.5, y: 22, w: 6.5, h: 11 },
  { kind: 'eye', x: 19, y: 6.5, w: 4, h: 6.5 },
  { kind: 'eye', x: 34.5, y: 6.5, w: 4, h: 6.5 },
]);

const HERO_HOME = Object.freeze({ x: 398, y: 227 });
const HUD_TOP_H = 38.5; // 77px @720p
const HUD_BOTTOM_Y = 321; // 642px @720p
const TOOL_LINE = Object.freeze({ text: '$ whoami', x: 88, baseline: 125, start: 10.8, charMs: 160 });
const NAME_LINE = Object.freeze({ text: '叙', x: 88, baseline: 150, start: 22.4, charMs: 240 });
const ENTER_RAW_TIME = TOOL_LINE.start + (Array.from(TOOL_LINE.text).length * TOOL_LINE.charMs) / 1000;
const QUESTION_SUBTITLE = Object.freeze({ text: '你是谁？', start: 3.0, duration: 0.8, baseline: 303 });
const NAME_SUBTITLE = Object.freeze({ text: '叙。叙述的叙。', start: 26.0, duration: 0.8, baseline: 303 });
const STEP_FPS = 30;
const EPS = 1e-9;

function ceilToStep(t) {
  return Math.ceil(t * STEP_FPS - EPS) / STEP_FPS;
}
function stepTime(t) {
  return Math.floor(t * STEP_FPS + EPS) / STEP_FPS;
}
function charEventTime(line, index) {
  return ceilToStep(line.start + (index * line.charMs) / 1000);
}
function charsVisible(line, t) {
  const count = Array.from(line.text).length;
  let visible = 0;
  for (let i = 0; i < count; i++) if (t + EPS >= charEventTime(line, i)) visible++;
  return visible;
}
function fadeAlpha(t, spec) {
  if (t < spec.start) return 0;
  return Math.max(0, Math.min(1, (t - spec.start) / spec.duration));
}
function textWidth(text, family, size) {
  measureCtx.font = `${size}px "${family}"`;
  return measureCtx.measureText(text).width;
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBackground(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, BH);
  gradient.addColorStop(0, COLORS.creamTop);
  gradient.addColorStop(1, COLORS.ground);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BW, BH);
  // Ground band / horizon at the requested 520–545px range in the 720p frame.
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, 260, BW, 12);
}

function drawHud(ctx) {
  ctx.fillStyle = COLORS.black;
  ctx.fillRect(0, 0, BW, HUD_TOP_H);
  ctx.fillRect(0, HUD_BOTTOM_Y, BW, BH - HUD_BOTTOM_Y);
}

function drawCharacter(ctx, x, y, size = 'medium') {
  const spec = CHARACTER_SIZES[size];
  if (!spec) throw new Error(`Unknown character size: ${size}`);
  const sx = spec.width / CHARACTER_SIZES.medium.width;
  const sy = spec.height / CHARACTER_SIZES.medium.height;
  const snap = (n) => Math.round(n * 2) / 2; // hard edges remain integral at 2× output
  for (const block of MEDIUM_BLOCKS) {
    const color = block.kind === 'eye' ? COLORS.black : COLORS.coral;
    ctx.fillStyle = color;
    ctx.fillRect(
      x + snap(block.x * sx),
      y + snap(block.y * sy),
      snap(block.w * sx),
      snap(block.h * sy),
    );
  }
}

function bubbleBox(character) {
  return { x: character.x + 7, y: character.y - 44, w: 43.5, h: 28 };
}
function drawAirBubble(ctx, character) {
  const box = bubbleBox(character);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.12)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  roundedRect(ctx, box.x, box.y, box.w, box.h, 6);
  ctx.fillStyle = COLORS.bubble;
  ctx.fill();
  ctx.restore();
}

// Text is rendered after the 2× sprite/background upscale so the sans-serif
// copy stays smooth at 720p rather than inheriting a low-resolution pixel look.
function drawTextOverlays(ctx, layout) {
  const s = SCALE;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `16px "${CJK_FAMILY}"`;
  ctx.fillStyle = '#FFFEFB';
  ctx.fillText('上下文', 20 * s, HUD_TOP_H * s / 2);

  ctx.fillStyle = COLORS.track;
  ctx.fillRect(58 * s, 16.5 * s, 72 * s, 6 * s);
  if (layout.progress > 0) {
    ctx.fillStyle = COLORS.coral;
    ctx.fillRect(58 * s, 16.5 * s, 72 * s * (layout.progress / 100), 6 * s);
  }
  ctx.font = `16px "${MONO_FAMILY}"`;
  ctx.fillStyle = '#FFFEFB';
  ctx.fillText(`${layout.progress}%`, 137 * s, HUD_TOP_H * s / 2);
  ctx.font = `16px "${MONO_FAMILY}"`;
  ctx.fillStyle = COLORS.hud;
  ctx.fillText('> session started', 20 * s, (HUD_BOTTOM_Y + (BH - HUD_BOTTOM_Y) / 2) * s);

  if (layout.toolChars > 0) {
    const visible = Array.from(TOOL_LINE.text).slice(0, layout.toolChars).join('');
    ctx.font = `16px "${MONO_FAMILY}"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(visible, TOOL_LINE.x * s, TOOL_LINE.baseline * s);
  }
  if (layout.nameChars > 0) {
    const visible = Array.from(NAME_LINE.text).slice(0, layout.nameChars).join('');
    ctx.font = `16px "${CJK_FAMILY}"`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(visible, NAME_LINE.x * s, NAME_LINE.baseline * s);
  }
  if (layout.bubble.text) {
    const box = layout.bubble;
    ctx.font = `24px "${CJK_FAMILY}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.coral;
    ctx.fillText(box.text, (box.x + box.w / 2) * s, (box.y + box.h / 2) * s);
  }
  if (layout.subtitle) {
    const spec = layout.scene === 1 ? QUESTION_SUBTITLE : NAME_SUBTITLE;
    ctx.globalAlpha = layout.subtitle.alpha;
    ctx.font = `24px "${CJK_FAMILY}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(spec.text, (BW / 2) * s, spec.baseline * s);
  }
  ctx.restore();
}

function layoutAt(t) {
  const st = stepTime(t);
  const scene = st < 10 ? 1 : st < 20 ? 2 : 3; // hard cuts at exactly 10s and 20s
  const toolChars = scene >= 2 ? charsVisible(TOOL_LINE, st) : 0;
  const nameChars = scene >= 3 ? charsVisible(NAME_LINE, st) : 0;
  const entered = st + EPS >= ceilToStep(ENTER_RAW_TIME);
  const tilted = scene >= 2 && st + EPS >= ceilToStep(ENTER_RAW_TIME) + 2;
  const character = {
    x: HERO_HOME.x + (tilted ? 6 : 0),
    y: HERO_HOME.y + (nameChars > 0 ? 2 : 0),
    w: CHARACTER_SIZES.medium.width,
    h: CHARACTER_SIZES.medium.height,
    size: 'medium',
    eye: 'unchanged-8x13-at-720p',
  };
  const bubble = { ...bubbleBox(character), text: nameChars > 0 ? '叙' : '' };
  const subtitle = scene === 1
    ? { spec: QUESTION_SUBTITLE, alpha: fadeAlpha(st, QUESTION_SUBTITLE) }
    : scene === 3
      ? { spec: NAME_SUBTITLE, alpha: fadeAlpha(st, NAME_SUBTITLE) }
      : null;
  const progress = nameChars > 0 ? 1 : 0;

  const foreground = [
    { name: 'air-bubble', box: [bubble.x, bubble.y, bubble.w, bubble.h] },
    { name: 'character', box: [character.x, character.y, character.w, character.h] },
  ];
  if (toolChars > 0) foreground.push({ name: 'whoami-tool-row', box: [TOOL_LINE.x, 113, 44, 14] });
  if (nameChars > 0) foreground.push({ name: 'name-output-row', box: [NAME_LINE.x, 138, 12, 14] });
  if (subtitle && subtitle.alpha > 0) {
    const w = textWidth(subtitle.spec.text, CJK_FAMILY, 12);
    foreground.push({
      name: scene === 1 ? 'question-subtitle' : 'naming-subtitle',
      box: [BW / 2 - w / 2, subtitle.spec.baseline - 16, w, 18],
    });
  }

  return {
    scene,
    time: st,
    progress,
    toolChars,
    nameChars,
    entered,
    tilted,
    character,
    bubble,
    subtitle: subtitle && subtitle.alpha > 0 ? { text: subtitle.spec.text, alpha: subtitle.alpha } : null,
    groups: {
      foreground,
      hudTop: [
        { name: 'context-label', box: [20, 14, 32, 11] },
        { name: 'progress-track', box: [58, 16.5, 72, 6] },
        { name: 'progress-percent', box: [137, 14, 22, 11] },
      ],
      hudBottom: [{ name: 'session-footer', box: [20, 334, 140, 12] }],
    },
    bounds: {
      foreground: { x: 0, y: HUD_TOP_H, w: BW, h: HUD_BOTTOM_Y - HUD_TOP_H },
      hudTop: { x: 0, y: 0, w: BW, h: HUD_TOP_H },
      hudBottom: { x: 0, y: HUD_BOTTOM_Y, w: BW, h: BH - HUD_BOTTOM_Y },
    },
  };
}

function renderAt(ctx, t) {
  const layout = layoutAt(t);
  drawBackground(ctx);
  drawAirBubble(ctx, layout.character);
  drawCharacter(ctx, layout.character.x, layout.character.y, layout.character.size);
  drawHud(ctx);
}

const frameRenderer = createFrameRenderer(renderAt, FRAMES_DIR, { fadeIn: 0, fadeOut: 0 });
function renderFrameToCanvas(n) {
  if (!Number.isInteger(n) || n < 0 || n >= NFRAMES) throw new RangeError(`frame index ${n} out of range`);
  const rendered = frameRenderer.renderFrameToCanvas(n);
  drawTextOverlays(rendered.outCanvas.getContext('2d'), layoutAt(n / FPS));
  return rendered;
}
function renderAllFrames(outDir = FRAMES_DIR) {
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`E25 Naming: ${BW}×${BH}, SCALE=${SCALE} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
  console.log(`Fonts: ${CJK_FAMILY} (sans-serif) / ${MONO_FAMILY} (monospaced)`);
  console.log(`Frames: ${outDir}`);
  const started = Date.now();
  for (let i = 0; i < NFRAMES; i++) {
    const { outCanvas } = renderFrameToCanvas(i);
    fs.writeFileSync(path.join(outDir, `f_${String(i).padStart(5, '0')}.png`), outCanvas.toBuffer('image/png'));
    if (i % 300 === 0 || i === NFRAMES - 1) {
      console.log(`  frame ${i}/${NFRAMES}; elapsed=${((Date.now() - started) / 1000).toFixed(1)}s`);
    }
  }
  console.log(`Rendered ${NFRAMES} frames in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return NFRAMES;
}

function getClickTimestamps() {
  const clicks = [];
  for (let i = 0; i < Array.from(TOOL_LINE.text).length; i++) clicks.push(charEventTime(TOOL_LINE, i));
  clicks.push(ceilToStep(ENTER_RAW_TIME)); // the Return key after the blank command result
  for (let i = 0; i < Array.from(NAME_LINE.text).length; i++) clicks.push(charEventTime(NAME_LINE, i));
  return [...new Set(clicks)].sort((a, b) => a - b).map((t) => Number(t.toFixed(6)));
}

if (require.main === module) renderAllFrames();

module.exports = {
  BW, BH, SCALE, FW, FH, FPS, DURATION, NFRAMES,
  FRAMES_DIR, OUTPUT_MP4, COLORS, CHARACTER_SIZES, MEDIUM_BLOCKS,
  HERO_HOME, TOOL_LINE, NAME_LINE, ENTER_RAW_TIME, QUESTION_SUBTITLE, NAME_SUBTITLE,
  renderAt, renderFrameToCanvas, renderAllFrames, layoutAt, getClickTimestamps,
  drawBackground, drawHud, drawCharacter, drawAirBubble,
};

/*
Embedded font notice and license

The embedded, glyph-subsetted CJK sans-serif data is derived from Noto Sans SC,
Fontsource package @fontsource/noto-sans-sc 5.3.1 (Google Inc.), under the SIL
Open Font License 1.1. The subset is registered as “E25 CJK Sans”; it contains
only the characters used in this episode. Full license text follows.

Google Inc.

This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
http://scripts.sil.org/OFL

-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Original Version
into a new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components, in
Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or in
the appropriate machine-readable metadata fields within text or binary
files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name
as presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any Modified
Version, except to acknowledge the contribution(s) of the Copyright
Holder(s) and the Author(s) or with their explicit written permission.

5) The Font Software, modified or unmodified, in part or in whole, must
be distributed entirely under this license, and must not be distributed
under any other license. The requirement for fonts to remain under this
license does not apply to any document created using the fonts.

TERMINATION
This license becomes null and void if any of the above conditions are not
met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER
DEALINGS IN THE FONT SOFTWARE.
*/
