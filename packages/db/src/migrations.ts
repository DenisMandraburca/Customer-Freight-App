import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import type { Database } from './client.js';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(srcDir, '..');
const configPath = path.join(packageRoot, 'prisma.config.ts');

let migrationsExecuted = false;

function resolvePrismaBin(): string {
  return process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
}

async function runPrismaCommand(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(resolvePrismaBin(), args, {
      cwd: packageRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Prisma command failed with exit code ${code}.`));
    });
  });
}

export async function runMigrations(_db?: Database): Promise<void> {
  if (migrationsExecuted || process.env.SKIP_DB_MIGRATIONS === 'true') {
    return;
  }

  await runPrismaCommand(['migrate', 'deploy', '--config', configPath]);
  migrationsExecuted = true;
}
