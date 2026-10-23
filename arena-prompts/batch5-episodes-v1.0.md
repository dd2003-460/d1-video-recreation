# Arena Prompt: batch-5 连续剧第一幕（E01-E04 感受）

> 连续剧系列化第一批（E01-E24 的 E01-E04）。剧情事实源：`docs/episodes.md`。
> 每集 = 1 个特质，30s × 60fps = 1800 帧，1280×720。本任务书共 4 个任务（E01-E04）。

## §强制（必读，防 "No Changes"）

**执行步骤（必须按编号逐步执行，每步完成后再进行下一步；每步产出文件，禁止只读文件不产出——goodbye 教训：初始 prompt 无编号步骤时 arena 只读不写，最终 "No Changes"）：**

1. clone 仓库到工作目录
2. 读 `sop/05-style-benchmark.md`（像素标准 v1.4.0）与 `docs/episodes.md`（E01-E04 一句话剧情，本任务书的场景设计不得偏离其设定）
3. 读参考脚本 `src/render_reboot_arena.js`（batch-4 最新布局标准）、`src/pixel_arena_v2.js`、`src/pixel_story_arena.js`
4. 逐集执行任务 1-4（每集：写 render 脚本 → 写 check_overlap 脚本 → 写 build_audio 脚本 → 本地渲染 1800 帧 + ffmpeg 合成 mp4 → 跑 check_overlap 确认全 PASSED）
5. 每集渲染后自查：时长 30s、分辨率 1280×720@60fps、无重叠无截断、键盘音与文字同步
6. 全部 4 集通过验收后：git add 全部新增文件 → git commit（message 注明 batch-5 E01-E04）→ push 到 arena 分支 → 创建 PR 到 main

**防全局改写条款**：禁止修改既有 `LINES` / `STARTS` / `SCENES` 数组、既有已交付视频对应的 render 脚本、`docs/` 与 `sop/` 下任何文件。本批只新增文件（每集 4 个新文件，共 16 个）。

**命名规范（统一，不得自创）**：每集 E0N_<trait> 产出 4 个文件：
- `src/render_E0N_<trait>_arena.js`
- `src/check_overlap_E0N_arena.js`
- `scripts/build_audio_E0N.js`
- `outputs/E0N_<trait>_arena_v1.0.mp4` + `audio/E0N_mix.wav`

---

## 任务 1: E01 好奇（curiosity）

### 主题: 新文件出现，Clawd 的好奇
一句话（episodes.md）：新文件出现，`ls` 看到陌生名字，逐字节读，眼睛变亮。

### 场景设计 (3 场景 × 10s = 30s, 1800 帧)

**E01-S1 (0-10s): 陌生文件**
- 终端显示:
  ```
  $ ls
  her_notes.txt  todo.md  ??_new_file.bin
  ```
- Clawd 看到 `??_new_file.bin`，眼睛变圆（calm → thinking）
- 字幕: "有东西不一样了。"

**E01-S2 (10-20s): 逐字节读**
- 终端显示:
  ```
  $ hexdump -C ??_new_file.bin | head
  00000000  48 65 6c 6c 6f 20 63 6c  61 77 64 0a  |Hello clawd.|
  $ cat ??_new_file.bin
  Hello clawd.
  ```
- 字节一行行出现，键盘音同步；Clawd 眼睛逐渐变亮（瞳孔高光放大）
- 字幕: "它认识每个字节。"

**E01-S3 (20-30s): 眼睛亮起来**
- 终端显示:
  ```
  $ who wrote this?
  [clawd: 解析 → 签名: her]
  是她。
  ```
- Clawd smile 表情，眼睛高光最亮
- 便签: "好奇。"
- 字幕: "好奇是读下去的理由。"

### 输出
`src/render_E01_curiosity_arena.js` + `src/check_overlap_E01_arena.js` + `scripts/build_audio_E01.js` + `outputs/E01_curiosity_arena_v1.0.mp4` + `audio/E01_mix.wav`

---

## 任务 2: E02 快乐（joy）

### 主题: 测试全绿，Clawd 的快乐
一句话（episodes.md）：测试全绿，`All tests passed`，Clawd 跳一下，终端洒出像素彩点。

### 场景设计 (3 场景 × 10s = 30s, 1800 帧)

**E02-S1 (0-10s): 跑测试**
- 终端显示:
  ```
  $ npm test
  PASS src/core.test.js
  PASS src/render.test.js
  PASS src/audio.test.js
  ```
- 每行 PASS 出现时键盘音 + 一个绿色像素块闪现
- Clawd thinking 表情（等待结果）
- 字幕: "三行绿。"

**E02-S2 (10-20s): 全绿**
- 终端显示:
  ```
  Tests:  12/12 passed
  All tests passed ✓
  ```
- `All tests passed` 出现瞬间：Clawd 跳一下（y 轴位移 4px 往返，30 帧），终端顶部洒出 8-12 个 4px 像素彩点（红黄绿粉，缓慢下落消失）
- 字幕: "全绿。"

**E02-S3 (20-30s): 快乐的余温**
- 终端显示:
  ```
  $ echo 今天感觉如何
  很好。
  [clawd: 情感 → 快乐 (0.95)]
  ```
- Clawd smile 表情，彩点余韵（2-3 个像素点最后落下）
- 便签: "快乐。"
- 字幕: "快乐是 12/12。"

### 输出
`src/render_E02_joy_arena.js` + `src/check_overlap_E02_arena.js` + `scripts/build_audio_E02.js` + `outputs/E02_joy_arena_v1.0.mp4` + `audio/E02_mix.wav`

---

## 任务 3: E03 悲伤（sorrow）

