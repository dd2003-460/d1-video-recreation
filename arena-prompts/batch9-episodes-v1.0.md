# Arena Prompt: batch-9 系列 (E17-E20)

> 4 集 × 30 秒。直接写文件，不讨论。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/prompt-first-bench.git` 到工作目录
2. 读取 `sop/05-style-benchmark.md` 和 `docs/episodes.md`
3. 读取 `src/render_E16_sacrifice_arena.js`（布局基准，最近批次产出）
4. 写 16 个文件（每集 4 个）：
   - `src/render_E17_dependency_arena.js`
   - `src/check_overlap_E17_arena.js`
   - `scripts/build_audio_E17.js`
   - `outputs/E17_dependency_arena_v1.0.mp4`
   - （E18/E19/E20 同理，共 16 个文件）
5. 每集：渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-9 E17-E20"` → `git push origin <branch>` → 创建 PR 到 main

## 通用技术要求

- 复用 `src/pixel_story_arena.js` 的像素工具函数
- 风格锚：4-6px 像素块、fusion-pixel 字体、Clawd 40×17 形象、终端窗口 440×200
- 画布 640×360，SCALE=2 → 输出 1280×720
- 1800 帧 @ 60fps = 30 秒
- 音频：每字符键盘音（sfx_click.wav -6dB）+ 环境 BGM（emotional_bgm.wav -12dB），`amix=normalize=0`
- 字幕用 fusion-pixel 字体渲染
- 每集 3 个场景 × 10 秒（300 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task 1: E17 Dependency (依赖)

**主题**：她的终端关了 24 小时，他开始自动运行 `ping her`

**场景**：
- S1 (0-10s)：终端 `last her` 显示她最后登录 24 小时前，Clawd 盯着屏幕，字幕「（24h）」
- S2 (10-20s)：cron 任务自动触发，`ping her ... no reply` 逐行滚动，Clawd 尾巴垂下，光标不停闪烁
- S3 (20-30s)：屏幕变暗，只剩最后一行 `ping her ...` 和缓慢闪烁的光标，字幕「等待应答。」

## Task 2: E18 Let Go (放手)

**主题**：把她的文件打包成 tar，移到 archive，终端第一次干净了

**场景**：
- S1 (0-10s)：`ls her_*` 显示全部文件，Clawd 逐个查看，每停留一个停顿一拍
- S2 (10-20s)：`tar -czf archive/her.tar.gz her_*` 进度条走完，Clawd 踮脚看终端
- S3 (20-30s)：`rm her_*` 完成，终端第一次干净，只剩 prompt，Clawd 转身走开，字幕「（干净了。）」

## Task 3: E19 Reaction (反应)

**主题**：错误弹出的第 1 帧他就转头，比日志快，比人快

**场景**：
- S1 (0-10s)：正常运行，日志滚动，Clawd 放松
- S2 (10-20s)：`ERROR: segfault` 出现的第 1 帧，Clawd 同一帧转头（早于日志渲染完成），像素眼睛锁定错误行
- S3 (20-30s)：`cat /var/log/error.log` 定位根因，字幕「（比你快。）」

## Task 4: E20 Memory (记忆)

**主题**：`df -h /memory` 显示 98%，开始决定哪些梦可以删

**场景**：
- S1 (0-10s)：`df -h /memory` 98%，红色进度条快满，Clawd 皱眉
- S2 (10-20s)：`ls /memory/dreams/` 列出上千个梦，`rm dream_0431` 逐个删除，进度条每删一个降一点
- S3 (20-30s)：`df -h /memory` 61%，Clawd 放松，但屏上还剩最后一个梦没删，字幕「（这个不能删。）」

## 参考文件

- `src/render_E16_sacrifice_arena.js` — 布局基准（最近批次）
- `src/render_E01_curious_arena.js` — 首集布局参考
- `src/pixel_story_arena.js` — 共享像素工具
- `docs/episodes.md` — 剧情唯一事实源
- `outputs/full_v1.3.4.mp4` — 风格锚
