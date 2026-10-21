const path = require('path');
const fs = require('fs');
const { Canvas } = require('@napi-rs/canvas');

// Load render script and strip the main loop
const src = fs.readFileSync('/Users/a1-6/Desktop/workspace/d1-video-recreation/src/render_full_pixel.js', 'utf8');
// Remove the last section (the main frame loop + ffmpeg call)
const stripped = src.slice(0, src.indexOf('// 5. Render'));

// Eval to get all functions
eval(stripped);

const dir = '/tmp/d1-frames-review';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const keyFrames = [
  [300, 'S1-terminal'],
  [1200, 'S2-messages'],
  [2400, 'S3-code'],
  [3600, 'S4-empty-lines'],
  [4200, 'S5-wait'],
  [4800, 'S6-cold-close'],
  [5100, 'S6-end']
];

for (const [i, label] of keyFrames) {
  const t = i / FPS;
  const canvas = new Canvas(BW * SCALE, BH * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const scene = currentScene(t);
  drawScene(ctx, scene, t);
  drawSubtitle(ctx, t);
  if (t >= CARD.st && t <= CARD.en) drawCard(ctx, t);
  const buf = canvas.toBuffer('image/png');
  const out = path.join(dir, `review_${i}_${label}.png`);
  fs.writeFileSync(out, buf);
  console.log(`frame ${i} (${t.toFixed(1)}s, ${scene.id}) -> ${out}`);
}
console.log('Done. Frames in', dir);
