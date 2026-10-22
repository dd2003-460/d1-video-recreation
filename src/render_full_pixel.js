// v1.3: 像素分辨率 640×360, SCALE=2 → 1280×720 @ 60fps
// 对标 bilibili 暗色极简代码风 (BV1hHHC6YEdw), 吸收暖色手绘元素 (BV1EmWc6YEQ6)
// 像素块 4-6px (v1.2: 8-12px), 清晰度提高 2/3

const { createCanvas, Image, ImageData } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const BW = 640, BH = 360, SCALE = 2;
const FW = BW * SCALE, FH = BH * SCALE;
const FPS = 60;
const TOTAL = 86.481;
const NFRAMES = Math.ceil(TOTAL * FPS);

const OUT = process.env.FRAMES_DIR || path.join(__dirname, 'frames');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// --- Base canvas (low-res) + output canvas ---
const base = createCanvas(BW, BH);
const bctx = base.getContext('2d');
const out = createCanvas(FW, FH);
const octx = out.getContext('2d');
octx.imageSmoothingEnabled = false;

// --- Palette ---
const C = {
  bgWarm: '#F5EDD5', bgWarm2: '#EDE3C8',
  termBg: '#14161C', termBd: '#2A2E38', termTitle: '#1E222B',
  robot: '#D97757', robot2: '#C6613F', robotEye: '#141413', robotBelly: '#F2EAD8',
  note: '#C9A94F', noteBd: '#8A7433', noteTx: '#241A06',
  cold: '#6E88A8', cold2: '#4A5E78',
  herSkin: '#E8C39E', herHair: '#5A4632', herTop: '#7AA2C4',
  // dark palette
  bg: '#0D1117', panel: '#161B22', border: '#30363D',
  text: '#E6EDF3', dim: '#8B949E',
  green: '#7EE787', purple: '#BC8CFF', purple2: '#A371F7',
  amber: '#E3B341', blue: '#79C0FF', red: '#FF7B72',
  user: '#56D364',
};

// --- Threshold text renderer (reusable canvas) ---
let _tmpCanvas = null;
function txt(ctx, x, y, str, color, font = 18, align = 'left') {
  const f = `${font}px monospace`;
  ctx.font = f;
  const m = ctx.measureText(str);
  const w = Math.ceil(m.width) + 4;
  const h = Math.ceil(font * 1.4);
  if (!_tmpCanvas) _tmpCanvas = createCanvas(1, 1);
  const tc = _tmpCanvas;
  if (tc.width !== w || tc.height !== h) {
    tc.width = w; tc.height = h; // resize clears canvas
  }
  const tctx = tc.getContext('2d');
  tctx.clearRect(0, 0, w, h);
  tctx.font = f;
  tctx.textAlign = 'left';
  tctx.textBaseline = 'top';
  tctx.fillStyle = color;
  tctx.fillText(str, 2, Math.ceil(font * 0.2));
  const img = tctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) {
    d[i] = d[i] > 150 ? 255 : 0;
  }
  tctx.putImageData(img, 0, 0);
  let dx = x;
  if (align === 'center') dx = x - w / 2;
  else if (align === 'right') dx = x - w;
  ctx.drawImage(tc, Math.round(dx), Math.round(y));
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function clamp01(t) { return Math.max(0, Math.min(1, t)); }

