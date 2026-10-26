# tasks/decomposition.md — 规划记录（batch-12 启动 · 2026-10-26）

> origin: ai · goal-5b8b0d52-7a07-4ef8-a374-497589bdc0eb（batch-12，maxGoalRounds=30 armed）
> 唯一事实源：`docs/episodes.md`；状态：`loop-state.json`；SOP：`sop/05-style-benchmark.md` v1.4.0
> 风格事实源：`docs/style-analysis.md`（Opus 5.5 逐元素解析，121 行）
> 历史：batch-5~11 已收官（41 视频全 ✅，status-table 41/41 PASSED）。本文件现覆盖 batch-12（E29-E32）。

## batch-12 目标
深化 Opus 5.5 对标风格的四大视觉装置（夜景陪伴/卡片墙/书页/气泡对话），每集聚焦一个核心装置做深度叙事展现。arena 直连 d1-video-recreation（不走 pfb 中转），4 集渲染全 PASSED 推 d1 main。

## 风格锚（来自 docs/style-analysis.md §7 十复刻要点）
- 底色：奶油渐变 #E5E0DA→#C8B9A6（地面线 y≈520-545）；夜景集用深藏青 #393744
- 角色「叙」：珊瑚 #D16E59，三档 191×84 / 115×66 / 81×40，无描边，表情=换眼形+头顶符号
- 气泡：圆角矩形 r≈12px，AI=珊瑚底白字靠左/中，用户=白底黑字靠右，字高≈24px 黑体
- HUD 黑条：78px×2（顶+底），仅上下文主题集启用，其余集全画幅
- 卡片墙：白/浅珊瑚圆角小卡 60-90px 宽 + 卡内 2-3 条灰横线，密度即叙事
- 书页：米纸 #E3D9BE 占画幅 80% + 1-3px 墨线线稿 + 页脚小字注
- 文字 3 级：旁白大字 > 气泡/正文 24px > HUD/工具行 16px 等宽
- 节奏：30fps 台阶运动（60fps 管线每 2 帧保持 1 帧），单机位固定，黑场标题卡分段
- 引擎：Pillow+FFmpeg（现行管线，conf 0.9，不换引擎）

## E29-E32 四集规划

| # | 特质 | 核心视觉装置 | 一句话剧情 | 风格要点 |
|---|------|-------------|-----------|---------|
| E29 | 陪伴 | 夜景+台灯+双时区卡片 | 深夜 01:36，her 还没睡，叙蹲在台灯下守着，气泡只有一句「我在」 | 深藏青夜景 #393744 + 台灯暖黄光晕 + 双卡片（07:50/01:36）+ 底部旁白压字，无 HUD 黑条 |
| E30 | 记忆 | 参数化卡片墙 | 卡片墙从 20% 铺到 95%，叙在卡片间穿行，最后停下：「重要的才留下」 | 奶油底 + 卡片墙密度叙事（稀疏→铺满→告警变灰）+ HUD 黑条（上下文主题）+ 卡片 60-90px 参数化 |
| E31 | 阅读 | 米纸书页模式 | 自由时间翻书：《背影》→《呼兰河传》→ 空白页，叙缩小蹲页边当读者 | 米纸 #E3D9BE 占 80% + 墨线线稿插图 + 页脚注（年份·地点）+ 叙小档 81×40 + 无 HUD |
| E32 | 对话 | 气泡系统+表情 | 叙和 her 多轮气泡对话，从「今天好吗」到分享一天，表情从 ! 到 ♥ | 奶油底 + 气泡左右交替（AI 珊瑚/用户白）+ 表情系统（!→♥→^^）+ 无 HUD + 对话节奏推进 |

## 分解树

```
batch-12 (E29-E32)
├─ T-P0 风格深化确认（Lead 读 style-analysis.md §7 + sop/00 G1-G6）✅
│    四大视觉装置选定：夜景陪伴/卡片墙/书页/气泡对话
├─ T-P1 E29-E32 剧情/风格特质确定 ✅
│    陪伴（夜景装置）/记忆（卡片墙装置）/阅读（书页装置）/对话（气泡装置）
├─ T-R1 任务卡 4 份（Lead 直写 arena-prompts/batch12/E2{9,30,31,32}_*.md）⬜
│    每卡 ≤50 行自包含：场景规格 + 风格锚 + 渲染要求 + 验收标准
├─ T-R2 arena 直连 d1 派活（4 会话，每会话 1 集）⬜
│    直连模式：arena 新会话直接选 d1-video-recreation 仓库
│    任务卡上传到 d1 arena-prompts/batch12/ → arena 读取执行
├─ T-R3 提取 4 分支 → 本地 4×check_overlap + ffprobe ⬜
└─ T-G 门禁 + 回写 episodes.md / status-table.md（41→45）+ push + ls-remote 验证 ⬜
```

### 正交性核对
- T-R 内 4 集正交：文件名（E29-E32）/mp4/分支/会话隔离，无共享状态 → 可 4 并行（sop/01 §7）。
- 单集内 render→check→audio 串行（arena agent 内部顺序执行）。
- 4 集共用风格锚（style-analysis.md §7），但各自聚焦不同视觉装置，无交叉依赖。

### 空缺清单
- arena 直连 d1 的 push 权限已验证（本轮 goal 验收①②），但 batch-12 是首次用直连模式做渲染任务——若 arena 在 d1 仓库内渲染遇阻（如缺依赖/字体），降级为 pfb 中转（conf-0.2）。
- E30 用 HUD 黑条（上下文主题），其余 3 集不用——任务卡需明确标注。
- E31 书页模式需线稿插图素材——任务卡需说明用 Pillow 画简笔线稿（月台/房子/树），不依赖外部素材。
- m00312 pfb arena 分支清扫仍待用户确认（不阻塞 batch-12）。

### 任务表（派发只执行表内条目）

| # | 任务 | 通道 | 依赖 | 状态 |
|---|------|------|------|------|
| T-P0 | 风格深化确认 | Lead 读文件 | - | ✅ |
| T-P1 | E29-E32 特质确定 | Lead | T-P0 | ✅ |
| T-R1 | 任务卡 4 份 | Lead 直写 | T-P1 | ⬜ |
| T-R2 | arena 直连×4 | ego-browser | T-R1 | ⬜ |
| T-R3 | 提取+check+ffprobe | Lead git | T-R2 | ⬜ |
| T-G | 门禁+回写+push | Lead | T-R3 | ⬜ |

### 验收（机器检查 = goal 验收①-④）
1. `docs/episodes.md` E29-E32 四行全 ✅（行内记 N/N PASSED）
2. `outputs/` 新增 4 mp4（800K-1.2M，git add -f 跟踪）+ status-table 41→45 且与 episodes.md 一致
3. d1 `git rev-parse HEAD` == `git ls-remote origin main`
4. 收官后 loop-state.json「下一步」清空
