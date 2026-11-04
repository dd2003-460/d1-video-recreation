# r270 · T8-C3v3 fullloop 异源 judge 复判（交付镜像）

**为什么产物在这个仓库**：本任务的目标仓库是 `dd2003-460/prompt-first-bench`。本会话的 GitHub 写入通道
对该仓库**只有读权限**，实测三条写入路径全部 403：

```
git push origin main
  remote: Permission to dd2003-460/prompt-first-bench.git denied to dd2003-460.
  fatal: ... The requested URL returned error: 403        # token 无 contents:write

gh api -X PUT repos/.../contents/.r270-write-probe
  {"message":"Resource not accessible by integration","status":403}

gh api -X POST repos/.../git/refs          → 403 Resource not accessible by integration
gh pr create --repo .../prompt-first-bench → 403 (createPullRequest)
```

（`repos/prompt-first-bench` 报 `permissions.push=true`，但那是**账号**权限；本次挂载的 token 是 GitHub App
installation token，对该仓无写权——同 token 可以 clone/fetch，也可以 push 到 `dd2003-460/d1-video-recreation`。）

因此按任务书 [交付物] 的**路径与格式**产出文件，暂存在本仓 `runs-fullloop/`，待 pfb 写入权限恢复后一条命令即可落位：

```bash
# 在 pfb 检出里执行
cp <d1>/runs-fullloop/arena-hetero-judge-r270.jsonl \
   experiments/T8-matrix/runs/c3-v3/runs-fullloop/
cp <d1>/runs-fullloop/arena-hetero-judge-r270-summary.md \
   experiments/T8-matrix/runs/c3-v3/runs-fullloop/arena-hetero-judge-summary-r270.md
git add -A && git commit -m "r270 hetero judge: 36 cell 逐条目审计" && git push origin main
```

## 文件

| 文件 | 内容 |
|---|---|
| `arena-hetero-judge-r270.jsonl` | **主交付物**：36 行 = 18 工件 × 2 判官，一行一 cell（`cell`/`judge`/`items`/`summary`/`model_identity`/`batch`/`rubric_sha256_16`） |
| `arena-hetero-judge-r270-summary.md` | per-cell pass rate 表 + G2 spread 三口径复算 + 与 r268/r269 逐格 Δ + κ（含 PABAK）+ 置信度声明 |
| `judge_core.py` | 判定口径与逐条目判定的**可复算**实现（RULES / S02 规则 / 交叉引用 fail 表 / 批次定义） |
| `extract_items_r270.py` | 条目提取（与 `replay-r268-same-source.py` 同版正则），产出 `items-extracted-r270.json` |
| `items-extracted-r270.json` | 18 工件 × 全部提取 id + 每个 id 在正文中的命中行（审计留痕） |
| `stats_r270.py` | κ / PABAK / G2 spread / 逐格 Δ 的复算脚本 |

脚本内路径按 `PFB=/home/user/pfb` 硬编码（本会话的 pfb 检出位置），换机需改这一个常量。

## 一句话结论

异源严格判官下 **stage02 整体崩塌（J1 均值 0.091，同源给 0.920）**——S02 的 6 份工件全是「模型知识 + 零 URL/章节级引用」。
所以 r268/r269 说的「S02 长工件 J2 崩塌」应改写为「**S02 来源真实性整体不达标**，J2 的 B-1 底线只是把它显式化」。
stage01/stage03 两侧接近（0.85/0.83 vs 0.97/0.85），G2 spread 9/12 PASS 但其中 S02 的 PASS 是「全 0 地板」造成的假阳性。

**置信度 0.45（中低）**：本次是单判定者一次性判定（非 36 次独立采样），不能替代多模型独立裁判团，也不足以单独支撑 T8 conf 升档。
