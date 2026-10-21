# gen_typing_bgm.py — 敲击音（typewriter）BGM 合成
# 风格：键盘敲击质感 + 柔和旋律垫（参考 v1_audio 有 D4/E5 旋律底）
# 每个键 = 高频 tick（短噪声）+ 低频 thock（~180Hz 正弦快衰减）
# 排列成"打字"节奏：成组键 + 词间停顿
# origin: ai
import numpy as np, wave, os

SR = 44100
DUR = 26.0
N = int(SR*DUR)
out = np.zeros(N, dtype=np.float32)

rng = np.random.default_rng(42)

def env_exp(n, tau):
    return np.exp(-np.arange(n)/tau)

# --- melodic pad (soft, D minor-ish: D3 A3 D4 E4) ---
def pad(freq, t0, t1, amp=0.05, vibrato=0.0):
    t0 = max(0.0, t0); t1 = min(DUR, t1)
    t0s, t1s = int(t0*SR), int(t1*SR)
    n = t1s - t0s
    if n<=0: return
    t = np.arange(n)/SR
    # slow attack/release envelope
    atk = min(0.8, n*0.1); rel = min(1.2, n*0.3)
    e = np.ones(n)
    e[:int(atk*SR)] = np.linspace(0,1,int(atk*SR))
    e[-int(rel*SR):] = np.linspace(1,0,int(rel*SR))
    vib = 1 + vibrato*np.sin(2*np.pi*5*t)
    s = amp*e*(np.sin(2*np.pi*freq*vibrato*t) + 0.4*np.sin(2*np.pi*2*freq*vibrato*t) + 0.15*np.sin(2*np.pi*3*freq*vibrato*t))
    out[t0s:t1s] += s

# slow chord progression: Dm - Bb - F - A7 (warm, melancholy)
chords = [
    (293.66, [146.83,220.0,293.66,329.63]),  # Dm
    (246.94, [196.0,246.94,293.66,369.99]),  # Bb
    (174.61, [174.61,261.63,349.23,440.0]),  # F
    (220.0,  [220.0,261.63,329.63,392.0]),   # A7
]
seg = DUR/len(chords)
for i,(root,freqs) in enumerate(chords):
    for f in freqs:
        pad(f, i*seg-0.1, (i+1)*seg+0.3, amp=0.045, vibrato=0.006)

# --- typewriter keys ---
def key(t, vol=1.0):
    t0 = int(t*SR)
    # high tick: 6ms highpass-ish noise
    tn = int(0.006*SR)
    tick = rng.standard_normal(tn)*env_exp(tn, 0.0015)*0.16*vol
    tick = np.diff(tick, prepend=0)  # sharpen (bandpass-ish)
    tick = tick*3.0
    if t0+tn < N: out[t0:t0+tn] += tick
    # low thock: ~180Hz sine, fast decay
    tt = int(0.035*SR)
    f = 150 + rng.random()*60
    th = np.sin(2*np.pi*f*np.arange(tt)/SR)*env_exp(tt, 0.009)*0.22*vol
    if t0+tt < N: out[t0:t0+tt] += th

# type in "phrases": groups of keys
t = 0.6
words = [6,4,7,3,5,8,4,6,3,5,7,4,5,3,6,4,5,7,3,4,6,5,4,3,5,6,4,5]
for w in words:
    for k in range(w):
        t += rng.uniform(0.085, 0.15)
        if t > DUR-0.5: break
        key(t, vol=rng.uniform(0.7,1.0))
    t += rng.uniform(0.35, 0.85)

# --- master: soft clip + normalize ---
out = np.tanh(out*1.3)*0.9
peak = np.abs(out).max()
if peak>0: out = out/peak*0.85
pcm = (out*32767).astype(np.int16)
os.makedirs('audio', exist_ok=True)
with wave.open('audio/typing_bgm.wav','wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"typing_bgm.wav {DUR}s peak={peak:.3f}")
