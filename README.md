# d1-video-recreation — AI 独白短片复刻（独立仓）

> **独立 git 仓**：origin `github.com/dd2003-460/d1-video-recreation`（外层 workspace 仓经 `.gitignore` 排除，只在仓内 commit/push）。
> ⚠️ 本 README 为从 `pfb/` 拷贝时遗留的旧文（pfb=prompt-first-bench，是另一份独立仓检出），待按本仓实际内容重写；两者勿混。

---

（以下为 pfb 原文遗留，仅存档，不适用于本仓）

调研目标：**prompt-first 流程（1-loop）究竟有没有提升？对不同 AI 模型提升如何？**

- 执行通道：LMArena agent mode（arena 读本仓库 `tasks/` 任务书 + `loop/` 阶段定义 + `sop/` 链路 SOP）
- 流程权威源：`loop/prompt-first/00..04.5`
- 链路 SOP：`sop/arena-loop-pipeline.md`
- 评分：`rubric/`（任务内引用）
- 产出：`bench/runs/<task>/<variant>/`（run 输出 + score + summary）

## 研究问题（任务书 001）

1. 拆解任务（01 目标分解的正交+完备+递归原子）对最终成功率的影响
2. 正交完备性对最终成功率的影响（对照：无分解/非正交分解/正交完备）
3. 每个具体要求（02.5 交叉验证 / 逐阶段落盘 / 04.5 反方复核）的边际提升
4. 跨模型差异（arena 会话可用模型 × 变体矩阵）

---

## 交付物：「Clawd 的学习」v1.0 (arena)

30s 像素风短片 — Clawd 第一次学会说"不"。美术风格对标 `full_v1.3.4.mp4`（暖色条纹房间 + 晨窗远山 + 小终端 + 房间内像素角色）。

| 交付物 | 路径 |
|--------|------|
| 渲染脚本 | `src/render_learning_arena.js` |
| 重叠检测 | `src/check_overlap_arena.js` |
| 音频合成 | `scripts/build_audio_arena.js` |
| 最终视频 | `outputs/learning_arena_v1.0.mp4` |
| 合成音轨 | `audio/learning_arena_mix.wav` |
| 验收报告 | `docs/verify-learning-arena.md` |

```bash
npm install
npm run check      # 重叠检测 → 14/14 PASSED, 0 issues
npm run render     # 1800 帧 @ 640×360 → 1280×720 (SCALE=2)
npm run audio      # BGM×0.3 + click×0.5, amix normalize=0
npm run build      # check + render + audio + mux → outputs/learning_arena_v1.0.mp4
```

规格：640×360 基础分辨率 × SCALE=2 → 1280×720 @ 60fps · 1800 帧 / 30.00s · h264 + aac
字体：Fusion Pixel（终端 10px / 字幕 14px）· 字幕逐字 160ms · 终端打字 140ms
场景：L1 她的请求 (0-10s) → L2 思考中 (10-20s) → L3 成长 (20-30s)，场景间 0.5s 黑场

`sop/` 与 `docs/new-themes.md` 来自 `d1-video-recreation`，本任务所用参考 SOP。

---

## 交付物：「Clawd 的学习 / 升级」v2.0 (arena) — 修正版

> 修正 v1.0 的两个问题：**Clawd 形象**（眼睛 2×2 → 4×4、身体无质感 → 顶部 2px 暗条 + 腹部 22×4、
> 无表情 → calm / thinking / smile）与**像素感**（文字改回 10px Fusion Pixel 点阵 +
> alpha 阈值二值化，整帧 2× 最近邻，与 `companion_arena_v1.0.mp4` 同一套基础像素网格）。

| 交付物 | learning | upgrade |
|--------|----------|---------|
| 渲染脚本 | `src/render_learning_arena_v2.js` | `src/render_upgrade_arena_v2.js` |
| 重叠/截断检测 | `src/check_overlap_learning_v2.js` | `src/check_overlap_upgrade_v2.js` |
| 音频合成 | `scripts/build_audio_learning_v2.js` | `scripts/build_audio_upgrade_v2.js` |
| 最终视频 | `outputs/learning_arena_v2.0.mp4` | `outputs/upgrade_arena_v2.0.mp4` |
| 合成音轨 | `audio/learning_arena_v2_mix.wav` | `audio/upgrade_arena_v2_mix.wav` |
| 验收报告 | `docs/learning-v2/` | `docs/upgrade-v2/` |

共用：`src/pixel_arena_v2.js`（房间/终端/角色/气泡/便签/进度条/文字/时间轴）、
`src/check_overlap_v2_common.js`（校验核心）、`scripts/build_audio_v2_common.js`（混音/封装）。

