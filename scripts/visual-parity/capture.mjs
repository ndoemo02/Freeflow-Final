#!/usr/bin/env node

import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const configPath = path.join(scriptDir, 'parity.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const out = { selftest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--selftest') out.selftest = true;
    else if (value.startsWith('--')) {
      const key = value.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      invariant(index + 1 < argv.length, `Missing value for ${value}`);
      out[key] = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unexpected argument: ${value}`);
    }
  }
  return out;
}

function git(args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '-');
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function reachable(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
    return response.status < 500;
  } catch {
    return false;
  }
}

async function waitForServer(url, child, logs) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Vite exited before readiness (${child.exitCode}).\n${logs.join('')}`);
    }
    if (await reachable(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`Timed out waiting for ${url}.\n${logs.join('')}`);
}

async function startVite(baseUrl) {
  invariant(!(await reachable(baseUrl)), `Configured URL is already occupied: ${baseUrl}`);
  const url = new URL(baseUrl);
  const viteBin = path.join(repoRoot, 'node_modules', 'vite', 'bin', 'vite.js');
  invariant(fs.existsSync(viteBin), `Vite executable missing: ${viteBin}`);

  const logs = [];
  const child = spawn(process.execPath, [
    viteBin,
    '--host', url.hostname,
    '--port', url.port,
    '--strictPort',
  ], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const collect = (chunk) => {
    logs.push(chunk.toString());
    if (logs.length > 80) logs.shift();
  };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  await waitForServer(baseUrl, child, logs);
  return child;
}

async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

function storageInit({ cartMode = 'unchanged' } = {}) {
  try {
    localStorage.setItem('ff-demo-disclosure-v1', '1');
    localStorage.setItem('amber-session-id', 'sess_visual_parity_baseline');
    if (cartMode === 'empty') {
      localStorage.removeItem('freeflow_cart');
      localStorage.removeItem('freeflow_cart_restaurant');
      localStorage.removeItem('freeflow_cart_session');
    }
    if (cartMode === 'filled') {
      localStorage.setItem('freeflow_cart', JSON.stringify([{
        id: 'visual-parity-item',
        menu_item_id: 'visual-parity-item',
        name: 'Visual parity fixture',
        quantity: 1,
        qty: 1,
        price: 1,
        price_pln: 1,
      }]));
      localStorage.setItem('freeflow_cart_restaurant', JSON.stringify({
        id: 'visual-parity-restaurant',
        name: 'Visual parity fixture',
      }));
      localStorage.setItem('freeflow_cart_session', 'sess_visual_parity_baseline');
    }
  } catch {
    // Browser storage can be unavailable on an initial opaque document.
  }
}

async function settlePage(page, settleMs) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await Promise.all(Array.from(document.images).map(async (image) => {
      if (image.complete) return;
      await Promise.race([
        image.decode?.().catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    }));
  });
  await page.addStyleTag({
    content: '*,*::before,*::after{caret-color:transparent!important;animation-play-state:paused!important}',
  });
  await page.waitForTimeout(settleMs);
}

async function openDrawer(page) {
  const selectors = [
    'button[aria-label="Menu"]',
    'button[aria-label="Otwórz menu"]',
    'button[aria-label*="menu" i]',
    '.hamburger',
    '.menu-btn',
    '.cp-mobile-header button',
  ];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      try {
        if (await locator.isVisible()) {
          await locator.click({ timeout: 2500 });
          return true;
        }
      } catch {
        // Continue to the next stable selector.
      }
    }
  }
  return false;
}

async function focusProbe(page) {
  const probes = [];
  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Tab');
    probes.push(await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return null;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName.toLowerCase(),
        label: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 80),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
        visible: rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight,
      };
    }));
  }
  return probes;
}