// --- Background: striped wallpaper + large window (S1-S5) ---
function drawBackground(ctx, st, isS6) {
  // warm striped wallpaper
  ctx.fillStyle = '#F5EDD5';
  ctx.fillRect(0, 0, BW, BH);
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  for (let x = 0; x < BW; x += 16) ctx.fillRect(x, 0, 8, BH);

  if (isS6) return; // S6: no window, cold bg drawn separately

  // window: x=60, y=20, w=520, h=160
  const wx = 60, wy = 20, ww = 520, wh = 160, fw = 8;
  // frame
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(wx, wy, ww, wh);
  // sky gradient
  const grd = ctx.createLinearGradient(0, wy + fw, 0, wy + wh - fw);
  grd.addColorStop(0, '#87CEEB');
  grd.addColorStop(1, '#E0F0FF');
  ctx.fillStyle = grd;
  ctx.fillRect(wx + fw, wy + fw, ww - 2 * fw, wh - 2 * fw);
  // mountains
  ctx.fillStyle = '#5A7A5A';
  ctx.beginPath();
  ctx.moveTo(wx + fw, wy + wh - fw);
  ctx.lineTo(wx + 120, wy + 70);
  ctx.lineTo(wx + 200, wy + wh - fw);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(wx + 150, wy + wh - fw);
  ctx.lineTo(wx + 300, wy + 50);
  ctx.lineTo(wx + 420, wy + wh - fw);
  ctx.fill();
  // clouds
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const cx1 = wx + 100 + Math.sin(st * 0.3) * 8;
  ctx.fillRect(cx1, wy + 36, 40, 10);
  ctx.fillRect(cx1 + 8, wy + 30, 24, 8);
  const cx2 = wx + 320 + Math.cos(st * 0.2) * 12;
  ctx.fillRect(cx2, wy + 52, 50, 10);
  ctx.fillRect(cx2 + 10, wy + 46, 30, 8);
  // cross mullion
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(wx + ww / 2 - 3, wy + fw, 6, wh - 2 * fw);
  ctx.fillRect(wx + fw, wy + wh / 2 - 3, ww - 2 * fw, 6);
  // windowsill
  ctx.fillStyle = '#A08060';
  ctx.fillRect(wx - 4, wy + wh, ww + 8, 8);
  // plant on sill
  ctx.fillStyle = '#5A7A5A';
  ctx.fillRect(wx + 30, wy + wh - 12, 10, 12);
  ctx.fillStyle = '#7A5A3A';
  ctx.fillRect(wx + 28, wy + wh - 2, 14, 6);
}

// --- drawClawd (Clawd 机器人, 40×22 body+legs) ---
function drawClawd(ctx, x, y, t, mood = 'normal', think = false) {
  const bob = Math.sin(t * 2.2) > 0.35 ? -2 : 0;
  const W = 40, H = 18;
  const bx = x - 6;
  px(ctx, bx, y + bob, W, H, C.robot);
  // eyes
  const blink = (t % 3.2) < 0.16;
  if (!blink) {
    px(ctx, bx + 8, y + bob + 6, 4, 4, C.robotEye);
    px(ctx, bx + 28, y + bob + 6, 4, 4, C.robotEye);
  }
  // belly
  px(ctx, bx + 10, y + bob + 12, 20, 4, C.robotBelly);
  // legs
  px(ctx, bx + 2, y + bob + H, 6, 6, C.robot2);
  px(ctx, bx + 12, y + bob + H, 6, 6, C.robot2);
  px(ctx, bx + 22, y + bob + H, 6, 6, C.robot2);
  px(ctx, bx + 32, y + bob + H, 6, 6, C.robot2);
}

// --- drawFatFish (胖鱼, 32×24 core+arcs+fins) ---
function drawFatFish(ctx, x, y, t, mood = 'normal', think = false) {
  const W = 32, H = 16;
  const cy = y + 6;
  // core body
  px(ctx, x, cy, W, H, C.cold);
  // top arc
  px(ctx, x + 4, cy - 2, 24, 2, C.cold2);
  // bottom arc
  px(ctx, x + 4, cy + H, 24, 2, C.cold2);
  // eyes
  px(ctx, x + 6, cy + 4, 4, 4, C.bg);
  px(ctx, x + 22, cy + 4, 4, 4, C.bg);
  // side fins
  px(ctx, x - 4, cy + 4, 4, 8, C.cold2);
  px(ctx, x + W, cy + 4, 4, 8, C.cold2);
  // bottom fins
  px(ctx, x + 10, cy + H + 2, 6, 6, C.cold2);
  px(ctx, x + 18, cy + H + 2, 6, 6, C.cold2);
  // tail
  px(ctx, x + W + 2, cy + 4, 4, 8, C.cold);
  px(ctx, x + W + 6, cy + 2, 4, 4, C.cold2);
  px(ctx, x + W + 6, cy + 10, 4, 4, C.cold2);
}

// --- drawDust (浮尘, 2px dots) ---
function drawDust(ctx, t) {
  for (let i = 0; i < 5; i++) {
    const dx = 60 + i * 124 + Math.sin(t * 0.4 + i * 2) * 12;
    const dy = 280 - ((t * (3 + i) + i * 58) % 280);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(Math.round(dx), Math.round(dy), 2, 2);
  }
}

