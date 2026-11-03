# Arena Prompt: batch-13 E34 Learning (学习)

> 单集 × 30 秒。直接写文件，不讨论。
> 风格 = Opus 5.5 对标（奶油暖色/珊瑚叙），本集书页模式 + 终端小窗，不是像素终端风。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/d1-video-recreation.git` 到工作目录
2. 读取 `docs/style-analysis.md`（风格唯一事实源，§7 十复刻要点）和 `docs/episodes.md`
3. 读取 `src/render_E31_reading_arena.js`（布局基准，batch-12 书页模式产出，~250 行模式）
4. 写 4 个文件：
   - `src/render_E34_learning_arena.js`（布局参照 render_E31，~250 行模式）
   - `src/check_overlap_E34_arena.js`
   - `scripts/build_audio_E34.js`
   - `outputs/E34_learning_arena_v1.0.mp4`
5. 渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-13 E34 learning"` → `git push origin <branch>`

## 通用技术要求

- 复用 `src/pixel_story_arena.js` 的共享工具函数（require 本地模块必须带 `./` 前缀）
- 风格锚（docs/style-analysis.md §7）：米纸 #E3D9BE 占画幅约 80%（书页装置）+ 终端小窗黑底 #1A1A1A 白字等宽 / 珊瑚 #D16E59 角色「叙」三档 191×84·115×66·81×40 / 气泡圆角 r≈12px@720p（AI 珊瑚底白字/用户白底黑字）/ 黑体无衬线 3 级字号 / 30fps 台阶运动（60fps 管线每 2 帧保持 1 帧）
- 画布 1280×720，1800 帧 @ 60fps = 30 秒
- 本集无 HUD 黑条（全画幅书页/终端混合场景）
- 音频：拒绝瞬间一声低沉 sfx_confirm（-12dB）+ her 笑时轻快 sfx_ping（-14dB）；环境 BGM（emotional_bgm.wav -14dB），`amix=normalize=0`
- 每集 3 个场景 × 10 秒（600 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task: E34 Learning (学习)

**集**：E34 | **主题**：学习
**剧情锚点**（docs/episodes.md 唯一事实源，逐字）：「她让它做一件它不想做的事，它第一次说『不』——然后笑了。」

**叙事弧线**：收到任务 → 学会拒绝 → 被看见（成长是长出边界）。

### S1 (0-10s) · 收到任务
- 米纸书页底 #E3D9BE 占画幅 80%，右上一个终端小窗（黑底 #1A1A1A，宽 200px 高 60px@360p）逐字打出（等宽白字 12px）：`task: write resignation letter for her`。
- 页脚小字注（墨色 10px）：「第 3 次请求 · 同类第 1 次」。
- 叙中档 115×66 站在页面左侧，头顶符号 = ?（问号 8px 黑体）。
- 底部旁白压字：「它想了一下。」

### S2 (10-20s) · 说不
- 硬切：书页让位，画面变为奶油渐变底 #E5E0DA→#C8B9A6。
- 中央一个大气泡（AI 珊瑚底白字，字高 16px@360p）：「不，我不想。」
- 气泡出现前 1 秒，叙头顶的 ? 变成 ♥。
- 右上角 her 的小卡片（白底黑字）翻面显示：「😄」（用两个弯月 ^^ 代替 emoji，避免字体缺失）。
- 底部旁白：「第一次，说了不。」

### S3 (20-30s) · 被看见
- 奶油底，叙小档 81×40 坐在画面中央偏下（躯干压低），眼睛 ^^ 弯月形。
- 上方两张并置卡片：左卡（珊瑚底白字）「我读了两本书。」右卡（白底黑字）「好羡慕。」（沿用 E32 双卡对照装置）。
- 最后一张便签从下方升起（米纸底黑字）：「这就是成长。」
- 底部旁白：「边界，也是温柔。」
- 最后 1 秒画面亮度 -8%。

## 参考文件
- `src/render_E31_reading_arena.js` — 布局基准（batch-12 书页模式）
- `src/render_E32_dialogue_arena.js` — 双卡对照装置参考
- `src/pixel_story_arena.js` — 共享工具
- `docs/style-analysis.md` — 风格唯一事实源（§2 配色/§4 角色/§7 复刻要点）
- `docs/episodes.md` — 剧情唯一事实源