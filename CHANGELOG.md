# Changelog

All notable changes to ScrollyLite are documented here.

## 0.1.0 - 2026-06-08

Initial public package candidate.

- Added the browser ESM runtime and CDN-ready `dist/` build.
- Added a plain script-tag global build that exposes `ScrollyLite` for CDN use.
- Added the small public API: `createStory`, `story`, `bar`, `line`,
  `point`, `unit`, `defineChartIdiom`, `registerChartIdiom`,
  `registerChartModule`, and `availableChartIdioms`.
- Added function-based chart idiom plugins for `bar`, `line`, `point`, and
  `unit`.
- Removed legacy alias keys, global D3/Arquero lookups, demo-coupled runtime
  paths, and internal helper exports from the package entry.
- Added package checks for manifest drift, public API drift, tarball contents,
  consumer install/import behavior, CSS/theme subpath exports, and publish
  readiness.
