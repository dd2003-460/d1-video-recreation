# Arena Prompt: learning + upgrade v2.0 修正版

## 背景
v1.0 版本的 learning 和 upgrade 视频有两个问题：
1. **Claude (Clawd) 形象太丑** — 需要对标 bilibili 原视频的形象风格
2. **像素感不够** — 看起来过于清晰，需要对照 companion_arena_v1.0.mp4 的像素大小

## 参考素材（已在仓库中）
- **像素风格参考**: `outputs/companion_arena_v1.0.mp4` — 这是像素大小和美术风格的**标准**
- **形象参考帧**: `docs/refs/bili_v1/f_012.png` (640×360) — bilibili 原视频的 Clawd 形象
- **形象参考帧**: `docs/refs/bili_v2/f_008.png` (640×360) — 另一帧参考
- **完整渲染参考**: `src/render_full_pixel.js` — 主视频的渲染代码（形象+像素+布局标准）
- **Companion 渲染参考**: `src/render_companion_arena.js` — 像素大小和房间布局的标准

## 像素大小标准（对照 companion_arena_v1.0.mp4）
- 画布: BW=640 BH=360 SCALE=2 → 1280×720
- **像素块大小**: 4-6px（每个最小视觉单元），对照 companion 帧中的星星(2×2px)、窗户格子(6×6px)、角色眼睛(4×4px)
- **字体**: 10px fusion-pixel 字体（不是 monospace），确保像素化文字
- **角色尺寸**: Clawd 40×17px body（含眼睛 4×4px、肚子 22×4px），Her 16×28px
- **终端**: 360×160px（标题栏 20px + 内容区 140px），标题栏有红黄绿三个圆点

## Clawd 形象修正要求
v1.0 的 Clawd 形象问题：
- 眼睛太小（2×2px）→ 改为 4×4px，带 1×1px 白色高光
- 身体缺少质感 → 加顶部 2px 暗色条 + 腹部 22×4px 浅色块
- 缺少表情变化 → 至少 3 种表情：calm（正常圆眼）、thinking（眯眼+思考泡泡）、smile（弯月眼+微笑）
- 颜色: 正常 `#7B9E6B`（绿色），thinking `#6B5B95`（紫色），smile `#7B9E6B` + 粉色腮红
- 参考 `src/render_companion_arena.js` 的 `drawClawd()` 函数 — 这是**正确的形象标准**

## 场景设计

### Learning v2.0（30s, 1800 帧）
**L1 (0-10s): 她的请求**
- 房间背景: 暖色条纹墙 + 窗户(夜晚+星星+月亮) + 窗台(花盆)
- 终端在中央: `clawd@dsh:~$ — request`
- her 消息气泡: "帮我写一封辞职信"
- Clawd 在左侧(40×17px, 绿色, calm→thinking 表情变化)
- Her 在右侧窗户旁(16×28px, 粉色裙子)
- 字幕: "她给它一个任务。"

**L2 (10-20s): 学习过程**
- 终端显示学习进度:
  ```
  $ clawd: 正在学习...
  [████████░░] 80% — grammar
  [██████████] 100% — tone
  [████████░░] 60% — emotion
  ```
- 进度条用绿色/黄色/红色
- Clawd 思考泡泡: "..." → "?" → "!"
- 字幕: "它在学习理解。"

**L3 (20-30s): 成长**
- 终端显示完成的辞职信:
  ```
  亲爱的主管：
  我在此提交辞职申请。
  感谢您三年的指导。
  — Her
  ```
- 便签: "学会了。"
- Clawd smile 表情
- 字幕: "这就是成长。"

### Upgrade v2.0（30s, 1800 帧）
**U1 (0-10s): 新发现**
- 终端显示:
  ```
  $ clawd: 发现新模块 v2.0.0
  npm install clawd-v2
  ```
- 进度条: [████░░░░░░] 40%
- Clawd 好奇表情(眼睛变大)
- 字幕: "它发现了新版本。"

**U2 (10-20s): 升级过程**
- 终端显示升级日志:
  ```
  [1/5] backing up config...
  [2/5] downloading v2.0.0...
  [3/5] installing modules...
  [4/5] migrating data...
  [5/5] restarting...
  ```
- 每步完成打绿色 ✓
- 字幕: "升级中..."

**U3 (20-30s): 完成**
- 终端显示:
  ```
  ✓ upgrade complete
  clawd v2.0.0 — ready
  ```
- 便签: "升级完成。"
- Clawd 自信表情(挺胸)
- 字幕: "它变强了。"

## 技术要求
1. 使用 @napi-rs/canvas 渲染
2. BW=640 BH=360 SCALE=2
3. **像素块大小 4-6px**（对照 companion 帧）
4. **字体 10px fusion-pixel**（不是 monospace）
5. 每个场景: 房间背景 + 终端 + 角色 + 字幕
6. 角色形象对照 `render_companion_arena.js` 的 drawClawd()
7. 终端 360×160px，标题栏有红黄绿圆点
8. 背景: 暖色条纹墙(#F5EDD5) + 窗户(夜晚) + 星星 + 窗台
9. 键盘敲击音与画面文字出现同步（每行文字出现时播放一次 click 音）

## 音频同步要求（新）
- 每行终端文字出现时，播放一次 sfx_click.wav
- 打字机效果: 每个字符出现时播放 click
- 字幕切换时不播放 click
- 参考: `scripts/build_audio_companion.js` 的音频时间轴

## 文件输出
1. `src/render_learning_arena_v2.js` — 渲染脚本
2. `src/check_overlap_learning_v2.js` — 重叠+截断检测
3. `scripts/build_audio_learning_v2.js` — 音频合成
4. `outputs/learning_arena_v2.0.mp4` — 最终视频
5. `audio/learning_arena_v2_mix.wav` — 合成音轨
6. `src/render_upgrade_arena_v2.js` — 渲染脚本
7. `src/check_overlap_upgrade_v2.js` — 重叠+截断检测
8. `scripts/build_audio_upgrade_v2.js` — 音频合成
9. `outputs/upgrade_arena_v2.0.mp4` — 最终视频
10. `audio/upgrade_arena_v2_mix.wav` — 合成音轨

## 验收标准
- check_overlap 全部 PASSED
- 视频 30s 1280×720@60fps
- **像素大小与 companion_arena_v1.0.mp4 一致**
- **Clawd 形象与 companion 一致**（40×17px, 4×4px 眼睛, 3 种表情）
- **键盘敲击音与文字同步**
- 无重叠、无截断
- 音频无削波
- git commit + push 到 arena 分支 + 创建 PR
