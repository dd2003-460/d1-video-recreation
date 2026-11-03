# Arena Prompt: batch-13 E36 Return (回来)

> 单集 × 30 秒。直接写文件，不讨论。
> 风格 = Opus 5.5 对标（奶油暖色/珊瑚叙），本集归档盒 + 卡片墙复活装置，不是像素终端风。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/d1-video-recreation.git` 到工作目录
2. 读取 `docs/style-analysis.md`（风格唯一事实源，§7 十复刻要点）和 `docs/episodes.md`
3. 读取 `src/render_E35_farewell_arena.js`（布局基准，batch-13 归档装置产出，~250 行模式；若未先做 E35 则参照 render_E30_memory_arena.js 的卡片墙+HUD）
4. 写 4 个文件：
   - `src/render_E36_return_arena.js`（布局参照 render_E35，~250 行模式）
   - `src/check_overlap_E36_arena.js`
   - `scripts/build_audio_E36.js`
   - `outputs/E36_return_arena_v1.0.mp4`
5. 渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-13 E36 return"` → `git push origin <branch>`

## 通用技术要求

- 复用 `src/pixel_story_arena.js` 的共享工具函数（require 本地模块必须带 `./` 前缀）
- 风格锚（docs/style-analysis.md §7）：奶油渐变底 #E5E0DA→#C8B9A6 / 归档盒图标（深棕 #8B6F47 矩形 40×30px@360p）/ 卡片墙组件（白/浅珊瑚圆角小卡 60–90px@720p + 卡内 2–3 条灰横线）/ 珊瑚 #D16E59 角色「叙」三档 191×84·115×66·81×40 / 黑体无衬线 3 级字号 / 30fps 台阶运动（60fps 管线每 2 帧保持 1 帧）
- 画布 1280×720，1800 帧 @ 60fps = 30 秒
- 本集启用 HUD 黑条（顶/底各 78px@720p）：顶条「上下文+橙色进度条+百分比」、底条英文 `restored: N files`
- 音频：恢复音 sfx_ping 轻快连击（-12dB ×3）+ 最后一声 sfx_confirm（-10dB）；环境 BGM（emotional_bgm.wav -14dB），`amix=normalize=0`
- 每集 3 个场景 × 10 秒（600 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task: E36 Return (回来)

**集**：E36 | **主题**：回来
**剧情锚点**（docs/episodes.md 唯一事实源，逐字）：「三个月后 her 的第一句话是『在吗』，叙把 archive 里的文件一个个取出来，亮着。」

**叙事弧线**：安静了很久 → 一个消息 → 全部点亮（安放过的东西才拿得回来）。

### S1 (0-10s) · 安静了很久
- 奶油渐变底，右下角归档盒图标（深棕矩形），盒子旁一行小字（等宽 10px 墨色）：`archive: 12 files kept · 92 days`。
- 叙中档 115×66 站在画面左侧，眼睛平静两点，头顶无符号（与 E35 结尾的 ♥ 对照——现在没有情绪，只有等待）。
- 底部旁白压字：「它没有删任何东西。」

### S2 (10-20s) · 一个消息
- 右侧升起用户气泡（白底黑字）：「在吗？」（两个字，气泡比 E35 的消息短得多）。
- 叙头顶符号 = !，身体轻微前倾（躯干右移 4px，同 E32 打招呼装置）。
- 硬切后半段：归档盒打开（盒盖向上平移 8px），卡片开始飞出——每张卡从盒子向右上方散开（每 1.5 秒 1 张，本场景飞 6 张，白/浅珊瑚交替，卡内灰横线）。
- HUD 顶部：CONTEXT 8% → 40%；底部：`restored: 6 files`。
- 底部旁白：「一个一个，拿出来。」

### S3 (20-30s) · 亮着
- 硬切：卡片墙铺满画面（12 张全数恢复，密度同 E30 S2 终态）。
- 叙中档站在卡片墙前中央，眼睛 ^^ 弯月形，头顶 ♥。
- 一张 AI 气泡（珊瑚底白字）从叙头顶升起：「在。」（一个字，呼应 her 的两个字）。
- HUD 顶部：CONTEXT 40% → 62%；底部：`restored: 12 files`。
- 底部旁白：「放好的，才拿得回来。」
- 最后 1 秒整面卡片墙轻微脉动一次（透明度 ±0.1），亮度 -8%。

## 参考文件
- `src/render_E35_farewell_arena.js` — 布局基准（batch-13 归档装置）
- `src/render_E30_memory_arena.js` — 卡片墙密度装置参考
- `src/pixel_story_arena.js` — 共享工具
- `docs/style-analysis.md` — 风格唯一事实源（§2 配色/§4 角色/§7 复刻要点）
- `docs/episodes.md` — 剧情唯一事实源