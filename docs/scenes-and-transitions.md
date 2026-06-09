# Scenes & Transitions

ScrollyLite's signature feature is that you describe *states*, not
*animations*. You author what each step's chart looks like; ScrollyLite
**diffs consecutive steps**, classifies what changed into one or more
**scenes**, and drives the corresponding animation. This page explains the
classification rules and how each idiom animates each scene — useful both for
predicting what a chain of `.step()` calls will produce, and for debugging
when a transition doesn't look like you expected.

## The four scenes

| Scene | Question | Authoring triggers |
|---|---|---|
| `focus` | Which rows are emphasized or visible? | `.where()`, `.filter()`, `.highlight()` |
| `observation` | Which variable/field is encoded? | `.x()`/`.y()` with a different field (non-bar idioms) |
| `granularity` | What level of aggregation/grouping is shown? | `.breakdown()`, `.rollup()`, `.segment()` |
| `guide` | How is the same data being read (orientation, scale, layout, staging)? | `.flip()`, `.guide()`, `.layout()`, `.stage()`, `.group()`, `.timeline()`, `.dodge()` |

A single step transition can carry **more than one scene** — e.g. flipping
the axes *while also* filtering produces `["focus", "guide"]`. ScrollyLite
animates all of them together, choosing the most specific combined transition
plan the idiom supports.

## How inference works

When you call `.step(title, chartState, …)`, the story builder takes the
*previous* step's chart state and the *current* one and runs
`inferTransition(previous, next)`:

1. **Authoring-operation delta.** Each chart-state chain records the sequence
   of operations applied (`filter`, `highlight`, `flip`, `breakdown`, …).
   ScrollyLite finds where the two operation sequences diverge and seeds the
   scene list from the *new* operations' scene tags.
