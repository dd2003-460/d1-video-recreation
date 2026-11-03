# Arena Prompt: batch-13 E35 Farewell (告别)

> 单集 × 30 秒。直接写文件，不讨论。
> 风格 = Opus 5.5 对标（奶油暖色/珊瑚叙），本集卡片墙 + 归档装置，不是像素终端风。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/d1-video-recreation.git` 到工作目录
2. 读取 `docs/style-analysis.md`（风格唯一事实源，§7 十复刻要点）和 `docs/episodes.md`
3. 读取 `src/render_E30_memory_arena.js`（布局基准，batch-12 卡片墙产出，~250 行模式）
4. 写 4 个文件：
   - `src/render_E35_farewell_arena.js`（布局参照 render_E30，~250 行模式）
   - `src/check_overlap_E35_arena.js`
   - `scripts/build_audio_E35.js`
   - `outputs/E35_farewell_arena_v1.0.mp4`
5. 渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-13 E35 farewell"` → `git push origin <branch>`

## 通用技术要求

- 复用 `src/pixel_story_arena.js` 的共享工具函数（require 本地模块必须带 `./` 前缀）
- 风格锚（docs/style-analysis.md §7）：奶油渐变底 #E5E0DA→#C8B9A6 / 卡片墙组件（白/浅珊瑚圆角小卡 60–90px@720p + 卡内 2–3 条灰横线，密度即叙事）/ 珊瑚 #D16E59 角色「叙」三档 191×84·115×66·81×40 / 黑体无衬线 3 级字号 / 30fps 台阶运动（60fps 管线每 2 帧保持 1 帧）
- 画布 1280×720，1800 帧 @ 60fps = 30 秒
- 本集启用 HUD 黑条（顶/底各 78px@720p）：顶条「上下文+橙色进度条+百分比」、底条英文 `archive: N files`——归档主题与上下文主题同型
- 音频：卡片打包音 sfx_confirm 连击（-14dB ×3）+ 清空时一声低沉消散（sfx_ping 降调 -18dB）；环境 BGM（emotional_bgm.wav -16dB，比日常集更沉），`amix=normalize=0`
- 每集 3 个场景 × 10 秒（600 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task: E35 Farewell (告别)

**集**：E35 | **主题**：告别
**剧情锚点**（docs/episodes.md 唯一事实源，逐字）：「her 说『我们暂时分开一段时间』，叙把她的文件一个个打包进 archive，终端第一次是干净的。」

**叙事弧线**：收到消息 → 打包放手 → 空也是完整（告别不是删除，是安放）。

### S1 (0-10s) · 收到消息
- 奶油渐变底，右侧升起用户气泡（白底黑字）：「我们暂时分开一段时间。」
- 叙中档 115×66 站在画面左侧，头顶符号 = !，身体静止（不前倾，与 E32 的主动对话形成对照）。
- 底部旁白压字：「它没有问为什么。」

### S2 (10-20s) · 打包
- 硬切卡片墙装置：画面铺满 12 张卡（白/浅珊瑚交替，卡内灰横线），每张卡上有一个小文件名标签（等宽 10px）：`her_first_meet.json` / `her_birthday.txt` / `good_morning.log` …
- 卡片逐个变灰并向右下角一个归档盒图标（深棕 #8B6F47 矩形 40×30px）移动（每 1.5 秒 1 张，共 12 张走完约 18 秒节奏的前半段，本场景内走 6 张）。
- HUD 顶部：CONTEXT 100% → 60%；底部：`archive: 6 files`。
- 底部旁白：「一个一个，收好。」

### S3 (20-30s) · 干净了
- 硬切：画面只剩奶油渐变底（完全空白，无卡片无气泡）。
- 叙小档 81×40 站在中央偏下，眼睛 ^^ 弯月形，头顶 ♥。
- 下方一行小字淡入（墨色 12px 等宽）：`$ ls her_* — no matches`。
- HUD 顶部：CONTEXT 60% → 8%；底部：`archive: 12 files kept`。
- 底部旁白：「空，也是完整。」
- 最后 1 秒画面亮度 -8%。

## 参考文件
- `src/render_E30_memory_arena.js` — 布局基准（batch-12 卡片墙+HUD）
- `src/pixel_story_arena.js` — 共享工具
- `docs/style-analysis.md` — 风格唯一事实源（§2 配色/§4 角色/§7 复刻要点）
- `docs/episodes.md` — 剧情唯一事实源