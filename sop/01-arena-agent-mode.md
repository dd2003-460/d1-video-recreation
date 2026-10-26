# 01 · Arena Agent Mode 外包流程

> origin: human (成璐 m00002: "全部外包给arena的agentmode")
> 最后更新: 2026-10-23
> 适用: 任何需要把视觉/媒体制作任务外包给 arena.ai/agent 的场景

## 一、为什么用 Arena Agent Mode

- Arena 的 agent mode 可以**直接代干活**（不是纯聊天）
- 可选项最多（模型选择、工具调用等）
- 适合外包: 视频渲染、图像生成、代码修改、迭代审核
- **限制**: 不允许一次上传多张图片（必须走仓库引用）

## 二、前置条件

1. 本地工作区有一个干净的 git 仓库
2. 仓库已推送到 GitHub（arena 可以 clone）
3. 仓库包含: 渲染脚本 + 检查脚本 + 音频资产 + SOP + 参考帧
4. 用户已在 ego-lite 浏览器登录 arena.ai

## 三、流程（5 步）

### Step 1: 本地建仓库
```bash
mkdir ~/workspace/<project-name>
cd ~/workspace/<project-name>
git init
# 放入: src/ scripts/ audio/ docs/ sop/ .gitignore
```

### Step 2: 推 GitHub
```bash
gh repo create <repo-name> --public --source=. --push
# 或
gh repo create <repo-name> --private --source=. --push
```
- 仓库名: 小写短横线，如 `d1-video-recreation`
- 必须 push 成功（arena 要 clone）

### Step 3: 打开 Arena Agent Mode
- URL: `https://arena.ai/agent`
- 用 ego-browser 打开（用户已登录）
- 选择 agent mode（不是 chat mode）

### Step 4: 输入清晰完整的 Goal Prompt
**关键: prompt 必须清晰、完整、可执行**，让 arena 的 agent 知道:
1. **目标**: 要做什么（如"优化像素清晰度"）
2. **仓库**: clone 哪个仓库（GitHub URL）
3. **参考**: 看哪些文件（SOP、参考帧、当前脚本）
4. **要求**: 具体的质量要求（像素粒度、布局、风格）
5. **验收**: 怎么判断做完了（check_overlap 通过 + 人工审核）

**Prompt 模板**:
```
Clone the repo at https://github.com/<user>/<repo>.

Goal: <具体目标，如 "Improve pixel clarity by reducing pixel size by 2/3 while maintaining pixel art aesthetic">

Read these files first:
1. sop/00-project-requirements.md — project requirements
2. sop/02-pixel-video-workflow.md — pixel video workflow
3. docs/refs/ — reference frames from bilibili
4. src/render_full_pixel.js — current render script

Requirements:
- <requirement 1>
- <requirement 2>
- <requirement 3>

Acceptance criteria:
- check_overlap.js passes (no overlaps, no truncation)
- Visual style matches docs/refs/bili_v1/ and docs/refs/bili_v2/
- <specific criteria>

Work in the repo, commit changes, and push to main.
```

### Step 5: 监控 + 验收
- arena agent 会: clone → 读 SOP → 执行 → commit → push
- 监控: 在 ego-browser 里观察 arena 的进度
- 验收: clone 回本地 → 跑 check_overlap.js → 人工审核帧
- 不达标: 在 arena 里继续迭代（agent mode 支持多轮）

## 四、ego-browser 操作脚本

```javascript
// ego-browser nodejs
const task = await taskSpace('arena-agent-<project>')
const p1 = task.page('p1')

// 打开 arena
await p1.goto('https://arena.ai/agent')

// 等待加载
await p1.waitForTimeout(3000)

// snapshot 看页面结构
const s = await p1.snapshot()

// 找到输入框，填入 goal prompt
// (根据 snapshot 的 ref 定位输入框)
// await p1.fill('<input-ref>', goalPrompt)
// await p1.click('<send-btn-ref>')

// 等待 arena 开始工作
await p1.waitForTimeout(60000)

// 检查进度
const s2 = await p1.snapshot()

await task.finish({ keep: ['p1'] })  // 保留页面让用户看
```

## 五、注意事项

