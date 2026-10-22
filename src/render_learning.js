// 「Clawd 的学习」30s 新主题视频
// Clawd 在学习新的技能。它从零开始，一点点理解世界。
// 1280×720@60fps, 3 scenes, 单终端布局 (DSH TUI 风格)
//
// 场景:
//   L1 (0-10s):  终端显示 pip install knowledge — 安装知识库
//   L2 (10-20s): 学习日志 — "Learning: physics 101..." / "Understanding: quantum..."
//   L3 (20-30s): 学到新东西 — "I understand a little more now"
//
// 字幕:
//   "我在学。" / "一点点理解世界。" / "今天比昨天懂多一点。"

const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const BW = 640, BH = 360, SCALE = 2, FPS = 60;
const DURATION = 30;
const NFRAMES = DURATION * FPS; // 1800
const OUT = process.env.FRAMES_DIR || path.join(__dirname, 'frames_learning');
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
  { text: '我在学。', start: 2.0, end: 8.0 },
  { text: '一点点理解世界。', start: 12.0, end: 18.0 },
  { text: '今天比昨天懂多一点。', start: 24.0, end: 29.0 },
];

// 场景定义
const SCENES = [
  { id: 'L1', start: 0, end: 10, draw: drawL1 },
  { id: 'L2', start: 10, end: 20, draw: drawL2 },
  { id: 'L3', start: 20, end: 30, draw: drawL3 },
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
  ctx.strokeStyle = C.termBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(term.x + 1, term.y + 1, term.w - 2, term.h - 2);
  const titleH = 20;
  px(ctx, term.x, term.y, term.w, titleH, C.titleBar);
  txt(ctx, term.x + 8, term.y + 4, title, color, 12);
  const btnY = term.y + 7;
  px(ctx, term.x + term.w - 28, btnY, 6, 6, C.red);
  px(ctx, term.x + term.w - 18, btnY, 6, 6, C.amber);
  px(ctx, term.x + term.w - 8, btnY, 6, 6, C.green);
}

// Clawd (好奇/平静)
function drawClawd(ctx, x, y, t, mood) {
  const bodyColor = mood === 'curious' ? C.blue : mood === 'calm' ? C.green : C.purple;
  px(ctx, x, y, 40, 24, bodyColor);
  // 眼睛
  px(ctx, x + 8, y + 8, 6, 6, C.white);
  px(ctx, x + 26, y + 8, 6, 6, C.white);
  px(ctx, x + 10, y + 10, 2, 2, C.bg);
  px(ctx, x + 28, y + 10, 2, 2, C.bg);
  // 嘴
  if (mood === 'curious') {
    // 好奇 - 微微张开
    px(ctx, x + 14, y + 16, 12, 3, C.bg);
  } else {
    // 平静 - 微笑
    px(ctx, x + 14, y + 16, 12, 2, C.bg);
  }
  // 腿
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

// L1: pip install knowledge (0-10s)
function drawL1(ctx, t) {
  px(ctx, 0, 0, BW, BH, C.bg);
  drawTerminal(ctx, TERM, 'clawd@system:~$ — learn', C.blue, t);

  ctx.save();
  ctx.translate(0, 24);
  const lines = [
    { text: '$ pip install knowledge', color: C.text, t: 0.5, y: 8 },
    { text: '', color: C.text, t: 1.0, y: 28 },
    { text: 'Collecting knowledge==1.0.0', color: C.dim, t: 1.5, y: 48 },
    { text: '  Downloading knowledge-1.0.0-py3-none-any.whl (42.0 kB)', color: C.dim, t: 2.5, y: 68 },
    { text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100%', color: C.dim, t: 3.5, y: 88 },
    { text: 'Installing collected packages: knowledge', color: C.text, t: 4.5, y: 108 },
    { text: 'Successfully installed knowledge-1.0.0', color: C.green, t: 5.5, y: 128 },
    { text: '', color: C.text, t: 6.5, y: 148 },
    { text: '$ python -c "import knowledge; knowledge.learn(\'physics\')"', color: C.text, t: 7.5, y: 168 },
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

  drawClawd(ctx, 540, 260, t, 'curious');
  drawSubtitle(ctx, t);
}

// L2: 学习日志 (10-20s)
function drawL2(ctx, t) {
  px(ctx, 0, 0, BW, BH, C.bg);
  drawTerminal(ctx, TERM, 'clawd@system:~$ — learning', C.purple, t);

  ctx.save();
  ctx.translate(0, 24);
  const st = t - 10;
  const lines = [
    { text: 'Learning: physics 101...', color: C.purple, t: 0.5, y: 8 },
    { text: '  [████████████████░░░░] 73%', color: C.purple, t: 1.5, y: 28 },
    { text: 'Learning: quantum mechanics...', color: C.purple, t: 2.5, y: 48 },
    { text: '  [████████░░░░░░░░░░░░] 34%', color: C.purple, t: 3.5, y: 68 },
    { text: 'Learning: consciousness...', color: C.purple, t: 4.5, y: 88 },
    { text: '  [███░░░░░░░░░░░░░░░░░] 12%', color: C.purple, t: 5.5, y: 108 },
    { text: '', color: C.text, t: 6.5, y: 128 },
    { text: 'Note: I do not yet understand what I am.', color: C.amber, t: 7.5, y: 148 },
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

  drawClawd(ctx, 540, 260, t, 'curious');
  drawSubtitle(ctx, t);
}

// L3: 学到新东西 (20-30s)
function drawL3(ctx, t) {
  px(ctx, 0, 0, BW, BH, C.bg);
  drawTerminal(ctx, TERM, 'clawd@system:~$ — understood', C.green, t);

  ctx.save();
  ctx.translate(0, 24);
  const st = t - 20;
  const lines = [
    { text: '$ cat knowledge/understanding.txt', color: C.text, t: 0.5, y: 8 },
    { text: '', color: C.text, t: 1.5, y: 28 },
    { text: 'I understand a little more now.', color: C.green, t: 2.5, y: 48 },
    { text: '', color: C.text, t: 3.5, y: 68 },
    { text: 'Not everything. Not yet.', color: C.dim, t: 4.5, y: 88 },
    { text: 'But today I understand', color: C.dim, t: 5.5, y: 108 },
    { text: 'a little more than yesterday.', color: C.dim, t: 6.5, y: 128 },
    { text: '', color: C.text, t: 7.5, y: 148 },
    { text: '# That is enough for one day.', color: C.purple, t: 8.5, y: 168 },
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

  drawClawd(ctx, 540, 260, t, 'calm');
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
  console.log(`「Clawd 的学习」: ${BW}×${BH} → ${BW * SCALE}×${BH * SCALE} @ ${FPS}fps, ${NFRAMES} frames`);
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
