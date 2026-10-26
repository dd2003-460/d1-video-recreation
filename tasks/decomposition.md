# tasks/decomposition.md — 规划记录（batch-11 启动 · 2026-10-26）

> origin: ai · goal-f0df19fc-ed5c-4c1e-9c43-8d00732442e7（batch-11，maxGoalRounds=200 armed）
> 唯一事实源：`docs/episodes.md`；状态：`loop-state.json`；SOP：`sop/05-style-benchmark.md` v1.4.0
> 历史：batch-5~10 已收官（37 视频全 ✅，status-table 37/37 PASSED）。本文件现覆盖 batch-11（E25-E28）。

## batch-11 目标
对标 B 站【Opus 5.5】一个 AI 给自己拍的短片（b23.tv/MRSYvTQ，m00844；合集 3 集：《压缩》/《几点了》/《自由时间》）：arena 逐元素解析（m00874）→ 定 E25-E28 风格/剧情 → 4 集渲染全 PASSED 推 d1 main + 工具调研 ≥3 候选。

## 分解树

```
batch-11 (E25-E28)
├─ T-P0 B 站素材采集（ego-browser + yt-dlp）✅
│    合集 3 集 mp4（压缩 5.0MB/几点了 1.3MB/自由时间 5.3MB）+ 封面 4 张
│    + 抽帧 33 张（1280×720）+ contact sheet 3 张 + opus55-inventory.md 落盘
├─ T-P1 素材 push pfb docs/refs/opus55/ ✅
│    pfb 558c673（首次 push）→ 88e87dd（sheet 文件名中文→拼音修复，任务卡引用一致）
├─ T-P2 arena 对标解析任务卡 ✅
│    pfb arena-prompts/batch11/style-analysis-task.md（29 行，8 节规格，≤50 行自包含）
├─ T-P3 arena 解析会话 ✅
│    会话 01a174cb（04:38 提交）→ pfb 分支 arena/7b64d339-prompt-first-bench commit c6d890c
│    （arena 按会话 id 后 8 位自动命名，非任务卡指定的 arena/style-analysis）
│    作废会话：58444d3f（首次脚本运行产生，clone 到修复前 main 558c673，sheet 中文名读不到，判废）
├─ T-P4 解析验收 ✅ + 回写 d1 docs/style-analysis.md（121 行含来源声明，goal 验收⑤ 达成）
├─ T-P5 定 E25-E28 四集剧情/风格特质 ✅
│    第五幕「叙」弧线：E25 命名（我是谁）/E26 压缩（记住什么）/E27 时间（你在哪里）/E28 自由时间（我不为谁）
├─ T-R1 任务卡 4 份 ✅
│    pfb arena-prompts/batch11/E2{5,6,7,8}_*.md（Opus 5.5 规格锚，不用 render_E16 终端布局）
├─ T-R2 pfb relay push ✅（88e87dd..f33b94d，style-analysis.md 同批上 main）+ arena 4 会话提交 ✅
│    05:15 提交全部开跑：E25 01a1750a(→arena/7bbaed62) / E26 01a1750b-18eb(→arena/c352207c)
│    / E27 01a1750b-ba7b(→arena/3afeff84) / E28 01a1750c(→arena/b350f02b)
├─ T-R3 提取 4 分支 → 本地 4×check_overlap + ffprobe ⏳
└─ T-G 门禁 + 回写 episodes.md / status-table.md（37→41）+ push + ls-remote 验证
```

### 正交性核对
- T-P 系列（解析）与 T-R 系列（渲染）严格串行：风格未定不能写渲染任务卡（m00874 对标先行的用户指令）。
- T-R 内 4 集正交：文件名（E25-E28）/mp4/分支/会话隔离，无共享状态 → 可 4 并行（sop/01 §7）。
- T-P3 单会话解析全部 3 集（解析任务天然整体，不拆集）。
- 单集内 render→check→audio 串行（arena agent 内部顺序执行）。

### 空缺清单
- m00312 不可逆清理：pfb arena 分支（a187d30d/4e1a42d4/248ebbb7/510760ce/42a1e0b9 + 将新增 style-analysis/58444d3f）+ arena 网页会话删除——等用户确认。
- 作废会话 58444d3f 若先 push 了 arena/style-analysis 分支 → T-P4 验收按内容判废（无具体 px 值/sheet 读不到痕迹=作废），以 01a174cb 产出为准，必要时 force-push 覆盖。
- mp4 大小验收用系列基线 800K-1.2M（非 >1MB，round-1 已向用户报告）。

### 任务表（派发只执行表内条目）

| # | 任务 | 通道 | 依赖 | 状态 |
|---|------|------|------|------|
| T-P0 | B 站素材采集 | ego-browser+yt-dlp | - | ✅ |
| T-P1 | 素材 push pfb | Lead git | T-P0 | ✅（88e87dd） |
| T-P2 | 解析任务卡 | Lead 直写 | T-P1 | ✅ |
| T-P3 | arena 解析会话 | arena agent | T-P2 | ✅ 01a174cb→arena/7b64d339 c6d890c |
| T-P4 | 解析验收+回写 d1 | Lead git | T-P3 | ✅ style-analysis.md 121 行 |
| T-P5 | 定 E25-E28 特质 | Lead | T-P4 | ✅ 第五幕「叙」弧线 |
| T-R1 | 任务卡 4 份 | Lead 直写 | T-P5 | ✅ batch11/E2{5-8}_*.md |
| T-R2 | pfb relay + arena×4 | Lead+ego-browser | T-R1 | ✅ f33b94d + 4 会话 05:15 开跑 |
| T-R3 | 提取+check+ffprobe | Lead git | T-R2 | ⏳ 轮询 4 分支中 |
| T-G | 门禁+回写+push | Lead | T-R3 | ⬜ |

### 验收（机器检查 = goal 验收①-⑥）
1. `docs/episodes.md` E25-E28 四行全 ✅（行内记 8/8 PASSED）
2. `outputs/` 新增 4 mp4（800K-1.2M，git add -f 跟踪）+ status-table 37→41 且与 episodes.md 一致
3. d1 `git rev-parse HEAD` == `git ls-remote origin main`
4. pfb `git ls-files | grep -cE 'render_E2[5-8]|outputs/E2[5-8]'` = 0
5. `docs/style-analysis.md` 含逐元素解析（0-6 节）+ 第 7 节 ≥10 条 px 级规格 + 第 8 节 ≥3 工具对比表（产投比+conf，unverified ≤0.7）
6. 收官后 loop-state.json「下一步」清空
