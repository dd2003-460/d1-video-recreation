# 阶段 01：目标分解 — E33 Dream (梦境)

## 目标
batch-13 E33 梦境视频，30秒 × 3场景（入睡→梦里有身体→醒来），本地降级执行。

## 已知条件
- 风格锚: docs/style-analysis.md §7 (夜景 #393744 + 梦境柔光渐变 #393744→#4A4458)
- 角色: 珊瑚 #D16E59「叙」三档 191×84·115×66·81×40
- 布局基准: render_E29_companionship_arena.js (batch-12 夜景+双卡+台灯)
- 画布: 1280×720, 1800帧 @ 60fps = 30s
- 音频: sfx_ping(-18dB) + sfx_confirm + BGM(-14dB), amix=normalize=0

## 空缺条件
- 无（prompt 完整，参照文件齐全）

## 行动项
1. 写 render_E33_dream_arena.js (3场景, ~250行模式)
2. 写 check_overlap_E33_arena.js (10 checks, 0px tolerance)
3. 写 build_audio_E33.js (3 SFX + BGM)
4. 渲染 1800 帧 + ffmpeg 合成 mp4
5. 跑 check_overlap 确认全 PASSED
6. commit + push
