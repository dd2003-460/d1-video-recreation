#!/usr/bin/env node
'use strict';
// src/check_overlap_learning_v2.js — 「Clawd 的学习」v2.0 重叠 + 截断 + 像素标准检测
//
// 覆盖：
//   1. 房间前景层：终端、消息气泡、思考泡泡、Clawd（含 ±1px 浮动包络）、Her、便签、字幕栏
//   2. 终端标题栏：红黄绿三个圆点 × 标题文字（360×20 内）
//   3. 终端内容区：L1/L2/L3 全部文本行、三条进度条与标签、底部状态行（356×140 内，左右 ≥8px 留白）
//   4. 气泡 / 思考泡泡 / 便签 / 字幕栏内部元素
//   5. 像素层：2× 最近邻、文本无抗锯齿、Fusion Pixel 10px 点阵、Clawd 40×17 + 4×4 眼睛 + 3 表情、Her 16×28
//
// 用法: node src/check_overlap_learning_v2.js     (0 issues → exit 0)

const L = require('./render_learning_arena_v2');
const { run } = require('./check_overlap_v2_common');

const path = require('path');

const ok = run(L, { reportPath: path.join(__dirname, '..', 'docs', 'learning-v2', 'overlap-report.json') });
process.exit(ok ? 0 : 1);
