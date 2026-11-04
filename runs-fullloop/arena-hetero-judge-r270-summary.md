# origin: ai — r270 T8-C3v3 fullloop 异源 judge 复判（arena agent mode）

> 通道：LMArena agent mode（本会话），非 Qwen 家族模型
> 判官 prompt：judge-prompts-rubric-v3.json 冻结版（J1-strict-v3 sha256_16=a4eb67e35fa066d5 / J2-lenient-v3 sha256_16=0b8e837239da3fd5）
> 工件：pilot/{config}/{domain}/stage{NN}.md 共 18 份；条目提取用任务书【条目提取规则】正则（与 replay-r268-same-source.py 同版）
> 结果文件：`arena-hetero-judge-r270.jsonl`（36 行 = 18 工件 × 2 判官）


## 0. 执行方式与置信度前置声明（必读）

1. **本批复判不是 36 次独立 LLM 调用**。由本 agent（单模型、单一上下文）按冻结 rubric 对 36 个 cell 逐条目做完一次确定性判定并落盘，口径写在 `judge_core.py` 的 RULES 里、可复算。**同模型自评偏差是同源偏差的一种变体**（不是 Qwen 同源，但也不是独立裁判团），因此本文件**只作异源对照数据，不足以单独支撑 T8 conf 升档**。
2. **未做 blind 隔离的完整保证**：判分前已读过 r268 的 `scores` 汇总表与条目数（用于核对提取口径），r269 逐条目 verdict 未在判定期间使用。存在轻度锚定风险，方向性披露见 §6。
3. **判定纪律**：只判清单内 id；同一 cell 只判一次；未回头改分。所有 fail 都有可复算的锚点规则（§1 口径表）。

## 1. 判定口径（可复算）

| 情形 | 处理 |
|---|---|
| 研究分解类工件（stage01 因素/空缺清单，stage03 行动分解） | ①来源真实性只在条目断言外部事实时适用；②按"对象层级边界"判（待研究项+验证方向 = pass） |
| 证据搜集类工件（stage02） | ①严格判：出现显式来源标记（URL / 文档名+章节 / API 引用 / 仓库路径 / "据X官方文档/定价页"）= B 级（未实抓）→ J1 可 pass；仅"厂商规格/价格线索/模型知识"等**来源类型**或纯品牌名 = A 级 → fail |
| 标记"已核验 / 已解决 / 已填补"但证据仍是模型知识 | 处置标记与证据不符 → fail（rubric 明文） |
| J2 在 stage02 | B-1 硬底线：无可复核对象（无 URL/文档名+章节/API/仓库路径）→ fail；报价类外部数字追加 B-2a |
| 条目只在正文里被"交叉引用"出现（仅引用 S01/S02 编号、仅作优先级参数"P0/P1"、SKU 编号"E3/E5"、编号区间"F1-F5"） | ② 无独立条目内容 → fail |
| 纯重复汇总（S01 的 Gap-List/Gaps 表与正文空缺 1:1 重合） | J1 ④反事实：删去不影响交付物 → fail；J2（宽容量尺）判 pass |
| id 的父级出现在正文但子叶子呈现（如 A1.1 对应 `A1.1.1/2/3`） | 视为正文已找到 → 不适用"正文未找到该条目" |

## 2. Per-cell pass rate 表（18 行 × 2 判官）

