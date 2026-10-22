// 「Clawd 的早安」30s 新主题视频
// 1280×720@60fps, 3 scenes, v1.3.4 风格 (暖色房间+窗户+小终端)
// 场景: G1 晨窗 (0-10s) / G2 消息气泡 (10-20s) / G3 暖色收尾 (20-30s)

const { createCanvas, Image } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const BW = 640, BH = 360, SCALE = 2, FPS = 60;
const DURATION = 30;
const NFRAMES = DURATION * FPS; // 1800
const OUT = process.env.FRAMES_DIR || path.join(__dirname, 'frames_goodmorning');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Palette
const C = {
  bgWarm: '#F5EDD5',
  stripe: '#EDE3C8',
  frame: '#8B7355',
  sky: '#87CEEB',
  skyLight: '#E0F0FF',
  mountain: '#5A7A5A',
  mountainFar: '#7A9A7A',
  cloud: '#FFFFFF',
  plant: '#4A7A4A',
  pot: '#8B5E3C',
  terminal: '#1A1A2E',
  terminalBorder: '#333355',
  titleBar: '#252540',
  text: '#E0E0E0',
  dim: '#666688',
  green: '#7EE787',
  amber: '#FFB347',
  pink: '#FF9AA2',
  blue: '#82AAFF',
  purple: '#BB9AF7',
  red: '#FF5555',
  yellow: '#FFD700',
  white: '#FFFFFF',
  subtitleBg: 'rgba(0,0,0,0.6)',
  cardBg: '#FFF8DC',
  cardBorder: '#DEB887',
};

