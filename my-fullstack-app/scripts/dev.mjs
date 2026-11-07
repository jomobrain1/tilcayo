import { spawn, spawnSync } from 'node:child_process';

const windows = process.platform === 'win32';
const children = ['api', 'client'].map(workspace => spawn('npm', ['run', 'dev', '--workspace', workspace], {
  stdio: 'inherit', shell: windows, windowsHide: true, detached: !windows,
}));
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (windows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  }
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code ?? 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