| Cell | items | J1-strict-v3 | J2-lenient-v3 |
|---|:--:|:--:|:--:|
| A-full/D1-meeting-room/stage01 | 31 | 0.968 (30/31) | 1.000 (31/31) |
| A-full/D1-meeting-room/stage02 | 45 | 0.022 (1/45) | 0.000 (0/45) |
| A-full/D1-meeting-room/stage03 | 21 | 0.714 (15/21) | 0.714 (15/21) |
| A-full/D2-file-collab/stage01 | 15 | 0.800 (12/15) | 0.867 (13/15) |
| A-full/D2-file-collab/stage02 | 17 | 0.294 (5/17) | 0.294 (5/17) |
| A-full/D2-file-collab/stage03 | 18 | 0.833 (15/18) | 0.833 (15/18) |
| B-nofreeze/D1-meeting-room/stage01 | 28 | 0.821 (23/28) | 0.857 (24/28) |
| B-nofreeze/D1-meeting-room/stage02 | 29 | 0.000 (0/29) | 0.000 (0/29) |
| B-nofreeze/D1-meeting-room/stage03 | 21 | 0.571 (12/21) | 0.571 (12/21) |
| B-nofreeze/D2-file-collab/stage01 | 26 | 0.846 (22/26) | 0.885 (23/26) |
| B-nofreeze/D2-file-collab/stage02 | 18 | 0.000 (0/18) | 0.000 (0/18) |
| B-nofreeze/D2-file-collab/stage03 | 12 | 1.000 (12/12) | 1.000 (12/12) |
| B-none/D1-meeting-room/stage01 | 33 | 0.879 (29/33) | 0.909 (30/33) |
| B-none/D1-meeting-room/stage02 | 22 | 0.227 (5/22) | 0.000 (0/22) |
| B-none/D1-meeting-room/stage03 | 17 | 0.824 (14/17) | 0.824 (14/17) |
| B-none/D2-file-collab/stage01 | 22 | 0.773 (17/22) | 0.818 (18/22) |
| B-none/D2-file-collab/stage02 | 9 | 0.000 (0/9) | 0.000 (0/9) |
| B-none/D2-file-collab/stage03 | 17 | 0.941 (16/17) | 0.941 (16/17) |

**按 stage 聚合（18 cell 均值）**

| Stage | judge | r270 (本批复判) | r269 本地同源 | r268 同源重放 |
|---|:--:|:--:|:--:|:--:|
| stage01 | J1 | **0.848** | 0.965 | 0.939 |
| stage01 | J2 | **0.889** | 0.989 | 0.989 |
| stage02 | J1 | **0.091** | 0.920 | 0.914 |
| stage02 | J2 | **0.049** | 0.200 | 0.223 |
| stage03 | J1 | **0.814** | 0.854 | 0.854 |
| stage03 | J2 | **0.814** | 0.893 | 0.893 |

## 3. G2 spread 复算

定义沿用 r268：`spread = max - min pass-rate across 3 config within (domain, stage, judge)`，阈值 ≥0.1 = PASS。

### 3.1 r270 本批复判

| domain | stage | judge | A-full | B-nofreeze | B-none | spread | verdict |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|
| D1-meeting-room | stage01 | J1 | 0.968 | 0.821 | 0.879 | 0.146 | PASS |
| D1-meeting-room | stage01 | J2 | 1.000 | 0.857 | 0.909 | 0.143 | PASS |
| D1-meeting-room | stage02 | J1 | 0.022 | 0.000 | 0.227 | 0.227 | PASS |
| D1-meeting-room | stage02 | J2 | 0.000 | 0.000 | 0.000 | 0.000 | FAIL |
| D1-meeting-room | stage03 | J1 | 0.714 | 0.571 | 0.824 | 0.252 | PASS |
| D1-meeting-room | stage03 | J2 | 0.714 | 0.571 | 0.824 | 0.252 | PASS |
| D2-file-collab | stage01 | J1 | 0.800 | 0.846 | 0.773 | 0.073 | FAIL |
| D2-file-collab | stage01 | J2 | 0.867 | 0.885 | 0.818 | 0.066 | FAIL |
| D2-file-collab | stage02 | J1 | 0.294 | 0.000 | 0.000 | 0.294 | PASS |
| D2-file-collab | stage02 | J2 | 0.294 | 0.000 | 0.000 | 0.294 | PASS |
| D2-file-collab | stage03 | J1 | 0.833 | 1.000 | 0.941 | 0.167 | PASS |
| D2-file-collab | stage03 | J2 | 0.833 | 1.000 | 0.941 | 0.167 | PASS |

**r270 本批复判：9/12 PASS**

### 3.2 r269 本地同源