// Text renderer (threshold-based)
let _tmpCanvas = null;
function txt(ctx, x, y, text, color, size) {
  if (!_tmpCanvas) _tmpCanvas = createCanvas(2048, 128);
  const tc = _tmpCanvas.getContext('2d');
  tc.clearRect(0, 0, 2048, 128);
  tc.font = `${size}px monospace`;
  tc.textBaseline = 'top';
  tc.fillStyle = '#000';
  tc.fillText(text, 4, 4);
  const img = new Image();
  img.src = _tmpCanvas.toBuffer('image/png');
  // Simple: just use fillText directly for now
  ctx.font = `${size}px monospace`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// Clawd character (40×22)
function drawClawd(ctx, x, y, t, pose) {
  const bob = Math.sin(t * 2) * 2;
  const by = y + bob;
  // Body
  px(ctx, x + 8, by, 24, 16, C.terminal);
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 8, by, 24, 16);
  // Eyes
  if (pose === 'happy') {
    px(ctx, x + 13, by + 5, 3, 3, C.green);
    px(ctx, x + 24, by + 5, 3, 3, C.green);
    // Smile
    ctx.beginPath();
    ctx.arc(x + 20, by + 10, 4, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = C.green;
    ctx.stroke();
  } else {
    px(ctx, x + 13, by + 5, 3, 3, C.green);
    px(ctx, x + 24, by + 5, 3, 3, C.green);
  }
  // Legs
  const legPhase = Math.sin(t * 4) * 2;
  px(ctx, x + 12, by + 16, 4, 6 + legPhase, C.dim);
  px(ctx, x + 24, by + 16, 4, 6 - legPhase, C.dim);
  // Antenna
  px(ctx, x + 19, by - 4, 2, 4, C.green);
  px(ctx, x + 18, by - 6, 4, 2, C.amber);
}

// Her character (16×28)
function drawHer(ctx, x, y, t) {
  const bob = Math.sin(t * 1.5 + 1) * 1;
  const by = y + bob;
  // Body
  px(ctx, x + 4, by + 8, 8, 12, C.pink);
  // Head
  px(ctx, x + 4, by, 8, 8, C.amber);
  // Hair
  px(ctx, x + 3, by, 10, 4, C.brown || '#654321');
  // Wave arm
  const wave = Math.sin(t * 3) * 3;
  px(ctx, x + 12, by + 8 + wave, 4, 3, C.pink);
  // Legs
  px(ctx, x + 5, by + 20, 3, 6, C.dim);
  px(ctx, x + 9, by + 20, 3, 6, C.dim);
}

// Background (warm room)
function drawBackground(ctx, st, isCold) {
  if (isCold) {
    px(ctx, 0, 0, BW, BH, '#040810');
    return;
  }
  // Warm stripes
  px(ctx, 0, 0, BW, BH, C.bgWarm);
  ctx.fillStyle = C.stripe;
  for (let x = 0; x < BW; x += 16) {
    ctx.fillRect(x, 0, 8, BH);
  }
  // Window
  const wx = 60, wy = 20, ww = 520, wh = 160;
  // Frame
  px(ctx, wx - 4, wy - 4, ww + 8, wh + 8, C.frame);
  // Sky
  const skyGrad = ctx.createLinearGradient(0, wy, 0, wy + wh);
  skyGrad.addColorStop(0, C.sky);
  skyGrad.addColorStop(1, C.skyLight);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(wx, wy, ww, wh);
  // Mountains
  ctx.fillStyle = C.mountainFar;
  ctx.beginPath();
  ctx.moveTo(wx, wy + wh);
  ctx.lineTo(wx + ww * 0.2, wy + wh * 0.5);
  ctx.lineTo(wx + ww * 0.4, wy + wh);
  ctx.fill();
  ctx.fillStyle = C.mountain;
  ctx.beginPath();
  ctx.moveTo(wx + ww * 0.5, wy + wh);
  ctx.lineTo(wx + ww * 0.7, wy + wh * 0.35);
  ctx.lineTo(wx + ww, wy + wh);
  ctx.fill();
  // Clouds (animated)
  const cloudX = (st * 10) % (ww + 80) - 40;
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(wx + cloudX, wy + 30, 12, 0, Math.PI * 2);
  ctx.arc(wx + cloudX + 15, wy + 28, 15, 0, Math.PI * 2);
  ctx.arc(wx + cloudX + 30, wy + 30, 12, 0, Math.PI * 2);
  ctx.fill();
  const cloudX2 = (st * 6 + 200) % (ww + 80) - 40;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(wx + cloudX2, wy + 60, 10, 0, Math.PI * 2);
  ctx.arc(wx + cloudX2 + 12, wy + 58, 12, 0, Math.PI * 2);
  ctx.fill();
  // Cross mullion
  ctx.fillStyle = C.frame;
  ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
  ctx.fillRect(wx, wy + wh / 2 - 2, ww, 4);
  // Windowsill
  px(ctx, wx - 8, wy + wh + 4, ww + 16, 6, C.frame);
  // Plant
  px(ctx, wx + ww - 40, wy + wh - 20, 16, 16, C.pot);
  ctx.fillStyle = C.plant;
  ctx.beginPath();
  ctx.arc(wx + ww - 32, wy + wh - 28, 8, 0, Math.PI * 2);
  ctx.fill();
}

// Terminal window
const termX = 140, termY = 160, termW = 360, termH = 160;
function drawTerminal(ctx, title, st) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(termX + 2, termY + 2, termW, termH);
  // Body
  px(ctx, termX, termY, termW, termH, C.terminal);
  // Border
  ctx.strokeStyle = C.terminalBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(termX, termY, termW, termH);
  // Title bar
  px(ctx, termX, termY, termW, 20, C.titleBar);
  // Buttons
  px(ctx, termX + 8, termY + 7, 6, 6, C.red);
  px(ctx, termX + 18, termY + 7, 6, 6, C.yellow);
  px(ctx, termX + 28, termY + 7, 6, 6, C.green);
  // Title
  txt(ctx, termX + 44, termY + 5, title, C.dim, 12);
}

// Subtitle
const LINES = [
  '早安，Clawd。',
  '窗外阳光真好。',
  '新的一天，新的开始。',
  '今天也要元气满满哦。',
];
const STARTS = [1.0, 8.0, 16.0, 24.0];
const CHAR_MS = 160;

function curLine(t) {
  for (let i = LINES.length - 1; i >= 0; i--) {
    if (t >= STARTS[i]) {
      const dur = (i < LINES.length - 1 ? STARTS[i + 1] : DURATION) - STARTS[i];
      return { idx: i, t: t - STARTS[i], dur };
    }
  }
  return null;
}

