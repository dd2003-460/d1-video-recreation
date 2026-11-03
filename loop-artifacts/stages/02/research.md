# 阶段 02：信息调研 — E33 Dream

## 已读文件
- docs/style-analysis.md — 风格唯一事实源 (§2 配色/§4 角色/§7 十复刻要点)
- docs/episodes.md — 剧情唯一事实源 (E33 剧情锚点逐字)
- src/render_E29_companionship_arena.js — 布局基准 (夜景+双卡+台灯, ~250行)
- src/pixel_story_arena.js — 共享工具 (createFrameRenderer, drawSans, centeredX)
- main:src/render_E32_dialogue_arena.js — dialogue 模式参考
- main:scripts/build_audio_E32.js — audio 构建参考

## 关键发现
- E29 的 drawXu 函数支持三档尺寸 (large/mid/small)
- 闭眼效果: 眼睛两点变横线 (ctx.fillRect 代替 ctx.arc)
- 亮度 -10%: rgba(0,0,0,0.10) overlay, DIM_START=8.0s
- 台阶运动: steppedTime() 每 2 帧保持 1 帧 (30fps 等效)
