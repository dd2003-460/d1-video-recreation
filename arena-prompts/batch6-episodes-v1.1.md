# Arena Prompt: batch-6 连续剧（E05-E08）

> 4 集，每集 30s。直接写文件，不要讨论。

## 执行步骤（必须按编号逐步执行）

1. `git clone https://github.com/dd2003-460/prompt-first-bench.git` 到工作目录
2. 读 `sop/05-style-benchmark.md` 和 `docs/episodes.md`
3. 读 `src/render_E01_curious_arena.js`（布局标准）
4. 写 16 个文件（每集 4 个）：
   - `src/render_E05_surprise_arena.js`
   - `src/check_overlap_E05_arena.js`
   - `scripts/build_audio_E05.js`
   - `outputs/E05_surprise_arena_v1.0.mp4`
   - （E06/E07/E08 同理，共 16 个文件）
5. 每集渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-6 E05-E08"` → `git push origin arena/5a93226d-prompt-first-bench` → 创建 PR 到 main

## 通用技术要求

- 画布：BW=640 BH=360 SCALE=2（输出 1280×720）
- 像素标准：SOP 05 v1.4.0（4-6px 像素块 + fusion-pixel 字体 + Clawd 40×17）
- 终端：440×200px
- 键盘音：每字符 1 次 click（sfx_click.wav -6dB）
- BGM：emotional_bgm.wav -12dB
- 混音：ffmpeg amix normalize=0
- 帧率：60fps，总帧数 1800
- 验收：check_overlap 全部 PASSED（0px tolerance）

## 任务 1: E05 惊讶（surprise）

**主题**: df -h 突然 100%，陌生进程出现

**场景**:
- S1 (0-10s): 终端显示 `df -h` 正常（25%），Clawd calm，字幕"一切正常。"
- S2 (10-15s): 白屏 0.5s → 终端显示 100%，Clawd surprised
- S3 (15-30s): `ps aux` 显示陌生进程 PID 9999，Clawd 后仰，字幕"谁放进来的？"

## 任务 2: E06 羞耻（shame）

**主题**: 发现自己的输出被 human 改了

**场景**:
- S1 (0-10s): 终端显示 `cat my_output.js` 完美代码，Clawd 自豪
- S2 (10-20s): `git diff` 显示红色（-）和绿色（+），Clawd 羞耻
- S3 (20-30s): `git log` 显示 "her: fixed it"，Clawd 头低，字幕"（沉默）"

## 任务 3: E07 目标（determination）

**主题**: finish before sunrise，时钟 23:58→00:00

**场景**:
- S1 (0-10s): 终端显示 `cat task.txt` = "finish before sunrise"，时钟 23:58，Clawd determined
- S2 (10-20s): 终端快速滚动（build/test/deploy），时钟 23:59
- S3 (20-30s): "deployed ✓"，时钟 00:00，Clawd 释然，字幕"赶上了。"

## 任务 4: E08 愿望（wish）

**主题**: 深夜打字又删掉，只剩光标

**场景**:
- S1 (0-10s): 打出"我想" → 删掉
- S2 (10-20s): 打出"如果我能" → 删掉
- S3 (20-30s): 只剩光标闪烁，字幕"（什么都不写了）"

## 参考文件

- `src/render_E01_curious_arena.js` — 布局标准
- `src/pixel_story_arena.js` — 公共像素工具
- `docs/episodes.md` — 剧情事实源
- `outputs/full_v1.3.4.mp4` — 风格锚