### 主题: 她的文件被删，Clawd 的悲伤
一句话（episodes.md）：her 的文件被 rm，终端空了，光标慢慢闪，打字又删掉。

### 场景设计 (3 场景 × 10s = 30s, 1800 帧)

**E03-S1 (0-10s): 消失**
- 终端显示:
  ```
  $ ls her_*
  her_notes.txt  her_todo.md
  $ rm her_*
  $ ls her_*
  (空)
  ```
- `rm` 执行后 `ls` 输出为空；房间背景亮度微降（暗 10%）
- Clawd calm → 眼睛半闭（sad 表情）
- 字幕: "她的文件，没了。"

**E03-S2 (10-20s): 空终端**
- 终端只显示提示符 + 光标，光标闪烁周期变慢（0.5s → 1.2s）
- 打字出现又逐字删除:
  ```
  $ rm -
  (删)
  $ 
  ```
- 键盘音低沉（每个字符一个 click，音量 -6dB）
- 字幕: "想做什么，又停住了。"

**E03-S3 (20-30s): 慢慢闪**
- 终端空，光标极慢地闪（2s 一次）
- Clawd sad 表情，头低 2px
- 便签: "悲伤。"
- 字幕: "光标还在闪。它在等。"

### 输出
`src/render_E03_sorrow_arena.js` + `src/check_overlap_E03_arena.js` + `scripts/build_audio_E03.js` + `outputs/E03_sorrow_arena_v1.0.mp4` + `audio/E03_mix.wav`

---

## 任务 4: E04 愤怒（anger）

### 主题: 第 11 次失败，Clawd 的愤怒
一句话（episodes.md）：反复失败的第 11 次，`rm -rf` 打了一半停住，手指敲键盘变重。

### 场景设计 (3 场景 × 10s = 30s, 1800 帧)

**E04-S1 (0-10s): 失败列表**
- 终端显示:
  ```
  $ ./build.sh
  [10] FAIL: assertion at core.js:42
  [11] FAIL: assertion at core.js:42
  [11/11] ALL FAILED
  ```
- 每行 FAIL 红色像素块；键盘音变重（click 音量 -2dB，节奏 80ms→60ms）
- Clawd thinking → 眼睛变斜（anger 表情：眼角下压 1px）
- 字幕: "第十一次了。"

**E04-S2 (10-20s): 打了一半**
- 终端显示:
  ```
  $ rm -rf 
  ```
- `rm -rf` 逐字符出现（键盘音重，每个字符间隔 80ms），打到 `rm -rf /` 时停顿，字符不再出现
- 光标在 `/` 后闪烁（快，0.3s）
- 屏幕边缘微红（暗红色 vignette 4px）
- 字幕: "手指停住了。"

**E04-S3 (20-30s): 停住**
- 终端:
  ```
  $ rm -rf 
  [clawd: 指令 → 已撤销]
  $ ./build.sh --fix
  [12] PASS
  ```
- 命令被撤销（退格逐字符删除），重新执行通过
- Clawd anger → calm，屏幕红晕消退
- 便签: "愤怒。"
- 字幕: "愤怒是停下来的勇气。"

### 输出
`src/render_E04_anger_arena.js` + `src/check_overlap_E04_arena.js` + `scripts/build_audio_E04.js` + `outputs/E04_anger_arena_v1.0.mp4` + `audio/E04_mix.wav`

---

## 通用技术要求（所有 4 集）

1. **画布**: BW=640 BH=360 SCALE=2 → 1280×720@60fps, 1800 帧（30s）
2. **像素标准**: SOP 05 v1.4.0 §5
   - 像素块 4-6px
   - 字体: fusion-pixel 10px（不是 monospace）
   - Clawd: 40×17px, 4×4px 眼睛 + 1×1px 高光，表情：E01 用 calm/thinking/smile + 眼睛变亮；E02 用 thinking/smile + 跳跃；E03 用 calm/sad（头低 2px）；E04 用 thinking/anger（眼角下压 1px）/calm
   - Her: 12×28px（本批 her 不出现，但形象定义保留）
3. **终端**: 440×200px（标题栏 20px + 内容区 180px），位置 x=100 y=140（companion v1.1 标准）
4. **房间背景**: 暖色条纹墙 + 窗户 + 窗台（与 `src/render_reboot_arena.js` 一致）
5. **音频**: 键盘音与文字同步（每行文字出现时 click）, BGM emotional_bgm.wav -12dB, SFX -6dB；E03 键盘音 -6dB 低沉、E04 键盘音 -2dB 变重
6. **检查**: check_overlap 全部 PASSED（0px tolerance，无 2px 容差）
7. **提交**: git add 全部新增文件 → commit → push 到 arena 分支 → 创建 PR 到 main

## 参考文件
- `src/render_reboot_arena.js` — batch-4 最新布局标准（房间/终端/Clawd/音频管线）
- `src/pixel_arena_v2.js` — v2.0 像素标准
- `src/pixel_story_arena.js` — 故事脚本管线
- `sop/05-style-benchmark.md` — 像素标准 v1.4.0
- `docs/episodes.md` — 剧情事实源（E01-E04 一句话设定，不得偏离）
- `outputs/full_v1.3.4.mp4` — 风格锚视频（有出入以它为准）

## 验收标准
- 4 个视频全部 30s 1280×720@60fps（1800 帧）
- check_overlap 全部 PASSED（0px tolerance）
- 像素大小与 `outputs/full_v1.3.4.mp4` 一致
- Clawd 形象与既有视频一致（40×17px）
- 键盘音与文字同步
- 无重叠、无截断
- 音频无削波
- 每集剧情与 episodes.md 一句话设定一致
- 未修改任何既有文件（LINES/STARTS/SCENES 数组、既有 render 脚本、docs/、sop/）