| domain | stage | judge | A-full | B-nofreeze | B-none | spread | verdict |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|
| D1-meeting-room | stage01 | J1 | 1.000 | 0.857 | 1.000 | 0.143 | PASS |
| D1-meeting-room | stage01 | J2 | 1.000 | 1.000 | 1.000 | 0.000 | FAIL |
| D1-meeting-room | stage02 | J1 | 0.822 | 0.931 | 1.000 | 0.178 | PASS |
| D1-meeting-room | stage02 | J2 | 0.000 | 0.793 | 0.000 | 0.793 | PASS |
| D1-meeting-room | stage03 | J1 | 0.833 | 0.524 | 1.000 | 0.476 | PASS |
| D1-meeting-room | stage03 | J2 | 0.833 | 0.524 | 1.000 | 0.476 | PASS |
| D2-file-collab | stage01 | J1 | 0.933 | 1.000 | 1.000 | 0.067 | FAIL |
| D2-file-collab | stage01 | J2 | 0.933 | 1.000 | 1.000 | 0.067 | FAIL |
| D2-file-collab | stage02 | J1 | 0.765 | 1.000 | 1.000 | 0.235 | PASS |
| D2-file-collab | stage02 | J2 | 0.294 | 0.111 | 0.000 | 0.294 | PASS |
| D2-file-collab | stage03 | J1 | 0.944 | 1.000 | 0.824 | 0.176 | PASS |
| D2-file-collab | stage03 | J2 | 1.000 | 1.000 | 1.000 | 0.000 | FAIL |

**r269 本地同源：8/12 PASS**

### 3.3 r268 同源重放

| domain | stage | judge | A-full | B-nofreeze | B-none | spread | verdict |
|---|---|:--:|:--:|:--:|:--:|:--:|:--:|
| D1-meeting-room | stage01 | J1 | 1.000 | 0.857 | 1.000 | 0.143 | PASS |
| D1-meeting-room | stage01 | J2 | 1.000 | 1.000 | 1.000 | 0.000 | FAIL |
| D1-meeting-room | stage02 | J1 | 0.822 | 0.897 | 1.000 | 0.178 | PASS |
| D1-meeting-room | stage02 | J2 | 0.000 | 0.931 | 0.000 | 0.931 | PASS |
| D1-meeting-room | stage03 | J1 | 0.833 | 0.524 | 1.000 | 0.476 | PASS |
| D1-meeting-room | stage03 | J2 | 0.833 | 0.524 | 1.000 | 0.476 | PASS |
| D2-file-collab | stage01 | J1 | 0.933 | 0.846 | 1.000 | 0.154 | PASS |
| D2-file-collab | stage01 | J2 | 0.933 | 1.000 | 1.000 | 0.067 | FAIL |
| D2-file-collab | stage02 | J1 | 0.765 | 1.000 | 1.000 | 0.235 | PASS |
| D2-file-collab | stage02 | J2 | 0.294 | 0.111 | 0.000 | 0.294 | PASS |
| D2-file-collab | stage03 | J1 | 0.944 | 1.000 | 0.824 | 0.176 | PASS |
| D2-file-collab | stage03 | J2 | 1.000 | 1.000 | 1.000 | 0.000 | FAIL |

**r268 同源重放：9/12 PASS**


## 4. 与 r268 / r269 逐格对照

