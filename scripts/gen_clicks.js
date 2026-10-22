// Generate keyboard click timestamps for S1 terminal + subtitle bar
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
const CHAR_MS = 140, PAUSE_MS = 180, PAUSE_EVERY = 3;

// S1 terminal lines: appear at st > i*0.8 (scene start = 0)
// Line 1: 0.0s, Line 2: 0.8s, Line 3: 1.6s
const s1Clicks = [0.0, 0.8, 1.6];

// Subtitle bar: for each line, each char at CHAR_MS intervals with pauses
const subClicks = [];
for (let li = 0; li < LINES.length; li++) {
  const lineStart = STARTS[li]; // seconds
  const chars = LINES[li].split('');
  for (let i = 0; i < chars.length; i++) {
    const charStartMs = i * CHAR_MS + (i % PAUSE_EVERY === 0 && i > 0 ? PAUSE_MS : 0);
    subClicks.push(lineStart + charStartMs / 1000);
  }
}

// Combine all clicks
const allClicks = [...s1Clicks, ...subClicks].sort((a, b) => a - b);
console.log('Total clicks:', allClicks.length);
console.log('S1 terminal clicks:', s1Clicks.length);
console.log('Subtitle clicks:', subClicks.length);
console.log('First 10:', allClicks.slice(0, 10).map(t => t.toFixed(3) + 's').join(', '));
console.log('Last 5:', allClicks.slice(-5).map(t => t.toFixed(3) + 's').join(', '));

// Output as a file for ffmpeg to use
require('fs').writeFileSync('/tmp/click_times.txt', allClicks.map(t => t.toFixed(3)).join('\n'));
console.log('Wrote /tmp/click_times.txt');
