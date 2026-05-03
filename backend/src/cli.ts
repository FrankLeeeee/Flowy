#!/usr/bin/env node

process.env.NODE_ENV = 'production';

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' || args[i] === '-p') {
    process.env.PORT = args[++i];
  } else if (args[i] === '--cors' || args[i].startsWith('--cors=')) {
    const value = args[i].startsWith('--cors=')
      ? args[i].slice('--cors='.length)
      : args[++i];
    if (!value || value.startsWith('-')) {
      console.error(
        'Error: --cors requires an explicit origin allowlist, e.g. --cors=https://app.example.com,https://other.example.com',
      );
      console.error('Reflecting arbitrary origins with credentials would expose the hub to CSRF.');
      process.exit(1);
    }
    process.env.CORS = value;
  }
}

import('./index');
