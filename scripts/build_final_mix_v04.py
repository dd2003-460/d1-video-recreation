#!/usr/bin/env python3
# v0.4 终混: final_mix_piper(旁白+敲击音) + emotional_bgm(场景情绪钢琴) 低电平铺底
# 软限幅防削波，峰值归一 0.88
import numpy as np
from pathlib import Path
import wave

def load(p):
    with wave.open(p, 'rb') as w:
        sr = w.getframerate(); n = w.getnframes()
        d = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float64) / 32768
    return d, sr

base, sr = load('outputs/audio/final_mix_piper.wav')
emo, _ = load('outputs/audio/emotional_bgm.wav')
N = min(len(base), len(emo), int(86.481 * sr))
base = base[:N]; emo = emo[:N]

EMO_GAIN = 0.32
mix = base + emo * EMO_GAIN

# 软限幅: tanh 压缩峰值，保留动态
drive = 1.15
mix = np.tanh(mix * drive) / np.tanh(drive)

peak = np.abs(mix).max()
if peak > 0:
    mix = mix / peak * 0.88

pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
out_p = Path('outputs/audio/final_mix_v04.wav')
with wave.open(str(out_p), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes(pcm.tobytes())
print('wrote', out_p, round(len(pcm)/sr, 3), 's peak', round(float(np.abs(mix).max()), 3), 'rms', round(float(np.sqrt((mix**2).mean())), 3))