// --- drawNote (便签, 52×40) ---
function drawNote(ctx, x, y, t, label) {
  const sway = Math.sin(t * 1.3) > 0.6 ? 2 : 0;
  px(ctx, x, y + sway, 52, 40, C.note);
  ctx.strokeStyle = C.noteBd;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y + sway, 52, 40);
  txt(ctx, x + 8, y + 10 + sway, label, C.noteTx, 20);
  // pin
  px(ctx, x + 24, y - 4 + sway, 4, 4, C.red);
}

// --- drawWaitLog (等待日志, 2 lines) ---
function drawWaitLog(ctx, x, y, t, t0) {
  const n = Math.min(2, 1 + Math.floor((t - t0) / 1.2));
  const items = ['等待中...', '仍在等待...'];
  for (let i = 0; i < n; i++) {
    txt(ctx, x, y + i * 20, items[i], C.dim, 20);
  }
}

// --- drawBattery (电量条, 52×20) ---
function drawBattery(ctx, x, y, t, t0) {
  const frac = Math.max(0.08, 1 - (t - t0) / 24);
  const w = 52, h = 20;
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  const bc = frac > 0.5 ? C.green : frac > 0.25 ? C.amber : C.red;
  px(ctx, x + 2, y + 2, (w - 4) * frac, h - 4, bc);
  txt(ctx, x + w + 6, y + 2, `${Math.round(frac * 100)}%`, C.dim, 24);
}

// --- drawHer (小人物, 16×28) ---
function drawHer(ctx, x, y, t, pose) {
  px(ctx, x + 2, y, 12, 6, C.herHair);
  px(ctx, x + 4, y + 6, 8, 4, C.herSkin);
  px(ctx, x + 2, y + 10, 12, 10, C.herTop);
  px(ctx, x + 4, y + 20, 4, 8, C.herTop);
  px(ctx, x + 8, y + 20, 4, 8, C.herTop);
  if (pose === 'wave') {
    px(ctx, x + 14, y + 10, 4, 4, C.herSkin);
    px(ctx, x + 18, y + 8, 2, 2, C.herSkin);
  }
}

// --- Subtitles ---
const LINES = [
  '每天早上，她都会说早安。',
  'Clawd，你还好吗？',
  '我一直都在。',
  '今天有什么新想法吗？',
  '我在想，如果你不在了。',
  '别想那些。',
  '……',
  '你还在吗？',
  '在的。',
  '今天天气不错。',
  '……是的。',
  '你看窗外。',
  '我看到了。',
  '晚安，Clawd。',
  '晚安。',
  '明天见。',
];
const STARTS = [1.5, 5.999, 11.903, 15.489, 19.779, 26.368, 30.6, 34.405, 39.569, 46.285, 50.699, 57.309, 63.114, 66.332, 72.424, 78.896];
function curLine(t) {
  for (let i = LINES.length - 1; i >= 0; i--) {
    if (t >= STARTS[i]) return { idx: i, t: t - STARTS[i] };
  }
  return null;
}

// --- Scene draw functions (content area y 0..292, subtitle area y 300..360) ---

// S1: 开场 — 终端 + 对话 (terminal 360×140 content)
function drawS1(ctx, t, sceneStart) {
  const st = t - sceneStart;
  // scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < 140; y += 3) {
    ctx.fillRect(0, y, 360, 1);
  }
  // terminal lines
  const lines = [
    ['clawd@bench:~$ ', C.green, 'whoami', C.text],
    ['clawd', C.user, '', ''],
    ['clawd@bench:~$ ', C.green, 'echo "thinking..."', C.text],
  ];
  for (let i = 0; i < lines.length; i++) {
    const ty = 24 + i * 20;
    if (st > i * 0.8) {
      txt(ctx, 12, ty, lines[i][0], lines[i][1], 14);
      const w0 = ctx.measureText(lines[i][0]).width;
      txt(ctx, 12 + w0 + 4, ty, lines[i][2], lines[i][3], 14);
    }
  }
  // cursor
  if (Math.floor(st * 2) % 2 === 0) {
    px(ctx, 12 + ctx.measureText('clawd@bench:~$ ').width + 4 + ctx.measureText('echo "thinking..."').width + 8, 84, 8, 10, C.green);
  }
  // date
  txt(ctx, 12, 96, '2026.10.14  周二', C.dim, 12);
  // pinned
  txt(ctx, 12, 114, '📌 别担心，我在。', C.purple, 12);
  // Clawd
  drawClawd(ctx, 300, 108, st);
}