2. **Spec-level diff.** It also structurally diffs the compiled view specs
   (encoding, transform, focus, guide, granularity) and adds scenes the
   operation-delta might have missed:
   - `focus`: triggered by a changed `filter` transform, a changed/added
     `focus` state (including `.highlight()`), or any transform-level filter
     change.
   - `observation`: triggered when `x` or `y`'s bound **field** changes —
     *except* on bar charts, where measure swaps are folded into `focus`
     (because bar's `.where()` treats `{ type: "Cold days" }` as "the same
     measure channel, different selected value", not a new observation — see
     [Chart Idioms → Bar `.where()`](./chart-idioms.md#wherefilter-richer-on-bar)).
   - `granularity`: triggered by a changed `granularity` block — *unless*
     only its `layout` sub-field changed (that's a pure `guide` change,
     handled by `.layout()`).
   - `guide`: triggered by any change to the `guide` block (orientation,
     scale, staging, layout).
3. **Deduplication.** The final scene list is unique and ordered by
   first-seen.

The very first step in a story has no predecessor, so it always carries
`transition: undefined` (no scenes) — it's the narrative's starting point,
not a transition.

## What each scene looks like, per idiom

### `focus`

- **Bar / Line / Point / Unit — filtering** (`.where`/`.filter`): rows that no
  longer match exit (fade + shrink/collapse); rows that newly match enter
  (fade + grow from their guide position). Marks that match in both states
  use D3's keyed data-join (via `.key()`) to **morph in place** rather than
  exit-then-enter — this is why choosing a good semantic key matters so much.
- **Highlighting** (`.highlight`): no marks enter or exit — every mark stays,
  but non-matching marks fade to a lower opacity (`options.opacity`, default
  a low constant) while matching marks stay at full opacity. This is the
  right tool when you want to draw attention *without* changing what's on
  screen (e.g. "notice how cold days behave differently" while keeping hot
  days visible for comparison).

### `observation`

- **Line / Point / Unit**: the bound field on `x`/`y` changes — axis domains,
  scales, and labels animate to the new field's range, and marks
  reposition/resize along the changed channel. Combined with a stable `.key`,
  this reads as "the same entities, now plotted by a different measure".
- **Bar**: bar doesn't use a separate `observation` scene for measure swaps —
  see the `focus` note above; `.where({ type: "Cold days" })` after `{ type:
  "Hot days" }` is classified as `focus` (with an inferred y-axis retitle),
  keeping the narrative reading as "same bars, different selection" rather
  than "an unrelated new chart".

### `granularity`

- **Bar**: `.breakdown()` (one bar → segments) and `.rollup()` (segments →
  one bar) are inverse operations; the renderer computes an aggregation
  transition plan that splits/merges marks while preserving the parent
  category's position. `.segment()` performs the same kind of split but from
  raw/wide data via folding.
- **Line**: `.breakdown(field)` (`mode: "series"`) splits one line into
  multiple series, each keyed and colored distinctly; `.rollup()` (`mode:
  "single"`) merges them back, with the multiple lines visually converging
  into one.
- **Point**: `.rollup(groupby)` (`mode: "aggregate"`) collapses many points
  into fewer, larger summary circles (size encodes aggregate count via
  `sizeRange`); `.breakdown(detail)` (`mode: "detail"`) is the inverse —
  summary circles "explode" into their constituent detail points.
- **Unit**: not implemented — unit charts only support `focus` and `guide`
  scenes (their narrative range is about *which* units are shown and *how*
  they're laid out, not aggregation level).

### `guide`

- **Bar**: `.flip()` runs bar's signature **two-stage staged transition** —
  by default the y-guide restages before the x-guide (`order: ["y", "x"]`),
  so the chart visibly "turns" rather than instantly swapping; `.layout()`
  (stacked ↔ grouped) repositions/resizes segments along the shared category
  axis; `.stage()` lets you tune staging order/timing directly.
  `onlyGranularityLayoutChanged` ensures a pure `.layout()` switch is
  classified as `guide`, not `granularity` (the *grouping* hasn't changed,
  only how it's drawn).
- **Line / Point**: `.flip()` swaps axis bindings and re-derives scales;
  marks/lines reposition and rescale to the flipped guide. `.guide({ y:
  { scale: { type: "log" } } })` (or any raw guide override) re-derives the
  affected scale and animates the axis/marks to it.
- **Unit**: `.group()`, `.timeline()`, `.dodge()` each set a distinct
  `guide.layout` value (`"groupedGrid"`, `"timeline"`, `"dodge"`) — the
  renderer computes new per-unit positions for the chosen layout and animates
  every unit mark to its new slot. These three layouts are mutually
  exclusive; switching between them is always a `guide` scene.

## Multi-stage staging (`stage`/`staging`)

Bar (and, via the shared `.flip()` shape, line/point) supports **staged**
multi-step transitions: instead of every visual property animating at once,
ScrollyLite sequences them — e.g. "first re-scale the y-axis, *then*
re-orient the x-axis" — so the reader can follow what's happening rather than
watching everything jump simultaneously. Configure this via:

```js
.flip({ order: ["y", "x"], stage: { duration: 600, stagger: 30 } })
.stage(["x", "y"], { duration: 700 })
```

`order` is the sequence of guide axes to restage; `duration`/`stagger`
control per-stage timing and inter-mark delay. The default order differs by
orientation (`["x", "y"]` for horizontal-reading charts, `["y", "x"]` after a
flip to vertical) — overriding it changes which axis "leads" the transition.

## Choosing keys for clean transitions

Almost every visually satisfying transition in ScrollyLite — marks morphing
instead of popping in/out, segments splitting smoothly from a parent bar,
detail points "exploding" out of an aggregate circle — depends on the
renderer being able to **match marks across steps** via `.key()`. Some
guidelines:

- Pick the field(s) that name the "thing" your narrative is *about* — often
  the category axis (`decade`, `country`, `product`).
- When a `.breakdown()`/`.segment()` introduces a new dimension (e.g.
  `type`), bar automatically extends the key to `[category, segment]` so
  parent and child marks both resolve to stable identities.
- When filtering on a "measure-like" field changes which *value* is selected
  (bar's `{ type: "Cold days" }` → `{ type: "Hot days" }`), bar infers a
  `semanticKey` descriptor (`{ entity, measure }`) so the same physical bars
  are recognized across the swap — you don't need to manually re-key.
- If transitions look "jumpy" (marks exiting and re-entering instead of
  morphing) when you'd expect continuity, the most common cause is a
  `.key()` that changes — or doesn't exist — between consecutive steps.

## Summary: predicting a step's scenes

Given two consecutive chart states, ask:

1. Did the **selected/visible rows** change (`.where`/`.filter`/`.highlight`)? → `focus`
2. Did the **encoded field** on `x`/`y` change (and it's not bar)? → `observation`
3. Did the **aggregation level** change (`.breakdown`/`.rollup`/`.segment`,
   beyond just `.layout`)? → `granularity`
4. Did **how the data is read** change (orientation, scale, staging, unit
   layout)? → `guide`

Any combination can co-occur; ScrollyLite animates the union, choosing the
richest transition plan the idiom defines for that combination.
