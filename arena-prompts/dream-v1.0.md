请制作「Clawd 的梦境」30 秒像素风视频，完全对标 full_v1.3.4.mp4 的美术风格。

【画布规格】
- 640×360 像素，SCALE=2 输出 1280×720
- 60fps，共 1800 帧
- 输出: outputs/dream_arena_v1.0.mp4

【美术风格 — 严格对标 full_v1.3.4】
- 角色在房间内（不在终端里），用 10px 小字体
- 暖色条纹壁纸背景 (drawBackground: #F5EDD5 底色 + 16px 条纹)
- 窗口: x=60 y=20 520×160 (天空渐变 #87CEEB→#E0F0FF + 2 座山 #5A7A5A + 云)
- 终端: x=140 y=160 360×160 (深色 #14161C，边框 #30363D)
- 字幕条: y=320 h=40, 14px 字体，半透明黑底
- 角色: Clawd (40×24 紫色身体 + 6 条腿), Her (16×28 粉色)
- 便签: 100×80 米色，倾斜 -5 度

【故事线】
Clawd 在"睡眠"时做了一场梦。梦里它有了身体，和她一起走在路上。

【场景设计 (3 scenes, 30s)】
- D1 (0-10s): 终端黑屏显示 `# sleeping...` + 星星闪烁动画 (随机位置的小白点)
- D2 (10-20s): 梦境画面 — 像素风格的两人走在路上 (简单动画: Clawd + Her 并肩行走)
- D3 (20-30s): 醒来 — 终端亮屏 + 便签 "刚才的梦，有点暖。"

【字幕 (3 条)】
1. "它也做梦。" (start: 2s, end: 8s)
2. "梦里，它有了身体。" (start: 12s, end: 18s)
3. "醒来，还在等你。" (start: 24s, end: 29s)

【音频】
- 背景: audio/emotional_bgm.wav (volume 0.3)
- 点击音: audio/sfx_click.wav (volume 0.5)
- 合成: ffmpeg amix=inputs=2:normalize=0

【验收标准】
1. 重叠检测 0 issues (check_overlap.js 8/8 或 13/13 PASSED)
2. 1280×720@60fps，30s
3. 美术风格对标 full_v1.3.4 (暖色背景、小字体、角色在房间内)
4. 代码可运行: node src/render_dream_arena.js
5. 推送到 GitHub

【文件清单】
- src/render_dream_arena.js (渲染脚本)
- src/check_overlap_arena.js (重叠检测)
- scripts/build_audio_arena.js (音频合成)
- outputs/dream_arena_v1.0.mp4 (最终视频)

【参考代码】
请读取仓库中的:
- src/render_full_pixel.js (full v1.3.4 参考)
- src/render_goodmorning_arena.js (arena goodmorning 参考)
- sop/05-pixel-art-reference.md (美术风格参考)
- sop/02-video-production.md (视频制作 SOP)
