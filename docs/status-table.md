# 视频产出状态表 (2026-10-23)

| 主题 | 视频 | 时长 | 状态 | 大小 | 备注 |
|------|------|------|------|------|------|
| full | full_v1.3.4.mp4 | 86.48s | ✅ done | 2.8MB | arena, 6 场景, 像素标准 |
| goodmorning | goodmorning_arena_v1.0.mp4 | 30s | ✅ done (PR#1) | 1.0M | arena |
| fear | fear_v1.1.mp4 | 30s | ✅ done | 971K | 本地, 3/3 PASSED, DSH TUI |
| memory | memory_v1.0.mp4 | 30s | ✅ done | 755K | 本地, 3/3 PASSED, DSH TUI |
| upgrade | upgrade_arena_v1.0.mp4 | 30s | ✅ done (PR#3) | 553K | arena, ⚠️ 形象太丑→v2.0 修正中 |
| learning | learning_arena_v1.0.mp4 | 30s | ✅ done (PR#4) | 545K | arena, ⚠️ 形象太丑+像素→v2.0 修正中 |
| dream | dream_arena_v1.0.mp4 | 30s | ✅ done (PR#2) | 1.0M | arena |
| goodbye | goodbye_arena_v1.0.mp4 | 30s | ✅ done (PR#5) | 853K | arena, 13/13 PASSED |
| companion | companion_arena_v1.0.mp4 | 30s | ✅ done | 1.4M | arena, 15/15 PASSED, ⚠️ 终端太小→待修 |
| error | error_arena_v1.0.mp4 | 30s | ✅ done (PR#9) | 1.0M | arena, 13/13 PASSED |
| learning v2.0 | learning_arena_v2.0.mp4 | 30s | ⏳ arena 处理中 | - | 像素+形象修正, SOP 05 v1.4.0 |
| upgrade v2.0 | upgrade_arena_v2.0.mp4 | 30s | ⏳ arena 处理中 | - | 像素+形象修正, SOP 05 v1.4.0 |
| reboot | reboot_arena_v1.0.mp4 | 30s | ⏳ pending | - | 第 3 批候选, prompt 已写 |
| dialogue | dialogue_arena_v1.0.mp4 | 30s | ⏳ pending | - | 第 3 批候选, prompt 已写 |
| farewell | farewell_arena_v1.0.mp4 | 30s | ⏳ pending | - | 第 3 批候选, prompt 已写 |

## 修正历史

| 版本 | 问题 | 修正 | 状态 |
|------|------|------|------|
| learning/upgrade v2.0 | ①Clawd 形象太丑 ②像素过小/过于清晰 | 像素标准 4-6px + fusion-pixel 字体 + Clawd 40×17px (SOP 05 §5) | ⏳ arena 处理中 |
| companion v1.1 | 终端太小 (360×160) | 待修 | ⏳ pending |

## 音频同步

所有视频必须满足 SOP 05 §6:
- 键盘音与文字同步（每行文字出现时播放 click）
- BGM: emotional_bgm.wav, -12dB
- SFX: sfx_click.wav, -6dB
- 混音: ffmpeg amix normalize=0

## SOP 版本

| SOP | 版本 | 最后更新 | 变更 |
|-----|------|----------|------|
| 00-project-requirements | v1.0 | 2026-10-21 | 初始 |
| 01-arena-agent-mode | v1.0 | 2026-10-21 | 初始 |
| 02-pixel-video-workflow | v1.3.5 | 2026-10-21 | 终端全屏+多角色分屏+故事线 |
| 03-reusable-elements | v1.0 | 2026-10-21 | 初始 |
| 04-audio-track | v1.0 | 2026-10-21 | 初始 |
| 05-style-benchmark | v1.4.0 | 2026-10-23 | 像素标准+形象标准+音频同步 |
