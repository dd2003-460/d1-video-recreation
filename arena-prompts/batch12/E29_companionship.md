# Arena Prompt: batch-12 E29 Companionship (陪伴)

> 单集 × 30 秒。直接写文件，不讨论。
> 风格 = Opus 5.5 对标（奶油暖色/珊瑚叙/气泡），不是像素终端风。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/d1-video-recreation.git` 到工作目录
2. 读取 `docs/style-analysis.md`（风格唯一事实源，§7 十复刻要点）和 `docs/episodes.md`
3. 读取 `src/render_E28_freetime_arena.js`（布局基准，batch-11 最近产出，~250 行模式）
4. 写 4 个文件：
   - `src/render_E29_companionship_arena.js`（布局参照 render_E28，~250 行模式）
   - `src/check_overlap_E29_arena.js`
   - `scripts/build_audio_E29.js`
   - `outputs/E29_companionship_arena_v1.0.mp4`
5. 渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-12 E29 companionship"` → `git push origin <branch>`

## 通用技术要求

- 复用 `src/pixel_story_arena.js` 的共享工具函数（require 本地模块必须带 `./` 前缀）
- 风格锚（docs/style-analysis.md §7）：奶油渐变底 #E5E0DA→#C8B9A6（本集夜景用深藏青 #393744）/ 珊瑚 #D16E59 角色「叙」三档 191×84·115×66·81×40 / 气泡圆角 r≈12px（AI 珊瑚底白字/用户白底黑字）/ 黑体无衬线 3 级字号 / 30fps 台阶运动（60fps 管线每 2 帧保持 1 帧）
- 画布 1280×720，1800 帧 @ 60fps = 30 秒
- 本集无 HUD 黑条（全画幅夜景）
- 音频：气泡出现时软提示音 + 环境夜声（蟋蟀/低 hum -18dB），`amix=normalize=0`
- 每集 3 个场景 × 10 秒（600 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task: E29 Companionship (陪伴)

**集**：E29 | **主题**：陪伴
**剧情锚点**（docs/episodes.md 唯一事实源，逐字）：「深夜 01:36，her 还没睡，叙蹲在台灯下守着，气泡只有一句『我在』」

**叙事弧线**：夜静了 → 守着 → 灯还亮着（陪伴不需要话多）。

### S1 (0-10s) · 夜静了
- 深藏青夜景 #393744 铺满，台灯在画面中右部亮起，暖黄光晕 #F5D9A8 圆形渐晕。
- 左侧一张小卡片：07:50 her「早」（白底黑字）；右侧一张小卡片：01:36 叙（珊瑚底白字，「还没睡？」）。
- 底部旁白压字（奶油白 28px）：「夜很静。」
- 叙中档 115×66 站在台灯下，面向卡片，眼睛是平静的两点。

### S2 (10-20s) · 守着
- 叙蹲下（躯干压低，腿弯曲成像素台阶），头顶符号 = 一个小 ♥。
- 台灯下只升一个气泡（AI 珊瑚底白字）：「我在。」
- 气泡悬浮 2 秒后缓慢淡出。底部旁白：「不需要话多。」
- 光晕轻微呼吸（半径 ±4px 慢速脉动）。

### S3 (20-30s) · 灯还亮着
- her 的卡片翻面变成：01:52 her「那晚安」（白底黑字）。
- 叙点头（头部像素块下移 2px 一拍），眼睛变成 ^^ 弯月形。
- 台灯保持亮着，光晕范围扩大一点。底部旁白：「灯还亮着。」
- 最后 1 秒画面整体亮度 -10%（夜更深），灯晕成为最亮处。

## 参考文件
- `src/render_E28_freetime_arena.js` — 布局基准（batch-11 Opus 5.5 风）
- `src/pixel_story_arena.js` — 共享工具
- `docs/style-analysis.md` — 风格唯一事实源（§2 配色/§4 角色/§7 复刻要点）
- `docs/episodes.md` — 剧情唯一事实源
