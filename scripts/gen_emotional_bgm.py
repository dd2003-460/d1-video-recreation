#!/usr/bin/env python3
# 场景情绪 BGM 生成器 —— 纯 numpy，本地免费，无外部依赖
# 目标: 稀疏、空旷、带混响的"环境钢琴"，跟随 6 场景情绪弧线:
#   S1 希望 / S2 陪伴 / S3 日常 / S4 不安 / S5 寻找(悬置) / S6 释怀(温暖而带一丝酸)
# 音色: 钢琴近似 = 基频+谐波(高频衰减快) + 软起音 + 指数衰减 + 双声部微失谐 + 反馈延迟(空间感)
# 混音: 低电平铺底(约0.20)，交叉淡化衔接，精确 86.481s
import numpy as np
from pathlib import Path
import wave

SR = 44100
TOTAL = 86.481          # 与 final_mix_piper 一致
N = int(TOTAL * SR)
out = np.zeros(N, dtype=np.float64)

# ---------- 基础音色 ----------
def midi_f(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))

def piano_note(midi, dur, level=1.0, detune_cents=0.0):
    """单个钢琴近似音符: 谐波 + 软起音 + 指数衰减。返回 len(dur*SR) float64。"""
    n = int(dur * SR)
    f0 = midi_f(midi) * (2.0 ** (detune_cents / 1200.0))
    t = np.arange(n) / SR
    sig = np.zeros(n)
    # 钢琴: 基频强，高次谐波快速衰减
    for h, amp in [(1, 1.0), (2, 0.5), (3, 0.28), (4, 0.16), (5, 0.09), (6, 0.05)]:
        fh = f0 * h
        if fh < SR / 2:
            sig += amp * np.sin(2 * np.pi * fh * t) * np.exp(-t * (2.2 + 1.1 * h))  # 高频衰减更快
    # 软起音(约 8ms) 避免 click
    atk = int(0.008 * SR)
    if atk > 0 and atk < n:
        ramp = np.linspace(0, 1, atk) ** 2
        sig[:atk] *= ramp
    return sig * level

