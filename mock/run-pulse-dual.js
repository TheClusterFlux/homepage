/**
 * Start void-resonance (8099), mesh-echo (8100), and dual showcase (8101).
 */
const { spawn } = require('child_process');
const path = require('path');

const mockDir = __dirname;
const repoRoot = path.join(mockDir, '..');

const procs = [
  { script: 'cluster-pulse/server.js', label: 'void-resonance :8099' },
  { script: 'cluster-pulse-beta/server.js', label: 'mesh-echo :8100' },
  { script: 'cluster-pulse-showcase/server.js', label: 'showcase :8101' },
];

for (const p of procs) {
  const child = spawn(process.execPath, [path.join(mockDir, p.script)], {
    stdio: 'inherit',
    cwd: repoRoot,
  });
  child.on('exit', (code) => {
    console.error(`[pulse-dual] ${p.label} exited (${code})`);
    process.exit(code ?? 1);
  });
}

console.log('Open http://127.0.0.1:8101 for both pulses side-by-side');
