# 00 · 项目要求（通用 + 子领域）

> origin: human (成璐 m00002 直接指令) + ai (结构化整理)
> 最后更新: 2026-10-21

## 一、通用要求（跨所有视频项目）

### G1. 美术风格对标
- 所有视觉元素必须对标 bilibili 参考视频（见 `docs/refs/` 目录）
- 参考视频 1: 《每天和AI说话的那个人》BV1EmWc6YEQ6 — 暖色手绘办公室 + 像素机器人
- 参考视频 2: 《压缩》BV1hHHC6YEdw — 暗色极简大字卡 + 进度条 + 代码编辑器
- **当前制作决策**: 对标视频 2 的代码风（高技术可复现性），吸收视频 1 的叙事温度

### G2. 像素风但更高清晰度
- 像素风格保留，但像素粒度要**再小 2/3**（即提高清晰度）
- 当前 v1.2: 基础分辨率 320×180，SCALE=4 → 1280×720
- 目标: 像素块更细，细节更清晰，但仍保留像素感（不是平滑矢量）
- 具体方案: 提高基础分辨率（如 640×360）或降低 SCALE（如 2），使每个像素点更小

### G3. 布局无重叠、无截断
- 所有元素必须在画布内完整显示
- 不允许元素一半在画布内、一半超出画布（截断）
- 元素之间不允许重叠
- 用 `check_overlap.js` 做自动检测

### G4. 可复用元素 + 音轨
- 可复用的视觉元素（角色、UI 组件、特效）必须抽象为独立函数/模块
- 音轨（BGM、SFX、人声）必须制作成可复用的音频资产
- 每个可复用资产都有对应的 SOP 文档

### G5. 无真人配音
- 当前项目不用真人 TTS（用户 m01217 明确）
- 音频 = 打字 SFX + 钢琴 + 弦乐（纯乐器）

### G6. 字幕节奏
- 字幕步进节奏: 140ms/字 + 每 3 字暂停 180ms
- 与打字音效同步

## 二、子领域要求（按领域拆分）

### 像素视频制作（pixel-video）
- 见 `sop/02-pixel-video-workflow.md`
- 核心: Node+canvas 720p 帧序列 → ffmpeg 合成
- 渲染管线: 基础分辨率 → nearest-neighbor 放大 → 1280×720@60fps
- 调色板: 见 `render_full_pixel.js` 的 C 对象

### Arena Agent Mode 外包（arena-agent-mode）
- 见 `sop/01-arena-agent-mode.md`
- 核心: 把视频制作任务外包给 arena.ai/agent
- 限制: 不允许一次上传多张图片
- 流程: 本地建仓库 → 推 GitHub → 在 arena agent mode 里让 agent 看仓库 → 让 arena 执行

### 可复用元素（reusable-elements）
- 见 `sop/03-reusable-elements.md`
- 核心: 角色（Clawd/Her）、UI 组件（终端/消息/代码编辑器）、特效（扫描线/粒子）

### 音轨制作（audio-track）
- 见 `sop/04-audio-track.md`
- 核心: BGM（钢琴+弦乐）+ SFX（打字/心跳/点击）
- 工具: Python (numpy/scipy) 生成 → wav → ffmpeg 混音

### 风格对标（style-benchmark）
- 见 `sop/05-style-benchmark.md`
- 核心: 从 bilibili 视频提取风格特征 → 对标检查清单

## 三、项目结构

```
d1-video-recreation/
├── src/                    # 渲染脚本
│   ├── render_full_pixel.js    # 主渲染脚本（v1.2）
│   ├── render_goodnight.js     # 晚安视频渲染
│   └── check_overlap.js        # 布局重叠检测
├── scripts/                # 音频生成脚本
│   ├── gen_bgm.py
│   ├── gen_emotional_bgm.py
│   ├── gen_typing_bgm.py
│   ├── build_audio_piper.py
│   └── build_final_mix_v04.py
├── audio/                  # 音频资产（wav）
├── docs/
│   ├── refs/               # 参考帧（bilibili + 当前版本）
│   └── style-analysis.md   # 风格分析
├── sop/                    # SOP 文档
├── outputs/                # 输出（mp4，gitignore）
└── .gitignore
```

## 四、质量门禁

| 门禁 | 检查项 | 工具 |
|------|--------|------|
| 布局 | 无重叠、无截断 | check_overlap.js |
| 风格 | 对标参考视频 | 人工 + arena agent |
| 音频 | 音画同步 | 人工听 |
| 像素粒度 | 清晰度达标 | 人工 + 帧对比 |
