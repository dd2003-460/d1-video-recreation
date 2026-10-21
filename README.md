# D1 · AI Video Recreation

像素风视频制作项目 — 对标 bilibili 参考视频，用 Node+canvas 渲染 720p 帧序列 → ffmpeg 合成。

## 当前版本

**v1.2** — 86.5s, 1280×720@60fps, 5189 帧

- 6 个场景: 终端 → 消息流 → 代码编辑器 → 空行累积 → 等待循环 → 金句收尾
- 像素风: 320×180 基础分辨率 × 4 = 1280×720
- 音频: 钢琴+弦乐 BGM + 打字/心跳 SFX (无人声)
- 字幕: 步进节奏 (140ms/字 + 180ms/3字)

## v1.3 目标

- **像素清晰度提升**: 基础分辨率 320×180 → 640×360, SCALE=4→2 (像素块减半)
- 布局: 无重叠、无截断
- 风格: 对标 bilibili 参考视频 (见 `docs/refs/`)

## 目录结构

```
├── src/                    # 渲染脚本
│   ├── render_full_pixel.js    # 主渲染 (v1.2, 517 行)
│   ├── render_goodnight.js     # 晚安视频
│   └── check_overlap.js        # 布局重叠检测
├── scripts/                # 音频生成脚本 (Python)
│   ├── gen_bgm.py
│   ├── gen_emotional_bgm.py
│   ├── gen_typing_bgm.py
│   ├── build_audio_piper.py
│   └── build_final_mix_v04.py
├── audio/                  # 音频资产 (wav)
├── docs/
│   └── refs/               # 参考帧 (bilibili + 当前版本)
├── sop/                    # SOP 文档 (制作流程)
│   ├── 00-project-requirements.md
│   ├── 01-arena-agent-mode.md
│   ├── 02-pixel-video-workflow.md
│   ├── 03-reusable-elements.md
│   ├── 04-audio-track.md
│   └── 05-style-benchmark.md
└── outputs/                # 输出 (mp4, gitignore)
```

## 快速开始

```bash
# 渲染
node src/render_full_pixel.js

# 检查布局
node src/check_overlap.js

# 合成视频
ffmpeg -framerate 60 -i outputs/frames_%04d.png \
  -i audio/final_mix_v0.9.wav \
  -c:v libx264 -c:a aac -shortest \
  outputs/full_v1.2.mp4
```

## 参考视频

- 视频 1: 《每天和AI说话的那个人》 BV1EmWc6YEQ6
- 视频 2: 《压缩》 BV1hHHC6YEdw

参考帧在 `docs/refs/bili_v1/` 和 `docs/refs/bili_v2/`。

## SOP

制作流程文档在 `sop/` 目录:
- `00-project-requirements.md` — 项目要求 (通用 + 子领域)
- `01-arena-agent-mode.md` — Arena Agent Mode 外包流程
- `02-pixel-video-workflow.md` — 像素风视频制作流程
- `03-reusable-elements.md` — 可复用视觉元素
- `04-audio-track.md` — 音轨制作
- `05-style-benchmark.md` — 风格对标检查清单