def pad(midis, dur, level=1.0):
    """持续 pad: 多个音符叠加 + 慢包络(起 0.8s / 落 1.2s)，带轻微颤音。"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    for m in midis:
        f0 = midi_f(m)
        for h, amp in [(1, 1.0), (2, 0.35), (3, 0.12)]:
            fh = f0 * h
            if fh < SR / 2:
                # 基频带极慢颤音(相位调制)，谐波保持纯音
                vibph = (h - 1) * 2 * np.pi * 0.0015 * np.sin(2 * np.pi * 0.25 * t)
                sig += amp * np.sin(h * (2 * np.pi * f0 * t) + vibph) * np.exp(-t * 0.9)
    # 包络: 起 0.8s, 落 1.2s
    a = int(0.8 * SR); r = int(1.2 * SR)
    env = np.ones(n)
    env[:a] = np.linspace(0, 1, a)
    if r < n:
        env[-r:] = np.linspace(1, 0, r)
    sig *= env
    return sig * level

def add_at(sig, start_sec, gain=1.0):
    s = int(start_sec * SR)
    e = min(N, s + len(sig))
    if s >= N or s < 0:
        return
    out[s:e] += sig[: e - s] * gain

def xfade_pad(gain=1.0):
    """把整段 out 做一次全局淡入(2s)/淡出(3s)。"""
    a = int(2.0 * SR); r = int(3.0 * SR)
    out[:a] *= np.linspace(0, 1, a)
    out[-r:] *= np.linspace(1, 0, r)

# ---------- 混响: 简单反馈延迟(营造空间感) ----------
def reverb(x, delay_ms=330, feedback=0.38, level=0.5):
    d = int(delay_ms / 1000.0 * SR)
    y = x.copy()
    # 两个延迟分支(奇数倍)避免 comb 单峰
    for mult, fb in [(1.0, feedback), (1.618, feedback * 0.8)]:
        dd = int(d * mult)
        tail = x.copy()
        for _ in range(12):
            shifted = np.zeros_like(tail)
            shifted[dd:] = tail[:-dd]
            tail = shifted * fb
            y += tail * level
    return y

# ---------- 6 场景和声 (MIDI) ----------
# (场景起始, 时长, pad音符, 琶音音符列表[(偏移秒, midi, 时值秒, 电平)])
SCENES = [
    # S1 希望 (0.0–15.489): C add9，明亮而轻
    (0.0, 15.489, [48, 60, 64, 69],
     [(1.0, 60, 1.2, 0.50), (3.5, 64, 1.4, 0.45), (6.5, 67, 1.6, 0.42), (9.5, 74, 2.0, 0.40), (12.5, 76, 2.2, 0.34)]),
    # S2 陪伴 (15.489–30.6): Am，温暖
    (15.489, 15.111, [45, 57, 64, 69],
     [(17.0, 60, 1.2, 0.48), (19.5, 64, 1.4, 0.44), (22.5, 69, 1.6, 0.42), (25.5, 72, 2.0, 0.40), (28.5, 76, 2.0, 0.32)]),
    # S3 日常 (30.6–46.285): F，开阔平静
    (30.6, 15.685, [41, 53, 60, 65],
     [(32.0, 60, 1.2, 0.46), (34.5, 65, 1.4, 0.42), (37.5, 69, 1.6, 0.40), (40.5, 72, 2.0, 0.38), (43.5, 77, 2.0, 0.30)]),
    # S4 不安 (46.285–63.114): Dm，转暗、更稀疏、更低
    (46.285, 16.829, [38, 50, 57, 62],
     [(48.0, 62, 1.6, 0.44), (52.0, 65, 1.8, 0.40), (56.5, 69, 2.2, 0.38), (60.5, 74, 2.4, 0.34)]),
    # S5 寻找/悬置 (63.114–78.896): Bb 挂留，紧张但不吵
    (63.114, 15.782, [46, 53, 58, 62],
     [(64.5, 62, 1.2, 0.42), (66.5, 63, 1.0, 0.34), (68.5, 65, 1.2, 0.40), (71.0, 69, 1.4, 0.38), (74.0, 74, 1.8, 0.34), (76.5, 77, 2.0, 0.30)]),
    # S6 释怀 (78.896–86.481): C，温暖带酸(加 D 的 add9 色彩)
    (78.896, 7.585, [48, 55, 60, 64, 74],
     [(79.5, 60, 1.4, 0.46), (81.5, 64, 1.4, 0.44), (83.0, 67, 1.4, 0.40), (84.5, 72, 1.6, 0.36), (85.2, 74, 1.2, 0.30)]),
]

PAD_GAIN = 0.30
NOTE_GAIN = 0.55

for start, dur, padm, notes in SCENES:
    add_at(pad(padm, dur + 2.5, level=PAD_GAIN), start, 1.0)   # pad 略长以覆盖交叉
    for off, m, nd, lv in notes:
        add_at(piano_note(m, nd, level=lv), start + off, NOTE_GAIN)

# 混响(空间感) + 全局淡入淡出
out = reverb(out, delay_ms=330, feedback=0.36, level=0.45)
xfade_pad()

# 归一化到目标峰值(0.62，留出与旁白/敲击音混音的动态余量)
peak = np.abs(out).max()
if peak > 0:
    out = out / peak * 0.62

# 转 16bit
pcm = np.clip(out, -1, 1)
pcm16 = (pcm * 32767).astype(np.int16)

out_dir = Path('outputs/audio')
out_dir.mkdir(parents=True, exist_ok=True)
with wave.open(str(out_dir / 'emotional_bgm.wav'), 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm16.tobytes())
print('wrote outputs/audio/emotional_bgm.wav', round(len(pcm16) / SR, 3), 's peak', round(float(peak), 3))
