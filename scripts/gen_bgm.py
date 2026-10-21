#!/usr/bin/env python3
"""生成钢琴风 BGM：C 小调舒缓琶音 + 正弦波钢琴近似音色，4 分钟。
origin: ai · 2026-10-19 · 纯 numpy 离线合成，零依赖（numpy 除外）
"""
import numpy as np

SR = 44100
DUR = 250.0  # 4:10，留 10s 余量
t = np.arange(int(SR * DUR)) / SR

# 钢琴近似：正弦 + 2/3 次谐波，指数衰减包络（attack 5ms，decay τ≈1.2s）
def pluck(freq, dur, amp=1.0, harmonics=(1.0, 0.35, 0.12)):
    n = int(SR * dur)
    tt = np.arange(n) / SR
    sig = np.zeros(n)
    for k, a in enumerate(harmonics, start=1):
        sig += a * np.sin(2 * np.pi * freq * k * tt)
    env = np.exp(-tt / 1.2) * (1 - np.exp(-tt / 0.005))
    return sig * env * amp

# C minor：Cm - Ab - Eb - Bb（i - VI - III - VII）进行，8 小节循环
chords = [
    [130.81, 155.56, 196.00],  # Cm
    [87.31, 110.00, 130.81],   # Ab
    [82.41, 123.47, 164.81],   # Eb
    [116.54, 146.83, 174.61],  # Bb
]
# 琶音：每小节 1.5s，4 个音符（根-三-五-八 上行，下行）
BPM = 40
BAR = 60 / BPM  # 1.5s
n_bars = int(DUR / BAR)
mix = np.zeros(len(t))

for bar in range(n_bars):
    ch = chords[bar % 4]
    t0 = int(bar * BAR * SR)
    # 低音（根音，长音）
    bass = pluck(ch[0], BAR, amp=0.5)
    mix[t0:t0+len(bass)] += bass
    # 琶音 4 音
    pattern = [ch[0]*2, ch[1]*2, ch[2]*2, ch[0]*4]
    for j, f in enumerate(pattern):
        st = t0 + int(j * (BAR/4) * SR)
        p = pluck(f, BAR/2, amp=0.30)
        mix[st:st+len(p)] += p
    # 副旋律（每 2 小节加一个高音点）
    if bar % 2 == 1:
        st = t0 + int(2*(BAR/4)*SR)
        p = pluck(ch[2]*4, BAR, amp=0.18)
        mix[st:st+len(p)] += p

# 全局包络：淡入 4s，最后 8s 淡出
fade_in = int(4 * SR); fade_out = int(8 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)
mix[-fade_out:] *= np.linspace(1, 0, fade_out)
mix = mix / np.max(np.abs(mix)) * 0.7

# 16-bit PCM → wav
import wave
pcm = (mix * 32767).astype("<i2")
with wave.open("audio/bgm.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("bgm.wav written:", DUR, "s")
