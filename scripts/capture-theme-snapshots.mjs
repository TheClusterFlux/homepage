/**
 * Capture PNG snapshots of theme preview ports (pre/post pulse experiments).
 * Requires: npx playwright install chromium (once)
 * Usage: node scripts/capture-theme-snapshots.mjs [outDir]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT = process.argv[2] || path.join('.tmp', 'theme-snapshots', new Date().toISOString().slice(0, 10));

const TARGETS = [
  { id: 'neural-terminal', port: 8091 },
  { id: 'crystal-cathedral', port: 8092 },
  { id: 'sakura-genome', port: 8093 },
  { id: 'void-opera', port: 8094 },
  { id: 'sibyl-index', port: 8095 },
  { id: 'lost-christmas', port: 8096 },
  { id: 'apocalypse-ring', port: 8097 },
  { id: 'sublevel-zero', port: 8098 },
  { id: 'seraph-static', port: 8099 },
  { id: 'dominator-lock', port: 8100 },
  { id: 'mwpsb-dossier', port: 8101 },
  { id: 'hue-spectrum', port: 8102 },
  { id: 'makishima-shelf', port: 8103 },
  { id: 'guilty-crown', port: 8080, path: '/' },
];

async function main() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch {
    console.error('Install Playwright: npx playwright install chromium');
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const t of TARGETS) {
    const url = `http://127.0.0.1:${t.port}${t.path || ''}`;
    const file = path.join(OUT, `${t.id}.png`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: file, fullPage: true });
      console.log('OK', file);
    } catch (e) {
      console.warn('SKIP', t.id, e.message);
    }
  }

  await browser.close();
  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify({ at: new Date().toISOString(), targets: TARGETS }, null, 2));
}

main();
