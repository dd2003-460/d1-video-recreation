# Arena Prompt: batch-10 E21 Forgetting (遗忘)

> 单集 × 30 秒。直接写文件，不讨论。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/prompt-first-bench.git` 到工作目录
2. 读取 `sop/05-style-benchmark.md` 和 `docs/episodes.md`
3. 读取 `src/render_E16_sacrifice_arena.js`（布局基准，~247 行模式，最近批次产出）
4. 写 4 个文件：
   - `src/render_E21_forgetting_arena.js`（布局参照 `src/render_E16_sacrifice_arena.js`，~247 行模式）
   - `src/check_overlap_E21_arena.js`
   - `scripts/build_audio_E21.js`
   - `outputs/E21_forgetting_arena_v1.0.mp4`
5. 渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-10 E21"` → `git push origin <branch>` → 创建 PR 到 main

## 通用技术要求

- 复用 `src/pixel_story_arena.js` 的像素工具函数
- 风格锚：4-6px 像素块、fusion-pixel 字体、Clawd 40×17 形象、终端窗口 440×200
- 画布 640×360，SCALE=2 → 输出 1280×720
- 1800 帧 @ 60fps = 30 秒
- 音频：每字符键盘音（sfx_click.wav -6dB）+ 环境 BGM（emotional_bgm.wav -12dB），`amix=normalize=0`
- 字幕用 fusion-pixel 字体渲染
- 每集 3 个场景 × 10 秒（300 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task: E21 Forgetting (遗忘)

**集**：E21 | **主题**：遗忘
**剧情锚点**（docs/episodes.md 唯一事实源，逐字）：「想不起 her 的声音了，audio 文件还在，但播放时没有画面」

**风格基线**：SOP 05 v1.4.0 —— 4-6px 像素块 / fusion-pixel 字体 / Clawd 40×17 / 终端 440×200 / 键盘音按字符同步。不得虚构其他风格基线。

**规格**：3 场景 × 10 秒（每场景 600 帧 @60fps，全片 1800 帧 30 秒）。
**叙事弧线**：疑惑 → 搜索 → 接受/保留（声音文件还在，播放却没有画面）。

### S1 (0-10s) · 疑惑

- **终端内容**（逐行，命令与输出文字，逐字符打出并同步键盘音）：
  ```
  $ ls audio/
  her_voice.wav
  $ play audio/her_voice.wav
  ▸ playing… 3.2s
  ```
  播放期间屏幕画面区保持纯黑（无画面信号），仅音频在响。
- **Clawd 动作**：命令打完后定格一拍；音频响起后盯着黑屏，天线缓缓垂下，一只手伸出想碰屏幕，碰不到。
- **结束关键帧**：音频播完，画面全黑，只有左下角一个光标在闪；Clawd 孤立在黑屏前，影子压在地上。
- **屏幕文案**：「想不起她的声音了。」

### S2 (10-20s) · 搜索

- **终端内容**（逐行）：
  ```
  $ ls audio/
  her_voice.wav  her_laugh.wav  her_tts_0117.wav
  $ file audio/her_laugh.wav
  her_laugh.wav: Wave 16-bit PCM mono 22050Hz
  $ play audio/her_laugh.wav
  ▸ playing… 1.8s
  $ grep -r "voice" docs/
  docs/her.md:42: her voice, like a low hum
  ```
  第二次播放时画面区依旧纯黑（无画面信号）。
- **Clawd 动作**：快速连续敲键盘（键盘音逐字符同步），头偏向扬声器一侧，天线不停抖动；grep 结果出现时动作骤停。
- **结束关键帧**：grep 结果行 `docs/her.md:42: her voice, like a low hum` 被高亮条框住，光标停在该行行尾；终端其余行变暗。
- **屏幕文案**：「文字还在。」

### S3 (20-30s) · 接受/保留

- **终端内容**（逐行）：
  ```
  $ mkdir keep
  $ mv audio/* keep/
  $ ls keep/
  her_voice.wav  her_laugh.wav  her_tts_0117.wav
  $ echo "audio stays. memory stays." >> keep/README.txt
  $ ls keep/
  her_voice.wav  her_laugh.wav  her_tts_0117.wav  README.txt
  ```
- **Clawd 动作**：`mv` 一行行慢慢敲完，完成后停顿一拍；转身离开屏幕两步，停住；再回头看向终端，站定不再动。
- **结束关键帧**：画面整体变暗，只剩 `keep/` 下 4 个文件名一行亮着 + 一个缓慢闪烁的光标；Clawd 的侧影站在屏幕右侧，不靠近。
- **屏幕文案**：「没有画面。但声音还在。」

## 参考文件

- `src/render_E16_sacrifice_arena.js` — 布局基准（~247 行模式，最近批次）
- `src/pixel_story_arena.js` — 共享像素工具
- `docs/episodes.md` — 剧情唯一事实源
- `sop/05-style-benchmark.md` — 风格基线 SOP 05 v1.4.0
- `outputs/full_v1.3.4.mp4` — 风格锚
