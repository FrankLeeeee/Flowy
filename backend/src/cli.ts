#!/usr/bin/env node

process.env.NODE_ENV = 'production';

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' || args[i] === '-p') {
    process.env.PORT = args[++i];
  } else if (args[i] === '--cors') {
    process.env.CORS = '1';
  }
}

import('./index');
