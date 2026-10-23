#!/usr/bin/env node
'use strict';
const path = require('path');
const R = require('./render_E06_shame_arena');
const { run } = require('./check_overlap_story_common');
const ok = run(R, { reportPath: path.join(__dirname, '..', 'docs', 'e06-v1', 'overlap-report.json') });
process.exit(ok ? 0 : 1);
