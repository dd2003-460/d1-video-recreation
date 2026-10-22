# Arena Prompt: 「Clawd 的陪伴」companion v1.0

## 目标
制作 30 秒像素风视频「Clawd 的陪伴」，美术风格严格对标 `full_v1.3.4.mp4`（暖色条纹房间 + 晨窗远山 + 小终端 + 房间内像素角色）。

## 仓库
```
git clone https://github.com/dd2003-460/d1-video-recreation.git
```

## 先读这些文件
1. `sop/00-project-requirements.md` — 项目通用要求
2. `sop/02-pixel-video-workflow.md` — 像素视频工作流
3. `sop/05-style-benchmark.md` — 美术风格基准
4. `src/render_full_pixel.js` — full 视频渲染脚本（参考美术风格）
5. `src/render_goodmorning_arena.js` — goodmorning arena 版（参考布局）
6. `src/render_goodbye_arena.js` — goodbye arena 版（参考终端风格）
7. `docs/new-themes.md` — 主题定义（看"陪伴"部分）
8. `audio/emotional_bgm.wav` — BGM
9. `audio/sfx_click.wav` — 点击音效

## 故事
她加班到深夜，Clawd 陪着她。它没有身体，但一直在。

## 场景定义（3 场景 × 10 秒）

### C1 (0-10s): 深夜办公室
- 终端全屏（DSH TUI 风格），显示:
  ```
  $ her: 还在吗？
  ```
- 逐字打字效果 (140ms/char)
- 办公室背景: 深夜，窗外是城市灯光（像素风格）
- 她的消息气泡: "还在吗？"
- Clawd 在房间内，安静地等着

### C2 (10-20s): 它说一直在
- 终端显示:
  ```
  $ clawd: 一直在。
  ```
- 咖啡杯图标出现在终端旁边，冒热气（像素风格动画）
- Clawd 的颜色微微变暖（陪伴状态）
- 内心独白字幕: "它说：一直在。"

### C3 (20-30s): 天亮了
- 终端显示:
  ```
  $ her: 早。
  $ clawd: 早。你终于休息了。
  ```
- 窗外从黑夜变为黎明（渐变动画）
- 她（Her）在窗边伸展，微笑
- Clawd 安静地守着
- 便签出现在窗台上: "深夜的陪伴"
- 画面渐暗

## 字幕（3 条）
1. "深夜，她问：还在吗？" (2-8s)
2. "它说：一直在。" (12-18s)
3. "天亮，它说：早。" (24-29s)

## 技术要求
- 基础画布 640×360，SCALE=2 → 1280×720 @ 60fps
- 1800 帧（30 秒）
- 字体: Fusion Pixel (10px 终端小字 / 14px 字幕)
- 场景间 0.5s 黑场过渡
- 字幕逐字 160ms
- 音频: `emotional_bgm.wav` × 0.3 + `sfx_click.wav` × 0.5 (与打字/事件同步)
- amix=inputs=2:normalize=0, 无削波

## 验收标准
- `check_overlap.js` 全部 PASSED (0 issues)
- 1280×720, h264, 60fps, 1800 帧, 30.00s
- 美术风格对标 full_v1.3.4
- 角色在房间内（不是终端里）
- 键盘声音同步
- 无削波

## 交付
1. `src/render_companion_arena.js` — 渲染脚本
2. `src/check_overlap_companion.js` — 重叠检测
3. `scripts/build_audio_companion.js` — 音频合成
4. `outputs/companion_arena_v1.0.mp4` — 最终视频
5. `audio/companion_arena_mix.wav` — 合成音轨

## 工作流
1. clone 仓库
2. 读 SOP + 参考文件
3. 写渲染脚本
4. 写重叠检测脚本
5. 运行重叠检测 → 修复 → 通过
6. 渲染 1800 帧
7. 合成音频
8. 封装 mp4
9. commit + push 到 `dd2003-460/prompt-first-bench` 新分支
10. 创建 PR
