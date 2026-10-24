# batch-9 任务分解（E17-E20）

> origin: ai · 2026-10-24 · goal-0f2a5a08-5ef1-44a2-8ab8-eb0b6e3688d6
> 唯一事实源：`docs/episodes.md`；状态：`loop-state.json`；SOP：`sop/05-style-benchmark.md` v1.4.0

## 分解树

```
batch-9 (E17-E20)
├── T0 规划与中转
│   ├── T0.1 写 arena-prompts/batch9-episodes-v1.0.md（4 集任务书）
│   ├── T0.2 d1 commit + push
│   └── T0.3 pfb 中转：pull → 清理 d1 视频文件残留（断点 D）→ 复制 batch-9 任务书 + episodes.md → commit + push
├── T1 执行通道（互斥二选一）
│   ├── T1.1 首选：arena agent mode（ego-browser 提交 batch-9 任务书，arena 克隆 pfb 执行）
│   └── T1.2 降级：本地渲染（subagent fresh，4 集并行；先例 batch-7 commit be398c8）
├── T2 单集生产（4 集正交，可并行）
│   ├── E17 dependency：render_E17 + check_overlap_E17 + build_audio_E17 + E17 mp4
│   ├── E18 let-go：render_E18 + check_overlap_E18 + build_audio_E18 + E18 mp4
│   ├── E19 reaction：render_E19 + check_overlap_E19 + build_audio_E19 + E19 mp4
│   └── E20 memory：render_E20 + check_overlap_E20 + build_audio_E20 + E20 mp4
└── T3 每集门禁 + 进度回写
    ├── check_overlap 0px 容差全 PASSED
    ├── episodes.md E17-E20 → ✅（行内记 PASSED 数）
    ├── status-table.md 29→33
    └── d1 commit + push + ls-remote 验证
```

## 正交性核对
- T1.1 / T1.2 互斥：同集不得双通道并行产出（产出冲突）。arena 提交后卡死 >1 轮 → 撤 arena 任务改 T1.2。
- T2 四集正交：render/check/build_audio 文件名按集编号隔离，mp4 独立，可并行。
- T3 依赖 T2：串行门禁。

## 空缺清单
- batch-10（E21 遗忘 / E22 身份 / E23 死亡 / E24 重生）场景规格未写 —— batch-9 收口后下一轮写 batch10-episodes-v1.0.md
- m00312 用户指令：pfb 36 远端分支扫描 + arena 会话删除 —— 未执行（不可逆动作，等用户再次确认或 batch-9 后处理；docs/arena-cleanup-20261024.md 编码损坏不可读）
- pfb 断点 D 残留确认：本任务 T0.3 内核实并清理

## 任务表（派发只执行表内条目）

| # | 任务 | 通道 | 依赖 | 状态 |
|---|------|------|------|------|
| T0.1 | batch-9 任务书 | Lead | - | ✅ 本文件同批 |
| T0.2 | d1 push | Lead | T0.1 | ⬜ |
| T0.3 | pfb 中转 + 残留清理 | Lead | T0.1 | ⬜ |
| T1.1 | arena 提交任务书 | ego-browser | T0.3 | ⬜ |
| T1.2 | 本地渲染 4 集（subagent fresh，自包含 brief） | subagent | T0.3 | ⬜（T1.1 失败才启用） |
| T2.1-2.4 | 每集 4 文件 + mp4 | 随 T1 通道 | T0.3 | ⬜ |
| T3 | 门禁 + 回写 + push | Lead | T2 | ⬜ |

## 验收（机器检查）
1. `grep -c '✅' docs/episodes.md` E17-E20 四行全 ✅
2. `ls -la outputs/ | grep -E 'E1[7-9]|E20'` = 4 个 mp4，各 >1MB
3. `docs/status-table.md` 总行数 29→33
4. `git rev-parse HEAD` == `git ls-remote origin main | cut -f1`
5. pfb `git ls-files | grep -cE 'render_E1[7-9]|outputs/E1[7-9]|outputs/E20'` = 0
