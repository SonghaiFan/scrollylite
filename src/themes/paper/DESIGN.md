---
name: ScrollyLite Paper
description: >
  Newspaper and magazine editorial style. Ink on newsprint.
  Serif typeface, cream paper background, minimal chrome — designed for
  narrative-first data journalism where tone is personal and unhurried.

colors:
  primary:          "#8b1a0a"
  surface:          "#fefcf5"
  bg:               "#f4ede0"
  on-surface:       "#1a1008"
  muted:            "#7a6a50"
  border:           "#c8b898"
  outline:          "#a89070"
  outline-variant:  "#e0d4c0"
  series-1:         "#8b1a0a"
  series-2:         "#2a5a3a"
  series-3:         "#1e3a6a"
  series-4:         "#6a3a1a"
  series-5:         "#8a6a10"
  series-6:         "#2a5a5a"
  series-7:         "#6a1a4a"
  series-8:         "#3a5a1a"
  series-9:         "#5a3a0a"
  series-10:        "#3a3a3a"

typography:
  label:
    fontFamily: "Georgia, \"Palatino Linotype\", Palatino, serif"
    fontSize: 11px
    fontWeight: 400
  body:
    fontFamily: "Georgia, \"Palatino Linotype\", Palatino, serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.75

rounded:
  sm: 0
  md: 1
  lg: 0

components:
  bar:
    radius: "{rounded.md}"
    dimOpacity: 0.18
  line:
    width: 2
  axis:
    fontSize: "{typography.label.fontSize}"
---

## Overview

A newspaper and magazine editorial character. Ink on cream newsprint.
The visual premise: your reader is holding a Sunday supplement.

The chart is a graphic in an article — boxed with a simple column rule,
no floating shadow, no rounded corners. It does not look like software.

## Cards

**Figure card** — bordered print graphic. A heavy 2px rule across the top
marks the chart as a distinct editorial unit (the "column-top" convention in
broadsheet layout). No drop shadow — print has no shadows.

**Step card** — bare text on paper. In the textOverVis layout, the narrative
text appears directly on the cream background with no card wrapper. Only the
active step gets a bold masthead-red left rule. This is closest to reading
a newspaper article where a pull-quote marks the key moment.

## Colors

Masthead red (`{colors.primary}`) is the headline color of every newspaper
since Gutenberg. Used sparingly — only for the active step accent and the
figure title.

The series palette is entirely earthy inks: umber, forest green, ink blue,
mustard, teal, plum. These are colors that reproduce well on newsprint
(coated or uncoated stock). Avoid bright saturated series colors in this
theme — they read as "web" rather than "print."

## Typography

Georgia is the canonical screen-serif. At 11px/400, it achieves the same
visual weight as Inter 500 in the default theme. The italic title style on
the figure (`font-style: italic`) mimics the italic deck headline used in
magazine section breaks.

## Do's and Don'ts

- **Do** keep series count low (2–3). Earthy inks lose distinctiveness past 4 series.
- **Do** use left-aligned text in step cards. Centered text looks like a carousel.
- **Don't** add card shadows — it breaks the print illusion entirely.
- **Don't** use this theme for dashboard-style charts. It's optimized for single narrative figures.
