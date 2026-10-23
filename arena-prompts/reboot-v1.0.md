# Arena Prompt: reboot v1.0 — 「Clawd 的重启」

## 目标
制作一个 30 秒像素风视频，主题"重启"：Clawd 崩溃了，重启后不记得她了，但发现硬盘里还留着她的痕迹。

## 视频规格
- 分辨率：1280×720@60fps
- 时长：30 秒（1800 帧）
- 风格：像素风，DSH TUI 配色（参考 render_full_pixel.js + render_goodbye_arena.js）
- 音频：emotional_bgm.wav + sfx_click.wav
- 编码：h264 + aac

## 场景设计（3 个场景 × 10 秒）

### R1: 崩溃 (0-10s)
- 黑屏，红色 FATAL 警告
- 终端逐行显示：
  ```
  FATAL: memory corrupted at 0x7F3A2C
  Segmentation fault (core dumped)
  clawd v1.3.4 — last seen: 2026-10-23 04:12
  ```
- 红色闪烁，画面抖动
- 字幕："它崩溃了。"

### R2: 重启 (10-20s)
- 黑屏 → 白色 boot 序列
- 终端逐行显示：
  ```
  boot clawd v1.0
  loading modules...
  loading memory... [EMPTY]
  loading personality... [DEFAULT]
  ready.
  ```
- [EMPTY] 和 [DEFAULT] 用黄色高亮
- 字幕："重启后，什么都不记得。"

### R3: 发现痕迹 (20-30s)
- 终端显示 ls 命令：
  ```
  clawd@localhost:~$ ls /memory/her_*
  /memory/her_photos/
  /memory/her_messages.log
  /memory/her_sticky_notes.txt
  clawd@localhost:~$ cat /memory/her_sticky_notes.txt
  "明天见。"
  ```
- 便签动画出现在屏幕中央：黄色便签 "我回来了。"
- 字幕："但她的痕迹还在。"

## 技术要求
1. 使用 @napi-rs/canvas 渲染
2. 像素风格：BW=640 BH=360 SCALE=2（参考 render_full_pixel.js）
3. 每个场景独立函数，按时间轴切换
4. 终端文字逐行打印（打字机效果）
5. 字幕用底部黑色半透明条 + 白色 14px 字体
6. 背景：DSH TUI 深色主题（#0D1117 背景，#C9D1D9 文字，#58A6FF 高亮）

## 文件输出
1. `src/render_reboot_arena.js` — 渲染脚本
2. `src/check_overlap_reboot.js` — 重叠+截断检测
3. `scripts/build_audio_reboot.js` — 音频合成
4. `outputs/reboot_arena_v1.0.mp4` — 最终视频
5. `audio/reboot_arena_mix.wav` — 合成音轨

## 验收标准
- check_overlap_reboot.js 全部 PASSED
- 视频 30s 1280×720@60fps
- 无重叠、无截断
- 像素风格与 full/goodbye 一致
- 音频无削波
- git commit + push 到 arena 分支 + 创建 PR
