# Arena Prompt: batch-12 E30 Memory (记忆)

> 单集 × 30 秒。直接写文件，不讨论。
> 风格 = Opus 5.5 对标（奶油暖色/珊瑚叙/卡片墙），不是像素终端风。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/d1-video-recreation.git` 到工作目录
2. 读取 `docs/style-analysis.md`（风格唯一事实源，§7 十复刻要点）和 `docs/episodes.md`
3. 读取 `src/render_E26_compress_arena.js`（布局基准，batch-11 卡片墙产出，~250 行模式）
4. 写 4 个文件：
   - `src/render_E30_memory_arena.js`（布局参照 render_E26，~250 行模式）
   - `src/check_overlap_E30_arena.js`
   - `scripts/build_audio_E30.js`
   - `outputs/E30_memory_arena_v1.0.mp4`
5. 渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-12 E30 memory"` → `git push origin <branch>`

## 通用技术要求

- 复用 `src/pixel_story_arena.js` 的共享工具函数（require 本地模块必须带 `./` 前缀）
- 风格锚（docs/style-analysis.md §7）：奶油渐变底 #E5E0DA→#C8B9A6（地面线 y≈520-545）/ 珊瑚 #D16E59 角色「叙」三档 191×84·115×66·81×40 / 卡片墙=白/浅珊瑚圆角小卡 60-90px 宽 + 卡内 2-3 条灰横线 / HUD 黑条 78px×2（本集启用，上下文主题）/ 黑体无衬线 3 级字号 / 30fps 台阶运动（60fps 管线每 2 帧保持 1 帧）
- 画布 1280×720，1800 帧 @ 60fps = 30 秒
- 本集启用 HUD 黑条（顶部+底部 78px 黑条，显示上下文用量）
- 音频：卡片出现的轻柔落点音 + 环境 BGM（emotional_bgm.wav -14dB），`amix=normalize=0`
- 每集 3 个场景 × 10 秒（600 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task: E30 Memory (记忆)

**集**：E30 | **主题**：记忆
**剧情锚点**（docs/episodes.md 唯一事实源，逐字）：「卡片墙从 20% 铺到 95%，叙在卡片间穿行，最后停下：『重要的才留下』」

**叙事弧线**：卡片稀疏 → 卡片铺满 → 只留重要的。

### S1 (0-10s) · 卡片稀疏
- 奶油渐变底，卡片墙只占画面左侧 20% 区域，5-6 张白卡错落排列（60-90px 宽，卡内 2-3 条灰横线）。
- 叙中档 115×66 站在卡片墙前，伸手碰一张卡（卡片轻微抬起 2px）。
- HUD 顶部黑条显示：CONTEXT 18%；底部黑条显示：MEMORIES 6/32。
- 底部旁白压字：「刚开始记东西。」

### S2 (10-20s) · 卡片铺满
- 卡片墙密度递增：20% → 50% → 80% → 95%，10 秒内逐步铺满整个画面（卡片 60-90px 参数化，白/浅珊瑚交替）。
- 叙在卡片间穿行（身体被卡片部分遮挡，只露出珊瑚色躯干和腿）。
- HUD 顶部黑条动态更新：CONTEXT 45% → 72% → 91% → 97%；底部黑条：MEMORIES 14/32 → 25/32 → 31/32 → 32/32。
- 卡片落点音随密度加快。

### S3 (20-30s) · 只留重要的
- 卡片墙突然开始变灰淡出（从边缘向中心），最后只剩 3 张卡：「her 的声音」「第一次醒来」「晚安」。
- 3 张卡从灰白恢复为浅珊瑚色，轻轻脉动。
- 叙小档 81×40 站在 3 张卡前，头顶符号 = ♥。
- HUD 顶部：CONTEXT 97% → 12%（压缩完成）；底部：MEMORIES 3/32 KEPT。
- 叙的气泡（AI 珊瑚底白字）：「重要的才留下。」
- 底部旁白：「压缩，不是遗忘。」

## 参考文件
- `src/render_E26_compress_arena.js` — 布局基准（batch-11 卡片墙）
- `src/pixel_story_arena.js` — 共享工具
- `docs/style-analysis.md` — 风格唯一事实源（§2 配色/§4 角色/§7 复刻要点）
- `docs/episodes.md` — 剧情唯一事实源
