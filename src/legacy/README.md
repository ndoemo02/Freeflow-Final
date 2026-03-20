# Legacy Folder Policy

This folder stores deprecated frontend files as rollback-safe backups.

Rules:
- Do not edit legacy files for new features.
- Keep original module structure when moving files here.
- Each move must be documented in:
  - `docs/legacy/LEGACY_INDEX.md`
- Permanent deletion is allowed only after:
  - minimum two deploy cycles
  - route smoke tests stay green
  - no active import references remain
