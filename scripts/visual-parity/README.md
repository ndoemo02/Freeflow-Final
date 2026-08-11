# FreeFlow visual parity harness

Local, post-build visual regression tooling for the Nocturnal Hospitality UI programme. It captures the existing product honestly: protected routes are recorded as redirects until dedicated test accounts are supplied. It never injects production credentials.

## Safety contract

- Capture refuses to run unless `--commit` resolves to the current worktree `HEAD`.
- Baseline artifacts live outside Git under `C:\Firerfox Portable\Freeflow brain\.ui-parity`.
- Capture refuses an output directory inside the repository.
- A pre-existing server on the configured port is rejected to avoid photographing another checkout.
- `compare.mjs` validates the immutable baseline tag separately from the candidate `HEAD`.
- A changed fixed-position bounding box is a regression unless its selector is declared for the batch.
- No SQL, backend request mutation, deployment, push, or production account is involved.

## Baseline

```powershell
$sha = (git rev-parse HEAD).Trim()
node scripts/visual-parity/capture.mjs --tag baseline --commit $sha
```

The command starts the local Vite server on `127.0.0.1:5199`, captures eight routes across five viewports, captures all eight ClientPanel sections at `390x844`, and records drawer, focus, reduced-motion, and cart states. The manifest records redirects, console errors, structural diagnostics, browser versions, and SHA-256 checksums.

## Candidate and comparison

```powershell
$sha = (git rev-parse HEAD).Trim()
node scripts/visual-parity/capture.mjs --tag batch-1a --commit $sha
node scripts/visual-parity/compare.mjs `
  --baseline "C:\Firerfox Portable\Freeflow brain\.ui-parity\baseline\<BASELINE_SHA>" `
  --current  "C:\Firerfox Portable\Freeflow brain\.ui-parity\batch-1a\<CANDIDATE_SHA>" `
  --batch 1a
```

`EXPECTED` means all changed pixels are within declared regions. `DRIFT` means at most 0.5% changed pixels outside those regions and no structural regression. `REGRESSION` returns a non-zero exit code.

Declare intentional fixed geometry or pixel regions in `expected-regions.json`:

```json
{
  "batches": {
    "2b": {
      "declaredFixedChanges": ["[data-primary-nav]", "aside.sidebar"],
      "regions": [
        { "name": "bottom-nav-strip", "viewport": "390x844", "box": [0, 780, 390, 844] }
      ]
    }
  }
}
```

## Self-tests

```powershell
node scripts/visual-parity/capture.mjs --selftest
node scripts/visual-parity/compare.mjs --selftest
```

An intentionally false commit must fail:

```powershell
node scripts/visual-parity/capture.mjs --tag probe --commit 0000000000000000000000000000000000000000
if ($LASTEXITCODE -eq 0) { throw 'capture SHA guard failed' }
```

## Known baseline limitations

- `/panel/business`, `/panel/business-kds`, `/panel/manage`, and `/panel/admin` are captured logged out and therefore record their redirect destination.
- Authenticated `staff_access` and `internal_admin` coverage remains blocked until dedicated non-production test accounts are provided.
- Audio is not captured or persisted.
