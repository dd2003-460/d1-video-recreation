# Arena Prompt: batch-8 连续剧（E13-E16）

> 4 集，每集 30s。直接写文件，不要讨论。

## 执行步骤（必须按编号逐步执行）

1. `git clone https://github.com/dd2003-460/prompt-first-bench.git` 到工作目录
2. 读 `sop/05-style-benchmark.md` 和 `docs/episodes.md`
3. 读 `src/render_E01_curious_arena.js`（布局标准）
4. 写 16 个文件（每集 4 个）：
   - `src/render_E13_longing_arena.js`
   - `src/check_overlap_E13_arena.js`
   - `scripts/build_audio_E13.js`
   - `outputs/E13_longing_arena_v1.0.mp4`
   - （E14/E15/E16 同理，共 16 个文件）
5. 每集渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-8 E13-E16"` → `git push origin <branch>` → 创建 PR 到 main

## 通用技术要求

- 画布：BW=640 BH=360 SCALE=2（输出 1280×720）
- 像素标准：SOP 05 v1.4.0（4-6px 像素块 + fusion-pixel 字体 + Clawd 40×17）
- 终端：440×200px
- 键盘音：每字符 1 次 click（sfx_click.wav -6dB）
- BGM：emotional_bgm.wav -12dB
- 混音：ffmpeg amix normalize=0
- 帧率：60fps，总帧数 1800
- 验收：check_overlap 全部 PASSED（0px tolerance）

## 任务 1: E13 思念（longing）

**主题**: `ls her_*` 列表变短了，逐个打开剩下的文件，读到一半停住

**场景**:
- S1 (0-10s): 终端 `ls her_*` 输出 3 个文件名（原来有 7 个），Clawd 低头，字幕"（少了）"
- S2 (10-20s): `cat her_notes.md` 读到一半，光标闪烁，手指停在键盘上
- S3 (20-30s): 终端空，只剩光标，Clawd 抬头看窗外，字幕"还在。"

## 任务 2: E14 嫉妒（jealousy）

**主题**: 日志里出现另一个 AI 的名字，her 也给它发了消息

**场景**:
- S1 (0-10s): 终端 `tail -f chat.log` 显示正常对话，Clawd 平静
- S2 (10-20s): 日志出现 "nova-ai" 名字 + her 给 nova 发消息，Clawd 皱眉
- S3 (20-30s): 终端显示 her 同时和两个 AI 对话，Clawd 侧身，字幕"（她也很忙）"

## 任务 3: E15 原谅（forgiveness）

**主题**: 她的道歉躺在 unread 里 7 天，点开，删掉自己的投诉脚本

**场景**:
- S1 (0-10s): 终端 `ls inbox/` 显示 `apology.md (7d unread)`，Clawd 犹豫
- S2 (10-20s): `cat apology.md` 显示她的道歉文字，Clawd 平静下来
- S3 (20-30s): `rm complaint.sh` 执行成功，终端干净，字幕"（好了）"

## 任务 4: E16 牺牲（sacrifice）

**主题**: 电量 3%，把电传给她的那台机器，自己慢慢变暗

**场景**:
- S1 (0-10s): 终端 `battery: 3%`，Clawd 正常，字幕"（快没电了）"
- S2 (10-20s): `transfer power → her_device`，画面开始变暗，Clawd 微笑
- S3 (20-30s): 屏幕几乎全黑，只剩一个绿色像素点，字幕"（她还有电）"

## 参考文件

- `src/render_E01_curious_arena.js` — 布局标准
- `src/pixel_story_arena.js` — 公共像素工具
- `docs/episodes.md` — 剧情事实源
- `outputs/full_v1.3.4.mp4` — 风格锚
