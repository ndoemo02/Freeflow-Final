#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const config = JSON.parse(fs.readFileSync(path.join(scriptDir, 'parity.config.json'), 'utf8'));
const expectedRegions = JSON.parse(fs.readFileSync(path.join(scriptDir, 'expected-regions.json'), 'utf8'));

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

function readManifest(directory) {
  const manifestPath = path.join(directory, 'MANIFEST.json');
  invariant(fs.existsSync(manifestPath), `Manifest missing: ${manifestPath}`);
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function regionApplies(region, screenshot) {
  if (region.viewport && region.viewport !== screenshot.viewport) return false;
  if (Array.isArray(region.keys) && !region.keys.includes(screenshot.key)) return false;
  return true;
}

function classificationFor(pixel, structuralRegression) {
  if (structuralRegression) return 'REGRESSION';
  if (pixel.dimensionMismatch) return 'REGRESSION';
  if (pixel.changedOutside === 0) return 'EXPECTED';
  if (pixel.outsideRatio <= config.driftRatio) return 'DRIFT';
  return 'REGRESSION';
}

function rectChanged(a, b, tolerance = 1) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return true;
  return a.some((value, index) => Math.abs(value - b[index]) > tolerance);
}

function structuralRegressions(baseline, current, declaredFixedChanges) {
  const issues = [];
  if (!baseline || !current) return ['missing structural diagnostics'];
  if (current.horizontalOverflow && !baseline.horizontalOverflow) issues.push('new horizontal overflow');
  if (current.primaryNavDrawerOverlap && !baseline.primaryNavDrawerOverlap) issues.push('new primary-nav/drawer overlap');
  if (current.numericZIndex > baseline.numericZIndex) issues.push(`numeric z-index increased ${baseline.numericZIndex} -> ${current.numericZIndex}`);
  if (current.h1Count !== baseline.h1Count) issues.push(`h1 count changed ${baseline.h1Count} -> ${current.h1Count}`);
  if (current.primaryNavCount !== baseline.primaryNavCount && !declaredFixedChanges.has('[data-primary-nav]')) {
    issues.push(`primary nav count changed ${baseline.primaryNavCount} -> ${current.primaryNavCount}`);
  }
  if (
    current.minimumTapTarget !== null
    && baseline.minimumTapTarget !== null
    && current.minimumTapTarget < baseline.minimumTapTarget
    && current.minimumTapTarget < 44
  ) {
    issues.push(`minimum tap target regressed ${baseline.minimumTapTarget} -> ${current.minimumTapTarget}`);
  }
  if (current.infiniteAnimations > baseline.infiniteAnimations) {
    issues.push(`infinite animations increased ${baseline.infiniteAnimations} -> ${current.infiniteAnimations}`);
  }

  const groupFixed = (items) => {
    const grouped = new Map();
    for (const item of items || []) {
      const group = grouped.get(item.selector) || [];
      group.push(item);
      grouped.set(item.selector, group);
    }
    return grouped;
  };
  const baselineFixed = groupFixed(baseline.fixed);
  const currentFixed = groupFixed(current.fixed);
  const selectors = new Set([...baselineFixed.keys(), ...currentFixed.keys()]);
  for (const selector of selectors) {
    if (declaredFixedChanges.has(selector)) continue;
    const before = baselineFixed.get(selector) || [];
    const after = currentFixed.get(selector) || [];
    if (before.length !== after.length) {
      issues.push(`fixed count changed for ${selector}: ${before.length} -> ${after.length}`);
      continue;
    }
    for (let index = 0; index < before.length; index += 1) {
      if (rectChanged(before[index].rect, after[index].rect)) {
        issues.push(`undeclared fixed geometry changed for ${selector}`);
        break;
      }
    }
  }
  return issues;
}

async function comparePng(page, baselinePath, currentPath, regions, threshold) {
  const baselineData = fs.readFileSync(baselinePath).toString('base64');
  const currentData = fs.readFileSync(currentPath).toString('base64');
  return page.evaluate(async ({ baselineData, currentData, regions, threshold }) => {
    const load = async (base64) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      return {
        width: canvas.width,
        height: canvas.height,
        data: context.getImageData(0, 0, canvas.width, canvas.height).data,
      };
    };
    const before = await load(baselineData);
    const after = await load(currentData);
    if (before.width !== after.width || before.height !== after.height) {
      return {
        dimensionMismatch: true,
        baselineSize: [before.width, before.height],
        currentSize: [after.width, after.height],
        changedInside: 0,
        changedOutside: before.width * before.height,
        outsidePixels: before.width * before.height,
        outsideRatio: 1,
      };
    }
    const insideExpected = (x, y) => regions.some(({ box }) => (
      Array.isArray(box)
      && box.length === 4
      && x >= box[0]
      && y >= box[1]
      && x < box[2]
      && y < box[3]
    ));
    let changedInside = 0;
    let changedOutside = 0;
    let outsidePixels = 0;
    for (let y = 0; y < before.height; y += 1) {
      for (let x = 0; x < before.width; x += 1) {
        const expected = insideExpected(x, y);
        if (!expected) outsidePixels += 1;
        const offset = (y * before.width + x) * 4;
        let changed = false;
        for (let channel = 0; channel < 4; channel += 1) {
          if (Math.abs(before.data[offset + channel] - after.data[offset + channel]) > threshold) {
            changed = true;
            break;
          }
        }
        if (changed && expected) changedInside += 1;
        if (changed && !expected) changedOutside += 1;
      }
    }
    return {
      dimensionMismatch: false,
      baselineSize: [before.width, before.height],
      currentSize: [after.width, after.height],
      changedInside,
      changedOutside,
      outsidePixels,
      outsideRatio: outsidePixels ? changedOutside / outsidePixels : 0,
    };
  }, { baselineData, currentData, regions, threshold });
}

