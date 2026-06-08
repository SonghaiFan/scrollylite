# Phase 1 Scene Transition Grammar

This phase implements two layout presets and four scene transition types for
bar, point, and line. Circle-unit views use the same mark-renderer protocol but only
implements focus and guide, because its observation is the unit count itself.

## Scene Inference

Scene transitions are inferred by diffing the source and target view specs. The
authoring API may create internal focus/guide/granularity state, but authors do
not write `transition.scene` in the Vega-Lite-shaped view spec.

The transition entry point resolves inferred scene tokens, maps authored state
intent to spec operations, then applies mark-specific handlers from the spec
compiler map generated from `src/charts/manifest.js`.

## Unified Scene Types

`focus` changes which part of the data or scene is emphasized.

- Bar and point views use a filter transform by default.
- Line uses range crop by default: keep the full line data, remap the x range to
  the focused subset, and let the global mark clip crop overflow.
- Line can opt back into filter focus with `focus: { mode: "filter", ... }`.

`guide` changes how the same observation is read.

- Bar supports orientation, scale, and staged x/y updates.
- Point and line share the xy guide compiler for `flip` and scale changes.
- Segmented bars can use guide to move between stacked and grouped layouts.
- Unit supports guide layout changes such as grouped-grid and collision-dodged
  timeline layouts. Grouping units by category is treated as guide, not
  granularity, because the unit count itself is unchanged.

`observation` changes the encoded variable while preserving the same entity key.

- Bar changes the quantitative measure for the current category channel.
- Scatter and line infer xy observation changes by diffing x/y encoded fields.
  Their normal compiled state should remain the target encoding, not a separate
  observation state patch.
- Unit charts do not implement observation transitions. Their observation is the
  count represented by repeated units, not an arbitrary encoded data attribute.

`granularity` changes the level of aggregation or grouping.

- Bar folds wide measures into segmented stacked/grouped bars.
- Scatter supports aggregate/detail split and merge with parent anchors inferred
  from rollup group keys or the current color channel.
- Line supports single trend versus series-level line segments.

## Extension Pattern

New chart idioms should register a spec compiler adapter with the same shape:

```js
export function createAreaSpecCompiler(context = {}) {
  return {
    base: compileAreaBase,
    operations: {
      filter: compileFilter,
      highlight: compileHighlight,
      coordinate: compileAreaCoordinate,
      scale: compileAreaScale,
      aggregate: compileAreaAggregate,
      layout: compileAreaLayout,
      encode: compileAreaEncoding
    }
  };
}
```

Expose that compiler through the idiom's `plugin.js`:

```js
export function createSpecCompiler(context = {}) {
  return createAreaSpecCompiler(context);
}
```

Every operation handler uses `compileX(spec, operationSpec = {}, context = {})`
and returns the next Vega-ish spec. Keep shared spec materializers in reusable
handlers such as `compileFilter`, `compileHighlight`,
`compileCartesianCoordinate`, and `compileCartesianScale`. Put chart-specific
behavior in small handlers named for the idiom and spec operation, such as
`compileBarAggregate` or `compileUnitLayout`.

Do not expose `focus`, `guide`, `granularity`, or `observation` as compiler
adapter keys. Those names are transition scene labels and belong in diff,
transition inference, transition planning, runtime transition, and inspector
output. `observation` is inferred from encoded field changes; it is not a
compiled operation in the normal authoring path.

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
orientation and stacked/grouped transitions. `point` and `line` keep smaller
state/key modules, but they use the same file shape so future idioms can extend
the pattern without changing the runtime.

`BaseChart` in `src/charts/base.js` is intentionally small. It owns shared chart
protocol helpers such as `renderer()`, `setCartesianState()`, and
`drawCartesianAxes()`. New chart idioms should inherit it and implement
`render(chart, rows, spec, tooltip, d3)`.

## State Diff Planning

Transition planning is based on a semantic diff between the source view state and
the target view state, not only on the target step's scene labels.
`src/grammar/diff.js` keeps the older structural `changed` list for inference and
also exposes `deltas`, a normalized list of net state changes such as:

