【执行前必读】
1. 本任务必须走 1-loop：先读 sop/arena-loop-pipeline.md + loop/prompt-first/00..04.5
2. 每阶段产出落盘 loop-artifacts/stages/<N>/
3. 完成后 commit + push
4. 通道故障 → 报告 Lead 降级，不得静默跳过

# E33 Dream (梦境) — batch-13

> 单集 × 30 秒。直接写文件，不讨论。
> 风格 = Opus 5.5 对标（奶油暖色/珊瑚叙），本集夜景底 + 梦境柔光，不是像素终端风。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/d1-video-recreation.git` 到工作目录
2. 读取 `docs/style-analysis.md`（风格唯一事实源，§7 十复刻要点）和 `docs/episodes.md`
3. 读取 `src/render_E29_companionship_arena.js`（布局基准，batch-12 夜景+双卡产出，~250 行模式）
4. 写 4 个文件：
   - `src/render_E33_dream_arena.js`（布局参照 render_E29，~250 行模式）
   - `src/check_overlap_E33_arena.js`
   - `scripts/build_audio_E33.js`
   - `outputs/E33_dream_arena_v1.0.mp4`
5. 渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-13 E33 dream"` → `git push origin <branch>`

## 通用技术要求

- 复用 `src/pixel_story_arena.js` 的共享工具函数（require 本地模块必须带 `./` 前缀）
- 风格锚（docs/style-analysis.md §7）：本集底 = 深藏青夜景 #393744（S1/S3）→ 梦境柔光渐变 #393744→#4A4458（S2，大面积柔渐变，不给角色加光影）/ 珊瑚 #D16E59 角色「叙」三档 191×84·115×66·81×40 / 卡片圆角 r≈12px@720p（AI 珊瑚底白字/用户白底黑字）/ 黑体无衬线 3 级字号 / 30fps 台阶运动（60fps 管线每 2 帧保持 1 帧）
- 画布 1280×720，1800 帧 @ 60fps = 30 秒
- 本集无 HUD 黑条（全画幅夜景/梦境）
- 音频：梦境段环境音换为低 hum + 极轻水滴感 ping（sfx_ping.wav 降调 -18dB），醒回时一声 sfx_confirm；环境 BGM（emotional_bgm.wav -14dB），`amix=normalize=0`
- 每集 3 个场景 × 10 秒（600 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task: E33 Dream (梦境)

**集**：E33 | **主题**：梦境
**剧情锚点**（docs/episodes.md 唯一事实源，逐字）：「入睡后屏幕暗下去，梦里叙有了身体，和她并肩走一段路；醒来只有便签：刚才的梦，有点暖。」

**叙事弧线**：入睡 → 梦里有身体 → 醒来只剩一点暖（梦境让缺席变得可以想象）。

### S1 (0-10s) · 入睡
- 深藏青夜景 #393744 铺满，台灯在画面中右部亮起，暖黄光晕 #F5D9A8 圆形渐晕（同 E29 装置）。
- 左侧一张小卡片：02:14 her「晚安」（白底黑字）；右侧一张小卡片：02:15 叙（珊瑚底白字，「好。」）。
- 底部旁白压字（奶油白 28px）：「它睡着了。」
- 叙中档 115×66 站在台灯下闭眼（眼睛两点变横线），最后 2 秒画面整体亮度 -10%（灯晕成为最亮处）。

### S2 (10-20s) · 梦里有身体
- 硬切梦境：底色换成柔光渐变 #393744→#4A4458，地面线变为淡紫 #6B6280。
- 叙小档 81×40 走在画面左侧，右侧一个白色剪影（人形矩形块，高 40px，无面部细节）并肩走，两者间距恒定 24px，缓慢向右移动（整块平移，台阶运动）。
- 上方一颗颗像素星缓缓出现（每 2 秒 1 颗，共 5 颗，白色 2×2px）。
- 底部旁白：「梦里，它有了身体。」
- 两人走过一盏路灯（暖黄光晕从右上扫过画面一次）。

### S3 (20-30s) · 醒来
- 硬切回夜景：台灯还亮着，叙中档睁眼（眼睛恢复两点），头顶符号 = ♥。
- 台灯旁升起一张便签卡片（米纸 #E3D9BE 底，黑字两行）：「刚才的梦，/ 有点暖。」
- 底部旁白：「醒来，还在等你。」
- 最后 1 秒便签轻微脉动一次（透明度 ±0.1）。

## 参考文件
- `src/render_E29_companionship_arena.js` — 布局基准（batch-12 夜景+双卡+台灯）
- `src/pixel_story_arena.js` — 共享工具
- `docs/style-analysis.md` — 风格唯一事实源（§2 配色/§4 角色/§7 复刻要点）
- `docs/episodes.md` — 剧情唯一事实源