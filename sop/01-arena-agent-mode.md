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
- **⚠️ Arena 不能 push 回原仓库** (v1.3.1 教训): arena sandbox 的 git auth 绑定到自己的仓库，无法 push 到 d1-video-recreation。arena 只能在本地工作，结果需要本地手动应用
- **✅ Arena 可以 push 到自己的仓库** (goodmorning v1.0 成功): arena 会创建分支 `arena/<session-id>-prompt-first-bench` 并 push 到 `dd2003-460/prompt-first-bench` 仓库，然后创建 PR。本地 `git clone` 该仓库 → `git checkout arena/...` → 复制文件到 d1-video-recreation 即可
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
| learning | v1.0 | 30s | 本地制作 | 3/3 PASSED | ⏳ arena 处理中 (session 已创建) |
| dream | arena v1.0 | 30s | arena 外包 (27m21s) | 13/13 PASSED | ✅ (PR #2) |

- 仓库: `dd2003-460/d1-video-recreation` (commit 6d82a63)
- arena 仓库: `dd2003-460/prompt-first-bench` (PR #1 goodmorning, PR #2 dream, PR #3 upgrade)
- 关键教训: **本地制作达不到 arena 的美术风格**（键盘声音、Clawd 形象、布局），必须外包
- 主题优先级: memory → dream → upgrade → learning (dream/upgrade 已完成 via arena)
- ego-browser 发送技巧: tiptap 输入框有时不在 snapshot 中，用 `p1.evaluate()` + IIFE 包装填充
