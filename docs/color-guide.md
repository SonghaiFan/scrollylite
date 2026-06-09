# Color in ScrollyLite

This guide covers how ScrollyLite assigns and manages color for data encoding,
and the design rules baked into the library's defaults.

The rules below are distilled from Stephen Few's *"Practical Rules for Using
Color in Charts"* (Perceptual Edge, 2008). The implementation tries to enforce
the good defaults automatically so authors can focus on the story, not color
theory.

---

## The nine rules at a glance

| # | Rule | How ScrollyLite implements it |
|---|---|---|
| 1 | Consistent background for same-colored objects | Single `--sl-surface` token; avoid per-step background changes |
| 2 | Data marks must contrast with the background | Default palette checked against `--sl-surface` (white) |
| 3 | Use color only when it serves a communication goal | Color channel must be explicitly encoded; no decorative multi-coloring of a single series |
| 4 | Different colors only for different meanings | Auto-color is only applied when a categorical `color` channel is present |
| 5 | Soft/natural hues for most data; bright/dark for highlights | Tableau 10 at medium intensity for data; `--sl-accent` for nav/highlight chrome |
| 6 | Sequential quantitative → single hue, varying intensity | `luminanceColorScale` (used automatically when `color.type = 'quantitative'`) |
| 7 | Non-data ink barely visible | `--sl-grid` and `--sl-axis` are light grays; never compete with data |
| 8 | Avoid red + green together (colorblind safety) | Tableau 10 + hue-maximised order keeps red and green non-adjacent |
| 9 | No visual effects (3-D, gradients, drop shadows on marks) | Flat SVG marks only; no CSS effects on data elements |

---

## Categorical color (nominal / ordinal data)

Use a `color` channel with a nominal or ordinal field:

```js
bar("sales")
  .x("region")
  .y("revenue")
  .color({ field: "segment", type: "nominal" })
```

### What happens automatically

1. **Domain resolution** — ScrollyLite collects the unique values of `segment`
   from the data rows (or reads `color.domain` if you provide one).
2. **Palette resolution** — the ten `--sl-series-*` CSS variables are read at
   render time (so a theme change is always reflected without rebuilding).
3. **Hue-maximisation** — `pickCategoricalColors(n, palette)` runs a greedy
   farthest-first algorithm:
   - Starts with the first chromatic palette color.
   - At each step, picks whichever remaining color maximises the *minimum
     pairwise hue distance* to all already-chosen colors.
   - Near-achromatic colors (saturation range < 10 %) are appended last.