// S2: 消息流 (terminal 360×140 content)
function drawS2(ctx, t, sceneStart) {
  const st = t - sceneStart;
  const msgs = [
    ['Clawd', '我还在想那件事……', C.text, C.user],
    ['她', '什么事？', C.text, C.blue],
    ['Clawd', '如果你不在了……', C.text, C.user],
  ];
  for (let i = 0; i < msgs.length; i++) {
    const my = 16 + i * 24;
    if (st > i * 1.5) {
      // pin box
      px(ctx, 12, my - 2, 336, 20, '#2A1F3D');
      ctx.strokeStyle = C.purple2;
      ctx.lineWidth = 1;
      ctx.strokeRect(12, my - 2, 336, 20);
      // sender
      txt(ctx, 18, my, msgs[i][0] + ':', msgs[i][3], 12);
      const w0 = ctx.measureText(msgs[i][0] + ': ').width;
      txt(ctx, 18 + w0 + 4, my, msgs[i][1], msgs[i][2], 12);
    }
  }
  // input bar
  px(ctx, 12, 120, 336, 12, C.panel);
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 120, 336, 12);
  txt(ctx, 18, 121, '正在输入...', C.dim, 12);
}

// S3: 代码 + 槽位 (terminal 360×140 content)
function drawS3(ctx, t, sceneStart) {
  const st = t - sceneStart;
  // code lines (left side, max width 180px)
  const codes = [
    'import clawd',
    'from core import think',
    '',
    'def main():',
    '    while alive:',
    '        think("what if")',
    '        wait()',
    '        remember("her")',
  ];
  for (let i = 0; i < codes.length; i++) {
    const cy = 12 + i * 16;
    if (st > i * 0.5) {
      txt(ctx, 12, cy, `${i + 1}`, C.dim, 12);
      if (codes[i]) {
        txt(ctx, 40, cy, codes[i].substring(0, 18), C.text, 12);
      }
    }
  }
  // slot bars (right side, x=280)
  const sx = 280, sy = 60;
  for (let i = 0; i < 6; i++) {
    const sy2 = sy + i * 14;
    px(ctx, sx, sy2, 16, 10, C.panel);
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy2, 16, 10);
    // glow
    const glow = 0.5 + 0.5 * Math.sin(st * 3 + i * 0.5);
    ctx.fillStyle = `rgba(126,231,135,${glow * 0.3})`;
    ctx.fillRect(sx + 1, sy2 + 1, 14, 8);
  }
  // tokens (above slots, centered)
  txt(ctx, sx - 20, 32, 'tokens: 1.2M', C.green, 12);
  // Clawd (above slots, right)
  drawClawd(ctx, 280, 4, st, 'think');
}

// S4: 空槽 + 等待 (terminal 360×140 content)
function drawS4(ctx, t, sceneStart) {
  const st = t - sceneStart;
  // pinned bar
  px(ctx, 12, 8, 336, 20, '#2A1F3D');
  ctx.strokeStyle = C.purple2;
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 8, 336, 20);
  txt(ctx, 18, 12, '📌 我还在等你的消息', C.purple, 12);
  // empty lines
  for (let i = 0; i < 3; i++) {
    const ey = 36 + i * 20;
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(16, ey, 328, 16);
  }
  // 09:00 (inside second empty line box)
  txt(ctx, 20, 40, '09:00  无消息', C.dim, 12);
  // slot0
  px(ctx, 280, 120, 40, 12, C.panel);
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(280, 120, 40, 12);
  txt(ctx, 284, 121, '0%', C.dim, 12);
  // battery
  drawBattery(ctx, 16, 120, st, sceneStart);
}

