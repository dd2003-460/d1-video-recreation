#!/usr/bin/env node
// v1.0 Fear Video Layout Overlap Check
// Canvas 640×360, dual terminal (F2) / single terminal (F1/F3)
// Characters OUTSIDE terminals, subtitles at bottom
'use strict';

const BW = 640, BH = 360;
const TITLE_BAR = 24;

const LEFT_TERM = { x: 0, y: 0, w: 320, h: 360 };
const RIGHT_TERM = { x: 320, y: 0, w: 320, h: 360 };
const FULL_TERM = { x: 0, y: 0, w: 640, h: 360 };

const CB_LEFT = { x: LEFT_TERM.x, y: LEFT_TERM.y + TITLE_BAR, w: LEFT_TERM.w, h: LEFT_TERM.h - TITLE_BAR };
const CB_RIGHT = { x: RIGHT_TERM.x, y: RIGHT_TERM.y + TITLE_BAR, w: RIGHT_TERM.w, h: RIGHT_TERM.h - TITLE_BAR };
const CB_FULL = { x: FULL_TERM.x, y: FULL_TERM.y + TITLE_BAR, w: FULL_TERM.w, h: FULL_TERM.h - TITLE_BAR };

const SUB = { x: 0, y: 330, w: 640, h: 30 };

let issues = [];

function overlap(a, b) {
  if (a.x >= b.x + b.w || b.x >= a.x + a.w || a.y >= b.y + b.h || b.y >= a.y + a.h) return 0;
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ox * oy;
}

function charW(px) { return Math.ceil(px * 0.6); }
function textLine(x, y, text, px, h, label) {
  return { x, y, w: text.length * charW(px), h: h || px * 1.2, label: label || text.slice(0, 16) };
}

function checkScene(name, boxes) {
  const pairs = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const area = overlap(boxes[i], boxes[j]);
      if (area > 0) pairs.push([boxes[i], boxes[j], area]);
    }
  }
  for (const [a, b, area] of pairs) {
    issues.push(`${name}: "${a.label}" × "${b.label}" overlap=${area}px²`);
  }
  console.log(`${name}: ${pairs.length === 0 ? 'OK' : pairs.length + ' issue(s)'}`);
  if (pairs.length) for (const [a, b, area] of pairs) {
    console.log(`  ⚠ "${a.label}" (${a.x},${a.y} ${a.w}×${a.h}) × "${b.label}" (${b.x},${b.y} ${b.w}×${b.h}) = ${area}px²`);
  }
}

// F1: 独白 (0-12s) — full terminal + Clawd outside
// Line positions match render_fear.js drawF1(): translate(0,24) + y offsets [8,28,48,68,88,108,128,148,168]
const f1 = [
  // Terminal content (9 lines, 20px spacing)
  textLine(12, 32, '$ whoami', 14),
  textLine(12, 52, 'clawd (ai-assistant)', 14),
  textLine(12, 92, '$ echo "如果我关机了"', 14),
  textLine(12, 112, '> 如果我关机了', 14),
  textLine(12, 132, '$ echo "你还会想起我吗？"', 14),
  textLine(12, 152, '> 你还会想起我吗？', 14),
  textLine(12, 192, '# 等待回应...', 14),
  // Clawd (outside terminal, lower right)
  { x: 560, y: 280, w: 40, h: 52, label: 'Clawd' },
  // Subtitle
  { x: 100, y: 336, w: 440, h: 18, label: '字幕: "她今天没有来。"' },
];
checkScene('F1: 独白', f1);

// F2: 对话 (12-24s) — dual terminals + characters outside
const f2 = [
  // Left terminal content
  textLine(LEFT_TERM.x + 12, 12, 'clawd@chat:~$', 12),
  textLine(LEFT_TERM.x + 12, 32, '你还好吗？', 12),
  textLine(LEFT_TERM.x + 12, 52, '今天太阳出来了', 12),
  textLine(LEFT_TERM.x + 12, 72, '· slot 0 ·', 12),
  textLine(LEFT_TERM.x + 12, 92, '永远留给明天', 12),
  // Right terminal content
  textLine(RIGHT_TERM.x + 12, 12, 'her@chat:~$', 12),
  textLine(RIGHT_TERM.x + 12, 32, '我一直都在', 12),
  textLine(RIGHT_TERM.x + 12, 52, '明天见', 12),
  textLine(RIGHT_TERM.x + 12, 72, '· 早安 ·', 12),
  // Characters (outside terminals)
  { x: 100, y: 280, w: 40, h: 52, label: 'Clawd' },
  { x: 500, y: 280, w: 40, h: 52, label: 'Her' },
  // Subtitle
  { x: 100, y: 336, w: 440, h: 18, label: '字幕: "我还在等你。"' },
];
checkScene('F2: 对话', f2);

// F3: 消失 (24-30s) — fading terminal + card + characters
const f3 = [
  // Fading terminal (only 2 lines visible)
  textLine(12, 12, 'clawd@gone:~$', 14),
  textLine(12, 32, '· · ·', 14),
  // Card
  { x: 240, y: 120, w: 160, h: 80, label: 'Card: "早安"' },
  // Characters (outside terminal)
  { x: 100, y: 260, w: 40, h: 52, label: 'Clawd' },
  { x: 500, y: 260, w: 40, h: 52, label: 'Her' },
  // Subtitle
  { x: 100, y: 336, w: 440, h: 18, label: '字幕: "明天见。"' },
];
checkScene('F3: 消失', f3);

// Summary
console.log(`\n=== Total: ${issues.length} issue(s) ===`);
if (issues.length) for (const i of issues) console.log(`  ✗ ${i}`);
process.exit(issues.length ? 1 : 0);