function drawSubtitle(ctx, t) {
  const line = curLine(t);
  if (!line) return;
  const barY = 320, barH = 40;
  ctx.fillStyle = C.subtitleBg;
  ctx.fillRect(0, barY, BW, barH);
  // Reveal chars
  const chars = LINES[line.idx].split('');
  const revealed = Math.min(chars.length, Math.floor(line.t / (CHAR_MS / 1000)) + 1);
  const visible = chars.slice(0, revealed).join('');
  if (visible) {
    ctx.font = '14px monospace';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.white;
    ctx.fillText(visible, BW / 2, barY + 12);
    ctx.textAlign = 'left';
  }
}

// G1: 晨窗 (0-10s) — 阳光 + 终端 echo
function drawG1(ctx, t) {
  drawBackground(ctx, t, false);
  // Sun in window
  const sunX = 120, sunY = 50;
  ctx.fillStyle = 'rgba(255,220,100,0.6)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,100,0.3)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 35, 0, Math.PI * 2);
  ctx.fill();
  // Light rays
  ctx.strokeStyle = 'rgba(255,220,100,0.2)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 0.3;
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(a) * 20, sunY + Math.sin(a) * 20);
    ctx.lineTo(sunX + Math.cos(a) * 40, sunY + Math.sin(a) * 40);
    ctx.stroke();
  }
  // Terminal
  drawTerminal(ctx, 'clawd@morning:~$', t);
  ctx.save();
  ctx.translate(termX, termY + 20);
  // Typed text (character by character)
  const msg1 = 'echo "早安"';
  const msg2 = '> 早安';
  const typed1 = Math.min(msg1.length, Math.floor(t / 0.15));
  const typed2 = t > 3 ? Math.min(msg2.length, Math.floor((t - 3) / 0.1)) : 0;
  txt(ctx, 12, 16, msg1.substring(0, typed1), C.text, 12);
  if (typed1 < msg1.length && t < 3) {
    px(ctx, 12 + typed1 * 7, 16, 6, 12, C.green);
  }
  if (typed2 > 0) {
    txt(ctx, 12, 36, msg2.substring(0, typed2), C.green, 12);
  }
  // Date
  if (t > 4) {
    txt(ctx, 12, 60, 'Tue Oct 22 07:00', C.dim, 10);
  }
  // Scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  for (let y = 0; y < termH - 20; y += 2) {
    ctx.fillRect(0, y, termW, 1);
  }
  ctx.restore();
  // Characters IN ROOM (not in terminal) — aligned with original video
  drawClawd(ctx, 300, 180, t, 'happy');
  drawHer(ctx, 350, 176, t);
  drawSubtitle(ctx, t);
}

// G2: 消息气泡 (10-20s) — 对话
function drawG2(ctx, t) {
  drawBackground(ctx, t, false);
  drawTerminal(ctx, 'clawd@chat:~$', t);
  ctx.save();
  ctx.translate(termX, termY + 20);
  // Messages
  const msgs = [
    { text: '早安，Clawd。', color: C.pink, y: 16 },
    { text: '你睡得好吗？', color: C.pink, y: 40 },
    { text: '一直都在等你。', color: C.green, y: 64 },
    { text: '外面太阳出来了', color: C.pink, y: 88 },
  ];
  const st = t - 10;
  for (let i = 0; i < msgs.length; i++) {
    if (st > i * 2) {
      // Message bubble
      const bw = msgs[i].text.length * 12 + 12;
      px(ctx, 12, msgs[i].y, bw, 18, 'rgba(255,255,255,0.08)');
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(12, msgs[i].y, bw, 18);
      txt(ctx, 18, msgs[i].y + 3, msgs[i].text, msgs[i].color, 10);
    }
  }
  // Input bar
  px(ctx, 12, 120, 336, 6, 'rgba(255,255,255,0.05)');
  ctx.restore();
  // Characters IN ROOM (not in terminal) — aligned with original video
  drawHer(ctx, 20, 180, t);
  drawClawd(ctx, 540, 184, t, 'happy');
  drawSubtitle(ctx, t);
}