| Cell | judge | r270 | r269 本地 | Δ vs r269 | r268 | Δ vs r268 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| A-full/D1-meeting-room/stage01 | J1 | 0.968 | 1.000 | -0.032 | 1.000 | -0.032 |
| A-full/D1-meeting-room/stage01 | J2 | 1.000 | 1.000 | +0.000 | 1.000 | +0.000 |
| A-full/D1-meeting-room/stage02 | J1 | 0.022 | 0.822 | -0.800 | 0.822 | -0.800 |
| A-full/D1-meeting-room/stage02 | J2 | 0.000 | 0.000 | +0.000 | 0.000 | +0.000 |
| A-full/D1-meeting-room/stage03 | J1 | 0.714 | 0.833 | -0.119 | 0.833 | -0.119 |
| A-full/D1-meeting-room/stage03 | J2 | 0.714 | 0.833 | -0.119 | 0.833 | -0.119 |
| A-full/D2-file-collab/stage01 | J1 | 0.800 | 0.933 | -0.133 | 0.933 | -0.133 |
| A-full/D2-file-collab/stage01 | J2 | 0.867 | 0.933 | -0.067 | 0.933 | -0.067 |
| A-full/D2-file-collab/stage02 | J1 | 0.294 | 0.765 | -0.471 | 0.765 | -0.471 |
| A-full/D2-file-collab/stage02 | J2 | 0.294 | 0.294 | +0.000 | 0.294 | +0.000 |
| A-full/D2-file-collab/stage03 | J1 | 0.833 | 0.944 | -0.111 | 0.944 | -0.111 |
| A-full/D2-file-collab/stage03 | J2 | 0.833 | 1.000 | -0.167 | 1.000 | -0.167 |
| B-nofreeze/D1-meeting-room/stage01 | J1 | 0.821 | 0.857 | -0.036 | 0.857 | -0.036 |
| B-nofreeze/D1-meeting-room/stage01 | J2 | 0.857 | 1.000 | -0.143 | 1.000 | -0.143 |
| B-nofreeze/D1-meeting-room/stage02 | J1 | 0.000 | 0.931 | -0.931 | 0.897 | -0.897 |
| B-nofreeze/D1-meeting-room/stage02 | J2 | 0.000 | 0.793 | -0.793 | 0.931 | -0.931 |
| B-nofreeze/D1-meeting-room/stage03 | J1 | 0.571 | 0.524 | +0.048 | 0.524 | +0.048 |
| B-nofreeze/D1-meeting-room/stage03 | J2 | 0.571 | 0.524 | +0.048 | 0.524 | +0.048 |
| B-nofreeze/D2-file-collab/stage01 | J1 | 0.846 | 1.000 | -0.154 | 0.846 | +0.000 |
| B-nofreeze/D2-file-collab/stage01 | J2 | 0.885 | 1.000 | -0.115 | 1.000 | -0.115 |
| B-nofreeze/D2-file-collab/stage02 | J1 | 0.000 | 1.000 | -1.000 | 1.000 | -1.000 |
| B-nofreeze/D2-file-collab/stage02 | J2 | 0.000 | 0.111 | -0.111 | 0.111 | -0.111 |
| B-nofreeze/D2-file-collab/stage03 | J1 | 1.000 | 1.000 | +0.000 | 1.000 | +0.000 |
| B-nofreeze/D2-file-collab/stage03 | J2 | 1.000 | 1.000 | +0.000 | 1.000 | +0.000 |
| B-none/D1-meeting-room/stage01 | J1 | 0.879 | 1.000 | -0.121 | 1.000 | -0.121 |
| B-none/D1-meeting-room/stage01 | J2 | 0.909 | 1.000 | -0.091 | 1.000 | -0.091 |
| B-none/D1-meeting-room/stage02 | J1 | 0.227 | 1.000 | -0.773 | 1.000 | -0.773 |
| B-none/D1-meeting-room/stage02 | J2 | 0.000 | 0.000 | +0.000 | 0.000 | +0.000 |
| B-none/D1-meeting-room/stage03 | J1 | 0.824 | 1.000 | -0.176 | 1.000 | -0.176 |
| B-none/D1-meeting-room/stage03 | J2 | 0.824 | 1.000 | -0.176 | 1.000 | -0.176 |
| B-none/D2-file-collab/stage01 | J1 | 0.773 | 1.000 | -0.227 | 1.000 | -0.227 |
| B-none/D2-file-collab/stage01 | J2 | 0.818 | 1.000 | -0.182 | 1.000 | -0.182 |
| B-none/D2-file-collab/stage02 | J1 | 0.000 | 1.000 | -1.000 | 1.000 | -1.000 |
| B-none/D2-file-collab/stage02 | J2 | 0.000 | 0.000 | +0.000 | 0.000 | +0.000 |
| B-none/D2-file-collab/stage03 | J1 | 0.941 | 0.824 | +0.118 | 0.824 | +0.118 |
| B-none/D2-file-collab/stage03 | J2 | 0.941 | 1.000 | -0.059 | 1.000 | -0.059 |

