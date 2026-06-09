---
name: ScrollyLite Warm
description: >
  Warm editorial theme evoking long-form print journalism — ink on cream,
  earthy data marks, serif body text. Suited to story-driven data journalism
  where the tone is personal, narrative, and unhurried.

colors:
  primary:          "#b95c1a"
  surface:          "#fffdf8"
  bg:               "#faf6ef"
  on-surface:       "#2a1f14"
  muted:            "#8a7460"
  border:           "#e4d8c8"
  outline:          "#c8b89a"
  outline-variant:  "#ede8de"
  series-1:         "#b95c1a"
  series-2:         "#4d7c5a"
  series-3:         "#5c7a9e"
  series-4:         "#8c5e8c"
  series-5:         "#9a7a1c"
  series-6:         "#7a4a2a"
  series-7:         "#4a7272"
  series-8:         "#c47a50"
  series-9:         "#6a7254"
  series-10:        "#a09080"

typography:
  label:
    fontFamily: "Georgia, \"Palatino Linotype\", Palatino, serif"
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "Georgia, \"Palatino Linotype\", Palatino, serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.75

rounded:
  sm:   2
  md:   4
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
    dimOpacity: 0.20
  point:
    stroke:      "{colors.surface}"
    strokeWidth: 1.5
  line:
    width:     2.5
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

A warm editorial character that evokes print journalism — cream-tinted paper
background, earthen ink colors, and a serif typeface that places the story
voice ahead of the data display.

This theme says: the data lives in a story. The implied reader is holding a
Sunday supplement, not a business dashboard. The marks look grounded, worn
slightly by the texture of the page.

## Colors

The palette is built around a terracotta primary ({colors.primary}) and a
set of earth-tone series colors that avoid the cool, saturated hues typical
of data visualization:

- **Primary ({colors.primary}):** Burnt terracotta. Warm, assertive, and
  distinctly editorial. Marks the first data series and interactive chrome.
- **Surface ({colors.surface}):** Near-white with a warm tint. The SVG
  figure background. Close enough to white for chart elements to read, but
  warm enough to feel continuous with the page.
- **Background ({colors.bg}):** Cream. The page background — the "paper."
  Slightly more yellow-shifted than the surface to give the figure a gentle
  lift.
- **On-surface ({colors.on-surface}):** Near-black with warm undertone.
  Ink on cream, essentially. Very dark brown rather than true black — true
  black on cream reads as "printed PDF" rather than "editorial."
- **Muted ({colors.muted}):** Warm tan/brown. Secondary labels. Much warmer
  than a neutral gray — this is where the "aged newspaper" tone lives.
- **Outline-variant ({colors.outline-variant}):** Warm off-white for grid
  lines. Barely visible against the page, like faint ruled lines on paper.

### Series Palette Design

The ten series colors are earth tones: terracotta, sage, slate-blue, mauve,
gold, clay, teal, amber, moss, and warm grey. None of the colors "pop"
against the warm background the way Tableau blue pops against white — they
are integrated into the page rather than floating above it. This is
intentional: marks that feel embedded in the page feel authoritative rather
than decorative.

The tradeoff is reduced perceptual separability at 6+ series. This theme is
optimized for 2–4 series stories. For multi-series data journalism, the
default or dark theme will provide better discrimination.

## Typography

Serif body text is the defining character of this theme. Georgia is the
first choice — excellent screen rendering, widely available, and correctly
associated with editorial long-form. Palatino is the print-press fallback.

Axis labels inherit the serif font at {typography.label.fontSize}/400.
Counterintuitively, the label font weight is 400 (not 500 as in the default)
because Georgia at 500 renders with excessive stroke weight at 11px. The
natural weight of Georgia at 400 in this size is equivalent to Inter 500.

## Line Weight

Lines use {components.line.width}px rather than the default 3px. The
slightly thinner line integrates better with the texture of the warm page —
3px lines on a cream background look bold and slightly aggressive. 2.5px
reads as "deliberate ink stroke."

## Bar Radius

{rounded.md}px rather than 3px — fractionally more rounded to soften the
mark within the warm editorial context. Data journalism charts on print pages
often use slightly rounded bars to distinguish them from financial/business
charts.

## Do's and Don'ts

- **Do** use this theme for narrative-first stories where the prose carries
  the argument. The visual tone supports extended reading.
- **Do** keep color counts low. This palette was designed for 2–4 series.
  At 6+ series, the earthy colors lose distinctiveness against the warm bg.
- **Don't** use this theme for dashboards or comparison-heavy charts. The
  earth-tone palette deprioritizes perceptual discrimination in favor of
  aesthetic cohesion.
- **Don't** mix in other typefaces. Serif + sans-serif combinations look
  accidental in this context — the mono-serif tone is the point.
- **Don't** change the background from cream. A white background in this
  theme collapses the warm-ink effect entirely.