For **n = 2** categories the two chosen colors sit ~180° apart on the hue
wheel (blue #4e79a7 + orange #f28e2b — the canonical colorblind-safe pair).
For **n = 4** the four colors span the wheel in roughly equal quarters.

```
n=1  →  #4e79a7                               (blue)
n=2  →  + #f28e2b                             (orange)   min gap 179°
n=3  →  + #59a14f                             (green)    min gap  83°
n=4  →  + #b07aa1                             (purple)   min gap  73°
n=5  →  + #ff9da7                             (pink)     min gap  36°
n=6  →  + #76b7b2                             (teal)     min gap  36°
n=7  →  + #edc948                             (yellow)   min gap  17°
n=8  →  + #9c755f                             (brown)    min gap   8°
n=9  →  + #e15759                             (red)      min gap   5°
n=10 →  + #bab0ac                             (gray)     wraps
```

For n ≤ 4, all chosen colors are well above 60° apart — easily
distinguishable even at small mark sizes (lines, points). For n ≥ 7 the
minimum gap drops below 20°; rely on shape or label differentiation too.

### Supplying an explicit range

If you know exactly which colors you want, specify `range` and the algorithm is
bypassed:

```js
bar("weather")
  .color({
    field: "type",
    domain: ["Hot days", "Cold days"],
    range:  ["#b05d3b",  "#536a9e"]
  })
```

`range` entries may be hex strings, `rgb()` values, or `var(--sl-series-N)`
references. Unknown/null entries fall back to the positional palette color.

### Overriding the palette

Replace any or all series tokens in your theme to change the whole palette
at once:

```js
story().theme({
  series: [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
    "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
  ]
})
```

The hue-maximisation runs on the *resolved* palette at render time, so the
assignment order adapts automatically to your custom colors.

---

## Sequential color (quantitative data)

Rule #6: **single hue, intensity encodes magnitude**.

Use `color.type = 'quantitative'` to get a luminance scale centered on
`--sl-accent`:

```js
point("cities")
  .x("gdp")
  .y("population")
  .color({ field: "density", type: "quantitative" })
```

ScrollyLite maps the domain `[min, max]` to a lightness range of roughly
`L +18 … L −18` in HCL space (pale = low, dark = high), where L is the
lightness of the resolved `--sl-accent` color.

Tune it via the `lightness` option:

```js
.color({ field: "density", type: "quantitative", lightness: [30, -30] })
```

---

## Hue + luminance composition (two-variable color)

For richer encodings — a categorical dimension split across a continuous one —
use the `hue`/`luminance` sub-channels directly:

```js
// Three periods (early / middle / recent) each with their own lightness ramp
point("weather")
  .color({
    hue:       { value: "#4e79a7" },          // single fixed hue
    luminance: { field: "period",
                 domain: ["early", "middle", "recent"],
                 lightness: [18, 0, -18] }    // positive = lighter
  })
```

Or with a categorical hue:

```js
.color({
  hue:       { field: "region",
               domain: ["North", "South"],
               range:  ["#4e79a7", "#f28e2b"] },
  luminance: { field: "year", type: "quantitative" }
})
```

---

## Highlighting vs. grouping

**Grouping** (distinguish independent series) → categorical palette, as above.

**Highlighting** (draw attention to one item) → the `.highlight()` method on
any idiom desaturates non-matching marks to `--sl-muted`, leaving the matched
marks in their original series color:

```js
bar("sales")
  .x("region").y("revenue")
  .color({ field: "region" })
  .highlight({ region: "North" })   // North stays vivid; others fade
```

For a single data-independent accent (e.g. a reference line or annotation
mark) use `--sl-accent` directly in your range — it's always visually
distinct from the series colors:

```js
.color({ field: "type", domain: ["Actual", "Target"],
         range: ["var(--sl-series-1)", "var(--sl-accent)"] })
```

---

## Non-data ink (Rule #7)

Axes, tick marks, and grid lines should not compete with data marks.
ScrollyLite uses:

| Token | Role | Default |
|---|---|---|
| `--sl-grid` | horizontal grid line stroke | `#eceff2` (very light) |
| `--sl-axis` | axis line and tick color | `#aeb4bb` (medium gray) |
| `--sl-muted` | axis labels, legend text | `#66707a` (dark gray) |

These resolve automatically from CSS custom properties so your theme file can
adjust them without touching chart code.

---

## Colorblind safety (Rule #8)

The default Tableau 10 palette was designed to be accessible. The
hue-maximisation order further ensures that for small N, the most common
failure modes are avoided:

- **n = 2**: blue + orange — safe for all major colorblindness types.
- **n = 3**: blue + orange + green — deuteranopia-safe (no red).
- **n = 4**: adds purple, not red — still no blue/green confusion pair.
- **n ≥ 6**: red enters the set; if your audience includes colorblind users,
  pair color with shape, pattern, or direct labels for those categories.

If you need a fully colorblind-safe palette for larger N, supply an explicit
`series` via `.theme()`. The IBM color-blind-safe palette or the Okabe-Ito
palette are good choices:

```js
// Okabe-Ito (8 colors, designed for colorblind accessibility)
story().theme({
  series: [
    "#56b4e9", "#e69f00", "#009e73", "#f0e442",
    "#0072b2", "#d55e00", "#cc79a7", "#000000"
  ]
})
```

---

## Quick reference

| Data type | Encoding | How to author |
|---|---|---|
| Nominal groups | Distinct hues | `color: { field, type: "nominal" }` — automatic |
| Ordered groups | Distinct hues (same mechanism) | `color: { field, type: "ordinal" }` |
| Quantitative magnitude | Single hue, varying intensity | `color: { field, type: "quantitative" }` |
| Two-variable | Hue × lightness | `color: { hue: {...}, luminance: {...} }` |
| Highlight one item | Desaturate others | `.highlight({ field: value })` |
| Fixed color | Constant | `color: { value: "#hex" }` |
| Manual palette | Override auto-assign | `color: { field, range: [...] }` |
