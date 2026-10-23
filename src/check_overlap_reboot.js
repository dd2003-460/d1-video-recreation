#!/usr/bin/env node
'use strict';
const path = require('path');
const R = require('./render_reboot_arena');
const { run } = require('./check_overlap_story_common');
const ok = run(R, { reportPath: path.join(__dirname, '..', 'docs', 'reboot-v1', 'overlap-report.json') });
process.exit(ok ? 0 : 1);
