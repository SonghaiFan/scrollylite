# Runtime API

This page documents what happens when you call `createStory()`, the shape of
the object it returns, and how to drive a story programmatically — useful for
custom navigation UI, debugging, analytics hooks, or embedding ScrollyLite
inside a larger app's lifecycle.

## `createStory(spec, options)`

```ts
async function createStory(spec: object, options: CreateStoryOptions): Promise<StoryRuntime>
```

### `options`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `target` | `string \| Element` | no | `"#app"` | CSS selector or DOM node to render into. ScrollyLite clears and owns everything inside it. Throws if a selector matches nothing. |
| `d3` | D3 module | **yes** (ESM entry) | `globalThis.d3` (browser entry only) | The D3 v7+ library. Required for rendering, scales, transitions, easing, and data loading. |
| `aq` | Arquero module | **yes** (ESM entry) | `globalThis.aq` (browser entry only) | The Arquero v8+ library. Required by the current runtime's data transform path (`applyTransforms`). |
| `debug` | `boolean` | no | `false` | Enables the demo's debug affordances (e.g. the source-code inspector panel) in the rendered shell. |

> **ESM vs. browser entry:** `import { createStory } from "scrollylite"` (or
> `"scrollylite/browser"` imported as a module) requires you to pass both `d3`
> and `aq` explicitly. The **global**
> build (`scrollylite.global.js`, exposed as `window.ScrollyLite`) wraps
> `createStory` to fall back to `globalThis.d3`/`globalThis.aq` when you omit
> them — convenient for `<script>`-tag usage where D3/Arquero are loaded as
> globals.

### What it does, step by step

1. **Resolves dependencies** — throws immediately with a clear error if `d3`
   or `aq` is missing.
2. **Compiles the spec** via `compileSpec(spec)` — normalizes structure and
   prepares everything the renderer needs. Builder-authored specs already carry
   transitions inferred by `.step()` / `.steps()`.
3. **Applies the theme** — sets `--sl-bg`/`--sl-fg`/`--sl-accent` custom
   properties on `document.documentElement` from `spec.theme`.
4. **Loads every dataset** declared in `spec.data` in parallel (CSV/JSON via
   D3, or used directly for inline arrays/`values`).
5. **Clears `target`** and renders the **story shell**: header, narrated
   step list, sticky chart figure(s), nav rail (`layout.nav`), progress bar
   (`layout.progress`), and a shared tooltip layer.
