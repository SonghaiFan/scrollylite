# Phase 1 Scene Transition Grammar

This phase implements two layout presets and four scene transition types for
bar, scatter, and line. Unit chart uses the same chart-module protocol but only
implements focus and guide, because its observation is the unit count itself.

## Scene Syntax

Each step declares scene transitions through the design-space annotation and
places the transition-specific parameters on the view spec:

```js
{
  designSpace: {
    transition: {
      scene: ["focus", "guide"]
    }
  },
  views: {
    main: {
      mark: "line",
      focus: { field: "period", equal: "recent" },
      guide: { y: { field: "hot_days", scale: { type: "log" } } }
    }
  }
}
```

The compiler resolves the scene tokens once, then applies chart-specific
handlers from `CHART_TRANSITION_COMPILERS` in `src/transitions/index.js`.

## Unified Scene Types

`focus` changes which part of the data or scene is emphasized.

- Bar and scatter use a filter transform by default.
- Line uses range crop by default: keep the full line data, remap the x range to
  the focused subset, and let the global mark clip crop overflow.
- Line can opt back into filter focus with `focus: { mode: "filter", ... }`.

`guide` changes how the same observation is read.

- Bar supports orientation, scale, and staged x/y updates.
- Scatter and line share the xy guide compiler for axis swap and scale changes.
- Segmented bars can use guide to move between stacked and grouped layouts.
- Unit supports guide layout changes such as grouped-grid and collision-dodged
  timeline layouts. Grouping units by category is treated as guide, not
  granularity, because the unit count itself is unchanged.

`observation` changes the encoded variable while preserving the same entity key.

- Bar changes the quantitative measure for the current category channel.
- Scatter and line share xy observation changes for x/y variables.
- Unit charts do not implement observation transitions. Their observation is the
  count represented by repeated units, not an arbitrary encoded data attribute.

`granularity` changes the level of aggregation or grouping.

- Bar folds wide measures into segmented stacked/grouped bars.
- Scatter supports aggregate/detail split and merge with `parentField` anchors.
- Line supports single trend versus series-level line segments.

## Extension Pattern

New chart idioms should register a compiler adapter with the same shape:

```js
const CHART_TRANSITION_COMPILERS = {
  area: {
    base: identitySpec,
    scenes: {
      focus: applyFilterFocus,
      guide: applyXYGuide,
      observation: applyXYObservation,
      granularity: applyAreaGranularity
    }
  }
};
```

Keep shared scene semantics in reusable handlers. Put chart-specific behavior in
small handlers named for the chart idiom and transition type.

## Chart Module Shape

Each built-in chart idiom should live under `src/charts/<type>/`:

- `render.js` exports a factory that instantiates a chart class extending
  `BaseChart`.
- `render.js` draws marks and delegates shared axis, scale, tooltip, and legend
  helpers from the runtime.
- `state.js` derives chart-specific scene state used by the renderer or
  transition planner.
- `keys.js` centralizes join-key and DOM identity helpers.

`bar` currently has the most complex state planner because it stages
orientation and stacked/grouped transitions. `scatter` and `line` keep smaller
state/key modules, but they use the same file shape so future idioms can extend
the pattern without changing the runtime.

`BaseChart` in `src/charts/base.js` is intentionally small. It owns shared chart
protocol helpers such as `renderer()`, `setCartesianState()`, and
`drawCartesianAxes()`. New chart idioms should inherit it and implement
`render(chart, rows, spec, tooltip, d3)`.

## Scroll Control

Continuous scroll action is implemented by the native controller in
`src/scroll-drivers/native.js`. The controller measures each step against the
configured viewport offset and emits `{ index, progress, direction }`.

The renderer then scrubs D3 transition schedules with that progress. This keeps
chart renderers written in normal D3 enter/update/exit style while allowing the
same transition to be either time-driven or scroll-driven.

The current template intentionally keeps only the native controller. Scrollama
and GSAP adapters were removed to avoid multiple progress semantics during the
grammar design phase.
