// Postinstall: coba `prisma generate` asli; jika gagal (mis. binary tidak
// bisa diunduh karena jaringan), pasang shim typing lokal agar `next build`
// tetap lolos type-check. Di Vercel generate selalu berhasil sehingga shim
// tidak dipakai.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

try {
  execSync('npx prisma generate', { cwd: root, stdio: 'inherit' });
  console.log('[simora] prisma generate OK');
} catch {
  console.warn('[simora] prisma generate gagal — memakai shim typing lokal.');
  const shim = join(root, 'types', 'prisma-client.shim.d.ts');
  const dir = join(root, 'node_modules', '.prisma', 'client');
  if (existsSync(shim) && existsSync(dir)) {
    for (const f of ['default.d.ts', 'index.d.ts', 'edge.d.ts', 'wasm.d.ts']) {
      copyFileSync(shim, join(dir, f));
    }
    console.log('[simora] shim typing dipasang.');
  } else {
    console.warn('[simora] shim atau direktori client tidak ditemukan; build mungkin gagal.');
  }
}
