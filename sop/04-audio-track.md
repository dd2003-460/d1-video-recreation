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

## 九、新增音频资产流程

1. 用 Python 脚本生成 wav
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
