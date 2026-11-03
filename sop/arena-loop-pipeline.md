# Arena Loop 外包链路（SOP · 唯一入口）

> origin: ai · 2026-10-22 · 成璐指令"链路核查 + arena 首选 + loop 双场景必需 + 精简 SOP + 新 SOP 复制到仓库给 arena 读"
> 本文件是外包 arena 任务的**唯一 SOP 入口**（goal 只索引这一个）。仓库/降级/loop 阶段细节已并入本文件，旧 `agents/arena-outsource.md` 与 `agents/loop-executor.md` 仅作存档指针，不再单独注入 goal。
> **部署**：创建目标仓库后，本文件必须复制进仓库 `sop/arena-loop-pipeline.md` 并 commit+push（与 loop/ 同次 push），arena agent 读仓库内的这份。

## 0. 优先级（硬规则 · 成璐指令）

1. **Arena 外包 = 必须首选通道**：调研/核验/执行类任务，默认走 arena（LMArena agent mode）。不自己 AI 琢磨。
2. **Loop 全程必需 · 双场景**：无论 arena agent 在仓库里执行，**还是** arena 通道失败回退本地 Lead 自答，**loop 6 阶段（01→04.5）一个不少**。
   - 回退降级的是**执行通道**（arena → 本地），不是流程。
   - 本地自答时 loop 工件仍落盘 `loop-artifacts/`，conf 标记 0.2。
3. 两者关系：**loop 是流程骨架（永远在），arena 是默认执行通道（首选，可降级）**。

## 1. 链路总览（6 步 + 每步断点 + 验证门禁）

| # | 步骤 | 断点 | 门禁（不过不进下一步） |
|---|------|------|----------------------|
| 1 | AI 启动 | — | goal 按 `agents/goal-template.md` §3 模板创建：含 SOP 索引（**只引用本文件**）+ 验收标准 |
| 2 | 注入 agents 原则 | — | 会话已加载 AGENTS.md/CLAUDE.md；goal 描述引用 goal-template §1 质量原则 |
| 3 | 阅读 arena 外包 SOP | — | 已读本文件；能说出当前任务对应仓库 |
| 4 | 复制 loop + 本 SOP 到目标仓库 + push | **断点 A**：workspace 未 commit/push 时，arena 拉到旧版/缺文件 | push 后在目标仓库验证：`ls loop/prompt-first/*.md` 7 个文件 + `sop/arena-loop-pipeline.md` 存在。**硬门禁：push 后必须在 workspace `projects/AI-计算科学/D1-persona-align/tasks/` 记录 commit hash + `git ls-remote` 输出到验证文件，否则断点 A 未过** |
| 5 | 发任务书 | **断点 B**：任务书未 commit/push 时 arena 读不到 | `git log -1 -- tasks/<id>.md` 有提交；arena 会话 `cat tasks/<id>.md` 成功 |
| 6 | arena agent 读 loop + 执行 | **断点 C**：arena agent 不知道要读 loop / 不知道在哪 | 任务书顶部强制段已写入（§2）；arena 首条消息引用了 loop 阶段路径 |

**回退分支**（步骤 6 故障）：arena 403/沙箱拦截 → 按 §3 降级本地自答，**loop 工件照常落盘**（conf-0.2），故障记 `knowledge/efficiency-bottlenecks.md`。回退不豁免 loop。

## 2. 任务书强制段（防断点 C · 必须写入 tasks/<id>.md 顶部）

```markdown
【执行前必读】
1. 本任务必须走 1-loop：先读 sop/arena-loop-pipeline.md + loop/prompt-first/00-common-review.md + 01..04.5（仓库内）。
2. 每阶段产出落盘 loop-artifacts/stages/<N>/，阶段判定 pass 才进下一阶段。
3. 完成后 commit + push（含全部 loop-artifacts/）。
4. 通道故障（403/沙箱）→ 报告 Lead，由 Lead 降级本地执行，不得静默跳过 loop。
```

## 3. 仓库映射 + 连接 + 失败降级（自 arena-outsource.md 并入）

### 3.1 选仓库（按任务选，不固定连一个）

| 任务类型 | 仓库 | 说明 |
|---------|------|------|
| decomp T4 消融 | `dd2003-460/decomp-bench` | 任务书在 `tasks/T4-arena-batch*.md` |
| prompt-first 流程调研 | `dd2003-460/prompt-first-bench`（2026-10-22 建） | 任务书在 `tasks/` |
| 风格蒸馏 | `dd2003-460/persona-distill`（假设） | 任务书在 `tasks/` |
| 论文校对 | `dd2003-460/academic-AI`（假设） | 任务书在 `tasks/` |
| 媒体 pipeline | `dd2003-460/d1-media-pipeline`（假设） | 任务书在 `tasks/` |
| AI 视频复刻（像素剧/对标 B 站合集） | `dd2003-460/d1-video-recreation`（2026-10-26 确认，实际在用） | 任务卡在 `arena-prompts/batchN/`，SOP 在仓库 `sop/` |

**原则**：每个项目有自己的仓库，arena 连接对应仓库，读仓库内的任务书执行。不跨仓库混用。

