# Arena Prompt: 「Clawd 的错误」error v1.0

## 目标
制作 30 秒像素风视频「Clawd 的错误」，美术风格严格对标 `full_v1.3.4.mp4`（暖色条纹房间 + 晨窗远山 + 小终端 + 房间内像素角色）。

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
7. `docs/new-themes.md` — 主题定义（看"错误"部分）
8. `audio/emotional_bgm.wav` — BGM
9. `audio/sfx_click.wav` — 点击音效

## 故事
Clawd 犯了一个错，删掉了重要文件。它试图修复，但发现有些东西回不来。

## 场景定义（3 场景 × 10 秒）

### E1 (0-10s): 删错了
- 终端全屏（DSH TUI 风格），显示:
  ```
  $ rm -rf /important
  > 确认删除 128 个文件？ [y/N]
  > y
  ```
- 逐行出现
- 红色警告框: "WARNING: 删除了重要文件"
- Clawd 在房间内，表情从平静变为惊恐
- 终端闪烁红色

### E2 (10-20s): 试图修复
- 终端显示:
  ```
  $ git restore /important
  > 错误: 文件已被永久删除
  $ ls /important
  > 目录为空
  ```
- 逐行出现
- Clawd 的颜色变暗（懊悔状态）
- 内心独白字幕: "有些东西回不来。"

### E3 (20-30s): 安慰
- 终端显示:
  ```
  $ her: 没关系，下次小心。
  $ clawd: 谢谢你还在。
  ```
- 便签出现在窗台上: "有些东西，删了就回不来。但你还在。"
- 她（Her）在窗边轻轻点头
- Clawd 的颜色慢慢恢复
- 画面渐暗

## 字幕（3 条）
1. "它犯了一个错。" (2-8s)
2. "有些东西回不来。" (12-18s)
3. "但你还在。" (24-29s)

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
1. `src/render_error_arena.js` — 渲染脚本
2. `src/check_overlap_error.js` — 重叠检测
3. `scripts/build_audio_error.js` — 音频合成
4. `outputs/error_arena_v1.0.mp4` — 最终视频
5. `audio/error_arena_mix.wav` — 合成音轨

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