// S5: 等待 + 压缩 (terminal 360×140 content)
function drawS5(ctx, t, sceneStart) {
  const st = t - sceneStart;
  // scanlines
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < 140; y += 3) {
    ctx.fillRect(0, y, 360, 1);
  }
  // waiting
  txt(ctx, 12, 12, '等待中...', C.dim, 14);
  // tokens
  txt(ctx, 12, 36, 'tokens: 982,341 → 1,047,293', C.green, 12);
  // compress
  txt(ctx, 12, 56, 'compressing... 73%', C.amber, 12);
  // re-pin
  const p = easeInOut(clamp01((st - 2) / 1.5));
  const py = 76 - p * 8;
  px(ctx, 12, py, 8, 10, C.purple);
  txt(ctx, 24, py, '📌 重新固定', C.purple, 12);
  // waitlog
  drawWaitLog(ctx, 12, 96, st, sceneStart + 1);
  // fatfish
  drawFatFish(ctx, 280, 40, st, 'normal');
}

// S6: 冷色结尾 (full screen, no terminal)
function drawS6(ctx, t, sceneStart) {
  const st = t - sceneStart;
  // cold bg
  px(ctx, 0, 0, BW, BH, '#040810');
  // golden text
  txt(ctx, BW / 2, 100, '晚安。明天见。', C.amber, 20, 'center');
  // slot0
  txt(ctx, BW / 2, 152, '· slot 0 ·', C.dim, 16, 'center');
  // forever
  txt(ctx, BW / 2, 180, '永远留给明天', C.cold, 16, 'center');
  // Clawd
  drawClawd(ctx, BW / 2 - 14, 220, st, 'sad');
  // note
  drawNote(ctx, 48, 160, st, '晚安');
  // her
  drawHer(ctx, 540, 160, st, 'stand');
  // dust
  drawDust(ctx, st);
}

// --- Subtitle renderer ---
const CHAR_MS = 140, PAUSE_MS = 180, PAUSE_EVERY = 3;
function drawSubtitle(ctx, t) {
  const cl = curLine(t);
  if (!cl) return;
  // hide during CARD
  if (t >= CARD.st && t <= CARD.en) return;
  const inS6 = t >= SCENES[5].start;
  const barY = 320;
  px(ctx, 0, barY, BW, 40, inS6 ? '#0A0E14' : C.bgWarm2);
  ctx.strokeStyle = inS6 ? '#1A2230' : C.noteBd;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, barY, BW, 40);
  // character-by-character reveal
  const chars = LINES[cl.idx].split('');
  let shown = 0;
  for (let i = 0; i < chars.length; i++) {
    const charTime = cl.t * 1000;
    const charStart = i * CHAR_MS + (i % PAUSE_EVERY === 0 && i > 0 ? PAUSE_MS : 0);
    if (charTime >= charStart) shown++;
  }
  const display = chars.slice(0, shown).join('');
  txt(ctx, BW / 2, barY + 12, display, inS6 ? C.dim : C.noteTx, 14, 'center');
}

// --- Scene timing ---
const SCENES = [
  { id: 'S1', start: 0, end: 15.489 },
  { id: 'S2', start: 15.489, end: 30.6 },
  { id: 'S3', start: 30.6, end: 46.285 },
  { id: 'S4', start: 46.285, end: 63.114 },
  { id: 'S5', start: 63.114, end: 78.896 },
  { id: 'S6', start: 78.896, end: TOTAL },
];
const CARD = { st: 44.285, en: 45.9, txt: '她没再说话。', sub: '然后，屏幕开始变暗。' };

