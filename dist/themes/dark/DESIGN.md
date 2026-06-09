---
name: ScrollyLite Dark
description: >
  Dark editorial theme for immersive data storytelling. Low-luminance
  backgrounds reduce eye strain in ambient-light reading environments while
  the brightened Tableau palette maintains perceptual contrast.

colors:
  primary:          "#79b4d9"
  surface:          "#1c1f27"
  bg:               "#13151a"
  on-surface:       "#dde2ea"
  muted:            "#8490a0"
  border:           "#2a2f3d"
  outline:          "#38404f"
  outline-variant:  "#1f2330"
  series-1:         "#79b4d9"
  series-2:         "#f5a55a"
  series-3:         "#f07070"
  series-4:         "#8ecece"
  series-5:         "#6fc26f"
  series-6:         "#f5d76e"
  series-7:         "#c895c5"
  series-8:         "#ffb3be"
  series-9:         "#b08870"
  series-10:        "#c8c0ba"

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
    dimOpacity: 0.15
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

A dark reading environment for data narratives viewed in dim conditions:
late-night reads, data journalism embeds in dark-mode browsers, and
presentation mode. The design decision is not "dark for aesthetic effect" —
it is a functional shift in luminance hierarchy.

The dominant impression should be: cinematic, focused, precise. The data is
lit; everything else recedes.

## Colors

Dark themes cannot simply invert the default palette. The Tableau 10 colors
at their standard saturation become neon against a dark background — harsh,
glowing, fighting each other. The fix is to raise lightness slightly and
reduce chroma on the most saturated series.

The rule applied here: every series color should read comfortably at 40–50 cd/m²
simulated display luminance. Colors that passed were kept; colors that bloomed
were shifted toward the axis L≈68, C≈60 in Oklch space.

- **Primary ({colors.primary}):** Lightened Tableau blue. Still reads as
  "data blue" but does not bloom against {colors.bg}.
- **Surface ({colors.surface}):** Dark blue-grey. The chart SVG background
  and the color that mark strokes inherit — crucial for dark mode since white
  strokes would create harsh halos.
- **Background ({colors.bg}):** Near-black with a slight blue cast. Matches
  the character of a dark-mode browser page; pure black (#000) is harsher
  than necessary and reads as "terminal" rather than "editorial."
- **On-surface ({colors.on-surface}):** Cool off-white. Axis tick labels,
  legend text. Never pure white — pure white luminance contrast on dark
  creates fatigue on long reads.
- **Muted ({colors.muted}):** Mid-grey. Step prose, captions. These should
  visually recede behind the data marks.
- **Outline-variant ({colors.outline-variant}):** Very dark blue-grey for
  grid lines. Almost invisible — just enough to orient spatial scale.

## Mark Stroke

The key token that differs most from the default: `--sl-mark-stroke` resolves
to `{colors.surface}` instead of white. On a dark background, a white stroke
on a dark-coloured data mark would produce a bright halo that draws the eye
away from the mark's color. Using the surface colour means the "cut" is
invisible at rest and only reveals itself when marks truly overlap.

## Dim Opacity

In highlight mode, non-focused bars fade to {components.bar.dimOpacity}
rather than the default 0.22. The lower value is needed because on a dark
background, 22% opacity still reads as a distinct visual element — the
"dimmed" bars compete with the focused bar for attention. 15% pushes them
almost fully into the background, making the highlight crisp.

## Contrast Accessibility

The `{colors.on-surface}` / `{colors.bg}` pair achieves approximately 11:1
contrast, well above the WCAG AA (4.5:1) and AAA (7:1) requirements for
body text. The `{colors.muted}` / `{colors.bg}` pair is approximately 4.5:1
— AA compliant for text used as secondary labels.

## Typography

Same font stack as the default theme. Dark mode benefits from slightly
reduced font weight at small sizes (thinner strokes are less blurry on
sub-pixel rendering in dark mode), but Inter at weight 500 for labels
remains the right choice — lighter weights vanish against dark backgrounds
at 11px.

## Do's and Don'ts

- **Do** use `{colors.surface}` (via `--sl-mark-stroke`) for mark outlines.
  Never hardcode `white` as a stroke in dark mode.
- **Do** trust the brightened series palette. The temptation to add more
  saturation is almost always wrong — it creates neon on dark.
- **Don't** use bright background fills on step cards in this theme. The
  step cards use `{colors.surface}` (not `{colors.bg}`) for a slight lift
  that maintains the dark character without going fully flat.
- **Don't** use `{colors.primary}` as a UI accent for anything other than
  the active/focused state. In dark mode, overuse of the primary color looks
  like a neon sign.