async function diagnostics(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const selectorFor = (element) => {
      if (element.hasAttribute('data-primary-nav')) return '[data-primary-nav]';
      if (element.hasAttribute('data-app-drawer')) return '[data-app-drawer]';
      if (element.id) return `#${CSS.escape(element.id)}`;
      const classes = Array.from(element.classList).slice(0, 2).map((name) => `.${CSS.escape(name)}`).join('');
      return `${element.tagName.toLowerCase()}${classes}`;
    };

    const all = Array.from(document.querySelectorAll('*'));
    const controls = all.filter((element) => (
      ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)
      || element.getAttribute('role') === 'button'
    ) && visible(element));
    const tapSizes = controls.map((element) => {
      const rect = element.getBoundingClientRect();
      return Math.min(rect.width, rect.height);
    });
    const fixed = all.filter((element) => {
      const position = getComputedStyle(element).position;
      return (position === 'fixed' || position === 'sticky') && visible(element);
    }).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        selector: selectorFor(element),
        position: getComputedStyle(element).position,
        zIndex: getComputedStyle(element).zIndex,
        rect: [rect.x, rect.y, rect.width, rect.height].map((value) => Math.round(value * 10) / 10),
      };
    });
    const infiniteAnimations = all.filter((element) => {
      const style = getComputedStyle(element);
      return style.animationIterationCount.split(',').some((value) => value.trim() === 'infinite')
        && style.animationDuration.split(',').some((value) => value.trim() !== '0s');
    }).length;
    const numericZIndex = all.filter((element) => /^-?\d+$/.test(getComputedStyle(element).zIndex)).length;
    const primaryNav = document.querySelector('[data-primary-nav]');
    const drawer = document.querySelector('[data-app-drawer]');
    let primaryNavDrawerOverlap = false;
    if (primaryNav && drawer && visible(primaryNav) && visible(drawer)) {
      const a = primaryNav.getBoundingClientRect();
      const b = drawer.getBoundingClientRect();
      primaryNavDrawerOverlap = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    }
    return {
      path: `${location.pathname}${location.search}`,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      h1Count: document.querySelectorAll('h1').length,
      primaryNavCount: document.querySelectorAll('[data-primary-nav]').length,
      appDrawerCount: document.querySelectorAll('[data-app-drawer]').length,
      primaryNavDrawerOverlap,
      controlCount: controls.length,
      minimumTapTarget: tapSizes.length ? Math.round(Math.min(...tapSizes) * 10) / 10 : null,
      smallTapTargetCount: tapSizes.filter((size) => size < 44).length,
      infiniteAnimations,
      numericZIndex,
      fixed,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
}

