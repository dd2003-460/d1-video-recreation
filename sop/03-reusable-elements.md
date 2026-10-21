# 03 · 可复用视觉元素

> origin: ai (从 render_full_pixel.js 提炼)
> 最后更新: 2026-10-21
> 适用: 所有像素风视频项目

## 一、角色元素

### Clawd (机器人角色)
- 函数: `drawClawd(x, y, t, mood, think)`
- 参数:
  - `x, y`: 位置 (基础分辨率坐标)
  - `t`: 时间 (秒, 用于动画)
  - `mood`: 情绪状态 (如 'happy', 'thinking', 'sad')
  - `think`: 是否显示思考气泡
- 复用: 任何需要机器人角色的场景
- 当前位置: S1 (236, 78), S2 (232, 76)

### Her (女性角色)
- 函数: `drawHer(x, y, t, pose)`
- 参数:
  - `x, y`: 位置
  - `t`: 时间
  - `pose`: 姿势 (如 'wave', 'sit', 'stand')
- 复用: 任何需要人物角色的场景
- 当前位置: S2 (4, 76)

## 二、UI 组件

### 终端 (Terminal)
- 函数: 在 `drawS1` 中实现
- 元素: 扫描线 (scanlines), 打字动画, cursor blink, 日期行, pinned counter
- 复用: 任何需要终端界面的场景

### 消息流 (Message Flow)
- 函数: 在 `drawS2` 中实现
- 元素: pinned message, scrolling messages, input bar
- 复用: 任何需要对话/消息的场景

### 代码编辑器 (Code Editor)
- 函数: 在 `drawS3` 中实现
- 元素: 代码行, 高亮, 光标, 行号
- 复用: 任何需要代码展示的场景

### 便签 (Note Card)
- 函数: `drawNote(x, y, t, label)`
- 参数:
  - `x, y`: 位置
  - `t`: 时间 (用于滑入动画)
  - `label`: 便签文字
- 复用: 任何需要提示/标注的场景
- 当前: CARD (st=44.285, txt='她没再说话。', sub='然后，屏幕开始变暗。')

## 三、特效元素

### 扫描线 (Scanlines)
- 函数: 在 `drawS1` 中实现
- 效果: CRT 终端扫描线
- 复用: 终端/复古界面场景

### 粒子 (Dust/Particles)
- 函数: `drawDust(...)`
- 效果: 漂浮粒子 (氛围)
- 复用: 需要氛围感的场景

### 电池 (Battery)
- 函数: `drawBattery(...)`
- 效果: 电量指示器
- 复用: 需要状态指示的场景

### 等待日志 (Wait Log)
- 函数: `drawWaitLog(...)`
- 效果: 滚动日志 (等待状态)
- 复用: 需要等待/加载状态的场景

## 四、字幕系统

### 步进字幕 (Stepped Subtitle)
- 函数: `drawSubtitle(...)`
- 节奏: 140ms/字 + 每 3 字暂停 180ms
- 复用: 所有需要字幕的场景
- 数据: LINES (16 行) + STARTS (16 时间戳)

## 五、像素文字

### txt() 函数
- 签名: `txt(x, y, str, color, font, align)`
- 原理: threshold-based pixel text (threshold=150)
- 复用: 所有需要文字的场景
- 注意: font 参数控制字体大小 (v1.2 已降级 1-2px)

## 六、复用原则

1. **独立函数**: 每个可复用元素都是独立函数
2. **参数化**: 位置/时间/状态都通过参数传入
3. **无副作用**: 函数只画自己的区域，不影响其他元素
4. **坐标基于基础分辨率**: 所有坐标都是 320×180 坐标 (v1.3 改为 640×360)
5. **SOP 记录**: 每个可复用元素都有 SOP 文档 (本文件)

## 七、新增可复用元素流程

1. 在 render_full_pixel.js 中实现函数
2. 在本文件中记录: 函数签名 + 参数 + 用途 + 复用场景
3. 在 check_overlap.js 中注册边界 (如果是布局元素)
4. 提交 commit
