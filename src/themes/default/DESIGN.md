---
name: ScrollyLite Default
description: >
  Clean editorial style for data storytelling. Optimised for long-form
  articles and journalism where the chart is a supporting argument,
  not a dashboard widget.

colors:
  primary:          "#4e79a7"
  surface:          "#ffffff"
  bg:               "#f8f8f7"
  on-surface:       "#1f2328"
  muted:            "#66707a"
  border:           "#dde1e6"
  outline:          "#aeb4bb"
  outline-variant:  "#eceff2"
  series-1:         "#4e79a7"
  series-2:         "#f28e2b"
  series-3:         "#e15759"
  series-4:         "#76b7b2"
  series-5:         "#59a14f"
  series-6:         "#edc948"
  series-7:         "#b07aa1"
  series-8:         "#ff9da7"
  series-9:         "#9c755f"
  series-10:        "#bab0ac"

typography:
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6

rounded:
  sm:   2
  md:   3
  lg:   6
  full: 9999

spacing:
  xs:  4px
  sm:  8px
  md:  16px
  lg:  32px
  xl:  48px

components:
  bar:
    radius:     "{rounded.md}"
    dimOpacity: 0.22
  point:
    stroke:      "{colors.surface}"
    strokeWidth: 1.5
  line:
    width:     3
    pointSize: 4.5
    pointStroke: "{colors.surface}"
    pointStrokeWidth: 1.5
  unit:
    stroke:      "{colors.surface}"
    strokeWidth: 0.5
  axis:
    fontSize:    "{typography.label.fontSize}"
    labelOffset: 48
    tickCount:   6
  grid:
    width: 1px
  legend:
    swatchSize:   9
    swatchRadius: "{rounded.sm}"
    fontSize:     "{typography.label.fontSize}"
---

## Overview

A clean editorial design for data-driven storytelling. The visual character is
that of a quality newspaper's data desk — authoritative, undecorated, and
built to let the data make the argument.

The chart sits beside narrative prose, not above it. Every visual decision
should serve the reader's comprehension, not signal technical sophistication.
The dominant impression should be: quiet, clear, trustworthy.

## Colors

The palette is anchored by a medium Tableau blue as the primary series and
accent color. The supporting palette is Tableau 10 — an industry-standard
scheme designed for maximum hue separation at medium saturation.

- **Primary ({colors.primary}):** The first and dominant data series color,
  also used for interactive chrome (navigation dots, progress bar, active step
  border). Medium-dark blue: trustworthy, readable, not aggressive.
- **Surface ({colors.surface}):** Pure white. The chart SVG background.
  Mark outlines inherit this color so they "cut" against adjacent marks.
- **Background ({colors.bg}):** Warm off-white. The page and figure wrapper.
  Slightly warmer than pure white to reduce eye strain on long reads.
- **On-surface ({colors.on-surface}):** Near-black with a slight warm tint.
  Used for axis tick labels, legend text, figure titles.
- **Muted ({colors.muted}):** Medium cool gray. Secondary text: step bodies,
  captions, axis labels. Should never compete with data marks for attention.
- **Outline-variant ({colors.outline-variant}):** Very light gray for grid
  lines. Grid lines are structural hints, not visual elements.

The ten series colors are assigned by hue-maximisation: the algorithm picks
the color with the greatest minimum hue distance from already-chosen colors,
so small-N palettes (2–4 series) are as distinct as possible.

## Typography

A single humanist sans-serif stack (Inter at the top) across all text roles.
No size gymnastics; only two sizes matter:

- **Label:** {typography.label.fontSize} / {typography.label.fontWeight} —
  axis ticks, legend entries. Small enough to not compete with marks.
- **Body:** {typography.body.fontSize} — step prose, tooltips.

Axis tick labels are rendered by D3 and inherit `--sl-type-family`. No
special treatment; plain and readable.

## Layout & Spacing

An 8px base grid. The axis label offset (48px = 6 × 8px) places axis titles
at a comfortable reading distance from the outermost tick label.

## Shapes

Conservative corner rounding:

- **sm ({rounded.sm}px):** Legend swatches — just enough to look intentional.
- **md ({rounded.md}px):** Bar marks — softens the column without making it
  feel "app-like."
- **lg ({rounded.lg}px):** Figures and cards — matches browser default style.

Never use `full` on data marks. Pill-shaped bars lose area accuracy.

## Components

### Bar
Plain rectangles with {rounded.md}px rounding. Non-highlighted bars fade to
{components.bar.dimOpacity} opacity in highlight mode so the focused bar
reads clearly without removing the spatial context of neighbors.

### Point / Line-point
White-outlined circles. The {components.point.strokeWidth}px stroke
separates overlapping points on dense scatters. The stroke color inherits
`{colors.surface}` so it adapts when the surface changes (dark mode).

### Line
Stroke-width {components.line.width}px. Thin enough to not overpower small
multiples, thick enough to read at chart thumbnail size.

### Axis
Tick labels at {typography.label.fontSize} — the smallest legible size.
{components.axis.tickCount} ticks preferred on linear scales.

### Grid
Hairline rules at {components.grid.width} in {colors.outline-variant}.
The rule of thumb: if you can describe the grid in words, it's too visible.

## Do's and Don'ts

- **Do** let the hue-maximisation algorithm pick colors. Only override
  `range` when the data has intrinsic color meaning (e.g., temperature,
  party affiliation).
- **Do** use `--sl-muted` for all non-data text. Axis labels, step bodies,
  captions — none should compete visually with the data marks.
- **Don't** change the series palette per-step. The reader builds a
  mental model of what each color means; breaking that mid-story is
  disorienting.
- **Don't** add decorative backgrounds to the SVG figure. The white
  surface is the data's stage.
- **Don't** set bar radius above 6px. Above that, the mark reads as a
  pill, not a bar, and area judgment degrades.