- **一次只上传一张图**: arena 限制，所以所有参考都走仓库
- **prompt 要完整**: arena 的 agent 看不到你的上下文，所有信息必须在 prompt 或仓库里
- **SOP 是桥梁**: 你的 SOP 文件就是 arena 的"说明书"，写得越清楚，arena 做得越准
- **迭代**: 第一次不一定完美，在 arena 里多轮迭代
- **验证**: arena 做完后必须本地验证（check_overlap + 人工审核）
- **✅ 新会话直接选 d1-video-recreation 仓库** (2026-10-26 用户实证修正): arena.ai/agent **新会话可以直接切换/选择仓库**（用户实证：会话 01a17723 很容易切到 d1-video-recreation）。**选对仓库是第一原则**：按任务选对应仓库直连，不走 pfb 中转。
- **⚠️ 历史教训（pfb 中转为旧方案）** (v1.3.1): 旧会话曾遇到 arena sandbox git auth 绑定 pfb 无法 push 回 d1 的问题，当时走 pfb 分支 `arena/<session-id>-prompt-first-bench` 中转。**新任务一律直连目标仓库**，pfb 中转仅用于历史遗留产出的提取清扫。
- **⚠️ Arena 会改写全局数据** (v1.3.1 教训): arena 在修 bug 时可能重写 LINES/SCENES 等全局数组，导致音频失同步。prompt 必须明确"不要修改 LINES/STARTS/SCENES"
- **⚠️ React SPA 限制** (v1.3.1 教训): arena 页面是 React SPA，body 文本不会实时更新新内容。ego-browser 的 `document.body.innerText` 可能显示旧内容。用 `p1.snapshot()` 而非 body 文本
- **✅ 提取代码的正确方式** (goodmorning v1.0 验证):
  1. arena 完成后，页面显示 "Create PR" 按钮和分支名
  2. `git clone https://github.com/dd2003-460/prompt-first-bench.git`
  3. `git checkout arena/<session-id>-prompt-first-bench`
  4. 复制 `render_goodmorning.js` → `src/render_goodmorning_arena.js`
  5. 复制 `check_overlap.js` → `src/check_overlap_arena.js`（注意 require 路径要改）
  6. 复制 `scripts/build_audio.js` → `scripts/build_audio_arena.js`
  7. 复制 `outputs/*.mp4` → `outputs/`
  8. 本地运行 `node src/check_overlap_arena.js` 验证

## 六、当前项目状态

| 视频 | 版本 | 时长 | 制作方式 | 重叠检测 | 状态 |
|------|------|------|----------|----------|------|
| full | v1.3.4 | 86.48s | arena 外包 | 8/8 PASSED | ✅ |
| goodmorning | arena v1.0 | 30s | arena 外包 | 13/13 PASSED | ✅ |
| goodmorning | 本地 v1.1 | 30s | 本地制作 | 未检测 | ❌ 不达标 |
| fear | v1.1 | 30s | 本地制作 | 3/3 PASSED | ✅ |
| memory | v1.0 | 30s | 本地制作 | 3/3 PASSED | ✅ |
| upgrade | arena v1.0 | 30s | arena 外包 | 13/13 PASSED | ✅ (PR #3) |
| upgrade | 本地 v1.0 | 30s | 本地制作 | 3/3 PASSED | ❌ 不达标 |
| learning | arena v1.0 | 30s | arena 外包 | 13/13 PASSED | ✅ (PR #4) |
| learning | 本地 v1.0 | 30s | 本地制作 | 3/3 PASSED | ❌ 不达标 |
| dream | arena v1.0 | 30s | arena 外包 (27m21s) | 13/13 PASSED | ✅ (PR #2) |

- 仓库: `dd2003-460/d1-video-recreation` (commit eaba135)
- arena 仓库: `dd2003-460/prompt-first-bench` (PR #1 goodmorning, PR #2 dream, PR #3 upgrade, PR #4 learning)
- 关键教训: **本地制作达不到 arena 的美术风格**（键盘声音、Clawd 形象、布局），必须外包
- 主题优先级: memory → dream → upgrade → learning (dream/upgrade/learning 已完成 via arena)
- 新主题候选: 告别 (Goodbye) / 陪伴 (Companion) / 错误 (Error) — 见 docs/new-themes.md
- ego-browser 发送技巧: tiptap 输入框有时不在 snapshot 中，用 `p1.evaluate()` + IIFE 包装填充

## 七、并发与并行化规则（origin: human · 成璐 m00189 · 2026-10-24）

**总则**：SOP 执行必须严格外包 arena（仅「必须本地」时例外）。但**寻找 / 选择 / 可并行**的任务，应拆分给**多个短上下文 subagent** 并行完成，以提高并发度与总速率。

**三条硬约束**：
1. **只有可并行的才能并行** — 有先后依赖（后步依赖前步产出）的任务必须串行，不得并行。
2. **subagent 上下文 + 任务尽可能简洁** — 每个 subagent 只给最小必要上下文 + 单一任务，不灌全量历史 / 无关文件。
3. **Leader 负责并行判定与拆分** — 是否可并行、如何拆分由 Leader（本会话）决定；subagent 只领单一领域，不自行做并行决策。

**本 SOP 的判定示例**：
- ✅ 可并行：多集互不依赖（如 batch-9 的 E17/E18/E19/E20 四集）→ 拆给多个 subagent 并行（各自准备任务书 / 盯各自 arena 会话 / 提取各自产物）。
- ❌ 不可并行：单集内 render → check → audio → mp4（有依赖）→ 串行。
- ✅ 可并行：多路调研 / 交叉核验 / 多个 arena 会话同时推进。

> 应用说明：batch-9 已作为单任务投 arena（会话 01a16de0），在途不拆；本规则自 batch-10 起的编排与多会话监控开始生效。
