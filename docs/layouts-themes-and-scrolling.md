# Layouts, Themes & Scrolling

This page covers everything that shapes how a story *looks and feels* on the
page, independent of its data and charts: the layout preset (where the chart
sits relative to the text), theming (colors via CSS custom properties), and
the scroll driver (how scrolling maps to step transitions).

All of this lives under `spec.layout` and `spec.theme`, set through the story
builder's `.layout(...)` or written directly into a hand-authored spec.

## Layout presets

ScrollyLite ships two layout presets, each applying a CSS class that controls
how the sticky chart figure and the scrolling narrative text are arranged:

| Preset | Arrangement | CSS class |
|---|---|---|
| `"floatToText"` (default) | Two columns: chart floats/sticks beside the text; the reader scrolls the narrative past it | `.sl-layout-preset-float-to-text` |
| `"textOverVis"` | Chart fills a sticky central stage; narrative text scrolls as a translucent overlay across it | `.sl-layout-preset-text-over-vis` |

```js
story().layout("floatToText")
story().layout("textOverVis")
```

Set the preset via `.layout(name)`, `.layout(name, { runtime: {...} })`, or a
raw config object — see [Story Builder → `.layout()`](./story-builder.md#layoutpresetorconfig-options).
You can also register your own preset at the layout registry level with
`registerLayout(name, { classes: [...] })` (exported from
`src/layouts/index.js`) and pair it with matching CSS.

## `layout` config reference

These fields all live alongside `preset` in `spec.layout`:

```js
{
  layout: {
    preset: "floatToText",
    offset: 0.58,        // Where in the viewport a step "activates" (see below)
    nav: true,           // Show the step-dot navigation rail
    progress: true,      // Show the top progress bar
    scroll: { /* … see below … */ }
  }
}
```

| Field | Type | Effect |
|---|---|---|
| `preset` | `"floatToText" \| "textOverVis"` | Visual arrangement (see above) |
| `offset` | `number \| string` | Viewport activation line for scroll-driven steps — see [Understanding `offset`](#understanding-offset) |
| `nav` | `boolean` | Render the clickable step-dot navigation rail |
| `progress` | `boolean` | Render the top progress bar that fills as you advance through steps |
| `scroll` | object | Scroll-driver configuration — see below |

## Understanding `offset`

`offset` defines the horizontal "activation line" in the viewport: the point
at which a step becomes active as it scrolls past. It accepts:

- A **fraction** `0 ≤ offset ≤ 1` — a proportion of the viewport height.
  `0.58` means "a step activates when its top crosses 58% down the viewport".
  This is the most portable form (adapts to any screen size).
- A **pixel number** `> 1` — an absolute distance from the top of the
  viewport.
- A **string** `"120px"` or `"55%"` — explicit unit forms, parsed the same
  way.

The default is `0.55`. Most stories look best with the offset somewhere in
the `0.5`–`0.65` range — high enough that the reader has "arrived" at the
step, low enough that the transition doesn't feel delayed.

## `scroll` config reference

```js
{
  scroll: {
    progress: "geometry",      // measurement strategy (currently the only supported mode)
    navigation: {
      behavior: "instant",     // "instant" | "smooth" — how clicking a nav dot scrolls
      progress: 0.98           // 0–1: where in the target step to land when navigating to it
    }
  }
}
```

`progress: "geometry"` is the (current) measurement strategy: the driver
reads each step element's bounding box on every scroll/resize tick and
derives `(index, progress, direction)` purely from layout geometry — no
IntersectionObserver thresholds or manual breakpoints to tune.

`navigation` controls what happens when the reader **jumps** to a step (via
the nav rail, keyboard, or a restored URL hash):

| Field | Default | Effect |
|---|---|---|
| `behavior` | `"instant"` | Passed to `window.scrollTo({ behavior })` — `"instant"` or `"smooth"` |
| `progress` | `0.98` | Where within the target step to land (`0` = just entering, `1` = about to exit) — landing near the end (`0.98`) means the step's transition has essentially completed when you arrive |

> Internally the scroll-driver config schema also reserves `start`, `end`,
> `clamp`, and `snap` keys for future tuning of the geometry measurement and
> snap-to-step behavior. As of this version they're normalized into the
> config object but don't yet change runtime behavior — set `offset` and
> `navigation` for now.

## Step actions and scroll-driven transitions

Whether a step's transitions are **scrubbed by scroll position** or **played
in full on click/keypress** depends on its `action` list — set via the story
builder's [`.action()`](./story-builder.md#actionactions):

- `["step", "tooltip"]` (default): clicking a nav dot, pressing arrow keys, or
  scrolling into a step's activation line plays its transition **once, in
  full**.
- `["scroll", "tooltip"]`: the transition is **continuously interpolated**
  as the reader scrolls through the step — scrolling down plays it forward,
  scrolling up plays it backward, and partial scroll positions show partial
  transitions. Internally this calls `renderScrollProgress(index, progress,
  direction)` on every scroll tick, which maps `progress ∈ [0, 1]` onto the
  step's D3 transition schedule via `easeProgress`.

Per-view scroll easing can be tuned via `narrative.action.scroll.ease`:
`"linear"` (default), `"cubic"`, `"cubicInOut"`, or `"cubicOut"`.

```js
story()
  .action(["scroll", "tooltip"])
  .step("Intro", base)                          // first step always also gets "enter"
  .step("Reveal", base.where({ period: "recent" }))
```

Only steps that actually carry a `transition.scene` benefit from `"scroll"`
mode (a step with no inferred change has nothing to scrub) — but it's safe to
set it on every step; steps without transitions simply render fully.

## Theming

`spec.theme` sets three CSS custom properties on `<html>` at story start:

```js
{
  theme: {
    background: "#fafafa",   // → --sl-bg
    foreground: "#222",      // → --sl-fg
    accent: "#b05d3b"        // → --sl-accent
  }
}
```

```js
story().toSpec()   // spec.theme = { background, foreground, accent }
```

These map directly onto the variables consumed by the packaged stylesheets
(`scrollylite.css` for structural styles, `themes/default.css` for the
default color theme). Any of the three keys may be omitted — only the
provided ones are applied, leaving the rest at the loaded theme's defaults.

### Building a custom theme

For deeper customization than the three variables cover, write your own CSS
that targets `--sl-*` custom properties and the `.sl-*` structural classes
(`.sl-layout-preset-float-to-text`, `.sl-progress`, `.sl-nav`, `.sl-figure`,
…), and load it instead of (or alongside) `themes/default.css`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/scrollylite@0.1.0/dist/scrollylite.css">
<link rel="stylesheet" href="./my-theme.css">
```

`scrollylite.css` provides the structural layout rules every preset depends
on — always load it. `themes/default.css` (or your replacement) supplies the
color palette on top.

## Putting it together

```js
story()
  .layout("floatToText", { runtime: { offset: 0.6, nav: true, progress: true,
    scroll: { navigation: { behavior: "smooth", progress: 0.95 } } } })
  .data(/* … */)
  .view("main", { title: "Melbourne Weather", height: 540 })
  .action(["scroll", "tooltip"])
  .step(/* … */)
  .toSpec();
```

This combination — `floatToText`, a moderate `offset`, and `["scroll",
"tooltip"]` actions — is the most common "classic scrollytelling" feel: text
scrolls past a sticky chart that smoothly morphs as you read.
