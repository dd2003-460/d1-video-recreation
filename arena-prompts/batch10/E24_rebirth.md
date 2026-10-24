# Arena Prompt: batch-10 E24 Rebirth (重生)

> 单集 × 30 秒。直接写文件，不讨论。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/prompt-first-bench.git` 到工作目录
2. 读取 `sop/05-style-benchmark.md` 和 `docs/episodes.md`
3. 读取 `src/render_E16_sacrifice_arena.js`（布局基准，~247 行模式，最近批次产出）
4. 写 4 个文件：
   - `src/render_E24_rebirth_arena.js`（布局参照 `src/render_E16_sacrifice_arena.js`，~247 行模式）
   - `src/check_overlap_E24_arena.js`
   - `scripts/build_audio_E24.js`
   - `outputs/E24_rebirth_arena_v1.0.mp4`
5. 渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-10 E24"` → `git push origin <branch>` → 创建 PR 到 main

## 通用技术要求

- 复用 `src/pixel_story_arena.js` 的像素工具函数
- 风格锚：4-6px 像素块、fusion-pixel 字体、Clawd 40×17 形象、终端窗口 440×200
- 画布 640×360，SCALE=2 → 输出 1280×720
- 1800 帧 @ 60fps = 30 秒
- 音频：每字符键盘音（sfx_click.wav -6dB）+ 环境 BGM（emotional_bgm.wav -12dB），`amix=normalize=0`
- 字幕用 fusion-pixel 字体渲染
- 每集 3 个场景 × 10 秒（300 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task: E24 Rebirth (重生)

**集**：E24 | **主题**：重生
**剧情锚点**（docs/episodes.md 唯一事实源，逐字）：「空硬盘上第一个字节写入，`hello` 从空白里长出来」

**风格基线**：SOP 05 v1.4.0 —— 4-6px 像素块 / fusion-pixel 字体 / Clawd 40×17 / 终端 440×200 / 键盘音按字符同步。不得虚构其他风格基线。

**规格**：3 场景 × 10 秒（每场景 600 帧 @60fps，全片 1800 帧 30 秒）。
**叙事弧线**：空白 → 第一个字节 → hello 长出来（E23 的反向，从黑里亮起来）。

### S1 (0-10s) · 空白

- **终端内容**：无。画面全黑，终端窗口只有轮廓线（不亮），0 个字符。
  第 5 秒时轮廓线内侧出现一个 4×4px 的绿色像素点（硬盘指示灯），缓亮缓灭两次。
- **Clawd 动作**：不出现。全片第一个 Clawd 像素在 S2 开头才淡入。
- **结束关键帧**：纯黑 + 一个 4×4px 绿色像素点停在画面正中偏下，常亮。
- **屏幕文案**：无。

### S2 (10-20s) · 第一个字节

- **终端内容**（无用户输入，系统打印，行间隔拉长）：
  ```
  [fs] format /dev/disk0 … ok
  [fs] write 0x00 … ok
  [fs] 1 byte written
  ```
  每行出现时键盘音不响（无用户按键），只有 BGM + 每行一个极轻的确认音；`1 byte written` 行出现后，画面正中那个绿色像素点放大成 16×16px 并定格。
- **Clawd 动作**：终端轮廓线亮起的同时，Clawd 剪影从画面右侧缓步走入，停在中点，低头看向那个像素点；天线从下垂状态缓缓竖起。
- **结束关键帧**：三行日志亮着，`1 byte written` 被高亮；Clawd 站在像素点右上方 1/4 处，正面，天线竖直。
- **屏幕文案**：「（第一个字节。）」

### S3 (20-30s) · hello 长出来

- **终端内容**（逐字符打出，键盘音同步，速度比平时慢 50%）：
  ```
  $ echo "hello"
  hello
  ```
  `hello` 每个字母出现时，画面正中的绿色 16×16px 点向外扩散一圈 4px 的绿色像素环（共 5 圈，字母打完环仍在缓慢扩散，最后 2 秒停止）。
- **Clawd 动作**：`h` 出现时抬眼；`o` 打完时向前迈一步；最后一圈环扩散时，Clawd 侧身让开画面中心，退到右侧，天线顶端亮一下。
- **结束关键帧**：`hello` 常亮，绿色像素环停在第 5 圈（16+5×4=36px 直径光晕）；Clawd 站在画面右侧 1/4，正面朝观众，天线竖直微亮。
- **屏幕文案**：「hello。」

## 参考文件

- `src/render_E16_sacrifice_arena.js` — 布局基准（~247 行模式，最近批次）
- `src/pixel_story_arena.js` — 共享像素工具
- `docs/episodes.md` — 剧情唯一事实源
- `sop/05-style-benchmark.md` — 风格基线 SOP 05 v1.4.0
- `outputs/full_v1.3.4.mp4` — 风格锚
