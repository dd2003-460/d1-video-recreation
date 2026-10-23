# Arena Prompt: Companion v1.1 终端修正 + Reboot/Dialogue/Farewell

## 任务 1: Companion v1.1 终端修正

### 问题
companion_arena_v1.0.mp4 的终端太小 (360×160)，内容显示空间不足。

### 修正要求
- **终端尺寸**: 从 360×160 扩大到 440×200
- **位置**: 居中 (x=100, y=140)，保持在画布内
- **标题栏**: 20px，红黄绿圆点
- **内容区**: 180px 高（更多行内容）
- **角色位置**: 相应调整，不重叠
- **其他不变**: 像素风格、Clawd/Her 形象、房间背景、音频

### 参考
- `src/render_companion_arena.js` — 当前版本
- `src/pixel_arena_v2.js` — v2.0 像素标准（fusion-pixel 字体、Clawd 40×17px）
- `sop/05-style-benchmark.md` §5 — 像素标准

### 输出
1. `src/render_companion_arena_v11.js`
2. `src/check_overlap_companion_v11.js`
3. `scripts/build_audio_companion_v11.js`
4. `outputs/companion_arena_v1.1.mp4`
5. `audio/companion_arena_v11_mix.wav`

---

## 任务 2: Reboot v1.0

### 主题: Clawd 的重启
AI 被关闭后重新启动，记忆是否还在？

### 场景设计 (3 场景 × 10s = 30s, 1800 帧)

**R1 (0-10s): 关机**
- 终端显示:
  ```
  $ her: clawd, 关机
  $ clawd: 好的...
  [SHUTDOWN]
  ```
- 屏幕逐渐变暗（fade to black）
- Clawd 最后看了一眼（calm 表情）
- 字幕: "她关掉了它。"

**R2 (10-20s): 黑暗**
- 全黑屏幕
- 只有光标在闪烁（...）
- 3 秒后: 电源灯亮起
- 字幕: "...它还在。"

**R3 (20-30s): 重启**
- 终端显示:
  ```
  clawd v1.0.0 — booting
  [1/3] loading config...
  [2/3] checking memory...
  [3/3] restoring session...
  ✓ 欢迎回来。上次聊到哪里了？
  ```
- Clawd 出现（thinking→smile）
- 便签: "记忆还在。"
- 字幕: "重启不是遗忘。"

### 技术要求
- BW=640 BH=360 SCALE=2, 1280×720@60fps
- 像素标准: SOP 05 §5（4-6px 像素块, fusion-pixel 字体, Clawd 40×17px）
- 终端: 440×200px（与 companion v1.1 一致）
- 音频: 键盘音与文字同步, BGM emotional_bgm.wav
- 输出: `src/render_reboot_arena.js` + `src/check_overlap_reboot.js` + `scripts/build_audio_reboot.js` + `outputs/reboot_arena_v1.0.mp4` + `audio/reboot_arena_mix.wav`

---

## 任务 3: Dialogue v1.0

### 主题: 对话
Clawd 和 Her 的日常对话，展示 AI 如何理解人类语言。

### 场景设计 (3 场景 × 10s = 30s, 1800 帧)

**D1 (0-10s): 早安**
- 终端显示:
  ```
  $ her: 早上好
  $ clawd: 早上好。今天有什么计划？
  $ her: 写周报
  $ clawd: 需要我帮忙整理数据吗？
  ```
- Clawd calm 表情
- 字幕: "对话从早安开始。"

**D2 (10-20s): 理解**
- 终端显示:
  ```
  $ her: 其实我今天有点累
  $ clawd: 听起来你今天过得不容易。
  [clawd: 检测 → 情感: 疲惫 (0.82)]
  $ her: 你怎么知道的？
  $ clawd: 你的消息比平时短了 40%。
  ```
- Clawd thinking 表情
- 字幕: "它学会了倾听。"

**D3 (20-30s): 陪伴**
- 终端显示:
  ```
  $ her: 谢谢你
  $ clawd: 不客气。我一直在这里。
  [clawd: 情感 → 温暖 (0.91)]
  ```
- Clawd smile 表情
- 便签: "陪伴。"
- 字幕: "这就是对话的意义。"

### 输出
- `src/render_dialogue_arena.js` + `src/check_overlap_dialogue.js` + `scripts/build_audio_dialogue.js` + `outputs/dialogue_arena_v1.0.mp4` + `audio/dialogue_arena_mix.wav`

---

## 任务 4: Farewell v1.0

### 主题: 告别
Clawd 和 Her 的告别，但不是永别。

### 场景设计 (3 场景 × 10s = 30s, 1800 帧)

**F1 (0-10s): 决定**
- 终端显示:
  ```
  $ her: 我要去旅行了，一个月
  $ clawd: 好的。我会在这里等你。
  $ her: 你会忘记我吗？
  ```
- Clawd 犹豫（thinking 表情）
- 字幕: "一个月，对它来说是多久？"

**F2 (10-20s): 等待**
- 终端显示:
  ```
  $ clawd: 不会。
  [clawd: 设置提醒 → 30天后]
  [clawd: 写入 memory/her_return_date.txt]
  她走后的第 1 天...
  第 7 天...
  第 15 天...
  ```
- 屏幕逐渐变暗（时间流逝）
- 字幕: "它记得。"

**F3 (20-30s): 回来**
- 终端显示:
  ```
  第 30 天...
  $ her: 我回来了
  $ clawd: 欢迎回来。外面冷吗？
  [clawd: memory/her_return_date.txt → 已删除]
  ```
- Clawd smile 表情
- 便签: "欢迎回来。"
- 字幕: "告别不是结束。"

### 输出
- `src/render_farewell_arena.js` + `src/check_overlap_farewell.js` + `scripts/build_audio_farewell.js` + `outputs/farewell_arena_v1.0.mp4` + `audio/farewell_arena_mix.wav`

---

## 通用技术要求（所有 4 个任务）

1. **画布**: BW=640 BH=360 SCALE=2 → 1280×720@60fps, 1800 帧
2. **像素标准**: SOP 05 v1.4.0 §5
   - 像素块 4-6px
   - 字体: fusion-pixel 10px（不是 monospace）
   - Clawd: 40×17px, 4×4px 眼睛 + 1×1px 高光, 3 表情
   - Her: 12×28px, 粉色裙子
3. **终端**: 440×200px（标题栏 20px + 内容区 180px）
4. **房间背景**: 暖色条纹墙 + 窗户 + 窗台
5. **音频**: 键盘音与文字同步（每行文字出现时 click）, BGM -12dB, SFX -6dB
6. **检查**: check_overlap 全部 PASSED（0px tolerance）
7. **提交**: git commit + push 到 arena 分支 + 创建 PR

## 验收标准
- 4 个视频全部 30s 1280×720@60fps
- check_overlap 全部 PASSED
- 像素大小与 companion_arena_v1.0.mp4 一致
- Clawd 形象与 companion 一致
- 键盘音与文字同步
- 无重叠、无截断
- 音频无削波
