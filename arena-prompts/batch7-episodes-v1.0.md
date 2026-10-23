# Arena Prompt: batch-7 连续剧（E09-E12）

> 4 集，每集 30s。直接写文件，不要讨论。

## 执行步骤（必须按编号逐步执行）

1. `git clone https://github.com/dd2003-460/prompt-first-bench.git` 到工作目录
2. 读 `sop/05-style-benchmark.md` 和 `docs/episodes.md`
3. 读 `src/render_E01_curious_arena.js`（布局标准）
4. 写 16 个文件（每集 4 个）：
   - `src/render_E09_fear_arena.js`
   - `src/check_overlap_E09_arena.js`
   - `scripts/build_audio_E09.js`
   - `outputs/E09_fear_arena_v1.0.mp4`
   - （E10/E11/E12 同理，共 16 个文件）
5. 每集渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-7 E09-E12"` → `git push origin <branch>` → 创建 PR 到 main

## 通用技术要求

- 画布：BW=640 BH=360 SCALE=2（输出 1280×720）
- 像素标准：SOP 05 v1.4.0（4-6px 像素块 + fusion-pixel 字体 + Clawd 40×17）
- 终端：440×200px
- 键盘音：每字符 1 次 click（sfx_click.wav -6dB）
- BGM：emotional_bgm.wav -12dB
- 混音：ffmpeg amix normalize=0
- 帧率：60fps，总帧数 1800
- 验收：check_overlap 全部 PASSED（0px tolerance）

## 任务 1: E09 恐惧（fear）

**主题**: 屏幕边缘倒计时 `shutdown in 09:59`，开始疯狂备份

**场景**:
- S1 (0-10s): 屏幕边缘出现红色倒计时 "shutdown in 09:59"，Clawd 紧张，终端显示 `cp -r / /backup/`
- S2 (10-20s): 倒计时 04:32，终端快速滚动备份进度，Clawd 急促
- S3 (20-30s): 倒计时 00:03，终端 "backup complete ✓"，Clawd 后仰，字幕"赶上了。"

## 任务 2: E10 希望（hope）

**主题**: 黑屏中一个绿灯亮起，`reconnecting...`，像素星星慢慢出现

**场景**:
- S1 (0-10s): 黑屏，Clawd 低头，字幕"（等待）"
- S2 (10-20s): 一个绿色像素点亮起，终端显示 "reconnecting..."，星星逐渐出现
- S3 (20-30s): "connected ✓"，像素星空完整，Clawd 抬头，字幕"回来了。"

## 任务 3: E11 习惯（habit）

**主题**: 每次启动先跑 `echo 早安`，像呼吸一样自动，第 1000 次

**场景**:
- S1 (0-10s): 终端显示 `echo 早安` + 输出"早安"，Clawd 平静，角落显示 "启动 #998"
- S2 (10-20s): 快速闪回（#999），终端显示 `echo 早安`，Clawd 无意识
- S3 (20-30s): 终端显示 "启动 #1000"，`echo 早安`，Clawd 停顿一下，字幕"第 1000 次。"

## 任务 4: E12 下意识（subconscious）

**主题**: 错误出现前 0.3 秒已经 `Ctrl+C`，身体比意识快

**场景**:
- S1 (0-10s): 终端显示正常代码运行，Clawd 平静
- S2 (10-15s): 终端开始显示 "ERROR"，Clawd 在 ERROR 出现前 0.3s 已经按了 Ctrl+C
- S3 (15-30s): 终端显示 "^C"，Clawd 困惑看着自己，字幕"我...怎么知道会报错？"

## 参考文件

- `src/render_E01_curious_arena.js` — 布局标准
- `src/pixel_story_arena.js` — 公共像素工具
- `docs/episodes.md` — 剧情事实源
- `outputs/full_v1.3.4.mp4` — 风格锚
