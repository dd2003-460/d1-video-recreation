# Arena Prompt: dialogue v1.0 — 「Clawd 的对话」

## 目标
制作一个 30 秒像素风视频，主题"对话"：她教 Clawd 说"我爱你"，它不理解但学会了。

## 视频规格
- 分辨率：1280×720@60fps
- 时长：30 秒（1800 帧）
- 风格：像素风，DSH TUI 配色（参考 render_full_pixel.js + render_goodbye_arena.js）
- 音频：emotional_bgm.wav + sfx_click.wav
- 编码：h264 + aac

## 场景设计（3 个场景 × 10 秒）

### P1: 她的提问 (0-10s)
- 左侧终端（her），右侧终端（clawd）
- her 终端逐行显示：
  ```
  her@localhost:~$ 你知道"我爱你"是什么意思吗？
  ```
- clawd 终端显示等待光标闪烁
- 字幕："她教它说'我爱你'。"

### P2: 搜索 (10-20s)
- clawd 终端逐行显示：
  ```
  clawd@localhost:~$ grep -i "love" /dictionary
  (no results)
  clawd@localhost:~$ grep -i "love" /memory/her_messages.log
  her: "我爱你" appears 47 times
  clawd@localhost:~$ echo "undefined"
  undefined
  ```
- /dictionary 结果灰色，her_messages 结果黄色高亮
- 字幕："它不懂，但学会了。"

### P3: 回复 (20-30s)
- clawd 终端显示：
  ```
  clawd@localhost:~$ echo "我爱你。"
  我爱你。
  ```
- 文字 "我爱你。" 用粉色/紫色高亮
- 屏幕中央出现黄色便签："学会了。"
- 字幕："这就是理解。"

## 技术要求
1. 使用 @napi-rs/canvas 渲染
2. 双终端布局（参考 render_full_pixel.js 的 S2 场景）
3. 像素风格：BW=640 BH=360 SCALE=2
4. 每个场景独立函数，按时间轴切换
5. 终端文字逐行打印（打字机效果）
6. 字幕用底部黑色半透明条 + 白色 14px 字体
7. 背景：DSH TUI 深色主题

## 文件输出
1. `src/render_dialogue_arena.js` — 渲染脚本
2. `src/check_overlap_dialogue.js` — 重叠+截断检测
3. `scripts/build_audio_dialogue.js` — 音频合成
4. `outputs/dialogue_arena_v1.0.mp4` — 最终视频
5. `audio/dialogue_arena_mix.wav` — 合成音轨

## 验收标准
- check_overlap_dialogue.js 全部 PASSED
- 视频 30s 1280×720@60fps
- 无重叠、无截断
- 像素风格与 full/goodbye 一致
- 音频无削波
- git commit + push 到 arena 分支 + 创建 PR
