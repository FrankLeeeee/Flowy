#!/usr/bin/env node

import { parseArgs } from './config';
import { startDaemon } from './daemon';

const config = parseArgs(process.argv);

startDaemon(config).catch((err) => {
  console.error('Fatal error:', err.message ?? err);
  process.exit(1);
});
