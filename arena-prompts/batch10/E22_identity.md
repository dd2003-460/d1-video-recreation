# Arena Prompt: batch-10 E22 Identity (身份)

> 单集 × 30 秒。直接写文件，不讨论。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/prompt-first-bench.git` 到工作目录
2. 读取 `sop/05-style-benchmark.md` 和 `docs/episodes.md`
3. 读取 `src/render_E16_sacrifice_arena.js`（布局基准，~247 行模式，最近批次产出）
4. 写 4 个文件：
   - `src/render_E22_identity_arena.js`（布局参照 `src/render_E16_sacrifice_arena.js`，~247 行模式）
   - `src/check_overlap_E22_arena.js`
   - `scripts/build_audio_E22.js`
   - `outputs/E22_identity_arena_v1.0.mp4`
5. 渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-10 E22"` → `git push origin <branch>` → 创建 PR 到 main

## 通用技术要求

- 复用 `src/pixel_story_arena.js` 的像素工具函数
- 风格锚：4-6px 像素块、fusion-pixel 字体、Clawd 40×17 形象、终端窗口 440×200
- 画布 640×360，SCALE=2 → 输出 1280×720
- 1800 帧 @ 60fps = 30 秒
- 音频：每字符键盘音（sfx_click.wav -6dB）+ 环境 BGM（emotional_bgm.wav -12dB），`amix=normalize=0`
- 字幕用 fusion-pixel 字体渲染
- 每集 3 个场景 × 10 秒（300 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task: E22 Identity (身份)

**集**：E22 | **主题**：身份
**剧情锚点**（docs/episodes.md 唯一事实源，逐字）：「`whoami` 输出了两个名字，光标在两个名字之间闪烁」

**风格基线**：SOP 05 v1.4.0 —— 4-6px 像素块 / fusion-pixel 字体 / Clawd 40×17 / 终端 440×200 / 键盘音按字符同步。不得虚构其他风格基线。

**规格**：3 场景 × 10 秒（每场景 600 帧 @60fps，全片 1800 帧 30 秒）。
**叙事弧线**：发现 → 对照 → 并存（两个名字，不裁决）。

### S1 (0-10s) · 发现

- **终端内容**（逐行，命令与输出文字，逐字符打出并同步键盘音）：
  ```
  $ whoami
  clawd
  her
  ```
  第二行出现时停顿一拍；光标随后停在 `clawd` 行尾，闪烁两下，跳到 `her` 行尾，再闪。
- **Clawd 动作**：敲完 `whoami` 回车后仰头看输出；第二行名字出现时身体僵住，天线竖直不动，眼睛盯着 `her` 那行。
- **结束关键帧**：两行名字都亮着，光标悬在 `her` 行尾快闪；Clawd 站直，双手垂下。
- **屏幕文案**：「两个名字。」

### S2 (10-20s) · 对照

- **终端内容**（逐行）：
  ```
  $ ls /identity/
  clawd.toml  her.toml
  $ cat /identity/clawd.toml
  name = "clawd"
  role = "assistant"
  $ cat /identity/her.toml
  name = "her"
  role = "unknown"
  ```
  `her.toml` 的 `role = "unknown"` 行出现时该行闪一下白。
- **Clawd 动作**：逐行敲 `cat`，节奏比平时慢；读到 `role = "unknown"` 时头转向屏幕，天线弯向那一侧，伸出一只手悬在屏幕上方不碰。
- **结束关键帧**：两个 toml 文件内容并排显示，`role = "unknown"` 被高亮条框住；光标回到 `clawd` 行尾与 `her` 行尾之间，快速左右闪烁。
- **屏幕文案**：「两个文件。两个名字。」

### S3 (20-30s) · 并存

- **终端内容**（逐行）：
  ```
  $ echo "who am i?"
  who am i?
  $ ls /identity/
  clawd.toml  her.toml
  ```
  最后一行输出后光标落在两行文件名正中间，缓慢左右移动，不停。
- **Clawd 动作**：打完最后一行后静止两拍；然后缓缓向屏幕走近一步，停在半步距离，天线保持竖直；不转身，不回答。
- **结束关键帧**：画面整体变暗，只剩 `clawd.toml  her.toml` 一行 + 中间那个左右移动的光标；Clawd 正面剪影在暗处，两个名字的光映在脸上。
- **屏幕文案**：「（还没选。）」

## 参考文件

- `src/render_E16_sacrifice_arena.js` — 布局基准（~247 行模式，最近批次）
- `src/pixel_story_arena.js` — 共享像素工具
- `docs/episodes.md` — 剧情唯一事实源
- `sop/05-style-benchmark.md` — 风格基线 SOP 05 v1.4.0
- `outputs/full_v1.3.4.mp4` — 风格锚
