'use strict';

/**
 * start-all.js
 * Spawns all four processes (3 services + gateway) in one terminal.
 * Each process's stdout/stderr is prefixed with its name for clarity.
 */
const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

const processes = [
  { name: 'user-service',    script: 'services/user-service/index.js',    color: '\x1b[36m' },
  { name: 'product-service', script: 'services/product-service/index.js', color: '\x1b[35m' },
  { name: 'order-service',   script: 'services/order-service/index.js',   color: '\x1b[33m' },
  { name: 'gateway',         script: 'gateway/server.js',                 color: '\x1b[32m' },
];

function prefix(name, color) {
  return `${color}[${name}]\x1b[0m `;
}

processes.forEach(({ name, script, color }) => {
  const proc = spawn('node', [path.join(root, script)], { cwd: root });

  proc.stdout.on('data', d =>
    process.stdout.write(prefix(name, color) + d.toString())
  );
  proc.stderr.on('data', d =>
    process.stderr.write(prefix(name, color) + d.toString())
  );
  proc.on('exit', code =>
    console.log(`${prefix(name, color)}exited with code ${code}`)
  );
});

console.log('Starting all services... (Ctrl+C to stop)\n');
