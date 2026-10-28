import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist/chrome';

async function walk(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const rows = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      rows.push(...(await walk(join(dir, entry.name), rel)));
    } else {
      const info = await stat(join(dir, entry.name));
      rows.push({ path: rel, bytes: info.size });
    }
  }
  return rows;
}

const files = await walk(root);
const manifestRaw = await readFile(join(root, 'manifest.json'), 'utf8');
const manifest = JSON.parse(manifestRaw);

console.log(`Package: ${root}`);
console.log(`Files: ${files.length}`);
console.log(`Bytes: ${files.reduce((sum, file) => sum + file.bytes, 0)}`);
console.log(`Manifest version: ${manifest.manifest_version}`);
console.log(`Name: ${manifest.name} ${manifest.version}`);
console.log(`Permissions: ${(manifest.permissions ?? []).join(', ') || '(none)'}`);
console.log(`Host permissions: ${(manifest.host_permissions ?? []).join(', ') || '(none)'}`);
console.log('Contents:');
for (const file of files) {
  console.log(`  ${file.path} (${file.bytes} bytes)`);
}

const required = ['manifest.json', 'icons/icon16.png', 'icons/icon48.png', 'icons/icon128.png'];
const missing = required.filter((name) => !files.some((file) => file.path === name));
if (missing.length > 0) {
  console.error(`Missing required files: ${missing.join(', ')}`);
  process.exit(1);
}

if (manifest.content_scripts) {
  console.error('Unexpected content_scripts in production manifest.');
  process.exit(1);
}
if (manifest.host_permissions?.length) {
  console.error('Unexpected host_permissions in production manifest.');
  process.exit(1);
}

const htmlFiles = files.filter((file) => file.path.endsWith('.html'));
for (const file of htmlFiles) {
  const html = await readFile(join(root, file.path), 'utf8');
  if (html.includes('src="/') || html.includes('href="/')) {
    console.error(`${file.path} still contains root-absolute asset paths.`);
    process.exit(1);
  }
}
