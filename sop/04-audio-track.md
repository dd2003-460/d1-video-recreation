# 04 · 音轨制作

> origin: ai (从音频生成脚本 + 实际制作经验提炼)
> 最后更新: 2026-10-21
> 适用: 所有视频项目的音轨制作

## 一、音频架构

```
BGM (钢琴+弦乐)  ──┐
                   ├──→ 混音 (ffmpeg/numpy) ──→ final_mix.wav
SFX (打字/心跳)  ──┘
```

**无人声** (D13: 用户 m01217 明确不用真人 TTS)

## 二、BGM 生成

### gen_emotional_bgm.py
- 输出: `emotional_bgm.wav`
- 风格: 钢琴 + 弦乐 (温暖、情感)
- 工具: Python (numpy/scipy)
- 特点: 持续、高能量 (0.04-0.13)

### gen_bgm.py
- 输出: `bgm.wav`
- 风格: 基础 BGM

### gen_typing_bgm.py
- 输出: typing BGM
- 风格: 配合打字节奏

## 三、SFX 生成

| 文件 | 用途 | 特点 |
|------|------|------|
| `sfx_ping.wav` | 打字/消息提示 | 短促、清脆 |
| `sfx_heartbeat.wav` | 心跳 (情感时刻) | 低频、缓慢 |
| `sfx_click.wav` | 点击/交互 | 极短、清脆 |

## 四、混音

### build_final_mix_v04.py
- 输入: BGM + SFX + (可选) TTS 片段
- 输出: `final_mix_v0.9.wav`
- 工具: numpy 混音
- 特点: 音量平衡、淡入淡出

### build_audio_piper.py
- 用途: Piper TTS 片段生成 (当前项目不用)
- 输出: `seg_04.wav` ... `seg_13.wav`

## 五、音频参数

| 参数 | 值 |
|------|-----|
| 采样率 | 44100 Hz |
| 位深 | 16-bit |
| 声道 | 立体声 (stereo) |
| 时长 | 86.481s (匹配视频) |
| 格式 | WAV (PCM) |

## 六、音量平衡

- BGM: -12dB (背景)
- SFX: -6dB (前景)
- 情感时刻: BGM 淡出, SFX 突出
- 整体: 峰值 -1dB, 避免削波

## 七、音画同步

- 打字 SFX 与字幕步进同步 (140ms/字)
- 心跳 SFX 与情感场景同步 (S5 等待循环)
- BGM 与场景转换同步 (淡入淡出)

## 八、文件清单

```
scripts/gen_bgm.py              # BGM 生成
scripts/gen_emotional_bgm.py    # 情感 BGM
scripts/gen_typing_bgm.py       # 打字 BGM
scripts/build_audio_piper.py    # TTS 片段 (当前不用)
scripts/build_final_mix_v04.py  # 混音
audio/*.wav                     # 音频资产
```

## 九、键盘敲击音（v1.3.3 新增）

### 原理
- 每个字幕字符出现时播放 `sfx_click.wav`（30ms 短点击）
- S1 终端行每行出现时也播放一次
- 点击时间点从 LINES + STARTS + CHAR_MS 计算

### 生成流程
```bash
# 1. 生成点击时间戳（Node 脚本）
node /tmp/gen_clicks.js  # 输出 /tmp/click_times.txt

# 2. 生成点击音轨（Node 脚本，读 sfx_click.wav + 时间戳 → WAV）
node /tmp/gen_click_wav.js  # 输出 audio/s1_clicks_v13.wav

# 3. 混入主音轨（ffmpeg，关键：normalize=0）
ffmpeg -i audio/final_mix_v1.1.wav -i audio/s1_clicks_v13.wav \
  -filter_complex "[0:a]volume=1.0[main];[1:a]volume=1.0[clicks];[main][clicks]amix=inputs=2:duration=first:dropout_transition=0:normalize=0" \
  -c:a pcm_s16le audio/final_mix_v1.3.wav
```

### 关键参数
| 参数 | 值 | 说明 |
|------|-----|------|
| 点击音量 | 0.708 (-3dB) | 太小听不见，太大盖过 BGM |
| amix normalize | 0 | **必须**！默认 normalize=1 会除以输入数，整体降 6dB |
| S1 终端行 | 3 个 (0s, 0.8s, 1.6s) | 每行出现一次 |
| 字幕逐字 | 103 个 | CHAR_MS=140ms, PAUSE_MS=180ms every 3 |
| 总点击数 | 106 | |

### 踩坑
- `amix` 默认 `normalize=1` 会把每个输入除以 N（输入数），导致整体音量骤降
- 点击音 -8dB 时相对 BGM -12dB 几乎听不见，需要提到 -3dB
- `curLine(t)` 返回的 `t` 是**相对时间**（`t - STARTS[i]`），生成绝对时间戳时要加回 `STARTS[i]`

## 十、新增音频资产流程

1. 用 Python/Node 脚本生成 wav
2. 放入 `audio/` 目录
3. 在本文件中记录: 文件名 + 用途 + 参数
4. 在混音脚本中注册
5. 提交 commit

## 十、ffmpeg 合成

```bash
ffmpeg -framerate 60 \
  -i frames_%04d.png \
  -i audio/final_mix_v0.9.wav \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 192k \
  -shortest \
  output.mp4
```
