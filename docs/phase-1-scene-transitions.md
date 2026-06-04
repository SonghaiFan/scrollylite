# Phase 1 Scene Transition Grammar

This phase implements two layout presets and four scene transition types for
three chart idioms: bar, scatter, and line.

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

`observation` changes the encoded variable while preserving the same entity key.

- Bar changes the quantitative measure for the current category channel.
- Scatter and line share xy observation changes for x/y variables.

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
