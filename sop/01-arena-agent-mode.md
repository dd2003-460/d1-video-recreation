# 01 · Arena Agent Mode 外包流程

> origin: human (成璐 m00002: "全部外包给arena的agentmode")
> 最后更新: 2026-10-21
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

## 六、当前项目状态 (2026-10-21)

- 仓库: `dd2003-460/d1-video-recreation`
- 当前版本: v1.2 (86.5s, 1280×720@60fps)
- 下一步: arena agent mode 执行 v1.3 优化（像素清晰度提升）
