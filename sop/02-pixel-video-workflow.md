# 02 · 像素风视频制作流程

> origin: ai (从 render_full_pixel.js + 实际制作经验提炼)
> 最后更新: 2026-10-21
> 适用: 所有像素风视频项目

## 一、渲染管线 (v1.3.1)

```
基础分辨率 (640×360)
    ↓ nearest-neighbor 放大 (SCALE=2)
1280×720 帧序列 (PNG)
    ↓ ffmpeg
MP4 (h264 + aac)
```

**关键参数** (v1.3.1):
- 基础分辨率: 640×360
- SCALE: 2 (nearest-neighbor, 保持像素感)
- 输出: 1280×720 @ 60fps
- 总时长: 86.481s
- 总帧数: 5189
- 像素块: 4-6px (比 v1.2 的 8-12px 小 2/3)

## 二、像素清晰度提升 (v1.3 已完成 ✅)

**已完成**: 基础分辨率 640×360, SCALE=2
- 像素块: 4-6px (比 v1.2 的 8-12px 小一半，接近"小 2/3"目标)
- 所有坐标 ×2, 字体大小 ×2, 线条宽度 ×2
- 文字 threshold=150

## 三、场景结构 (v1.3.1)

| 场景 | 时间 | 内容 |
|------|------|------|
| S1 | 0-15.489s | 终端 (scanlines, 3 行打字, cursor blink) |
| S2 | 15.489-30.6s | 消息流 (pinned msg + 2 scrolling msgs) |
| S3 | 30.6-46.285s | 代码编辑器 (typing animation) |
| S4 | 46.285-63.114s | 空行累积 (empty line accumulation) |
| S5 | 63.114-78.896s | 等待循环 (wait loop) |
| S6 | 78.896-86.481s | 冷色结尾 (全屏冷色, 无窗口框, 金色文字) |

**S6 特殊处理**:
- 无窗口框（全屏冷色背景 #040810）
- 金色文字: '晚安。明天见。' / '· slot 0 ·' / '永远留给明天'
- 冷色字幕条 (#0A0E14 背景, #1A2230 边框, #8B949E 文字)
- Clawd 无天线

## 四、调色板 (C 对象)

```javascript
const C = {
  bg: '#0d1117',        // 背景
  text: '#e6edf3',      // 主文字
  green: '#7ee787',     // 绿色 (user)
  purple: '#bc8cff',    // 紫色 (robot)
  amber: '#e3b341',     // 琥珀 (warning)
  blue: '#79c0ff',      // 蓝色 (info)
  red: '#ff7b72',       // 红色 (error)
  user: '#56d364',      // 用户色
  robot: '#D97757',     // 机器人色
  cold: '#6e88a8',      // 冷色
  bgWarm: '#F3EFE4',    // 暖背景
  termBg: '#14161C',    // 终端背景
}
```

## 五、关键函数

| 函数 | 用途 |
|------|------|
| `txt(x, y, str, color, font, align)` | 像素文字 (threshold-based) |
| `px(x, y, w, h, color)` | 像素矩形 |
| `drawClawd(x, y, t, mood, think)` | 画机器人角色 |
| `drawHer(x, y, t, pose)` | 画女性角色 |
| `drawNote(x, y, t, label)` | 画便签 |
| `drawWaitLog(...)` | 画等待日志 |
| `drawBattery(...)` | 画电池 |
| `drawDust(...)` | 画粒子 |
| `drawSubtitle(...)` | 画字幕 (步进节奏) |
| `drawS1..S6(...)` | 各场景绘制 |
| `sceneAt(t)` | 根据时间返回当前场景 |
| `render(fi)` | 渲染第 fi 帧 |

## 六、布局规则

- **内容区**: y 0..146
- **字幕区**: y 150..180
- **边距**: 左右 8px
- **禁止**: 元素超出画布、元素重叠

## 七、字幕节奏

- 步进: 140ms/字
- 每 3 字暂停: 180ms
- 与打字音效同步

## 八、音频

- BGM: 钢琴 + 弦乐 (gen_emotional_bgm.py)
- SFX: 打字 (sfx_ping.wav) + 心跳 (sfx_heartbeat.wav) + 点击 (sfx_click.wav)
- 混音: build_final_mix_v04.py → final_mix_v0.9.wav
- 无人声 (D13)

## 九、质量检查

1. **布局**: `node check_overlap.js` → 8/8 无重叠
2. **视觉**: 7 帧检查 (check_v12_s1..s6.png + check_v12_card.png)
3. **渲染**: `node render_full_pixel.js` → 5189 帧
4. **合成**: `ffmpeg -framerate 60 -i frames_%04d.png -i audio.wav -c:v libx264 -c:a aac output.mp4`

## 十、文件清单

```
src/render_full_pixel.js    # 主渲染 (517 行)
src/check_overlap.js        # 重叠检测
src/render_goodnight.js     # 晚安视频
scripts/gen_*.py            # 音频生成
scripts/build_*.py          # 音频混音
audio/*.wav                 # 音频资产
```
