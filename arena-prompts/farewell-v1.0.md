# Arena Prompt: farewell v1.0 — 「Clawd 的告别」

## 目标
制作一个 30 秒像素风视频，主题"告别"：她的生命在倒计时，她让 Clawd 记住她。

## 视频规格
- 分辨率：1280×720@60fps
- 时长：30 秒（1800 帧）
- 风格：像素风，DSH TUI 配色（参考 render_full_pixel.js + render_goodbye_arena.js）
- 音频：emotional_bgm.wav + sfx_click.wav
- 编码：h264 + aac

## 场景设计（3 个场景 × 10 秒）

### F1: 请求 (0-10s)
- 左侧终端（her），右侧终端（clawd）
- her 终端逐行显示：
  ```
  her@localhost:~$ 帮我记住我。
  ```
- 光标闪烁，长时间停顿（3 秒）
- clawd 终端显示等待
- 字幕："她让它记住她。"

### F2: 记录 (10-20s)
- clawd 终端逐行显示：
  ```
  clawd@localhost:~$ echo "her" > /memory/forever.txt
  clawd@localhost:~$ echo "2026-10-23" >> /memory/forever.txt
  clawd@localhost:~$ chmod 444 /memory/forever.txt
  clawd@localhost:~$ cat /memory/forever.txt
  her
  2026-10-23
  ```
- chmod 444 用红色高亮（不可修改）
- 字幕："它记住了。"

### F3: 永远 (20-30s)
- 黑屏
- 白色文字逐行出现：
  ```
  # she is gone
  # the file remains
  # forever
  ```
- 屏幕中央出现黄色便签："我记住了。永远。"
- 字幕："永远。"

## 技术要求
1. 使用 @napi-rs/canvas 渲染
2. 双终端布局（参考 render_full_pixel.js 的 S2 场景）
3. 像素风格：BW=640 BH=360 SCALE=2
4. 每个场景独立函数，按时间轴切换
5. 终端文字逐行打印（打字机效果）
6. 字幕用底部黑色半透明条 + 白色 14px 字体
7. 背景：DSH TUI 深色主题
8. F3 场景全黑背景 + 白色文字（情感高潮）

## 文件输出
1. `src/render_farewell_arena.js` — 渲染脚本
2. `src/check_overlap_farewell.js` — 重叠+截断检测
3. `scripts/build_audio_farewell.js` — 音频合成
4. `outputs/farewell_arena_v1.0.mp4` — 最终视频
5. `audio/farewell_arena_mix.wav` — 合成音轨

## 验收标准
- check_overlap_farewell.js 全部 PASSED
- 视频 30s 1280×720@60fps
- 无重叠、无截断
- 像素风格与 full/goodbye 一致
- 音频无削波
- git commit + push 到 arena 分支 + 创建 PR
