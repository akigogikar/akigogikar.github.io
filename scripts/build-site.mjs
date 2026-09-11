// Static release artifact; excludes tests, internal notes, git, and knowledge inputs.
import { mkdir, copyFile, mkdtemp, rename, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
execFileSync(process.execPath, ['--test', 'scripts/check-ask-aki.test.mjs'], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, ['scripts/check-seo.mjs'], { cwd: root, stdio: 'inherit' });
const files = ['index.html', 'styles.css', 'jsonld.json', 'llms.txt', 'robots.txt', 'sitemap.xml', 'CNAME', 'press/index.html', 'assets/aki-gogikar.jpg', 'assets/favicon.svg', 'assets/og-image.jpg', 'assets/ask-aki.css', 'assets/ask-aki.js', 'assets/ask-aki-transport.mjs', 'assets/ask-aki-config.json', 'assets/analytics.css', 'assets/analytics.js', 'privacy/index.html'];
await mkdir(path.join(root, 'dist'), { recursive: true });
const staging = await mkdtemp(path.join(root, 'dist', 'build-'));
for (const file of files) {
  await access(path.join(root, file));
  await mkdir(path.dirname(path.join(staging, file)), { recursive: true });
  await copyFile(path.join(root, file), path.join(staging, file));
}
// Timestamped artifacts avoid deleting or overwriting a prior owner build.
const output = path.join(root, 'dist', `site-${Date.now()}`);
await rename(staging, output);
console.log(`Built ${files.length} public files: ${output}`);
console.log('Not deployed. Public embed configuration remains approval-gated.');
