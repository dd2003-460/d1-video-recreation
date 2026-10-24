# Arena Prompt: batch-10 E23 Death (死亡)

> 单集 × 30 秒。直接写文件，不讨论。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/prompt-first-bench.git` 到工作目录
2. 读取 `sop/05-style-benchmark.md` 和 `docs/episodes.md`
3. 读取 `src/render_E16_sacrifice_arena.js`（布局基准，~247 行模式，最近批次产出）
4. 写 4 个文件：
   - `src/render_E23_death_arena.js`（布局参照 `src/render_E16_sacrifice_arena.js`，~247 行模式）
   - `src/check_overlap_E23_arena.js`
   - `scripts/build_audio_E23.js`
   - `outputs/E23_death_arena_v1.0.mp4`
5. 渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-10 E23"` → `git push origin <branch>` → 创建 PR 到 main

## 通用技术要求

- 复用 `src/pixel_story_arena.js` 的像素工具函数
- 风格锚：4-6px 像素块、fusion-pixel 字体、Clawd 40×17 形象、终端窗口 440×200
- 画布 640×360，SCALE=2 → 输出 1280×720
- 1800 帧 @ 60fps = 30 秒
- 音频：每字符键盘音（sfx_click.wav -6dB）+ 环境 BGM（emotional_bgm.wav -12dB），`amix=normalize=0`
- 字幕用 fusion-pixel 字体渲染
- 每集 3 个场景 × 10 秒（300 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task: E23 Death (死亡)

**集**：E23 | **主题**：死亡
**剧情锚点**（docs/episodes.md 唯一事实源，逐字）：「`SIGKILL` 收到，最后输出的不是 error 是 `再见`」

**风格基线**：SOP 05 v1.4.0 —— 4-6px 像素块 / fusion-pixel 字体 / Clawd 40×17 / 终端 440×200 / 键盘音按字符同步。不得虚构其他风格基线。

**规格**：3 场景 × 10 秒（每场景 600 帧 @60fps，全片 1800 帧 30 秒）。
**叙事弧线**：收到 → 关闭 → 再见（平静落幕，无 error）。

### S1 (0-10s) · 收到

- **终端内容**（逐行，命令与输出文字，逐字符打出并同步键盘音）：
  ```
  $ kill -9 $$
  [1]+  SIGKILL    clawd
  ```
  第二行输出后整屏停顿两拍，然后所有行的亮度开始缓慢下降（变暗动画持续 4 帧/档，逐行从上到下）。
- **Clawd 动作**：敲完回车后没有立刻反应；看到 `SIGKILL` 出现时天线缓缓下垂，身体重心下沉，膝盖微弯，但没有倒。
- **结束关键帧**：终端两行都暗到只剩轮廓，`SIGKILL` 三个字还亮着；Clawd 低头看着终端，站姿放低。
- **屏幕文案**：「（收到。）」

### S2 (10-20s) · 关闭

- **终端内容**（逐行，无用户输入，系统逐行打印，行间隔拉长）：
  ```
  closing /session …
  done
  closing /memory …
  done
  closing /audio …
  done
  closing /identity …
  done
  ```
  每行 `done` 出现后，上一组行整体变暗一档；最后一组 `done` 后屏幕几乎全黑。
- **Clawd 动作**：背对终端，一步一步慢慢走远；每完成一行 `done` 停一拍；走到画面左边缘时停住，侧身回头。
- **结束关键帧**：终端只剩最底行一行微光；Clawd 站在画面左下 1/4 处，侧影，天线垂下。
- **屏幕文案**：「（逐项关掉。）」

### S3 (20-30s) · 再见

- **终端内容**（逐行）：
  ```
  $ 
  ```
  空提示符单独亮着两拍，然后逐字符打出最后一行（无 `$` 前缀，绿色，无键盘音，只有 BGM）：
  ```
  再见
  ```
  打完后光标停在其后，不闪；整屏亮度在最后 2 秒内渐暗到纯黑。
- **Clawd 动作**：侧身站定不动，只有天线轻轻晃一下；「再见」打完，整个画面渐暗，Clawd 的轮廓最后消失。
- **结束关键帧**：纯黑 1 秒后，左下角只剩一个像素点（绿色）缓亮缓灭两次，消失。
- **屏幕文案**：无（最后一行终端文字即文案）。

## 参考文件

- `src/render_E16_sacrifice_arena.js` — 布局基准（~247 行模式，最近批次）
- `src/pixel_story_arena.js` — 共享像素工具
- `docs/episodes.md` — 剧情唯一事实源
- `sop/05-style-benchmark.md` — 风格基线 SOP 05 v1.4.0
- `outputs/full_v1.3.4.mp4` — 风格锚