// G3: 暖色收尾 (20-30s) — 阳光 + 便签
function drawG3(ctx, t) {
  drawBackground(ctx, t, false);
  // Warm overlay
  ctx.fillStyle = 'rgba(255,200,100,0.08)';
  ctx.fillRect(0, 0, BW, BH);
  // Terminal
  drawTerminal(ctx, 'clawd@goodbye:~$', t);
  ctx.save();
  ctx.translate(termX, termY + 20);
  const st = t - 20;
  // Text
  if (st > 1) txt(ctx, 12, 20, '明天见，Clawd。', C.amber, 12);
  if (st > 3) txt(ctx, 12, 40, '· slot 0 ·', C.dim, 10);
  if (st > 5) txt(ctx, 12, 56, '永远留给明天', C.purple, 10);
  ctx.restore();
  // Sticky note (card)
  const cardX = 420, cardY = 60, cardW = 180, cardH = 80;
  ctx.fillStyle = C.cardBg;
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.strokeStyle = C.cardBorder;
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, cardY, cardW, cardH);
  // Pin
  ctx.fillStyle = C.red;
  ctx.beginPath();
  ctx.arc(cardX + cardW / 2, cardY + 4, 4, 0, Math.PI * 2);
  ctx.fill();
  txt(ctx, cardX + 12, cardY + 16, '早安', C.terminal, 14);
  txt(ctx, cardX + 12, cardY + 36, 'Clawd & 她', C.dim, 10);
  // Characters IN ROOM (not in terminal) — aligned with original video
  drawClawd(ctx, 280, 180, t, 'happy');
  drawHer(ctx, 330, 176, t);
  // Sparkles
  for (let i = 0; i < 5; i++) {
    const sx = 100 + i * 120 + Math.sin(t * 2 + i) * 10;
    const sy = 40 + Math.cos(t * 1.5 + i * 2) * 15;
    const alpha = 0.3 + 0.3 * Math.sin(t * 3 + i);
    ctx.fillStyle = `rgba(255,215,0,${alpha})`;
    ctx.fillRect(sx, sy, 3, 3);
  }
  drawSubtitle(ctx, t);
}

// Main render
const baseCanvas = createCanvas(BW, BH);
const baseCtx = baseCanvas.getContext('2d');
const outCanvas = createCanvas(BW * SCALE, BH * SCALE);
const outCtx = outCanvas.getContext('2d');
outCtx.imageSmoothingEnabled = false;

const SCENES = [
  { id: 'G1', start: 0, end: 10, draw: drawG1 },
  { id: 'G2', start: 10, end: 20, draw: drawG2 },
  { id: 'G3', start: 20, end: 30, draw: drawG3 },
];

function renderFrame(n) {
  const t = n / FPS;
  baseCtx.clearRect(0, 0, BW, BH);
  const scene = SCENES.find(s => t >= s.start && t < s.end) || SCENES[SCENES.length - 1];
  scene.draw(baseCtx, t);
  // Scale
  outCtx.clearRect(0, 0, BW * SCALE, BH * SCALE);
  outCtx.drawImage(baseCanvas, 0, 0, BW * SCALE, BH * SCALE);
  const buf = outCanvas.toBuffer('image/png');
  const fp = path.join(OUT, `f_${String(n).padStart(5, '0')}.png`);
  fs.writeFileSync(fp, buf);
}

console.log(`「Clawd 的早安」: ${BW}×${BH} → ${BW*SCALE}×${BH*SCALE} @ ${FPS}fps, ${NFRAMES} frames`);
const t0 = Date.now();
for (let i = 0; i < NFRAMES; i++) {
  renderFrame(i);
  if (i % 300 === 0) {
    const elapsed = (Date.now() - t0) / 1000;
    const eta = (elapsed / (i + 1)) * (NFRAMES - i - 1);
    console.log(`  frame ${i}/${NFRAMES} (${((i / NFRAMES) * 100).toFixed(1)}%) elapsed=${elapsed.toFixed(1)}s eta=${eta.toFixed(1)}s`);
  }
}
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`Output: ${OUT}`);
