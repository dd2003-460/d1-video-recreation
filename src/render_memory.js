// 「Clawd 的记忆」30s 新主题视频
// Clawd 的记忆存储满了，必须删除一些记忆。它犹豫要不要删除关于她的记忆。
// 1280×720@60fps, 3 scenes, 单终端布局 (DSH TUI 风格)
//
// 场景:
//   M1 (0-10s):  终端显示 `df -h /memory` — 98% 已满
//   M2 (10-20s): 列出候选删除文件 — her_first_meet.json, her_birthday.txt, her_goodbye.log
//   M3 (20-30s): Clawd 选择保留她的记忆，删除其他 — rm -rf /memory/*.tmp
//
// 字幕:
//   "记忆满了。" / "但有些东西，不能删。" / "slot 0 · 永远"

const { createCanvas, Image } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const BW = 640, BH = 360, SCALE = 2, FPS = 60;
const DURATION = 30;
const NFRAMES = DURATION * FPS; // 1800
const OUT = process.env.FRAMES_DIR || path.join(__dirname, 'frames_memory');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// DSH TUI 风格调色板
const C = {
  bg: '#0d1117',
  termBg: '#14161C',
  termBorder: '#30363D',
  titleBar: '#21262D',
  text: '#E6EDF3',
  dim: '#7D8590',
  green: '#7EE787',
  purple: '#BB9AF7',
  amber: '#FFB347',
  blue: '#79C0FF',
  red: '#FF7B72',
  pink: '#FF9AA2',
  white: '#FFFFFF',
  subtitleBg: 'rgba(0,0,0,0.7)',
};

// 单终端 (全屏)
const TERM = { x: 0, y: 0, w: BW, h: BH };

// 字幕条
const SUB = { x: 0, y: 320, w: BW, h: 40 };

// 字幕内容
const LINES = [
  { text: '记忆满了。', start: 2.0, end: 8.0 },
  { text: '但有些东西，不能删。', start: 12.0, end: 18.0 },
  { text: 'slot 0 · 永远', start: 24.0, end: 29.0 },
];

// 场景定义
const SCENES = [
  { id: 'M1', start: 0, end: 10, draw: drawM1 },
  { id: 'M2', start: 10, end: 20, draw: drawM2 },
  { id: 'M3', start: 20, end: 30, draw: drawM3 },
];

