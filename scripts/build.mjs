/**
 * Build with esbuild (transpile only). Avoids type-checking node_modules/ox
 * so the build passes on Railway/Vercel without TS errors from dependencies.
 */
import * as esbuild from 'esbuild';
import { readdir, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

async function build() {
  await mkdir(join(root, 'dist'), { recursive: true });
  await esbuild.build({
    entryPoints: [join(root, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: join(root, 'dist', 'index.js'),
    packages: 'external',
    sourcemap: true,
    target: 'node18',
  });
  console.log('Build done: dist/index.js');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
