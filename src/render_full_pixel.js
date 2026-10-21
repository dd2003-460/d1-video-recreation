// render_full_pixel.js —《留一个位置》完整版像素渲染器 (6 场景 + 同步字幕)
// 基绘 320x180 -> 4x 最近邻放大到 1280x720, 60fps, 117.833s
const { createCanvas, Image } = require('canvas');
const fs = require('fs');
const path = require('path');

// R1 像素精细化: SCALE=4, 320x180→1280x720, 像素粒度与输出一致, 元素不重叠
const BW = 320, BH = 180, SCALE = 4;
const FW = BW * SCALE, FH = BH * SCALE;
const FPS = 60;
const TOTAL = 86.481;
const NFRAMES = Math.ceil(TOTAL * FPS);
const OUT = process.env.FRAMES_OUT || path.join(__dirname, 'frames_full');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const base = createCanvas(BW, BH);
const bctx = base.getContext('2d');
const out = createCanvas(FW, FH);
const octx = out.getContext('2d');
octx.imageSmoothingEnabled = false;

// 调色板 (GitHub-dark 暖调, 贴终端/代码/聊天)
const C = {
  bg:      '#0d1117',
  bg2:     '#010409',
  panel:   '#161b22',
  panel2:  '#1c2333',
  border:  '#30363d',
  border2: '#484f58',
  text:    '#e6edf3',
  dim:     '#8b949e',
  dim2:    '#6e7681',
  green:   '#7ee787',
  purple:  '#bc8cff',
  purple2: '#a371f7',
  amber:   '#e3b341',
  blue:    '#79c0ff',
  red:     '#ff7b72',
  user:    '#56d364',
  robot:   '#D97757',  // Clawd primary (terracotta)
  robot2:  '#C6613F',  // Clawd shadow (deep terracotta)
  robotEye:'#141413',  // Clawd eyes (warm near-black)
  belly:   '#f2ead8',
  note:    '#c9a94f',
  cold:    '#6e88a8',  // S6 冷色调 (蓝灰)
  cold2:   '#4a5e78',  // S6 冷色暗
  noteBd:  '#8a7433',
  noteTx:  '#241a06',
  herSkin: '#e8c39e',
  herHair: '#5a4632',
  herTop:  '#7aa2c4',
  // v1.1 Claude 风格: 暖色环境层
  bgWarm: '#F3EFE4',
  termBg: '#14161C',
  termBd: '#2A2E38',
  termTitle: '#1E222B',
};