### 3.2 连接仓库（新会话直接选仓库 · 2026-10-26 修正）

> **修正**：arena.ai/agent **新会话可以直接切换/选择仓库**（用户实证：新开会话 easily 切到 d1-video-recreation，会话 01a17723）。旧认知"账号级 OAuth 绑定 pfb、UI 无切换入口"已作废。

1. **★ 选对仓库是第一原则**：开新 arena 会话时，按 §3.1 映射表选目标仓库直连，不走 pfb 中转。
2. GitHub App 授权保持 "All repositories"（含私有），保证所有仓库可访问
3. pfb 中转仅用于历史遗留（batch-11 及之前的分支产出需提取清扫）

**验证**：`git ls-remote https://github.com/dd2003-460/<repo>.git HEAD` 返回 hash = 可达（权限本身在 arena 会话内验证）。

### 3.3 失败降级

| 故障 | 诊断 | 降级方案 |
|------|------|---------|
| git clone 403 | `curl -s -o /dev/null -w '%{http_code}' https://github.com` 测网络 | ① 用 GitHub REST API（Contents API）读写文件 ② 上传任务书到对话本机执行 ③ Lead 本地自答（conf-0.2，loop 工件照常落盘） |
| token 过期 | `git ls-remote` 测权限 | 重新 OAuth 授权 / 用 `gh auth token` 生成新 token |
| arena 沙箱拦截 git | `curl https://api.github.com` 通但 `git clone` 不通 | 用 GitHub REST API（不走 git） |

**降级原则**：arena 通道不可用 → 不阻塞，降级到 Lead 本地自答（conf-0.2，loop 工件照常落盘），故障记 `knowledge/efficiency-bottlenecks.md`。

## 4. loop 阶段速览（自 loop-executor.md 并入 · 逐段定义见仓库内 loop/prompt-first/）

6 阶段，每阶段读对应 `loop/prompt-first/<阶段>.md` → 产出落盘 `loop-artifacts/stages/<N>/` → 判定 pass/revise：

| 阶段 | 产出 |
|------|------|
| 01 目标分解 | decomposition.md（正交+覆盖+边界+已知vs空缺+递归到原子） |
| 02 信息调研 | research.md（GitHub→arXiv→ego-browser→自答；每条 claim 带来源+conf） |
| 02.5 交叉验证 | crosscheck.md（关键结论 ≥2 LLM；矛盾记录） |
| 03 行动分解 | actions.md（依赖+并行标注+执行级原子化） |
| 04 执行验证 | execution-log.md（per-step 备份→执行→review→提交） |
| 04.5 反方复核 | review.md（找矛盾+验证假设） |

**约束**：每阶段产出必须落盘；判定基于工件内容不是感觉；任务卡 ≤50 行；每读 N 个文件先写 checkpoint。

### 4.1 复制 + push 命令模板（断点 A）

目标仓库是独立 git 仓库（含 `loop/ sop/ tasks/ rubric/`），workspace 是源。已验证先例：`dd2003-460/prompt-first-bench`。

```bash
# 本地浅克隆目标仓库（已存在则 git -C <dir> pull）
git clone --depth 1 https://github.com/dd2003-460/<repo>.git /tmp/<repo>
# 同步 workspace 的 1-loop 阶段文件 + SOP（只同步 prompt-first/，workspace loop/ 其他子目录不属于仓库）
rsync -av --delete /Users/a1-6/Desktop/workspace/loop/prompt-first/ /tmp/<repo>/loop/prompt-first/
cp /Users/a1-6/Desktop/workspace/agents/arena-loop-pipeline.md /tmp/<repo>/sop/
# 记录验证证据 + commit + push
git -C /tmp/<repo> add -A && git -C /tmp/<repo> commit -m "sync: loop/prompt-first + sop (workspace $(date +%Y%m%d))"
git -C /tmp/<repo> push && git ls-remote https://github.com/dd2003-460/<repo>.git HEAD
```

说明：rsync `--delete` 保证仓库 `loop/prompt-first/` 与 workspace 完全一致（6 个阶段文件 + examples/ 示例子目录，2026-10-26 外移）；**不要 rsync 整个 workspace `loop/`**（含 ralph_runtime/、archived 等与 arena 无关的内容）。sop 只复制本文件。push 后把 commit hash + ls-remote 输出写进 tasks/ 验证文件（§1 断点 A 硬门禁）。

## 5. goal 模板引用

所有外包 arena 的 goal，目标描述包含：
```
按 `sop/arena-loop-pipeline.md`（仓库内）/ `agents/arena-loop-pipeline.md`（workspace）流程执行：
1. 选仓库：<repo>
2. 复制 loop/ + 本 SOP 到仓库 + push（断点 A 门禁）
3. 发任务书（含强制段）+ push（断点 B/C 门禁）
4. arena 执行 + 评分 + push
5. 失败降级：按 §3.3（loop 不豁免）
```

## 6. 维护

- 新增仓库 → 更新 §3.1 映射表
- 新增链路断点（实际断裂案例）→ 更新 §1 表格 + 记 qanda-ledger
- 故障修复 → 更新 §3.3
- 本文件变更 → commit + push（workspace + 已部署的目标仓库同步）
