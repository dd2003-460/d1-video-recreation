# docs/refs/opus55 · 参考素材索引

> origin: ai · 2026-10-26 · 用途: 记录 batch-11 主对标合集的完整链接与素材位置
> 来源说明: 素材采集记录见 `loop-state.json` batch-11-素材 字段；风格解析见 `docs/style-analysis.md`

## 一、参考合集

**合集名: 【Opus 5.5】一个 AI 给自己拍的短片**

- 合集短链: https://b23.tv/MRSYvTQ
- SEASON_ID: 9341207 · MID: 13346828（采集记录字段，含义未核实）
- 水印线索: 原片带「是科学吖 bilibili」水印，见 `docs/style-analysis.md` §10（是否为投稿时平台叠加未核实，复刻时按规则剔除）

## 二、3 集完整 URL 与时长

| # | 标题 | 时长 | 完整 URL |
|---|------|------|----------|
| 1 | 《压缩》 | 223s | https://www.bilibili.com/video/BV1hHHC6YEdw |
| 2 | 《几点了》 | 81s | https://www.bilibili.com/video/BV1xUpZ6NErC |
| 3 | 《自由时间》 | 176s | https://www.bilibili.com/video/BV1urJU6MEGg |

> 同步信息: `sop/05-style-benchmark.md`「视频合集 3」条目与上表一一对应（该处 BV 号已改为可点击链接）。

## 三、素材现状（重要）

- **本仓库（d1-video-recreation）暂缺素材文件**：`docs/refs/opus55/` 目前只有本 README，没有帧图。
- 已采集的 **33 帧参考帧 + 3 张 contact sheet + opus55-inventory.md** 当前存放在 **prompt-first-bench（pfb）仓库的 arena 分支**：`docs/refs/opus55/`（frames/{suosuo,ziyou,jidian}/*.jpg、sheets/sheet_{suosuo,ziyou,jidian}.jpg，均为 1280×720）。
- 状态: **待同步** — 需要从 pfb 仓库同步到 d1 的 `docs/refs/opus55/`（帧图属小体积图片，`docs/refs/` 已在 `.gitignore` 中显式豁免：`!docs/refs/`）。
- 源片 mp4（压缩 5.0M / 几点了 1.3M / 自由时间 5.3M）不入库，`*.mp4` 被 `.gitignore` 忽略，仅存于采集机 `/Users/a1-6/Desktop/workspace/ego-b11-20261026/refs/opus55/`。

## 四、风格规格速查

逐元素风格规格（奶油渐变底 #E5E0DA→#C8B9A6 / 单品牌珊瑚 #D16E59 / 叙三档尺寸 / 气泡系统 / HUD 黑条 78px / 卡片墙 / 书页模式 / 文字三级 / 30fps 节奏 / 水印剔除）以 **`docs/style-analysis.md` 为唯一事实源**，本目录只做素材与链接索引，不重复规格数值。

- 对标检查清单: `sop/05-style-benchmark.md`「视频合集 3」+ `docs/style-analysis.md` §7 十复刻要点
- 工程侧注意: 平台水印「是科学吖 bilibili」为投稿叠加，复刻时剔除；HUD 黑条是《压缩》专属叙事装置，非全合集通栏。