- `filter:change`
- `bar.guide:add` or `bar.guide:remove`
- `bar.orientation:change`
- `bar.granularity:add`
- `bar.layout:change`
- `bar.x-geometry:change` or `bar.y-geometry:change`

This treats each step as a complete state: `target = base + delta`. When moving
between arbitrary steps, the runtime compares the two complete states and uses
the net delta. If both source and target already include the same guide state,
that guide cancels out and does not trigger a guide transition again. If the
source is horizontal and the target is vertical, the diff reports a
`bar.orientation` change and the bar planner can choose the reverse staged guide
transition.

Bar transition planning in `src/charts/bar/state.js` consumes these deltas:

- `bar.x-geometry` and `bar.y-geometry` decide staged bar updates. If only one
  physical direction changes, only that direction is updated; if both change, the
  planner stages the two directions.
- The renderer treats x geometry as `x`/`width` and y geometry as `y`/`height`,
  so the same rule works for vertical, horizontal, grouped, and stacked bars.
- `bar.orientation` or `bar.layout` still names the reason for guide-related
  staged updates, but they are no longer the only trigger.
- `bar.granularity` add/remove produces semantic key consistency and
  split/collapse lineage when the aggregate relationship is present.

This lets stepped navigation and ordinary render updates share the same
transition decision rule. Continuous scroll still uses adjacent authored source
states because the interaction path physically passes through intermediate
steps.

## Scroll Control

Continuous scroll action is implemented by the native controller in
`src/scroll-drivers/native.js`. The controller measures each step against the
configured viewport offset and emits `{ index, progress, direction }`.

The renderer then scrubs D3 transition schedules with that progress. This keeps
mark renderers written in normal D3 enter/update/exit style while allowing the
same transition to be either time-driven or scroll-driven.

In ordinary scroll mode, each step renders from a stable authored adjacent
source state: step `i` begins from step `i - 1`, and the first step begins from
an empty scene. Do not derive normal scroll progress from whatever DOM happened
to be visible, because reverse scrolling can otherwise pick up a later step as
the source. The symptom is a back-scroll from step 2 to step 1 briefly animating
toward step 3, then jumping to step 1 at the end.

Stepped mode is discrete. If the user moves from step 1 directly to step 3, the
runtime should not pretend step 2 happened. The source state is the currently
rendered view spec, the target state is step 3's view spec, and the semantic
diff between those two states decides whether the transition should use staged
guide updates, ordinary updates, granularity split/collapse, or only enter/exit.

Scroll navigation and hash jumps are exceptions to continuous progress. When the
user jumps directly to a scroll step, the runtime renders the target scroll step
at progress `1` so the chart lands on the requested state immediately. It does
not need to animate through skipped scroll steps, because the user did not
perform the continuous scroll gesture.

Navigation clicks use a short scroll lock while the page is moved to the target
step. Scroll-action steps may render twice: once immediately after the click and
again after the browser reaches the target scroll position. The second render is
a scroll-specific reconciliation pass that keeps the visual state pinned to
`scrollProgress: 1` even if native scroll events were filtered during the lock.

Stepped navigation must not do that second forced render. A stepped transition is
time-driven, and the first render creates the source-to-target D3 transition
from the current `scene.previousSpec`. Rendering the same target again after the
scroll lock would interrupt that transition, update `scene.previousSpec` to the
target, and make the diff look like target-to-target. The visible symptom is
that staged transitions appear not to trigger on direct nav jumps.

The runtime prepares the chosen source state before creating the current step's
named scroll transition, then scrubs the current transition with measured
progress. Existing scroll-driven transition schedules should be cancelled rather
than finished when switching scroll steps; finishing them can force the old step
to its endpoint before the new progress is applied.

The current template intentionally keeps only the native controller. Scrollama
and GSAP adapters were removed to avoid multiple progress semantics during the
grammar design phase.