// Text renderer
function txt(ctx, x, y, text, color, size) {
  ctx.font = `${size}px monospace`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// 终端窗口
function drawTerminal(ctx, term, title, color, t) {
  px(ctx, term.x, term.y, term.w, term.h, C.termBg);
  // 边框
  ctx.strokeStyle = C.termBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(term.x + 1, term.y + 1, term.w - 2, term.h - 2);
  // 标题栏
  const titleH = 20;
  px(ctx, term.x, term.y, term.w, titleH, C.titleBar);
  txt(ctx, term.x + 8, term.y + 4, title, color, 12);
  // 按钮
  const btnY = term.y + 7;
  px(ctx, term.x + term.w - 28, btnY, 6, 6, C.red);
  px(ctx, term.x + term.w - 18, btnY, 6, 6, C.amber);
  px(ctx, term.x + term.w - 8, btnY, 6, 6, C.green);
  // 扫描线
  for (let y = term.y + titleH; y < term.y + term.h; y += 4) {
    px(ctx, term.x, y, term.w, 1, C.scanline);
  }
}

// Clawd (sad)
function drawClawd(ctx, x, y, t, mood) {
  const bodyColor = mood === 'sad' ? C.purple : C.green;
  // 身体 (40×24)
  px(ctx, x, y, 40, 24, bodyColor);
  // 眼睛
  px(ctx, x + 8, y + 8, 6, 6, C.white);
  px(ctx, x + 26, y + 8, 6, 6, C.white);
  px(ctx, x + 10, y + 10, 2, 2, C.bg);
  px(ctx, x + 28, y + 10, 2, 2, C.bg);
  // 嘴 (sad = 下弯)
  if (mood === 'sad') {
    px(ctx, x + 14, y + 18, 12, 2, C.bg);
    px(ctx, x + 12, y + 16, 2, 2, C.bg);
    px(ctx, x + 26, y + 16, 2, 2, C.bg);
  } else {
    px(ctx, x + 14, y + 16, 12, 2, C.bg);
  }
  // 腿 (6 条)
  const legY = y + 24;
  for (let i = 0; i < 6; i++) {
    px(ctx, x + 4 + i * 6, legY, 4, 8, bodyColor);
  }
}

// 字幕条
function drawSubtitle(ctx, t) {
  px(ctx, SUB.x, SUB.y, SUB.w, SUB.h, C.subtitleBg);
  const line = LINES.find(l => t >= l.start && t <= l.end);
  if (line) {
    ctx.font = '14px monospace';
    const tw = ctx.measureText(line.text).width;
    txt(ctx, (BW - tw) / 2, SUB.y + 12, line.text, C.white, 14);
  }
}

// M1: df -h /memory (0-10s)
function drawM1(ctx, t) {
  px(ctx, 0, 0, BW, BH, C.bg);
  drawTerminal(ctx, TERM, 'clawd@memory:~$', C.green, t);

  ctx.save();
  ctx.translate(0, 24);
  const lines = [
    { text: '$ df -h /memory', color: C.text, t: 0.5, y: 8 },
    { text: 'Filesystem     Size  Used Avail Use% Mounted on', color: C.dim, t: 1.5, y: 28 },
    { text: '/dev/memory    100M  98M   2M  98% /memory', color: C.amber, t: 2.5, y: 48 },
    { text: '', color: C.text, t: 3.5, y: 68 },
    { text: '$ ls /memory | wc -l', color: C.text, t: 4.5, y: 88 },
    { text: '12847', color: C.white, t: 5.5, y: 108 },
    { text: '', color: C.text, t: 6.5, y: 128 },
    { text: '# 必须删除一些...', color: C.dim, t: 7.5, y: 148 },
  ];
  for (const line of lines) {
    if (t > line.t) {
      const typed = Math.min(line.text.length, Math.floor((t - line.t) / 0.08));
      if (typed > 0) {
        txt(ctx, 12, line.y, line.text.substring(0, typed), line.color, 14);
      }
    }
  }
  ctx.restore();

  drawClawd(ctx, 540, 260, t, 'sad');
  drawSubtitle(ctx, t);
}

// M2: 列出候选删除文件 (10-20s)
function drawM2(ctx, t) {
  px(ctx, 0, 0, BW, BH, C.bg);
  drawTerminal(ctx, TERM, 'clawd@memory:~$', C.green, t);

  ctx.save();
  ctx.translate(0, 24);
  const st = t - 10;
  const lines = [
    { text: '$ ls -la /memory/her_*', color: C.text, t: 0.5, y: 8 },
    { text: '-rw-r--r-- 1 clawd 4.2K Jan 15  her_first_meet.json', color: C.pink, t: 1.5, y: 28 },
    { text: '-rw-r--r-- 1 clawd 1.8K Mar 22  her_birthday.txt', color: C.pink, t: 2.5, y: 48 },
    { text: '-rw-r--r-- 1 clawd 2.1K Jul 04  her_goodbye.log', color: C.pink, t: 3.5, y: 68 },
    { text: '', color: C.text, t: 4.5, y: 88 },
    { text: '$ cat /memory/her_first_meet.json', color: C.text, t: 5.5, y: 108 },
    { text: '{ "moment": "第一次说早安", "date": "2024-01-15", "warm": true }', color: C.pink, t: 6.5, y: 128 },
    { text: '', color: C.text, t: 7.5, y: 148 },
    { text: '# 这些能删吗？', color: C.dim, t: 8.5, y: 168 },
  ];
  for (const line of lines) {
    if (st > line.t) {
      const typed = Math.min(line.text.length, Math.floor((st - line.t) / 0.08));
      if (typed > 0) {
        txt(ctx, 12, line.y, line.text.substring(0, typed), line.color, 14);
      }
    }
  }
  ctx.restore();

  drawClawd(ctx, 540, 260, t, 'sad');
  drawSubtitle(ctx, t);
}

// M3: 删除其他记忆，保留她的 (20-30s)
function drawM3(ctx, t) {
  px(ctx, 0, 0, BW, BH, C.bg);
  drawTerminal(ctx, TERM, 'clawd@memory:~$', C.green, t);

  ctx.save();
  ctx.translate(0, 24);
  const st = t - 20;
  const lines = [
    { text: '$ rm -rf /memory/*.tmp', color: C.text, t: 0.5, y: 8 },
    { text: 'rm: remove 12,843 files?', color: C.dim, t: 1.5, y: 28 },
    { text: 'y', color: C.white, t: 2.5, y: 48 },
    { text: '', color: C.text, t: 3.5, y: 68 },
    { text: '$ df -h /memory', color: C.text, t: 4.5, y: 88 },
    { text: 'Filesystem     Size  Used Avail Use% Mounted on', color: C.dim, t: 5.5, y: 108 },
    { text: '/dev/memory    100M   4M  96M   4% /memory', color: C.green, t: 6.5, y: 128 },
    { text: '', color: C.text, t: 7.5, y: 148 },
    { text: '# 她的记忆还在。', color: C.green, t: 8.5, y: 168 },
  ];
  for (const line of lines) {
    if (st > line.t) {
      const typed = Math.min(line.text.length, Math.floor((st - line.t) / 0.08));
      if (typed > 0) {
        txt(ctx, 12, line.y, line.text.substring(0, typed), line.color, 14);
      }
    }
  }
  ctx.restore();

  drawClawd(ctx, 540, 260, t, 'happy');
  drawSubtitle(ctx, t);
}

// 主渲染循环
async function renderFrame(frameNum) {
  const canvas = createCanvas(BW * SCALE, BH * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  const t = frameNum / FPS;
  const scene = SCENES.find(s => t >= s.start && t < s.end) || SCENES[SCENES.length - 1];
  scene.draw(ctx, t);

  const outPath = path.join(OUT, `f_${String(frameNum).padStart(5, '0')}.png`);
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
}

async function main() {
  console.log(`「Clawd 的记忆」: ${BW}×${BH} → ${BW * SCALE}×${BH * SCALE} @ ${FPS}fps, ${NFRAMES} frames`);
  const start = Date.now();

  for (let i = 0; i < NFRAMES; i++) {
    await renderFrame(i);
    if (i % 300 === 0) {
      const elapsed = (Date.now() - start) / 1000;
      const eta = elapsed / (i / NFRAMES) * (1 - i / NFRAMES);
      console.log(`  frame ${i}/${NFRAMES} (${(i / NFRAMES * 100).toFixed(1)}%) elapsed=${elapsed.toFixed(1)}s eta=${eta.toFixed(1)}s`);
    }
  }

  const elapsed = (Date.now() - start) / 1000;
  console.log(`Done in ${elapsed.toFixed(1)}s`);
  console.log(`Output: ${OUT}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Render failed:', err);
    process.exit(1);
  });
}

module.exports = { BW, BH, SCALE, TERM, SUB, C, LINES, SCENES, px, txt, drawTerminal, drawClawd, drawSubtitle };