6. **Renders step 0**, then wires up:
   - the **scroll driver** (geometry-based native scroll tracking;
     see [Layouts, Themes & Scrolling](./layouts-themes-and-scrolling.md#scroll-config-reference))
   - **click navigation** on the nav rail
   - **window resize** handling (recomputes chart dimensions and scroll
     measurements)
   - **URL hash restoration** (jumping straight to a step if the page loads
     with `#step-N` in the URL)
7. Returns the `StoryRuntime`.

### Errors

`createStory` throws synchronously (before any async work) if:
- `d3` is missing — `"ScrollyLite requires D3. Pass { d3 } to createStory()."`
- `aq` is missing — `"ScrollyLite data transforms
  require Arquero. Pass { aq } to createStory()."`
- `target` doesn't resolve to an element — `"ScrollyLite target not found:
  <selector>"`
- `spec` isn't an object — `"ScrollyLite requires a story spec object."`

Always `await createStory(...)` (or `.catch()` the promise) so these surface
in your own error handling rather than as unhandled rejections.

## `StoryRuntime`

The object `createStory` resolves to:

```ts
interface StoryRuntime {
  spec: object;                 // The compiled, normalized story spec
  data: Record<string, any[]>;  // Loaded datasets, keyed by name: { weatherDays: [...], … }
  signature: StepSignature[];   // Lightweight per-step metadata for nav/analytics
  renderStep(index: number, options?: RenderStepOptions): void;
  renderScrollProgress(index: number, progress: number, direction?: "up" | "down"): void;
  scrollDriver: ScrollDriver;
  destroy(): void;
}
```

### `spec`

The fully compiled spec — the same shape `story().toSpec()` produces, but
with every step's view fully resolved (no authoring shorthand left). Useful
for debugging ("what did my chained builders actually produce?") or for
serializing a runtime story for later replay.

### `data`

A plain object mapping each dataset name to its loaded row array — exactly
what `viewRows()` extracts from for rendering. Handy for verifying a remote
file loaded correctly, or for driving your own visualizations off the same
data.

```js
const runtime = await createStory(spec, { target: "#app", d3, aq });
console.log(runtime.data.weatherDays.length, "rows loaded");
```

### `signature`

An array of lightweight step descriptors — exactly what you need to build
custom navigation UI, a table of contents, or analytics instrumentation
without re-deriving anything from the full compiled spec:

```ts
interface StepSignature {
  index: number;
  id?: string;
  title: string;
  transition: string[];   // inferred scenes for this step, e.g. ["focus", "guide"]
  action: string[];       // e.g. ["scroll", "tooltip"]
}
```

```js
runtime.signature.forEach(({ index, title, transition }) => {
  console.log(`${index}: ${title} — scenes: ${transition.join(", ") || "(none)"}`);
});
```

### `renderStep(index, options?)`

Jumps directly to a step and renders it **fully** (not scroll-scrubbed):

```ts
renderStep(index: number, options?: {
  force?: boolean;            // re-render even if already on this step
  scrollProgress?: number;    // initial progress to seed for scroll-mode steps (0–1)
  direction?: "up" | "down";  // affects default enter/exit direction
}): void
```

```js
runtime.renderStep(2);                       // jump to step 2
runtime.renderStep(0, { force: true });       // re-render step 0 even if already active
```

This is what the nav rail calls internally — use it
to build your own "jump to step" controls, a table of contents, deep links,
or programmatic walkthroughs.

### `renderScrollProgress(index, progress, direction?)`

Scrubs a step's transition to a specific point of completion — what the
scroll driver calls on every scroll tick for steps with `"scroll"` in their
`action` list:

```ts
renderScrollProgress(index: number, progress: number, direction?: "up" | "down"): void
```

`progress` is clamped to `[0, 1]`: `0` is the step's *source* state (start of
its transition), `1` is its *target* state (transition complete). Calling
this on a step without a `"scroll"` action is a no-op.

```js
runtime.renderScrollProgress(2, 0.5);          // show step 2's transition halfway through
runtime.renderScrollProgress(2, 1, "down");    // jump straight to step 2's completed state
```

Useful for building custom scroll-linked experiences (e.g. driving progress
from an external scrubber, video playback position, or a non-native scroll
container) instead of — or in addition to — the built-in native scroll
driver.

### `scrollDriver`

The active scroll driver instance — currently always the **native** driver
(geometry-based, tracks `window.scrollY`):

```ts
interface ScrollDriver {
  type: "native";
  scrollToStep(index: number, options?: { behavior?: string; progress?: number }): number | null;
  resize(): void;
  refresh(): void;   // alias of resize()
  destroy(): void;
}
```

`scrollToStep(index, options)` programmatically scrolls the page so the given
step lands at `options.progress` (default from `layout.scroll.navigation.progress`,
itself defaulting to `0.98`) using `options.behavior` (default from
`layout.scroll.navigation.behavior`, itself `"instant"`). Returns the
resulting scroll-top in pixels (or `null` if the step doesn't exist).

```js
runtime.scrollDriver.scrollToStep(3, { behavior: "smooth", progress: 0.5 });
```

`resize()`/`refresh()` force a re-measurement (useful after you
programmatically change layout that the driver can't observe, e.g. injecting
content above the story). `destroy()` tears down its scroll/resize listeners
— called automatically by `runtime.destroy()`.

### `destroy()`

Tears the story down completely: cancels pending animation frames, removes
ScrollyLite's scroll/resize/nav listeners, and destroys the scroll driver.
Call this when removing a story from the page (e.g. in a framework
component's unmount/cleanup hook) to avoid leaking listeners:

```js
const runtime = await createStory(spec, { target: "#app", d3, aq });
// … later, e.g. on component unmount:
runtime.destroy();
```

> `destroy()` does **not** clear `target`'s contents — it only stops
> ScrollyLite's own activity. Clear or replace the target element yourself if
> you're tearing down the DOM as well.

## Registering chart idioms at runtime

These three functions (re-exported from the package root) manage the
**built-in chart idiom registry** that every `createStory` call shares:

```ts
function registerChartIdiom(idiom: ChartPlugin): void
function registerChartModule(module: { plugin: ChartPlugin }): void
function availableChartIdioms(): string[]
```

```js
import { availableChartIdioms } from "scrollylite";
console.log(availableChartIdioms());   // ["bar", "line", "point", "unit"]
```

See [Extending with Plugins](./extending-with-plugins.md) for how to define
and register your own idiom with `defineChartIdiom`.

## Putting it together: a minimal embedding

```js
import * as d3 from "d3";
import * as aq from "arquero";
import { createStory, story, bar } from "scrollylite";
import "scrollylite/style.css";

const spec = story()
  .title("Demo")
  .data("rows", { values: [{ a: "x", b: 1 }, { a: "y", b: 2 }] })
  .view("main", { height: 420 })
  .step("Baseline", bar("rows").x("a").y("b").key("a"))
  .step("Highlight", bar("rows").x("a").y("b").key("a").highlight({ a: "y" }))
  .toSpec();

let runtime;
async function mount() {
  runtime = await createStory(spec, { target: "#app", d3, aq });
  console.log("steps:", runtime.signature);
}
function unmount() {
  runtime?.destroy();
}
```
