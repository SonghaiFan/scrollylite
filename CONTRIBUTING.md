# Contributing

ScrollyLite keeps the public surface small. Before adding API, prefer making an
existing idiom, compiler helper, or plugin capability clearer.

## Local Checks

```sh
npm test
npm run release:check
```

`npm test` runs syntax checks, builds `dist/`, and compiles the built-in demo
stories through the chart idiom registry.
`npm run release:check` also verifies the npm tarball contents.

For release changes, update `CHANGELOG.md` in the same pull request.

## Chart Idioms

Each idiom lives under `src/charts/<idiom>/` and exposes exactly one
`plugin.js`:

```js
export const plugin = defineChartIdiom({
  key,
  createRenderer,
  createSpecCompiler,
  scenes,
  stateOperations
});
```

After adding or removing an idiom folder, run:

```sh
node scripts/sync-chart-manifest.mjs
```

Do not add alias keys, empty hook bags, or mark-specific switch statements in
the transition runtime. Capabilities belong to the plugin.
