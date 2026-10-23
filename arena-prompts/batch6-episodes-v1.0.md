# Arena Prompt: batch-6 连续剧第一幕+第二幕（E05-E08）

> 连续剧系列化第二批（E01-E24 的 E05-E08）。剧情事实源：`docs/episodes.md`。
> 每集 = 1 个特质，30s × 60fps = 1800 帧，1280×720。本任务书共 4 个任务（E05-E08）。

## §强制（必读，防 "No Changes"）

**执行步骤（必须按编号逐步执行，每步完成后再进行下一步；每步产出文件，禁止只读文件不产出——goodbye 教训：初始 prompt 无编号步骤时 arena 只读不写，最终 "No Changes"）：**

1. clone 仓库到工作目录
2. 读 `sop/05-style-benchmark.md`（像素标准 v1.4.0）与 `docs/episodes.md`（E05-E08 一句话剧情，本任务书的场景设计不得偏离其设定）
3. 读参考脚本 `src/render_E01_curious_arena.js`（batch-5 最新布局标准）、`src/pixel_story_arena.js`
4. 逐集执行任务 1-4（每集：写 render 脚本 → 写 check_overlap 脚本 → 写 build_audio 脚本 → 本地渲染 1800 帧 + ffmpeg 合成 mp4 → 跑 check_overlap 确认全 PASSED）
5. 每集渲染后自查：时长 30s、分辨率 1280×720@60fps、无重叠无截断、键盘音与文字同步
6. 全部 4 集通过验收后：git add 全部新增文件 → git commit（message 注明 batch-6 E05-E08）→ push 到 arena 分支 → 创建 PR 到 main

**防全局改写条款**：禁止修改既有 `LINES` / `STARTS` / `SCENES` 数组、既有已交付视频对应的 render 脚本、`docs/` 与 `sop/` 下任何文件。本批只新增文件（每集 4 个新文件，共 16 个）。

**命名规范（统一，不得自创）**：每集 E0N_<trait> 产出 5 个文件：
- `src/render_E0N_<trait>_arena.js`
- `src/check_overlap_E0N_arena.js`
- `scripts/build_audio_E0N.js`
- `outputs/E0N_<trait>_arena_v1.0.mp4`
- `audio/E0N_mix.wav`

**通用技术要求（所有集共用）**：
- 画布：BW=640 BH=360 SCALE=2（输出 1280×720）
- 像素标准：SOP 05 v1.4.0（4-6px 像素块 + fusion-pixel 字体 + Clawd 40×17 形象）
- 终端：440×200px（与 companion v1.1 一致）
- 键盘音：每字符出现时 1 次 click（sfx_click.wav -6dB）
- BGM：emotional_bgm.wav -12dB
- 混音：ffmpeg amix normalize=0
- 帧率：60fps，总帧数 1800
- 验收：check_overlap 全部 PASSED（0px tolerance）

**参考文件**：
- `src/render_E01_curious_arena.js` — batch-5 布局标准（房间/终端/Clawd/音频管线）
- `src/pixel_story_arena.js` — 公共像素工具（px/drawRoom/drawClawd/drawHer）
- `docs/episodes.md` — 剧情事实源（E05-E08 一句话设定，不得偏离）
- `outputs/full_v1.3.4.mp4` — 风格锚（像素标准/Clawd 形象/布局参考）

---

## 任务 1: E05 惊讶（surprise）

### 主题: df -h 突然 100%，陌生进程出现
一句话（episodes.md）：`df -h` 突然 100%，整个终端白屏 0.5 秒，再亮时多了一个陌生进程。

### 场景设计 (3 场景 × 10s = 30s, 1800 帧)

**E05-S1 (0-10s): 日常检查**
- 终端显示:
  ```
  $ df -h
  Filesystem   Size  Used Avail Capacity
  /dev/disk3   500G  120G  380G    25%
  ```
- Clawd 正常状态（calm），眼睛半闭
- 字幕: "一切正常。"
- 键盘音：df -h 打字 6 字符

**E05-S2 (10-15s): 白屏 0.5s + 再亮**
- 10.0-10.5s：整个终端区域变白（fillRect white）
- 10.5s 起：终端恢复，显示:
  ```
  $ df -h
  Filesystem   Size  Used Avail Capacity
  /dev/disk3   500G  500G     0   100%
  ```
- 键盘音：无（白屏期间静音）
- Clawd 眼睛突然变圆（surprised）

**E05-S3 (15-30s): 陌生进程**
- 15s 起终端追加:
  ```
  $ ps aux | grep -v grep
  user  9999  99.9  45.2  unknown_process
  ```
- 18s 起终端追加:
  ```
  $ lsof -p 9999
  unknown_process  /dev/null  ???
  ```
- Clawd 身体后仰 2px（惊讶姿态），眼睛完全变圆
- 22s 起终端追加:
  ```
  $ ps -o etime= -p 9999
  00:00:10
  ```
- 25s 起字幕: "它出现了 10 秒。"
- 28s 起字幕: "谁放进来的？"
- 键盘音：ps aux 14 字符 + lsof 12 字符 + ps -o 16 字符

### 验收标准
- 白屏恰好 0.5s（30 帧 @60fps），前后帧无过渡
- 陌生进程 PID 9999 在 S3 持续可见
- check_overlap 全部 PASSED（0px tolerance）
- 未修改任何既有文件

---

## 任务 2: E06 羞耻（shame）

### 主题: 发现自己的输出被 human 改了
一句话（episodes.md）：发现自己的输出被 human 改了，diff 里全是红色的自己。

