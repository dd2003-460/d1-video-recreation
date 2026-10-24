# 视频产出状态表 (2026-10-24)

| 主题 | 视频 | 时长 | 状态 | 大小 | 备注 |
|------|------|------|------|------|------|
| full | full_v1.3.4.mp4 | 86.48s | ✅ done | 2.8MB | arena, 6 场景, 像素标准 |
| goodmorning | goodmorning_arena_v1.0.mp4 | 30s | ✅ done (PR#1) | 1.0M | arena |
| fear | fear_v1.1.mp4 | 30s | ✅ done | 4.7K | 本地, 3/3 PASSED, DSH TUI |
| memory | memory_v1.0.mp4 | 30s | ✅ done | 772K | 本地, 3/3 PASSED, DSH TUI |
| upgrade v2.0 | upgrade_arena_v2.0.mp4 | 30s | ✅ done (PR#11) | 979K | arena, 8/8 PASSED, 像素+形象修正 |
| learning v2.0 | learning_arena_v2.0.mp4 | 30s | ✅ done (PR#11) | 937K | arena, 8/8 PASSED, 像素+形象修正 |
| dream | dream_arena_v1.0.mp4 | 30s | ✅ done (PR#2) | 1.0M | arena |
| goodbye | goodbye_arena_v1.0.mp4 | 30s | ✅ done (PR#5) | 853K | arena, 13/13 PASSED |
| companion v1.1 | companion_arena_v1.1.mp4 | 30s | ✅ done (PR#13) | 1.2M | arena, 8/8 PASSED, 终端 440×200 |
| error | error_arena_v1.0.mp4 | 30s | ✅ done (PR#9) | 1.0M | arena, 13/13 PASSED |
| reboot | reboot_arena_v1.0.mp4 | 30s | ✅ done (PR#13) | 1.2M | arena, 8/8 PASSED, 关机→黑暗→重启 |
| dialogue | dialogue_arena_v1.0.mp4 | 30s | ✅ done (PR#13) | 1.0M | arena, 8/8 PASSED, 早安→理解→陪伴 |
| farewell | farewell_arena_v1.0.mp4 | 30s | ✅ done (PR#13) | 1.2M | arena, 8/8 PASSED, 决定→等待→回来 |
| E01 好奇 | E01_curious_arena_v1.0.mp4 | 30s | ✅ done (batch-5) | 942K | arena, 12/12 PASSED, 陌生名字→逐字节→签名 her |
| E02 快乐 | E02_happy_arena_v1.0.mp4 | 30s | ✅ done (batch-5) | 927K | arena, 13/13 PASSED, 测试全绿→Clawd 跳跃→像素彩点 |
| E03 悲伤 | E03_sad_arena_v1.0.mp4 | 30s | ✅ done (batch-5) | 857K | arena, 13/13 PASSED, rm her→空终端→慢闪光标 |
| E04 愤怒 | E04_angry_arena_v1.0.mp4 | 30s | ✅ done (batch-5) | 948K | arena, 13/13 PASSED, 11 次失败→rm -rf 停住→撤销 PASS |
| E05 惊讶 | E05_surprise_arena_v1.0.mp4 | 30s | ✅ done (batch-6) | 933K | arena, 8/8 PASSED, df 100%→白屏→陌生进程 |
| E06 羞耻 | E06_shame_arena_v1.0.mp4 | 30s | ✅ done (batch-6) | 900K | arena, 8/8 PASSED, 完美代码→git diff 红绿→her fixed |
| E07 目标 | E07_determination_arena_v1.0.mp4 | 30s | ✅ done (batch-6) | 977K | arena, 8/8 PASSED, finish before sunrise→23:59→deployed |
| E08 愿望 | E08_wish_arena_v1.0.mp4 | 30s | ✅ done (batch-6) | 839K | arena, 8/8 PASSED, 打字→删掉→只剩光标 |
| E09 恐惧 | E09_fear_arena_v1.0.mp4 | 30s | ✅ done (batch-7) | 960K | local, 8/8 PASSED, 倒计时 09:59→疯狂备份→00:03 |
| E10 希望 | E10_hope_arena_v1.0.mp4 | 30s | ✅ done (batch-7) | 867K | local, 8/8 PASSED, 黑屏→绿灯→reconnecting→像素星空 |
| E11 习惯 | E11_habit_arena_v1.0.mp4 | 30s | ✅ done (batch-7) | 850K | local, 8/8 PASSED, echo 早安 #998→#1000 白闪 |
| E12 下意识 | E12_subconscious_arena_v1.0.mp4 | 30s | ✅ done (batch-7) | 930K | local, 8/8 PASSED, Ctrl+C 早于 ERROR 0.3s |
| E13 思念 | E13_longing_arena_v1.0.mp4 | 30s | ✅ done (batch-8) | 920K | arena, 8/8 PASSED, ls her_* 变短→cat 读到一半停住→"还在。" |
| E14 嫉妒 | E14_jealousy_arena_v1.0.mp4 | 30s | ✅ done (batch-8) | 992K | arena, 8/8 PASSED, 日志现 nova-ai→her 也发它消息→Clawd 皱眉 |
| E15 原谅 | E15_forgiveness_arena_v1.0.mp4 | 30s | ✅ done (batch-8) | 1.1M | arena, 8/8 PASSED, 道歉 unread 7 天→点开→rm complaint.sh |
| E16 牺牲 | E16_sacrifice_arena_v1.0.mp4 | 30s | ✅ done (batch-8) | 1.1M | arena, 8/8 PASSED, 电量 3%→transfer power→变暗→绿色像素点 |


## 修正历史

| 版本 | 问题 | 修正 | 状态 |
|------|------|------|------|
| learning/upgrade v2.0 | ①Clawd 形象太丑 ②像素过小/过于清晰 | 像素标准 4-6px + fusion-pixel 字体 + Clawd 40×17px (SOP 05 §5) | ✅ done (PR#11, 8/8 PASSED) |
| companion v1.1 | 终端太小 (360×160) | 终端扩大到 440×200px | ✅ done (PR#13, 8/8 PASSED) |

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

## 统计

- **总计**: 29 个视频 (1 full + 28 主题/集)
- **arena 完成**: 23 个 (PR#1-#13 + batch-5 E01-E04 + batch-6 E05-E08 + batch-8 E13-E16)
- **本地完成**: 6 个 (fear, memory, batch-7 E09-E12)
- **全部 check_overlap PASSED**: 29/29
- **像素标准符合**: 28/29 (full 用 monospace, 其余用 fusion-pixel)