async function captureEntry({ browser, baseUrl, outputDir, entry, viewport, settleMs, action }) {
  const reducedMotion = action === 'reduced-motion' ? 'reduce' : 'no-preference';
  const cartMode = action === 'cart-empty' ? 'empty' : action === 'cart-filled' ? 'filled' : 'unchanged';
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.mobile,
    hasTouch: viewport.mobile,
    locale: 'pl-PL',
    reducedMotion,
  });
  await context.addInitScript(storageInit, { cartMode });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500));
  });
  page.on('pageerror', (error) => consoleErrors.push(`PAGEERROR: ${String(error).slice(0, 500)}`));

  try {
    await page.goto(`${baseUrl}${entry.path}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await settlePage(page, settleMs);
    let actionResult = null;
    if (action === 'open-drawer') {
      actionResult = { opened: await openDrawer(page) };
      await page.waitForTimeout(350);
    } else if (action === 'focus-probe') {
      actionResult = { focusProbe: await focusProbe(page) };
    }

    const currentUrl = new URL(page.url());
    const landed = `${currentUrl.pathname}${currentUrl.search}`;
    const file = `${safeName(entry.name)}__${viewport.name}.png`;
    const filePath = path.join(outputDir, file);
    await page.screenshot({ path: filePath, fullPage: false, animations: 'disabled' });
    const structure = await diagnostics(page);
    return {
      key: `${entry.name}@${viewport.name}`,
      file,
      sha256: sha256(filePath),
      requested: entry.path,
      landed,
      redirected: landed !== entry.path,
      viewport: viewport.name,
      auth: entry.auth || 'public',
      action: action || null,
      actionResult,
      consoleErrors,
      structure,
    };
  } finally {
    await context.close();
  }
}

function runSelftest() {
  const parsed = parseArgs(['--tag', 'baseline', '--commit', 'abc', '--output', 'C:/tmp/out']);
  invariant(parsed.tag === 'baseline' && parsed.commit === 'abc', 'argument parser failed');
  invariant(config.routes.length === 8, 'expected exactly eight baseline routes');
  invariant(config.viewports.length === 5, 'expected exactly five viewports');
  invariant(config.clientSections.length === 8, 'expected all eight ClientPanel sections');
  invariant(config.interactionStates.length === 6, 'expected six interaction states');
  invariant(!isInside(repoRoot, path.resolve(config.artifactRoot)), 'artifactRoot must remain outside the repository');
  invariant(safeName('a/b c') === 'a-b-c', 'safe filename normalization failed');
  console.log('capture.mjs selftest PASS');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selftest) {
    runSelftest();
    return;
  }

  invariant(args.tag, '--tag is required');
  invariant(args.commit, '--commit is required');
  const head = git(['rev-parse', 'HEAD']);
  const requestedCommit = git(['rev-parse', `${args.commit}^{commit}`]);
  invariant(requestedCommit === head, `Commit guard failed: requested ${requestedCommit}, HEAD ${head}`);

  const tag = safeName(args.tag);
  const outputDir = path.resolve(args.output || path.join(config.artifactRoot, tag, head));
  invariant(!isInside(repoRoot, outputDir), `Capture output must be outside the repository: ${outputDir}`);
  invariant(!fs.existsSync(outputDir), `Capture output already exists: ${outputDir}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const baseUrl = args.baseUrl || config.baseUrl;
  let server = null;
  let browser = null;
  try {
    if (!args.baseUrl) server = await startVite(baseUrl);
    else invariant(await reachable(baseUrl), `Explicit base URL is not reachable: ${baseUrl}`);
    browser = await chromium.launch();
    const chromiumVersion = browser.version();
    const screenshots = [];

    for (const viewport of config.viewports) {
      for (const route of config.routes) {
        screenshots.push(await captureEntry({
          browser,
          baseUrl,
          outputDir,
          entry: route,
          viewport,
          settleMs: config.settleMs,
          action: null,
        }));
      }
    }

    const stateViewport = config.viewports.find((item) => item.name === '390x844');
    invariant(stateViewport, '390x844 state viewport missing');
    for (const section of config.clientSections) {
      screenshots.push(await captureEntry({
        browser,
        baseUrl,
        outputDir,
        entry: {
          name: `client-section-${section}`,
          path: `/panel/client?section=${encodeURIComponent(section)}`,
          auth: 'public',
        },
        viewport: stateViewport,
        settleMs: config.settleMs,
        action: null,
      }));
    }
    for (const state of config.interactionStates) {
      screenshots.push(await captureEntry({
        browser,
        baseUrl,
        outputDir,
        entry: { name: state.name, path: state.path, auth: 'public' },
        viewport: stateViewport,
        settleMs: config.settleMs,
        action: state.action,
      }));
    }

    const baselineSha = args.tag === 'baseline'
      ? head
      : git(['rev-parse', 'checkpoint/ui-polish-baseline^{commit}']);
    const toolingSha = git(['log', '-1', '--format=%H', '--', 'scripts/visual-parity/capture.mjs']);
    const diagnosticsFile = path.join(outputDir, 'diagnostics.json');
    fs.writeFileSync(diagnosticsFile, `${JSON.stringify(
      Object.fromEntries(screenshots.map((item) => [item.key, item.structure])),
      null,
      2,
    )}\n`);

    const manifest = {
      schemaVersion: 1,
      tag: args.tag,
      baselineSha,
      toolingSha,
      candidateSha: head,
      capturedAt: new Date().toISOString(),
      baseUrl,
      playwrightVersion: JSON.parse(fs.readFileSync(path.join(repoRoot, 'node_modules', 'playwright', 'package.json'), 'utf8')).version,
      chromiumVersion,
      configSha256: sha256(configPath),
      diagnosticsSha256: sha256(diagnosticsFile),
      viewports: config.viewports,
      routes: config.routes,
      capturedStates: [
        ...config.clientSections.map((section) => `client-section:${section}`),
        ...config.interactionStates.map((state) => state.name),
        'auth:logged-out',
      ],
      deferredStates: [
        'auth:staff_access-test-account',
        'auth:internal_admin-test-account',
        'voice:6-runtime-states',
      ],
      screenshots,
    };
    const manifestPath = path.join(outputDir, 'MANIFEST.json');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`CAPTURE PASS: ${screenshots.length} screenshots`);
    console.log(`OUTPUT=${outputDir}`);
    console.log(`MANIFEST=${manifestPath}`);
  } finally {
    if (browser) await browser.close();
    await stopChild(server);
  }
}

main().catch((error) => {
  console.error(`CAPTURE FAILED: ${error.stack || error.message || error}`);
  process.exitCode = 1;
});
