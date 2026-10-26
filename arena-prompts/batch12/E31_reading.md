# Arena Prompt: batch-12 E31 Reading (阅读)

> 单集 × 30 秒。直接写文件，不讨论。
> 风格 = Opus 5.5 对标（米纸书页/墨线线稿/珊瑚叙小档），不是像素终端风。

## 执行步骤（必须按顺序逐步执行）

1. `git clone https://github.com/dd2003-460/d1-video-recreation.git` 到工作目录
2. 读取 `docs/style-analysis.md`（风格唯一事实源，§7 十复刻要点）和 `docs/episodes.md`
3. 读取 `src/render_E28_freetime_arena.js`（布局基准，batch-11 书页模式产出，~250 行模式）
4. 写 4 个文件：
   - `src/render_E31_reading_arena.js`（布局参照 render_E28，~250 行模式）
   - `src/check_overlap_E31_arena.js`
   - `scripts/build_audio_E31.js`
   - `outputs/E31_reading_arena_v1.0.mp4`
5. 渲染 1800 帧 + ffmpeg 合成 mp4 + 跑 check_overlap 确认全 PASSED
6. `git add .` → `git commit -m "feat: batch-12 E31 reading"` → `git push origin <branch>`

## 通用技术要求
…
- 复用 `src/pixel_story_arena.js` 的共享工具函数（require 本地模块必须带 `./` 前缀）
- 风格锚（docs/style-analysis.md §7）：米纸 #E3D9BE 占画幅 80% + 1-3px 墨线线稿 + 页脚小字注（年份·地点）/ 珊瑚 #D16E59 角色「叙」小档 81×40 蹲页边 / 黑体无衬线 3 级字号 / 30fps 台阶运动（60fps 管线每 2 帧保持 1 帧）
- 画布 1280×720，1800 帧 @ 60fps = 30 秒
- 本集无 HUD 黑条（全画幅书页）
- 线稿插图用 Pillow/canvas 画简笔线稿（月台/房子/树/河），不依赖外部素材
- 音频：翻书页声（纸张摩擦音）+ 环境 BGM（emotional_bgm.wav -16dB），`amix=normalize=0`
- 每集 3 个场景 × 10 秒（600 帧/场景）
- check_overlap 容差 0px，全 PASSED 才算完成

## Task: E31 Reading (阅读)
…
**集**：E31 | **主题**：阅读
**剧情锚点**（docs/episodes.md 唯一事实源，逐字）：「自由时间翻书：《背影》→《呼兰河传》→ 空白页，叙缩小蹲页边当读者」

**叙事弧线**：翻开《背影》→ 翻到《呼兰河传》→ 空白页（读到尽头，留白）。

### S1 (0-10s) · 翻开《背影》
- 米纸 #E3D9BE 占画面 80%（中央大书页），页边露出奶油底 #E5E0DA。
- 书页中央用 1-3px 墨线 #4A443D 画简笔线稿：月台斜线 + 父亲背影轮廓（简笔，几个矩形+梯形拼成）。
- 页脚小字注（16px 等宽灰字）：「1917 年冬 · 浦口车站」。
- 书页右上有书名（24px 黑体）：「背影」。
- 叙小档 81×40 蹲在书页右下角页边，面向书页，像读者。
- 底部旁白压字：「自由时间，翻书。」

### S2 (10-20s) · 翻到《呼兰河传》
- 硬切翻书：书页内容切换，线稿变为：一条河（波浪线）+ 几棵树（简笔树）+ 一座小房子轮廓。
- 页脚小字注：「1940 年 · 呼兰河」。
- 书名（24px 黑体）：「呼兰河传」。
- 叙小档仍在右下角页边，头部像素块转向新书页（水平翻转朝向）。
- 翻页时书页有轻微上下位移 2px（模拟翻页动作）。

### S3 (20-30s) · 空白页
- 硬切：书页变成完全空白（只有米纸底色，无线稿无文字）。
- 页脚小字注淡入：「读到尽头。」
- 叙小档从右下角慢慢移到书页中央偏下，坐下（躯干压低），头顶符号 = ♥。
- 底部旁白压字：「空白，也是内容。」
- 最后 2 秒叙的眼睛变成 ^^ 弯月形（满足的读者）。

## 参考文件
…
- `src/render_E28_freetime_arena.js` — 布局基准（batch-11 书页模式）
- `src/pixel_story_arena.js` — 共享工具
- `docs/style-analysis.md` — 风格唯一事实源（§1 像素单元/§2 配色/§7 复刻要点）
- `docs/episodes.md` — 剧情唯一事实源
