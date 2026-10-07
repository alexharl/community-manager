// Startet Backend und Frontend parallel mit farbigem Präfix je Zeile (Ersatz für `concurrently`).
import { spawn } from 'node:child_process';

const tasks = [
  { name: 'backend', color: 34, workspace: '@cm/backend' },
  { name: 'frontend', color: 35, workspace: '@cm/frontend' },
];

let stopping = false;

const children = tasks.map(({ name, color, workspace }) => {
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  // shell: true, damit npm(.cmd) auch unter Windows gefunden wird
  const child = spawn(`npm run dev -w ${workspace}`, {
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  for (const stream of [child.stdout, child.stderr]) {
    let buffer = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) process.stdout.write(`${prefix}${line}\n`);
    });
  }

  child.on('exit', (code) => {
    if (!stopping) console.log(`${prefix}beendet (Code ${code ?? 0}) – stoppe alle Prozesse`);
    shutdown(code ?? 0);
  });
  return child;
});

function shutdown(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