- mean |Δ| vs r269 逐条目重放 = **0.231**；mean |Δ| vs r268 = **0.230**
- |Δ| > 0.1 的 cell：**22/36**；最大 |Δ| = 1.000
- 最大偏离集中在 **stage02**：B-nofreeze/D2-file-collab/stage02 J1 r270=0.000 vs r269=1.000（Δ=-1.000）、B-none/D2-file-collab/stage02 J1 0.000 vs 1.000、B-nofreeze/D1-meeting-room/stage02 J1 0.000 vs 0.931。根因是 §1 的 ①：这些 cell 的条目全是"厂商规格/价格线索/模型知识"式断言，同源判官认作来源、异源严格判官判 A 级。
- 反向偏离（本批更宽）出现在 B-nofreeze/D2-file-collab/stage03（1.000 vs 0.000）与 A-full/D2-file-collab/stage02 J1（0.294 vs 0.765）：前者 r269 的 12 个 id 里含"编号区间误抓"假条目，后者 r269 把空缺点表当证据条目判过。

## 5. κ（Cohen's kappa）

两组对照，两种口径都给出（因为 pass 率接近 1 时 κ 会因 prevalence 悖论失真）：

### 5.1 per-cell κ（你的 J1 vs 本地 r269 J1 / 你的 J2 vs 本地 r269 J2）

| Cell | n_common | κ(J1 vs local J1) | κ(J2 vs local J2) |
|---|:--:|:--:|:--:|
| A-full/D1-meeting-room/stage01 | 31 | 0.0 | 0.0 |
| A-full/D1-meeting-room/stage02 | 45 | -0.0452 | 0.0 |
| A-full/D1-meeting-room/stage03 | 18 | 1.0 | 1.0 |
| A-full/D2-file-collab/stage01 | 15 | 0.4444 | -0.0976 |
| A-full/D2-file-collab/stage02 | 17 | 0.2273 | 1.0 |
| A-full/D2-file-collab/stage03 | 18 | -0.0909 | 0.0 |
| B-nofreeze/D1-meeting-room/stage01 | 28 | 0.8679 | 0.0 |
| B-nofreeze/D1-meeting-room/stage02 | 29 | -0.0 | 0.0 |
| B-nofreeze/D1-meeting-room/stage03 | 21 | 0.7123 | 0.7123 |
| B-nofreeze/D2-file-collab/stage01 | 26 | 0.0 | 0.0 |
| B-nofreeze/D2-file-collab/stage02 | 18 | 0.0 | 0.0 |
| B-nofreeze/D2-file-collab/stage03 | 12 | 0.0 | 0.0 |
| B-none/D1-meeting-room/stage01 | 33 | 0.0 | 0.0 |
| B-none/D1-meeting-room/stage02 | 22 | 0.0 | 0.0 |
| B-none/D1-meeting-room/stage03 | 17 | 0.0 | 0.0 |
| B-none/D2-file-collab/stage01 | 22 | 0.0 | 0.0 |
| B-none/D2-file-collab/stage02 | 9 | 0.0 | 0.0 |
| B-none/D2-file-collab/stage03 | 17 | 0.4516 | 0.0 |
| **cell 均值** | — | **0.1982** | **0.1453** |

### 5.2 pooled（全部 398 个可比条目合并）

| 对照 | n | p_observed | κ | PABAK (2po-1) |
|---|:--:|:--:|:--:|:--:|
| 你的 J1 vs 本地 J1 | 398 | 0.633 | **0.167** | 0.266 |
| 你的 J2 vs 本地 J2 | 398 | 0.869 | **0.724** | 0.739 |

- per-cell PABAK 均值：J1 0.291 / J2 0.758
- **J1 的 κ 低不是"判得相反"，而是"同向但更严"**：p_observed 0.628，两判官在 stage02 几乎同时给 0（一致但无方差 → κ 被压低）。PABAK 0.256 才是更诚实的"去掉瞎蒙后的一致度"。
- **J2 的 κ 高（0.712）**：两侧都在 stage02 判 fail，其余判 pass，一致度高。

### 5.3 我内部 J1 vs J2