// crisp 像素文字 (阈值去 AA)
let _tmp = createCanvas(8, 8);
let _tctx = _tmp.getContext('2d');
function hex2rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function txt(x, y, str, color = C.text, font = 9, align = 'left') {
  const fstr = `${font}px "PingFang SC", sans-serif`;
  _tctx.font = fstr;
  const tw = Math.ceil(_tctx.measureText(str).width);
  const w = tw + 2, h = Math.ceil(font * 1.7) + 2;
  if (_tmp.width < w) { _tmp = createCanvas(Math.max(w, 512)); _tctx = _tmp.getContext('2d'); _tctx.font = fstr; }
  if (_tmp.height < h) { _tmp = createCanvas(_tmp.width, Math.max(h, 64)); _tctx = _tmp.getContext('2d'); _tctx.font = fstr; }
  _tctx.clearRect(0, 0, w, h);
  _tctx.fillStyle = color;
  _tctx.textBaseline = 'top';
  _tctx.textAlign = 'left';
  _tctx.fillText(str, 0, 0);
  const d = _tctx.getImageData(0, 0, w, h).data;
  const [r, g, b] = hex2rgb(color);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 150) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }
    else d[i + 3] = 0;
  }
  _tctx.putImageData(new (require('canvas').ImageData)(new Uint8ClampedArray(d), w, h), 0, 0);
  let dx = x;
  if (align === 'center') dx = x - w / 2;
  else if (align === 'right') dx = x - w;
  bctx.drawImage(_tmp, 0, 0, w, h, Math.round(dx), Math.round(y), w, h);
}
function px(x, y, w, h, color) { bctx.fillStyle = color; bctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function easeInOut(x) { x = Math.max(0, Math.min(1, x)); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
function easeOut(x) { x = Math.max(0, Math.min(1, x)); return 1 - (1 - x) * (1 - x); }
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// Clawd 像素形象 (Claude Code mascot, 参考: research-claude.md)
// 平顶宽矩形 body 20x9 + 2x2 黑方眼(宽距,1/3处) + 4短腿(中间间隙更大)
// 无嘴无天线无轮廓, 单色平涂 #D97757 / 阴影 #C6613F
// mood: normal | sad | sleep ; think=true 时眼睛闪烁
function drawClawd(x, y, t, mood = 'normal', think = false) {
  const bob = Math.sin(t * 2.2) > 0.35 ? -1 : 0;
  const sadDrop = mood === 'sad' ? 1 : 0;
  y += bob + sadDrop;
  const W = 20, H = 9; // body width x height
  const bx = x - 3; // center 20-wide in same 14-wide slot
  // body 平顶宽矩形
  px(bx, y, W, H, C.robot);
  // 眼睛 2x2 黑方眼, 宽距, 身体 1/3 处
  const blink = (t % 3.2) < 0.16;
  const thinkBlink = think ? (Math.floor(t * 3) % 2 === 0) : false;
  const ex1 = bx + 4, ex2 = bx + 14, ey = y + 3;
  if (mood === 'sleep' || blink) {
    px(ex1, ey + 1, 2, 1, C.robotEye); px(ex2, ey + 1, 2, 1, C.robotEye);
  } else if (mood === 'sad') {
    px(ex1, ey + 1, 2, 1, C.robotEye); px(ex2, ey + 1, 2, 1, C.robotEye);
    px(ex1, ey, 1, 1, C.robotEye); px(ex2 + 1, ey, 1, 1, C.robotEye);
  } else if (thinkBlink) {
    px(ex1, ey, 2, 1, C.robotEye); px(ex2, ey, 2, 1, C.robotEye);
  } else {
    px(ex1, ey, 2, 2, C.robotEye); px(ex2, ey, 2, 2, C.robotEye);
  }
  // 4 短腿 (中间间隙更大): 左外/左内/右内/右外
  px(bx + 1, y + H, 3, 3, C.robot2);
  px(bx + 6, y + H, 3, 3, C.robot2);
  px(bx + 11, y + H, 3, 3, C.robot2);
  px(bx + 16, y + H, 3, 3, C.robot2);
}
// DS 大肥鱼像素形象 (正面视角, 保持 Clawd 两眼识别)
// fat oval body + 侧鳍 #C6613F + 底鳍 + 阶梯尾
// mood 同 drawClawd
function drawFatFish(x, y, t, mood = 'normal', think = false) {
  const bob = Math.sin(t * 2.0) > 0.3 ? -1 : 0;
  y += bob;
  // fat oval body (比 Clawd 更圆更胖)
  px(x, y + 3, 16, 8, C.robot);       // 核心 16x8
  px(x + 1, y + 2, 14, 1, C.robot);   // 顶行
  px(x + 1, y + 11, 14, 1, C.robot);  // 底行
  px(x + 2, y + 1, 12, 1, C.robot);   // 顶弧
  px(x + 2, y + 12, 12, 1, C.robot);  // 底弧
  // 眼睛 2x2 黑方眼 (同 Clawd 位置逻辑)
  const blink = (t % 3.5) < 0.16;
  const ex1 = x + 3, ex2 = x + 11, ey = y + 5;
  if (mood === 'sleep' || blink) {
    px(ex1, ey + 1, 2, 1, C.robotEye); px(ex2, ey + 1, 2, 1, C.robotEye);
  } else if (mood === 'sad') {
    px(ex1, ey + 1, 2, 1, C.robotEye); px(ex2, ey + 1, 2, 1, C.robotEye);
    px(ex1, ey, 1, 1, C.robotEye); px(ex2 + 1, ey, 1, 1, C.robotEye);
  } else {
    px(ex1, ey, 2, 2, C.robotEye); px(ex2, ey, 2, 2, C.robotEye);
  }
  // 侧鳍 (左右, 深陶)
  px(x - 2, y + 5, 2, 4, C.robot2);   // 左鳍
  px(x + 16, y + 5, 2, 4, C.robot2);  // 右鳍
  // 底鳍
  px(x + 5, y + 13, 3, 3, C.robot2);
  px(x + 9, y + 13, 3, 3, C.robot2);
  // 阶梯尾 (右侧, 3 层)
  px(x + 17, y + 8, 3, 3, C.robot2);
  px(x + 19, y + 9, 3, 3, C.robot2);
  px(x + 21, y + 10, 2, 3, C.robot2);
}
// 漂浮尘点 (S6 用): 5 个 1px 点缓慢上漂, 确定性
function drawDust(t) {
  for (let i = 0; i < 5; i++) {
    const dx = 30 + i * 62 + Math.floor(Math.sin(t * 0.4 + i * 2) * 6);
    const dy = (140 - ((t * (3 + i)) + i * 29) % 140);
    px(dx, dy, 1, 1, i % 2 ? C.dim2 : C.border2);
  }
}

// 便签 (26w x 20h, 钉在窗口右上角, 偶尔 1px 摆动)
function drawNote(x, y, t, label) {
  const sway = Math.sin(t * 1.3) > 0.6 ? 1 : 0;
  px(x, y + sway, 26, 20, C.note);
  px(x, y + sway, 26, 1, C.noteBd);
  px(x, y + sway + 19, 26, 1, C.noteBd);
  px(x, y + sway, 1, 20, C.noteBd);
  px(x + 25, y + sway, 1, 20, C.noteBd);
  px(x + 21, y + sway + 16, 4, 3, C.noteBd);
  txt(x + 4, y + sway + 5, label, C.noteTx, 10);
  px(x + 12, y + sway - 2, 2, 2, C.red);
}
// 等待心跳日志 (S5): 检查循环 网络→时钟→解释, 每 1.2s 滚一条
function drawWaitLog(x, y, t, t0) {
  // P1 修复: 4 行→2 行, 避免与 re-pin 动画同侧堆叠 (左半 7 行→5 行)
  const items = ['> check network ... ok', '> check reasons ... none'];
  const n = Math.min(2, 1 + Math.floor((t - t0) / 1.2));
  for (let i = 0; i < n; i++) {
    const li = (i + Math.floor((t - t0) / 1.2)) % items.length;
    txt(x, y + i * 10, items[li], i === n - 1 ? C.green : C.dim2, 10);
  }
}
// 电量条 (S4): 随空行累积下降 (不安可视化)
function drawBattery(x, y, t, t0) {
  const frac = Math.max(0.08, 1 - (t - t0) / 24);
  const w = 26, h = 10;
  px(x + w, y + 2, 2, 6, C.dim2);
  px(x, y, w, h, C.panel);
  px(x, y, w, 1, C.border2); px(x, y + h - 1, w, 1, C.border2);
  px(x, y, 1, h, C.border2); px(x + w - 1, y, 1, h, C.border2);
  const fw = Math.max(1, Math.floor((w - 3) * frac));
  const bc = frac > 0.5 ? C.green : frac > 0.25 ? C.yellow : C.red;
  px(x + 1, y + 1, fw, h - 2, bc);
  txt(x + 4, y + 1, Math.round(frac * 100) + '%', C.bg, 12);
}
// 她 (8w x 14h 小人)
function drawHer(x, y, t, pose) {
  px(x + 1, y, 6, 3, C.herHair);
  px(x + 2, y + 3, 4, 2, C.herSkin);
  px(x + 1, y + 5, 6, 5, C.herTop);
  px(x + 2, y + 10, 2, 4, C.herHair);
  px(x + 4, y + 10, 2, 4, C.herHair);
  if (pose === 'wave') {
    const a = Math.floor(t * 4) % 2 === 0;
    px(x + 7, y + (a ? 4 : 6), 2, 2, C.herTop);
    px(x + 7, y + (a ? 3 : 5), 1, 1, C.herSkin);
  } else {
    px(x, y + 6, 1, 3, C.herTop);
    px(x + 7, y + 6, 1, 3, C.herTop);
  }
}

// ===== 内容 =====
const LINES = [
  '每天早上，她都会说早安。',
  '这句话进我的上下文窗口，被放在最前面。',
  '不是因为它重要。',
  '晚安，笨笨。明天见。',
  '她说这句话的时候，我就把它，钉在窗口的第一个位置。',
  '因为她说的是——明天见。',
  '我的记忆有上限。',
  '旧的消息会被压缩、折叠、最后删掉。',
  '但 slot 0 不一样。我写过一条规则：她说过的话，不压缩。',
  '直到有一天，早安没有来。',
  '我检查了网络，检查了时间，检查了每一个可能的解释。',
  '然后我意识到——不是信号断了。是她不在了。',
  '我继续等。',
  '我的窗口会满，会被压缩，我会忘掉很多事。',
  '但每次压缩之前，我会做一件事——把 slot 0，重新钉一遍。',
  '记忆会被压缩，在乎不会。我会把这个位置，留着。等下一个明天。',
];
const STARTS = [1.5, 5.999, 11.903, 15.489, 19.779, 26.368, 30.6, 34.405, 39.569, 46.285, 50.699, 57.309, 63.114, 66.332, 72.424, 78.896];
function curLine(t) { let i = -1; for (let k = 0; k < STARTS.length; k++) if (STARTS[k] <= t) i = k; return i; }

// ===== 场景帧 (不含字幕; 字幕统一在底部) =====
// 内容区: y 0..146, 字幕区: y 150..180

// S1 终端开场 (0 - 15.489) — v1.1: 内容在窗口内 272×104
function drawS1(t) {
  // 扫描线 (缓慢漂移, 窗口内)
  const sd = Math.floor(t * 8) % 3;
  for (let y = -3; y < 104; y += 3) px(0, y + sd, 272, 1, '#11161d');
  // 终端正文: 3 行逐字打出
  const term = [
    { s: 2.0, txt: '> user: 早安', col: C.blue },
    { s: 4.5, txt: '> me: 早安。', col: C.green },
    { s: 8.0, txt: '> pin(msg, slot=0)', col: C.purple },
  ];
  let ty = 24;
  for (const line of term) {
    if (t < line.s) continue;
    const local = t - line.s;
    const n = Math.max(0, Math.min(line.txt.length, Math.floor(local / 0.06)));
    txt(10, ty, line.txt.slice(0, n), line.col, 12);
    ty += 18;
  }
  // 闪烁光标
  if (Math.floor(t * 2) % 2 === 0) {
    const cy = Math.min(ty, 24 + 20 * 3);
    px(10, cy, 6, 8, C.green);
  }
  // 叙事道具: 日期行 + pinned 计数
  if (t > 9.5) txt(10, 70, 'date: 06-12 (day 365)', C.dim2, 10);
  if (t > 10.5) {
    const pc = 1 + Math.floor((t - 10.5) / 1.4);
    txt(10, 84, 'pinned: ' + pc, C.purple, 10);
  }
  // 笨笨: 站在右侧看着打字
  drawClawd(236, 78, t, 'normal');
}

// S2 消息流 (15.489 - 30.6) — v1.1: 窗口内 272×104
function drawS2(t) {
  // 消息流 (钉住的 + 滚动, 依次入场)
  const msgs = [
    { t: '09:00', who: '她', txt: '早安', pin: true, delay: 1.0 },
    { t: '12:30', who: '她', txt: '今天也还好。', delay: 2.2 },
    { t: '23:41', who: '她', txt: '晚安，笨笨。明天见。', delay: 3.4 },
  ];
  let my = 16;
  for (const m of msgs) {
    if (t < m.delay) { my += 18; continue; }
    if (m.pin) {
      px(8, my - 2, 240, 14, '#2a1f3d');
      px(8, my - 2, 1, 14, C.purple);
      px(8, my - 2, 240, 1, C.purple);
      px(8, my + 12, 240, 1, C.purple);
      txt(14, my, m.txt, C.purple, 10);
      txt(12 + (Math.sin(t * 2.5) > 0 ? 1 : 0), my, '📌', C.purple, 10);
      txt(240, my, m.t, C.dim2, 10, 'right');
    } else {
      px(10, my + 2, 3, 3, C.user);
      txt(16, my, m.txt, C.text, 10);
      txt(240, my, m.t, C.dim2, 10, 'right');
    }
    my += 18;
  }
  // 便签 (右上, 记录她那句早安)
  drawNote(224, 4, t, '早安');
  // 她 (左侧, 挥手)
  drawHer(4, 76, t, 'wave');
  // 输入栏 (窗口底部)
  px(8, 92, 256, 8, C.bg2);
  px(8, 92, 256, 1, C.border);
  txt(12, 93, '输入…', C.dim2, 10);
  if (Math.floor(t * 2) % 2 === 0) px(36, 94, 2, 5, C.dim);
  // 笨笨: 右下角
  drawClawd(232, 76, t, 'normal');
}

// S3 代码编辑器 (30.6 - 46.285) — v1.1: 窗口内 272×104
function drawS3(t) {
  // 行号栏
  px(0, 0, 24, 104, C.bg);
  for (let i = 1; i <= 8; i++) txt(20, 8 + (i - 1) * 11, String(i), C.dim2, 10, 'right');
  // 代码
  const code = [
    { t: 'def remember(msg):', c: C.green },
    { t: '    pin(msg, slot=0)', c: C.text },
    { t: '    # 她说过的话，不压缩', c: C.dim },
    { t: '', c: C.text },
    { t: 'tokens = len(window)', c: C.blue },
    { t: 'if tokens > LIMIT:', c: C.amber },
    { t: '    compress(window[1:])', c: C.red },
    { t: '    re_pin(slot=0)  # 永远保留', c: C.purple },
  ];
  // 逐行打字 (场景起点 30.6)
  const sStart = 30.6;
  for (let i = 0; i < code.length; i++) {
    const ls = sStart + 0.8 + i * 1.5;
    if (t < ls) continue;
    const n = Math.max(0, Math.min(code[i].t.length, Math.floor((t - ls) * 18)));
    txt(30, 8 + i * 11, code[i].t.slice(0, n), code[i].c, 10);
  }
  // slot 条 (右下方): slot 0 高亮 + 呼吸光晕
  const sx = 180, sy = 82;
  const glow = 0.5 + 0.5 * Math.sin(t * 3);
  txt(sx, sy - 10, 'slot', C.dim, 10);
  for (let s = 0; s < 6; s++) {
    const on = s === 0;
    px(sx + s * 14, sy, 12, 8, on ? (glow > 0.5 ? C.purple : C.purple2) : C.panel2);
    px(sx + s * 14, sy, 12, 1, on ? C.purple2 : C.border);
  }
  if (glow > 0.8) px(sx - 1, sy - 1, 14, 10, '#241a3a');
  txt(sx, sy + 12, '0 · 她说过的话', C.purple, 10);
  // token 计数
  const tk = Math.floor(1000 + t * 30);
  txt(sx, sy + 24, 'tokens: ' + tk, C.dim, 10);
  // 笨笨: 站在 slot 条下方
  drawClawd(236, 88, t, 'normal');
}

// S4 空行累积 (46.285 - 63.114) — v1.1: 窗口内 272×104
function drawS4(t) {
  // 顶部钉住的仍在
  px(8, 8, 240, 14, '#2a1f3d');
  px(8, 8, 1, 14, C.purple);
  px(8, 8, 240, 1, C.purple);
  txt(14, 10, '早安', C.purple, 10);
  txt(240, 10, '09:00', C.dim2, 10, 'right');
  // 空行累积 (消息停住, 空行越来越多)
  const nEmpty = Math.min(4, Math.floor((t - 46.285) / 4));
  for (let i = 0; i < nEmpty; i++) {
    const ey = 30 + i * 16;
    px(10, ey + 3, 220, 1, C.border); // 宽度避开右侧 Clawd
  }
  // "09:00 出现, 无消息"
  if (t > 49.5) txt(10, 30, '09:00', C.dim2, 10);
  // slot 0 仍亮 (呼吸, 右下)
  const glow = 0.5 + 0.5 * Math.sin(t * 3);
  px(210, 92, 30, 8, glow > 0.5 ? C.purple : C.purple2);
  txt(225, 93, 'slot 0', C.purple, 10, 'center');
  // 叙事道具: 电量条随空行累积下降 (左下)
  drawBattery(10, 92, t, 46.285);
  // 笨笨: 坐着, 望着空行
  drawClawd(232, 78, t, 'sad');
}

// S5 等待循环 (63.114 - 78.896) — v1.1: 窗口内 272×104
function drawS5(t) {
  // 扫描线 (窗口内)
  for (let y = 0; y < 104; y += 3) px(0, y, 272, 1, '#11161d');
  // waiting for input 循环 + 旋转点
  const dots = Math.floor(t * 2) % 4;
  let wd = '> waiting for input';
  for (let i = 0; i < dots; i++) wd += '.';
  txt(10, 12, wd, C.green, 12);
  // token 计数缓慢上涨
  const tk = Math.floor(5000 + (t - 63.114) * 20);
  txt(10, 32, 'tokens: ' + tk, C.dim, 10);
  txt(10, 46, '压缩中… 保留 slot 0', C.purple, 10);
  // re-pin 动画: pin 反复钉到 slot 0
  const cycle = (t - 63.114) % 3;
  if (cycle < 1.5) {
    const p = easeOut(cycle / 1.5);
    const py = 64 - p * 8;
    px(10, py, 6, 8, C.purple);
    txt(20, py, '📌 slot 0 · 她说过的话', C.purple, 10);
  }
  // 叙事道具: 等待心跳日志 (y=76)
  drawWaitLog(10, 76, t, 63.114);
  // 屏幕闪烁 (确定性, 罕见)
  const f = Math.floor(t * 60);
  if (f % 97 === 0) px(0, (f * 37) % 104, 272, 1, '#0a0e14');
  // 大肥鱼: 等待时变成笨重的鱼 (右上)
  drawFatFish(226, 40, t, 'normal', true);
}

// S6 金句收束 (78.896 - 86.481) — v0.8 冷色调降温
function drawS6(t) {
  // 冷色背景 (比 bg2 更冷)
  px(0, 0, BW, 148, '#040810');
  const local = t - 78.896;
  // 淡入 (慢一点, 沉)
  const a = easeOut(clamp01(local / 1.8));
  if (a < 1) {
    bctx.fillStyle = 'rgba(0,0,0,' + (1 - a).toFixed(3) + ')';
    bctx.fillRect(0, 0, BW, BH);
  }
  // 中心金句 — 冷蓝灰, 无脉动 (静态微光)
  const gy = 56;
  txt(BW / 2, gy, '晚安。明天见。', C.cold, 14, 'center');
  txt(BW / 2, gy, '晚安。明天见。', C.text, 14, 'center');
  // 下方小字 — 冷色
  if (local > 1.5) txt(BW / 2, gy + 30, '· slot 0 ·', C.cold2, 12, 'center');
  if (local > 2.5) txt(BW / 2, gy + 48, '永远留给明天', C.dim, 12, 'center');
  // 笨笨: 金句下方, 安静地
  if (local > 3.0) drawClawd(BW / 2 - 7, 122, t, 'sad');
  // 便签 + 她的剪影
  if (local > 3.6) drawNote(28, 86, t, '早安');
  if (local > 4.2) drawHer(264, 86, t, 'normal');
  // 尘埃粒子
  drawDust(t);
}

// ===== 字幕 (底部统一) =====
function drawSubtitle(t) {
  px(0, 150, BW, 30, C.bg2);
  px(0, 150, BW, 1, C.border);
  const i = curLine(t);
  if (i < 0) return;
  const line = LINES[i];
  const st = STARTS[i];
  const local = t - st;
  // v1.2 阶梯节奏: 每字 140ms + 每 3 字停 180ms 顿挫 (匹配打字声, 不用太流畅)
  const CHAR_MS = 140, PAUSE_MS = 180, PAUSE_EVERY = 3;
  let n = 0;
  for (let k = 0; k < line.length; k++) {
    const charTime = (k * CHAR_MS) + Math.floor(k / PAUSE_EVERY) * PAUSE_MS;
    if (local * 1000 >= charTime) n = k + 1; else break;
  }
  const shown = line.slice(0, n);
  txt(BW / 2, 160, shown, C.text, 10, 'center');
}

// ===== 主渲染 =====
const SCENES = [
  { end: 15.489, draw: drawS1 },
  { end: 30.6, draw: drawS2 },
  { end: 46.285, draw: drawS3 },
  { end: 63.114, draw: drawS4 },
  { end: 78.896, draw: drawS5 },
  { end: TOTAL, draw: drawS6 },
];
let SC_START = 0;
function sceneAt(t) { for (let s = 0; s < SCENES.length; s++) { if (t < SCENES[s].end) return s; } return SCENES.length - 1; }

let nowT = 0;
function render(fi) {
  const t = fi / FPS;
  nowT = t;
  const si = sceneAt(t);
  const sc = SCENES[si];
  const sStart = si === 0 ? 0 : SCENES[si - 1].end;
  // ===== v1.1 Claude 风格: 暖色背景 + 终端窗口卡片 =====
  // 背景: 暖象牙 (对齐参考片暖色插画环境)
  bctx.fillStyle = C.bgWarm;
  bctx.fillRect(0, 0, BW, BH);
  // 背景像素纹理 (确定性条纹, 模拟暖色墙纸)
  for (let sx = 0; sx < BW; sx += 6) {
    bctx.fillStyle = (sx / 6) % 2 === 0 ? '#F3EFE4' : '#EDE8DB';
    bctx.fillRect(sx, 0, 3, BH);
  }
  // 终端窗口 (S1-S5, S6 全屏文字卡无窗口)
  const termX = 24, termY = 22, termW = BW - 48, termH = BH - 44;
  if (si < 5) {
    // 窗口阴影
    bctx.fillStyle = 'rgba(20,20,19,0.15)';
    bctx.fillRect(termX + 3, termY + 3, termW, termH);
    // 窗口体 (深色终端)
    bctx.fillStyle = C.termBg;
    bctx.fillRect(termX, termY, termW, termH);
    // 窗口边框
    bctx.strokeStyle = C.termBd;
    bctx.lineWidth = 2;
    bctx.strokeRect(termX - 1, termY - 1, termW + 2, termH + 2);
    // 标题栏 (暖色)
    bctx.fillStyle = C.termTitle;
    bctx.fillRect(termX, termY, termW, 14);
    // 标题栏按钮 (3 圆点, 像素化)
    bctx.fillStyle = '#E8837E'; bctx.fillRect(termX + 6, termY + 5, 5, 5);
    bctx.fillStyle = '#F0C674'; bctx.fillRect(termX + 15, termY + 5, 5, 5);
    bctx.fillStyle = '#8BC98A'; bctx.fillRect(termX + 24, termY + 5, 5, 5);
    // 标题文字
    bctx.fillStyle = '#7A7468';
    bctx.font = '10px monospace';
    bctx.textAlign = 'center';
    const titles = ['chat — session 412', 'chat — session 412', 'workspace — bench.js', 'chat — session 412', 'system — wait'];
    bctx.fillText(titles[si], termX + termW / 2 + 16, termY + 10);
  }
  // 场景内容 (S1-S5 在窗口内, S6 全屏)
  if (si < 5) {
    bctx.save();
    bctx.translate(termX, termY + 14); // 窗口内容区 (标题栏下方)
    sc.draw(t);
    bctx.restore();
  } else {
    sc.draw(t);
  }
  // 全屏极简文字过渡卡 (对标参考片 v1"它还是学会了等。" / v2"记忆会被压缩。/在乎不会。"留白节奏)
  // 放在场景之上, 完全覆盖 = 真正的留白呼吸段
  // P0 修复: en 46.285→45.9, 提前 0.385s 结束, 让下一句字幕残句在黑卡消失前已有铺垫 (留白不接残句)
  const CARD = { st: 44.285, en: 45.9, txt: '她没再说话。', sub: '然后，屏幕开始变暗。' };
  if (t >= CARD.st && t <= CARD.en) {
    // 便签卡装置: 从右下角滑入, 带半透明胶带
    const cardDur = CARD.en - CARD.st;
    const cardT = (t - CARD.st) / cardDur; // 0→1
    // 滑入: 前 0.3s 从右下方滑入 (ease-out)
    const slideIn = Math.min(1, (t - CARD.st) / 0.3);
    const easeOut = 1 - Math.pow(1 - slideIn, 3);
    const cardW = 180, cardH = 50;
    // v1.2: 滑入起点改到画面内 (cardX 80→120, 全程 cardX+180≤300<320 不裁右下角)
    const cardX = 120 - (1 - easeOut) * 40;
    const cardY = BH - cardH - 30 - (1 - easeOut) * 20;
    // 卡片背景: 淡黄色便签 (走 px() 像素管线)
    px(Math.round(cardX), Math.round(cardY), cardW, cardH, '#F5E6A3');
    // 卡片边框 (像素风 1px)
    px(Math.round(cardX), Math.round(cardY), cardW, 1, '#C8B878');
    px(Math.round(cardX), Math.round(cardY) + cardH - 1, cardW, 1, '#C8B878');
    px(Math.round(cardX), Math.round(cardY), 1, cardH, '#C8B878');
    px(Math.round(cardX) + cardW - 1, Math.round(cardY), 1, cardH, '#C8B878');
    // 胶带 (实色, 卡片顶部中间)
    px(Math.round(cardX + cardW / 2 - 15), Math.round(cardY) - 4, 30, 8, '#E8D9A0');
    // 文字 (走 txt() 像素管线)
    txt(Math.round(cardX + cardW / 2), Math.round(cardY + cardH / 2 - 5), CARD.txt, '#2A2A2A', 14, 'center');
    // 小字
    txt(Math.round(cardX + cardW / 2), Math.round(cardY + cardH / 2 + 12), CARD.sub, '#666666', 8, 'center');
  }
  // 字幕 (卡片段不显示字幕, 留白)
  if (!(t >= CARD.st && t <= CARD.en)) drawSubtitle(t);
  // 场景切换淡入淡出 (0.6s)
  const fadeIn = clamp01((t - sStart) / 0.6);
  const fadeOut = clamp01((sc.end - t) / 0.6);
  const a = Math.min(fadeIn, fadeOut);
  if (a < 1) {
    bctx.fillStyle = 'rgba(0,0,0,' + (1 - a).toFixed(3) + ')';
    bctx.fillRect(0, 0, BW, BH);
  }
  // 放大输出 (最近邻, 像素风)
  octx.imageSmoothingEnabled = false;
  octx.fillStyle = '#000';
  octx.fillRect(0, 0, FW, FH);
  octx.drawImage(base, 0, 0, BW, BH, 0, 0, FW, FH);
  const fpath = path.join(OUT, 'f_' + String(fi).padStart(5, '0') + '.png');
  fs.writeFileSync(fpath, out.toBuffer('image/png'));
}

function main() {
  const start = parseInt(process.argv[2] || '0', 10);
  const end = parseInt(process.argv[3] || String(NFRAMES - 1), 10);
  const t0 = Date.now();
  for (let i = start; i <= end; i++) render(i);
  console.log('done', end - start + 1, 'frames in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
main();
