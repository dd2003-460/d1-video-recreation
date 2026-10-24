# 任务分解（batch-9 ✅ / batch-10 进行中）

> origin: ai · 2026-10-24 · goal-0f2a5a08-5ef1-44a2-8ab8-eb0b6e3688d6
> 唯一事实源：`docs/episodes.md`；状态：`loop-state.json`；SOP：`sop/05-style-benchmark.md` v1.4.0

## batch-9（E17-E20）— ✅ 完成

- 任务书 `arena-prompts/batch9-episodes-v1.0.md` → d1 898de54 → pfb 中转 838595e（含断点 D 清理）
- arena 会话 01a16de0（16m27s）→ 分支 arena/a187d30d-prompt-first-bench d5e5f66 → 16 文件提取 d1
- 本地 4 集 check_overlap 8/8 PASSED exit=0；episodes.md ✅；status-table 29→33；d1 16bf64e；pfb a285194
- PR #25 有意不合并（提取不合并，pfb main 不再被视频文件弄脏）

## batch-10 任务分解（E21-E24）

> 按 sop/01 §7 并发规则（m00189）：4 集正交 → 4 个并行 arena 会话；场景规格 subagent×4 短上下文并行写

### 分解树

```
batch-10 (E21-E24)
├── T0 规划与中转
│   ├── T0.1 场景规格 ×4（subagent 短上下文，各领 1 集，并行）
│   ├── T0.2 Lead 合并复核 → arena-prompts/batch10/E2[1-4]_*.md（4 份自包含任务卡）
│   ├── T0.3 d1 commit + push
│   └── T0.4 pfb 中转：复制 4 份任务卡 → commit + push
├── T1 执行通道（每集互斥二选一）
│   ├── T1.1 首选：arena agent mode ×4 并行会话（每会话 = 1 集，ego-browser 顺序提交）
│   └── T1.2 降级：本地渲染（仅卡住的集启用，subagent fresh 自包含 brief；先例 batch-7 be398c8）
├── T2 单集生产（4 集正交，并行；每会话内串行）
│   ├── E21 forgetting：render_E21 + check_overlap_E21 + build_audio_E21 + E21 mp4
│   ├── E22 identity：render_E22 + check_overlap_E22 + build_audio_E22 + E22 mp4
│   ├── E23 death：render_E23 + check_overlap_E23 + build_audio_E23 + E23 mp4
│   └── E24 rebirth：render_E24 + check_overlap_E24 + build_audio_E24 + E24 mp4
└── T3 每集门禁 + 进度回写
    ├── check_overlap 0px 容差全 PASSED ×4
    ├── episodes.md E21-E24 → ✅（行内记 PASSED 数）
    ├── status-table.md 33→37
    └── d1 commit + push + ls-remote 验证
```

### 正交性核对
- 4 集正交：文件名按集编号隔离（E21-E24），mp4 独立，每 arena 会话独立分支，无共享状态 → 可并行（§7 判定 ✅）。
- 单集内 render→check→audio 串行不可并（arena agent 内部顺序执行）。
- T1.1/T1.2 每集互斥：同集不得双通道产出。

### 空缺清单
- m00312 不可逆清理：pfb arena 分支扫描（含新增 arena/a187d30d-prompt-first-bench）+ arena 网页会话删除 —— 等用户确认。
- goal 验收②「每个 >1MB」与系列基线（E03/E08/E10/E11 均 839K-867K）失准：round 1 已向用户报告，待一句话修正授权；真实门禁 = check_overlap 全 PASSED + ffprobe 1280×720/30s/含音频。

### 任务表（派发只执行表内条目）

| # | 任务 | 通道 | 依赖 | 状态 |
|---|------|------|------|------|
| T0.1a | E21 场景规格 | subagent（短上下文） | - | ⬜ |
| T0.1b | E22 场景规格 | subagent（短上下文） | - | ⬜ |
| T0.1c | E23 场景规格 | subagent（短上下文） | - | ⬜ |
| T0.1d | E24 场景规格 | subagent（短上下文） | - | ⬜ |
| T0.2 | 合并 4 份 brief + 复核 | Lead | T0.1a-d | ⬜ |
| T0.3 | d1 push | Lead | T0.2 | ⬜ |
| T0.4 | pfb 中转 push | Lead | T0.3 | ⬜ |
| T1.1a-d | 4 个 arena 会话提交 + 健康检查 | ego-browser | T0.4 | ⬜ |
| T1.2 | 本地渲染（仅卡住的集） | subagent fresh | T0.4 | ⬜（T1.1 失败才启用） |
| T3 | 门禁 + 回写 + push | Lead | T1 | ⬜ |

### 验收（机器检查 = goal 验收①-⑤）
1. `docs/episodes.md` E21-E24 四行全 ✅（行内记 PASSED 数）
2. `outputs/` 新增 4 个 mp4（E21-E24，大小系列正常区间 800K-1.2M）
3. `docs/status-table.md` 总计 33→37
4. `git rev-parse HEAD` == `git ls-remote origin main | cut -f1`（d1）
5. pfb `git ls-files | grep -cE 'render_E2[1-4]|outputs/E2[1-4]'` = 0