function runSelftest() {
  const parsed = parseArgs(['--baseline', 'a', '--current', 'b', '--batch', '2b']);
  invariant(parsed.baseline === 'a' && parsed.current === 'b' && parsed.batch === '2b', 'argument parser failed');
  invariant(classificationFor({ dimensionMismatch: false, changedOutside: 0, outsideRatio: 0 }, false) === 'EXPECTED', 'EXPECTED classification failed');
  invariant(classificationFor({ dimensionMismatch: false, changedOutside: 1, outsideRatio: 0.001 }, false) === 'DRIFT', 'DRIFT classification failed');
  invariant(classificationFor({ dimensionMismatch: false, changedOutside: 10, outsideRatio: 0.01 }, false) === 'REGRESSION', 'pixel regression classification failed');
  invariant(classificationFor({ dimensionMismatch: false, changedOutside: 0, outsideRatio: 0 }, true) === 'REGRESSION', 'structural regression classification failed');
  const issues = structuralRegressions(
    { horizontalOverflow: false, primaryNavDrawerOverlap: false, numericZIndex: 1, h1Count: 1, primaryNavCount: 1, minimumTapTarget: 44, infiniteAnimations: 0, fixed: [{ selector: 'nav', rect: [0, 0, 10, 10] }] },
    { horizontalOverflow: false, primaryNavDrawerOverlap: false, numericZIndex: 1, h1Count: 1, primaryNavCount: 1, minimumTapTarget: 44, infiniteAnimations: 0, fixed: [{ selector: 'nav', rect: [0, 0, 11, 10] }] },
    new Set(),
  );
  invariant(issues.length === 0, 'fixed tolerance selftest failed');
  console.log('compare.mjs selftest PASS');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selftest) {
    runSelftest();
    return;
  }
  invariant(args.baseline, '--baseline is required');
  invariant(args.current, '--current is required');
  invariant(args.batch, '--batch is required');

  const baselineDir = path.resolve(args.baseline);
  const currentDir = path.resolve(args.current);
  const baselineManifest = readManifest(baselineDir);
  const currentManifest = readManifest(currentDir);
  const currentHead = git(['rev-parse', 'HEAD']);
  const expectedBaselineSha = git(['rev-parse', `${args.baselineCommit || 'checkpoint/ui-polish-baseline'}^{commit}`]);

  invariant(baselineManifest.baselineSha === expectedBaselineSha, 'Baseline manifest SHA does not match the immutable baseline ref');
  invariant(baselineManifest.candidateSha === expectedBaselineSha, 'Baseline capture was not produced from the baseline commit');
  invariant(currentManifest.baselineSha === expectedBaselineSha, 'Candidate manifest references a different baseline');
  invariant(currentManifest.candidateSha === currentHead, `Candidate manifest SHA ${currentManifest.candidateSha} does not match HEAD ${currentHead}`);

  const baselineScreens = new Map(baselineManifest.screenshots.map((item) => [item.key, item]));
  const currentScreens = new Map(currentManifest.screenshots.map((item) => [item.key, item]));
  const allKeys = new Set([...baselineScreens.keys(), ...currentScreens.keys()]);
  const batch = expectedRegions.batches?.[args.batch] || {};
  const declaredFixedChanges = new Set(batch.declaredFixedChanges || []);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const results = [];
  try {
    for (const key of [...allKeys].sort()) {
      const baseline = baselineScreens.get(key);
      const current = currentScreens.get(key);
      if (!baseline || !current) {
        results.push({ key, classification: 'REGRESSION', issues: ['screenshot missing from one manifest'] });
        continue;
      }
      const baselinePath = path.join(baselineDir, baseline.file);
      const currentPath = path.join(currentDir, current.file);
      invariant(fs.existsSync(baselinePath), `Baseline screenshot missing: ${baselinePath}`);
      invariant(fs.existsSync(currentPath), `Candidate screenshot missing: ${currentPath}`);
      invariant(sha256(baselinePath) === baseline.sha256, `Baseline screenshot checksum mismatch: ${key}`);
      invariant(sha256(currentPath) === current.sha256, `Candidate screenshot checksum mismatch: ${key}`);
      const regions = (batch.regions || []).filter((region) => regionApplies(region, current));
      const pixel = await comparePng(page, baselinePath, currentPath, regions, config.pixelChannelThreshold);
      const issues = structuralRegressions(baseline.structure, current.structure, declaredFixedChanges);
      results.push({
        key,
        classification: classificationFor(pixel, issues.length > 0),
        pixel: { ...pixel, outsideRatio: Number(pixel.outsideRatio.toFixed(8)) },
        expectedRegions: regions.map((region) => region.name),
        issues,
      });
    }
  } finally {
    await browser.close();
  }

  const summary = results.reduce((accumulator, result) => {
    accumulator[result.classification] = (accumulator[result.classification] || 0) + 1;
    return accumulator;
  }, { EXPECTED: 0, DRIFT: 0, REGRESSION: 0 });
  const report = {
    schemaVersion: 1,
    batch: args.batch,
    baselineSha: expectedBaselineSha,
    candidateSha: currentHead,
    comparedAt: new Date().toISOString(),
    summary,
    results,
  };
  const reportPath = path.join(currentDir, 'COMPARE.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(summary));
  console.log(`REPORT=${reportPath}`);
  if (summary.REGRESSION > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`COMPARE FAILED: ${error.stack || error.message || error}`);
  process.exitCode = 1;
});
