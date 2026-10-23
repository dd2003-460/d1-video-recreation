#!/usr/bin/env node
'use strict';
// src/check_overlap_upgrade_v2.js — 「Clawd 的升级」v2.0 重叠 + 截断 + 像素标准检测
//
// 覆盖：
//   1. 房间前景层：终端、思考泡泡、Clawd（含 ±2px 浮动/挺胸包络）、Her、便签、字幕栏
//   2. 终端标题栏：红黄绿三个圆点 × 标题文字（360×20 内）
//   3. 终端内容区：U1 命令/进度条/脚注、U2 五步日志 + 行尾 ✓、U3 完成行 + 脚注、状态行
//   4. 思考泡泡 / 便签 / 字幕栏内部元素
//   5. 像素层：2× 最近邻、文本无抗锯齿、Fusion Pixel 10px 点阵、Clawd 40×17 + 4×4 眼睛 + 表情、Her 16×28 槽位
//
// 用法: node src/check_overlap_upgrade_v2.js     (0 issues → exit 0)

const U = require('./render_upgrade_arena_v2');
const { run } = require('./check_overlap_v2_common');

const path = require('path');

const ok = run(U, { reportPath: path.join(__dirname, '..', 'docs', 'upgrade-v2', 'overlap-report.json') });
process.exit(ok ? 0 : 1);
