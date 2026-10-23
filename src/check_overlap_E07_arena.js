#!/usr/bin/env node
'use strict';
const path = require('path');
const R = require('./render_E07_determination_arena');
const { run } = require('./check_overlap_story_common');
const ok = run(R, { reportPath: path.join(__dirname, '..', 'docs', 'e07-v1', 'overlap-report.json') });
process.exit(ok ? 0 : 1);