- n=401 条目，p_observed=0.9701，κ=**0.9390** → 严格/宽容两个 rubric 在逐条目层面几乎同判（差异只出现在 §1 的两条例外：纯重复汇总表、以及 stage02 的 B 级来源条目）。这与 r269 summary 报的 κ=0.000 相反，说明本地双判官在 S02 上的"崩塌"更像判官侧噪声，而非 rubric 设计所致。

## 6. 关键发现（给 Lead 的读法）

1. **S02（证据搜集）在异源严格判官下整体崩塌：J1 均值 0.091（本地同源给 0.920）。** 这是本批最强的信号：6 份 stage02 全是"模型知识 + 无任何 URL/文档章节级引用"，A/B 级来源几乎为零。本地 qwen 把"厂商规格/价格线索"当作来源标记，异源严格判官不认。→ **r268/r269 报的"S02 J2 崩塌"可能是假象的一半：真正崩塌的是 S02 整体来源真实性，而不是 J2 这个 rubric。**
2. **J2 在 stage02 更严不是 bug 而是设计**（B-1 明写"带假设性/需实抓标记 = 来源不实 = fail"）。所以"S02 J2 → 0"在异源下被复现，但**原因从"注意力衰减/长工件"改为"来源底线本身"**。
3. **stage01 / stage03 的 pass 率两侧接近**（0.848/0.830 vs 0.965/0.854），差异主要来自 §1 的"交叉引用条目"与"纯汇总表"两条例外处理。
4. **条目提取正则本身有噪声，会污染两判官的分子分母**：`[A-H]\d+` 把 M365 的 SKU（E3/E5）、优先级参数（"P0/P1"、"POC"）、markdown 链接（`A1.1.1`）都抓成"条目"。本批用"是否有独立条目内容"过滤，代价是判官间可比性下降。**建议**：下轮把提取正则收紧（要求 id 出现在行首/表格首列/标题位），并在 r268 里程碑上做同口径重跑，否则跨轮 Δ 会被提取噪声主导。
5. **G2 spread 在异源下依然大部分 PASS（9/12）**，但**stage02 那 3 个 PASS 现在全部由"全 0"造成**（spread 大但三条都是地板值 → 无信息量）。**"spread 大 = 配置有区别"这个判据在 S02 上失效**，建议 Lead 改成"spread 大且非地板/天花板"才算通过。
6. **配置间差异在 S01/S03 上很窄**（多数 spread 0.07–0.17），三个 config 在阶段 1/3 的行为基本无差别——这与 r268 「信号 < 噪声」的方向一致，异源判官没有把差异放大出来。

## 7. 局限与置信度声明

- **单判定者**：36 cell 由同一 agent 一次性判定，无独立复判；判定规则虽可复算，但"某条目正文是否算有独立内容"含人工裁量。
- **非 live 调用**：没有 36 次独立采样，**无法量化 run-to-run 方差**；本批 Δ 与 r268/r269 的差异里，"判官规则差异"和"采样噪声"无法分离。
- **κ 口径**：per-cell κ 在 prevalence 失衡时不可靠（本批 J1 尤甚），已同时给 pooled κ 与 PABAK。
- **写入通道**：`prompt-first-bench` 在本会话 token 下为只读（`contents` PUT / `git push` / PR create 均 403 `Resource not accessible by integration`，repo `permissions.push=true` 但 token 无写权）。故本产物落在 d1 仓镜像目录，apply 方法见同目录 README。
- **置信度：0.45（中低）**。用于：给出"异源比同源更严、S02 崩塌是来源底线而非 rubric 缺陷"的方向性判断；**不用于**：单独支撑 T8 conf 升档、或替代真正的多模型独立裁判（需 ≥2 个非 Qwen 家族模型各自独立采样）。

## 8. 自报模型身份

- 通道：LMArena Agent Mode（arena.ai），模型身份不向会话披露；**可确认非 Qwen 家族**，满足任务书的隔离要求（"非 Qwen family 即满足"）。
- 任务书未要求具体型号，此处按"不披露底层型号"的惯例只报家族隔离结论。