```bash
npm run check:v2              # 两个视频的布局+截断+像素标准检测 → 各 8/8 PASSED
npm run build:learning:v2     # check + render 1800 帧 + 音轨 + 封装 + A/V 同步 + 成片复核
npm run build:upgrade:v2      # 同上（upgrade）
npm run verify:v2             # 只跑同步与成片复核（需先有 outputs/*.mp4）
```

规格：640×360 × SCALE=2 → 1280×720 @ 60fps · 1800 帧 / 30.000s · h264 High/yuv420p + aac 44.1kHz
像素：最小视觉单元 = 基础画布整像素（输出恒为 2 的倍数：星星 4×4、窗棂 12px、Clawd 眼睛 8×8）
字体：终端 Fusion Pixel 10px（ASCII 5px / CJK 10px 点阵）· 字幕/便签 Fusion Pixel 12px · 全部二值化
角色：Clawd 40×17 body + 4×4 眼睛（1×1 高光）+ 2px 顶部暗条 + 22×4 腹部；Her 16×28 槽位
音频：BGM×0.3 + click×0.5，点击时刻由渲染脚本唯一时间线产生并量化到显示帧，字幕不发声

验收（实测，见 `docs/*-v2/*.json`）：

| 项 | learning | upgrade |
|----|----------|---------|
| check_overlap | 8/8 PASSED，0 issue（112,380 次判定） | 8/8 PASSED，0 issue（124,662 次判定） |
| 键盘音同步 | 71/71 检出，最大偏差 6.67ms（0.40 帧） | 192/192 检出，最大偏差 6.67ms（0.40 帧） |
| 像素一致性 | 房间/终端 2×2 同色率 100% / 99.99%，眼睛 8×8，窗棂 12px | 100% / 100%，同上 |
| 音频峰值 | −12.93 dBFS，clipped 0 | −10.65 dBFS，clipped 0 |

---

## 交付物：Companion v1.1 + Reboot / Dialogue / Farewell v1.0

四部 30s 像素短片共用 companion 原始角色与房间美术，以及 640×360 → 2× 最近邻 → 1280×720@60fps 网格。
终端统一为 **440×200 @ (100,140)**（20px 标题栏 + 180px 内容区）。为避免与放大后的终端重叠，字幕使用底部 20px 条带与 Fusion Pixel 10px 字体。

| 版本 | 渲染 / 检查 | 成片 / 混音 | 验收报告 |
|------|-------------|-------------|----------|
| Companion v1.1 | `src/render_companion_arena_v11.js` / `src/check_overlap_companion_v11.js` | `outputs/companion_arena_v1.1.mp4` / `audio/companion_arena_v11_mix.wav` | `docs/companion-v1.1/` |
| Reboot v1.0 | `src/render_reboot_arena.js` / `src/check_overlap_reboot.js` | `outputs/reboot_arena_v1.0.mp4` / `audio/reboot_arena_mix.wav` | `docs/reboot-v1/` |
| Dialogue v1.0 | `src/render_dialogue_arena.js` / `src/check_overlap_dialogue.js` | `outputs/dialogue_arena_v1.0.mp4` / `audio/dialogue_arena_mix.wav` | `docs/dialogue-v1/` |
| Farewell v1.0 | `src/render_farewell_arena.js` / `src/check_overlap_farewell.js` | `outputs/farewell_arena_v1.0.mp4` / `audio/farewell_arena_mix.wav` | `docs/farewell-v1/` |

共用：`src/pixel_story_arena.js`（三部新片布局/时间轴）、`src/check_overlap_story_common.js`（0px 几何与像素校验）、
`scripts/build_audio_v2_common.js`（确定性 PCM 混音）、`scripts/verify_story_outputs.js`（最终 MP4 独立复核）。
Companion 保留 v1.0 音频增益与淡入淡出；三部新片使用精确 BGM −12dB、SFX −6dB。点击时间由剧本唯一数据源生成并向上量化到显示帧。

```bash
npm run check:story          # 四部各 8/8 PASSED，0px tolerance
npm run build:companion:v11  # 单部：check + render + audio + mux
npm run build:reboot
npm run build:dialogue
npm run build:farewell
npm run verify:story         # 直接解码四个 MP4：规格 / 像素 / 音频 / 黑场 / A-V 同步
npm run build:story          # 完整重建四部并复核
```

最终实测：四部均为 **1800 帧 / 30.000s / h264 High / yuv420p / AAC 44.1kHz mono**；
键盘点击依次匹配 **70/70、152/152、217/217、232/232**，最大偏差均 **6.7ms（0.40 帧）**；
解码音频峰值依次 **−12.39、−13.09、−11.09、−12.03 dBFS**，全部 **0 削波样本**。

