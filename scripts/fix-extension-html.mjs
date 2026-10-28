import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { dirname, normalize, join as posixJoin, relative as posixRelative } from 'node:path/posix';

const root = process.argv[2];
if (!root) {
  console.error('Usage: node scripts/fix-extension-html.mjs <package-dir>');
  process.exit(1);
}

async function htmlFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await htmlFiles(abs, rel)));
    } else if (entry.name.endsWith('.html')) {
      files.push({ abs, rel });
    }
  }
  return files;
}

function toRootAsset(htmlRel, href) {
  if (href.startsWith('/')) {
    return normalize(href.slice(1));
  }
  return normalize(posixJoin(dirname(htmlRel), href));
}

function toRelative(htmlRel, assetFromRoot) {
  let rel = posixRelative(dirname(htmlRel), assetFromRoot);
  if (!rel.startsWith('.')) {
    rel = `./${rel}`;
  }
  return rel;
}

const files = await htmlFiles(root);
for (const file of files) {
  let html = await readFile(file.abs, 'utf8');
  html = html.replace(/\s+crossorigin(="[^"]*")?/g, '');
  html = html.replace(/(src|href)="([^"]+)"/g, (match, attr, href) => {
    if (href.startsWith('data:') || href.startsWith('http:') || href.startsWith('https:') || href.startsWith('#')) {
      return match;
    }
    const asset = toRootAsset(file.rel, href);
    return `${attr}="${toRelative(file.rel, asset)}"`;
  });
  await writeFile(file.abs, html);
  console.log(`fixed ${file.rel}`);
}