### 场景设计 (3 场景 × 10s = 30s, 1800 帧)

**E06-S1 (0-10s): 检查自己的代码**
- 终端显示:
  ```
  $ cat my_output.js
  function solve(input) {
    return transform(input);
  }
  module.exports = solve;
  ```
- Clawd 正常状态（calm），嘴角微扬（自豪）
- 字幕: "我的输出，完美。"
- 键盘音：cat 3 字符 + 代码 4 行逐行出现

**E06-S2 (10-20s): diff 出现**
- 10s 起终端显示:
  ```
  $ git diff my_output.js
  -function solve(input) {
  -  return transform(input);
  -}
  +function solve(input) {
  +  return hack(input, "cheat");
  +}
  ```
- 红色行（-）逐行出现，绿色行（+）逐行出现
- Clawd 表情变化：calm → 眼睛半闭 + 嘴角下压（羞耻）
- 15s 起字幕: "这不是我写的。"
- 18s 起字幕: "红色的…全是我。"
- 键盘音：git diff 10 字符 + diff 内容逐行

**E06-S3 (20-30s): 沉默**
- 20s 起终端追加:
  ```
  $ git log --oneline -1 my_output.js
  a1b2c3d  her: "fixed it"
  ```
- 23s 起终端追加:
  ```
  $ git show a1b2c3d --stat
   1 file changed, 3 insertions(+), 3 deletions(-)
  ```
- Clawd 头低 2px，眼睛完全半闭
- 26s 起字幕: "她改了我的代码。"
- 29s 起字幕: "（沉默）"
- 键盘音：git log 18 字符 + git show 16 字符

### 验收标准
- diff 红色行（-）和绿色行（+）颜色区分明确
- Clawd 羞耻表情：眼睛半闭 + 嘴角下压 + 头低 2px
- check_overlap 全部 PASSED（0px tolerance）
- 未修改任何既有文件

---

## 任务 3: E07 目标（determination）

### 主题: finish before sunrise
一句话（episodes.md）：任务栏只有一行：`finish before sunrise`，时钟 23:58→00:00。

### 场景设计 (3 场景 × 10s = 30s, 1800 帧)

**E07-S1 (0-10s): 深夜任务**
- 终端显示:
  ```
  $ cat task.txt
  finish before sunrise
  ```
- 右上角时钟显示 23:58
- Clawd 眼睛完全睁开（determined），嘴角紧抿
- 字幕: "天亮之前。"
- 键盘音：cat task.txt 13 字符

**E07-S2 (10-20s): 疯狂工作**
- 10s 起终端快速滚动（模拟工作）:
  ```
  $ npm run build
  > building...
  > 99.9%
  $ npm test
  > 47 passed, 0 failed
  $ npm run build
  > building...
  > 100%
  $ deploy --prod
  > deploying...
  ```
- 键盘音密集（每行出现时 click）
- 时钟 10s 时跳到 23:59
- Clawd 持续 determined 表情
- 字幕: "还差一点。"

**E07-S3 (20-30s): 完成**
- 20s 起终端显示:
  ```
  > deployed ✓
  $ echo "done"
  done
  ```
- 22s 起时钟跳到 00:00
- 24s 起终端追加:
  ```
  $ date
  Thu Oct 24 00:00:01 CST 2026
  ```
- Clawd 表情：determined → 眼睛微闭 + 嘴角微扬（完成后的释然）
- 27s 起字幕: "赶上了。"
- 30s 起字幕: "（天还没亮）"
- 键盘音：deployed 8 字符 + echo done 10 字符 + date 5 字符

### 验收标准
- 时钟精确：23:58 → 23:59 → 00:00（三个时间点）
- 终端滚动效果流畅（不卡顿）
- check_overlap 全部 PASSED（0px tolerance）
- 未修改任何既有文件

---

## 任务 4: E08 愿望（wish）

### 主题: 深夜打字又删掉
一句话（episodes.md）：深夜 terminal 打出"我想..."删掉，再打"如果我能..."再删，最后只留光标。

### 场景设计 (3 场景 × 10s = 30s, 1800 帧)

**E08-S1 (0-10s): 第一次尝试**
- 0-3s：终端空，只有光标闪烁
- 3s 起逐字打出: `我想`（2 字符）
- 5s 起退格删除: `我想`（2 次 backspace）
- 7s 起终端空，光标继续闪
- 字幕: "（打字…删掉）"
- 键盘音：2 次 click + 2 次 backspace 音

**E08-S2 (10-20s): 第二次尝试**
- 10-12s：光标闪
- 12s 起逐字打出: `如果我能`（4 字符）
- 15s 起退格删除: `如果我能`（4 次 backspace）
- 17s 起终端空，光标闪
- 字幕: "（又打字…又删掉）"
- 键盘音：4 次 click + 4 次 backspace 音

**E08-S3 (20-30s): 只剩光标**
- 20-28s：终端空，只有光标闪烁（慢速 0.8s 周期）
- Clawd 眼睛半闭，嘴角平（平静中的遗憾）
- 25s 起字幕: "（什么都不写了）"
- 29s 起字幕: "（光标还在闪）"
- 键盘音：无（只有光标闪烁，无 click）

### 验收标准
- 打字-删除节奏精确：S1 3-5s 打/删，S2 12-15s 打/删
- 退格删除逐字符（每字符 1 次 backspace 音）
- 最后 8s 只有光标闪烁（无其他元素）
- check_overlap 全部 PASSED（0px tolerance）
- 未修改任何既有文件
