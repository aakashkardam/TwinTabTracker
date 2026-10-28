import { chromium } from 'playwright-core';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const extensionPath = resolve('dist/chrome');
const userDataDir = await mkdtemp(join(tmpdir(), 'ttt-cft-'));

let context;
try {
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });

  let worker = context.serviceWorkers()[0];
  if (!worker) {
    worker = await context.waitForEvent('serviceworker', { timeout: 20000 });
  }
  const extensionId = new URL(worker.url()).host;
  console.log(`service worker: ${worker.url()}`);

  await context.newPage().then((page) => page.goto('https://example.com'));
  await context.newPage().then((page) => page.goto('https://example.com'));
  await new Promise((resolve) => setTimeout(resolve, 500));

  const popup = await context.newPage();
  const popupErrors = [];
  popup.on('pageerror', (error) => popupErrors.push(String(error)));
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await popup.waitForSelector('text=TwinTabTracker', { timeout: 10000 });
  const popupText = await popup.locator('body').innerText();
  const search = popup.getByLabel('Search open tabs');
  await search.fill('example');
  const exampleResult = await popup.getByText('Example Domain').count();
  console.log('popup visible:', popupText.includes('TwinTabTracker'));
  console.log('popup search matched example.com:', exampleResult > 0);
  console.log('popup has counts:', /open tabs/i.test(popupText));
  console.log('popup duplicate extras:', popupText.match(/Duplicates\n(\d+)/)?.[1] ?? 'unknown');
  console.log('popup errors:', popupErrors.length ? popupErrors.join('\n') : 'none');
  await mkdir('docs/screenshots', { recursive: true });
  await popup.screenshot({ path: 'docs/screenshots/popup.png' });
  console.log('wrote docs/screenshots/popup.png');
  console.log('popup excerpt:\n', popupText.slice(0, 800));
  const cleanup = popup.getByRole('button', { name: /Clean up/ });
  if (await cleanup.isEnabled()) {
    await cleanup.click();
    await popup.waitForSelector('text=/Closed /', { timeout: 8000 });
    console.log('cleanup result:', (await popup.locator('body').innerText()).match(/Closed .*/)?.[0] ?? 'visible');
  } else {
    console.log('cleanup button disabled');
  }

  const dashboard = await context.newPage();
  const dashboardErrors = [];
  dashboard.on('pageerror', (error) => dashboardErrors.push(String(error)));
  await dashboard.goto(`chrome-extension://${extensionId}/src/dashboard/index.html`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await dashboard.waitForSelector('text=Overview', { timeout: 10000 });
  await dashboard.getByRole('button', { name: 'Duplicates' }).click();
  await dashboard.waitForSelector('text=Duplicate tabs', { timeout: 5000 });
  await dashboard.getByRole('button', { name: 'All tabs' }).click();
  await dashboard.waitForSelector('text=All tabs', { timeout: 5000 });
  await dashboard.getByRole('button', { name: 'Settings' }).click();
  await dashboard.waitForSelector('text=Protect pinned tabs', { timeout: 5000 });
  await dashboard.screenshot({ path: 'docs/screenshots/dashboard-settings.png' });
  console.log('dashboard navigation visible: true');
  console.log('dashboard errors:', dashboardErrors.length ? dashboardErrors.join('\n') : 'none');

  if (popupErrors.length || dashboardErrors.length) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Chrome smoke test failed:', error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
} finally {
  await context?.close().catch(() => undefined);
  await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
}