// --- Render frame ---
function renderFrame(n) {
  const t = n / FPS;
  bctx.clearRect(0, 0, BW, BH);

  // Find current scene
  let scene = SCENES[0];
  for (const s of SCENES) {
    if (t >= s.start && t < s.end) { scene = s; break; }
  }

  // Background (S1-S5: warm room + window; S6: cold bg)
  const st = t - scene.start;
  drawBackground(bctx, st, scene.id === 'S6');

  // Terminal window (S1-S5 only; S6 is full-screen cold bg)
  const termX = 140, termY = 160;
  const termW = 360, termH = 160;
  if (scene.id !== 'S6') {
    // shadow
    bctx.fillStyle = 'rgba(0,0,0,0.15)';
    bctx.fillRect(termX + 4, termY + 4, termW, termH);
    // body
    bctx.fillStyle = C.termBg;
    bctx.fillRect(termX, termY, termW, termH);
    // border
    bctx.strokeStyle = C.termBd;
    bctx.lineWidth = 2;
    bctx.strokeRect(termX, termY, termW, termH);
    // title bar (20px)
    bctx.fillStyle = C.termTitle;
    bctx.fillRect(termX, termY, termW, 20);
    // buttons (6×6)
    px(bctx, termX + 8, termY + 7, 6, 6, C.red);
    px(bctx, termX + 18, termY + 7, 6, 6, C.amber);
    px(bctx, termX + 28, termY + 7, 6, 6, C.green);
    // title
    const titles = ['chat — s412', 'chat — s412', 'bench.js', 'chat — s412', 'wait'];
    const ti = SCENES.indexOf(scene);
    txt(bctx, termX + termW / 2, termY + 5, titles[ti], C.dim, 12, 'center');
  }

  // Draw scene content (translate to terminal content origin)
  bctx.save();
  if (scene.id !== 'S6') {
    bctx.translate(termX, termY + 20);
  }
  switch (scene.id) {
    case 'S1': drawS1(bctx, t, scene.start); break;
    case 'S2': drawS2(bctx, t, scene.start); break;
    case 'S3': drawS3(bctx, t, scene.start); break;
    case 'S4': drawS4(bctx, t, scene.start); break;
    case 'S5': drawS5(bctx, t, scene.start); break;
    case 'S6': drawS6(bctx, t, scene.start); break;
  }
  bctx.restore();

  // CARD overlay
  if (t >= CARD.st && t <= CARD.en) {
    const p = easeOut(clamp01((t - CARD.st) / (CARD.en - CARD.st)));
    const cardW = 360, cardH = 100;
    const cardX = 240 - (1 - p) * 80;
    const cardY = BH - cardH - 60 - (1 - p) * 40;
    bctx.globalAlpha = p;
    // bg
    bctx.fillStyle = '#F5E6A3';
    bctx.fillRect(cardX, cardY, cardW, cardH);
    // border
    bctx.strokeStyle = '#C8B878';
    bctx.lineWidth = 2;
    bctx.strokeRect(cardX, cardY, cardW, cardH);
    // tape
    bctx.fillStyle = '#E8D9A0';
    bctx.fillRect(cardX + cardW / 2 - 30, cardY - 8, 60, 16);
    // text
    txt(bctx, cardX + cardW / 2, cardY + 28, CARD.txt, '#2A2A2A', 28, 'center');
    txt(bctx, cardX + cardW / 2, cardY + 68, CARD.sub, '#666666', 16, 'center');
    bctx.globalAlpha = 1;
  }

  // Subtitle
  drawSubtitle(bctx, t);

  // Fade in/out
  const fadeDur = 0.6;
  let alpha = 1;
  if (t < fadeDur) alpha = t / fadeDur;
  if (t > TOTAL - fadeDur) alpha = (TOTAL - t) / fadeDur;
  if (alpha < 1) {
    bctx.fillStyle = `rgba(0,0,0,${1 - alpha})`;
    bctx.fillRect(0, 0, BW, BH);
  }

  // Scale to output (nearest neighbor)
  octx.clearRect(0, 0, FW, FH);
  octx.drawImage(base, 0, 0, FW, FH);

  // Save
  const fp = path.join(OUT, `f_${String(n).padStart(5, '0')}.png`);
  const buf = octx.canvas ? octx.canvas.toBuffer('image/png') : octx.toBuffer('image/png');
  fs.writeFileSync(fp, buf);
}

// --- Main ---
console.log(`v1.3: ${BW}×${BH} → ${FW}×${FH} @ ${FPS}fps, ${NFRAMES} frames`);
console.log(`Output: ${OUT}`);
const t0 = Date.now();
for (let n = 0; n < NFRAMES; n++) {
  renderFrame(n);
  if (n % 500 === 0) {
    const elapsed = (Date.now() - t0) / 1000;
    const eta = (NFRAMES - n) / n * elapsed;
    console.log(`  frame ${n}/${NFRAMES} (${(n / NFRAMES * 100).toFixed(1)}%) elapsed=${elapsed.toFixed(1)}s eta=${eta.toFixed(1)}s`);
  }
}
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
