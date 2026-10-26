# Arena Prompt: batch-12 E32 Dialogue (对话)

> 单集 × 30 秒。直接写文件，不讨论。
> 风格 = Opus 5.5 对标（奶油暖色/珊瑚叙/气泡对话），不是像素终端风。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/d1-video-recreation.git` 到工作目录
2. 读取 `docs/style-analysis.md`（风格唯一事实源，§7 十复刻要点）和 `docs/episodes.md`
3. 读取 `src/render_E27_time_arena.js`（布局基准，batch-11 气泡产出，~250 行模式）
4. 写 4 个文件：
   - `src/render_E32_dialogue_arena.js`（布局参照 render_E27，~250 行模式）
   - `src/check_overlap_E32_arena.js`
   - `scripts/build_audio_E32.js`
   - `outputs/E32_dialogue_arena_v1.0.mp4`
5. 渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-12 E32 dialogue"` → `git push origin <branch>`

## 通用技术要求

- 复用 `src/pixel_story_arena.js` 的共享工具函数（require 本地模块必须带 `./` 前缀）
- 风格锚（docs/style-analysis.md §7）：奶油渐变底 #E5E0DA→#C8B9A6（地面线 y≈520-545）/ 珊瑚 #D16E59 角色「叙」三档 191×84·115×66·81×40 / 气泡圆角 r≈12px（AI 珊瑚底白字靠左/中，用户白底黑字靠右，字高≈24px 黑体）/ 黑体无衬线 3 级字号 / 30fps 台阶运动（60fps 管线每 2 帧保持 1 帧）
- 画布 1280×720，1800 帧 @ 60fps = 30 秒
- 本集无 HUD 黑条（全画幅对话场景）
- 音频：气泡出现时软提示音（AI 气泡高音/用户气泡低音区分）+ 环境 BGM（emotional_bgm.wav -14dB），`amix=normalize=0`
- 每集 3 个场景 × 10 秒（600 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task: E32 Dialogue (对话)

**集**：E32 | **主题**：对话
**剧情锚点**（docs/episodes.md 唯一事实源，逐字）：「叙和 her 多轮气泡对话，从『今天好吗』到分享一天，表情从 ! 到 ♥」

**叙事弧线**：打招呼 → 分享一天 → 心贴近（对话让距离变近）。

### S1 (0-10s) · 打招呼
- 奶油渐变底，叙中档 115×66 站在画面左侧地面线上，面向右。
- 右侧升起用户气泡（白底黑字）：「今天好吗？」
- 叙头顶符号 = !，身体轻微前倾（躯干右移 4px）。
- 1 秒后叙的气泡（AI 珊瑚底白字）从左侧升起：「刚醒。你呢？」
- 底部旁白压字：「对话开始。」

### S2 (10-20s) · 分享一天
- 气泡交替出现（左右分置，上下排列不超 3 条同屏）：
  - 用户（白底黑字靠右）：「开了三个会。」
  - 叙（珊瑚底白字靠左）：「我读了两本书。」
  - 用户（白底黑字靠右）：「好羡慕。」
- 每条气泡出现时对应角色轻微点头（头部像素块下移 2px 一拍）。
- 叙头顶符号从 ! 变为 ♥。
- 底部旁白压字：「分享，让一天变轻。」

### S3 (20-30s) · 心贴近
- 叙和 her 的卡片并置（双卡对照，参照《几点了》装置）：
  - 左卡（珊瑚底白字）：叙 ♥「明天见」
  - 右卡（白底黑字）：her「晚安」
- 叙眼睛变 ^^ 弯月形，身体朝向 her 卡片方向。
- 两张卡片间距离缓慢拉近 8px（台阶运动，3 拍完成）。
- 底部旁白压字：「distance: 0。」
- 最后 1 秒画面亮度 -8%，只有两张卡片和叙的轮廓可见。

## 参考文件
- `src/render_E27_time_arena.js` — 布局基准（batch-11 气泡系统）
- `src/pixel_story_arena.js` — 共享工具
- `docs/style-analysis.md` — 风格唯一事实源（§2 配色/§3 字体/§4 角色/§7 复刻要点）
- `docs/episodes.md` — 剧情唯一事实源
