// @ts-nocheck — D3 rendering utilities; typed via deps injection
import { narrativeTransition } from '../scrolly-meta.js';
import { DEFAULT_TIMING, defaultTransition } from '../timing.js';
import { SCROLL_TRANSITION_NAME } from '../transition-progress.js';
import { clamp, escapeHtml, titleize } from './utils.js';

// ─── Color rules (Stephen Few, "Practical Rules for Using Color in Charts") ───
//
// Rule #3  Use color only when it serves a communication goal.
// Rule #4  Use different hues only for different meanings in the data.
// Rule #5  Soft, natural hues for most data; bright/dark for highlights.
// Rule #6  Sequential quantitative encoding: single hue, varying intensity.
// Rule #7  Non-data ink (axes, grid) barely visible — light grays only.
// Rule #8  Avoid red + green together (colorblind safety).
// Rule #9  No visual effects (gradients, 3-D, shadows on data marks).
//
// Categorical palette design (Rules #4 + #5):
//   • Use hues that are as distinct as possible — maximise minimum pairwise
//     hue distance so no two groups look similar.
//   • Keep similar lightness/saturation so no single group dominates visually.
//   • The Tableau 10 palette satisfies both criteria and is colorblind-safe
//     (no adjacent red+green pair in the hue-maximised assignment order).
// ─────────────────────────────────────────────────────────────────────────────

// Story-level color registry: field → (key → color string).
// Set once per story so the same semantic key always maps to the same color
// regardless of which subset of categories appears in a given scene.
let _storyColorRegistry: Map<string, Map<string, string>> | null = null;

export function setStoryColorRegistry(registry: Map<string, Map<string, string>> | null) {
  _storyColorRegistry = registry;
}

// Tableau 10 — widely-adopted, perceptually balanced categorical palette.
const DEFAULT_PALETTE = [
  ['--sl-series-1',  '#4e79a7'],
  ['--sl-series-2',  '#f28e2b'],
  ['--sl-series-3',  '#e15759'],
  ['--sl-series-4',  '#76b7b2'],
  ['--sl-series-5',  '#59a14f'],
  ['--sl-series-6',  '#edc948'],
  ['--sl-series-7',  '#b07aa1'],
  ['--sl-series-8',  '#ff9da7'],
  ['--sl-series-9',  '#9c755f'],
  ['--sl-series-10', '#bab0ac']
];
const DEFAULT_LUMINANCE_BASE = ['--sl-accent', '#4e79a7'];

// ─── Hue-maximisation helpers ─────────────────────────────────────────────────

// Circular angular distance between two hue angles (0–180°).
function hueDist(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Extract hue angle (0–360°) from a CSS color string.
// Supports #rrggbb, #rgb, and rgb(r,g,b).
// Returns null for near-achromatic colors (saturation range < 10 %).
function parseColorHue(color) {
  if (typeof color !== 'string') return null;
  let r, g, b;
  const hex = color.trim().match(/^#([0-9a-f]{3,6})$/i)?.[1];
  if (hex) {
    const full = hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex;
    r = parseInt(full.slice(0, 2), 16) / 255;
    g = parseInt(full.slice(2, 4), 16) / 255;
    b = parseInt(full.slice(4, 6), 16) / 255;
  } else {
    const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (!m) return null;
    r = Number(m[1]) / 255;
    g = Number(m[2]) / 255;
    b = Number(m[3]) / 255;
  }
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta < 0.1) return null; // near-achromatic — skip in hue selection
  let h;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  return (h * 60 + 360) % 360;
}

// Greedy farthest-first selection: choose n colors from `colors` such that the
// minimum pairwise hue distance among the chosen set is maximised.
// Near-achromatic entries are relegated to the end (appended only when needed).
// Works on any resolved-color array, so user-customised palettes benefit too.
export function pickCategoricalColors(n, colors) {
  if (n <= 0) return [];
  if (n >= colors.length) {
    return Array.from({ length: n }, (_, i) => colors[i % colors.length]);
  }
  const hues = colors.map(parseColorHue);
  const chromatic  = hues.map((h, i) => h !== null ? i : -1).filter((i) => i >= 0);
  const achromatic = hues.map((h, i) => h === null ? i : -1).filter((i) => i >= 0);

  if (chromatic.length === 0) return colors.slice(0, n); // all near-gray

  const chosen    = [chromatic[0]];
  const remaining = chromatic.slice(1);

  while (chosen.length < n) {
    if (remaining.length > 0) {
      let bestK = 0, bestMinDist = -Infinity;
      for (let k = 0; k < remaining.length; k++) {
        const i = remaining[k];
        const minDist = Math.min(...chosen.map((j) => hueDist(hues[i], hues[j])));
        if (minDist > bestMinDist) { bestMinDist = minDist; bestK = k; }
      }
      chosen.push(remaining.splice(bestK, 1)[0]);
    } else {
      // Chromatic pool exhausted — fill with achromatic entries
      const take = Math.min(achromatic.length, n - chosen.length);
      chosen.push(...achromatic.splice(0, take));
    }
  }
  return chosen.slice(0, n).map((i) => colors[i]);
}

// ─── Theme value helper ───────────────────────────────────────────────────────
// Reads a CSS custom property from :root at render time, with a typed fallback.
// Numeric fallback → strips units and returns a number (e.g. parseFloat("11px") = 11).
// String fallback  → returns the raw trimmed value.
// Falls back silently when running outside a browser (SSR / tests).
export function themeValue(cssVar, fallback) {
  if (typeof document === 'undefined') return fallback;
  const style = getComputedStyle(document.documentElement);
  const raw = style.getPropertyValue(cssVar).trim();
  if (!raw) return fallback;
  // Defensive var() resolution: if the browser returns an unresolved
  // var() reference (e.g. "var(--sl-rounded-md)"), resolve one level.
  // Modern browsers should already compute the final value, but this
  // guards against edge-cases and non-browser environments.
  if (raw.startsWith('var(')) {
    const m = raw.match(/^var\(\s*(--[\w-]+)(?:\s*,\s*([^)]*?))?\s*\)$/);
    if (m) {
      const resolved = style.getPropertyValue(m[1]).trim() || m[2]?.trim() || '';
      if (!resolved) return fallback;
      if (typeof fallback === 'number') {
        const n = parseFloat(resolved);
        return isNaN(n) ? fallback : n;
      }
      return resolved;
    }
    return fallback;
  }
  if (typeof fallback === 'number') {
    const n = parseFloat(raw);
    return isNaN(n) ? fallback : n;
  }
  return raw;
}
// ─────────────────────────────────────────────────────────────────────────────

export function transitionSpec(spec, previousSpec, { scrollDriven = false, d3 } = {}) {
  if (!d3) throw new Error('ScrollyLite transitions require D3. Pass { d3 } to createStory().');
  const local = narrativeTransition(spec);
  const previous = previousSpec ? narrativeTransition(previousSpec) : {};
  const transition = { ...defaultTransition(), ...previous, ...local };
  const ease = easeFor(transition.ease, d3);
  const base = (scrollDriven ? d3.transition(SCROLL_TRANSITION_NAME) : d3.transition())
    .duration(transition.duration).ease(ease);
  return { ...transition, base };
}

export function effectiveTransitionSpec(spec = {}) {
  return defaultTransition(narrativeTransition(spec));
}

export function easeFor(name, d3) {
  const eases = {
    linear: d3.easeLinear, cubic: d3.easeCubic, cubicInOut: d3.easeCubicInOut,
    exp: d3.easeExp, expInOut: d3.easeExpInOut, elastic: d3.easeElasticOut, back: d3.easeBackOut
  };
  return eases[name] || d3.easeCubicInOut;
}

export function activeMarkLayer(scene, mark, transition) {
  fadeLayers(scene, mark, transition);
  if (!scene.markLayers.has(mark)) {
    scene.markLayers.set(mark, scene.markRoot.append('g').attr('class', `sl-mark-layer sl-${mark}-layer`));
  }
  const layer = scene.markLayers.get(mark);
  layer.interrupt().style('display', null).transition(transition.base).style('opacity', 1);
  return layer;
}

export function fadeLayers(scene, activeMark, transition = null, d3 = null) {
  const resolvedTransition = transition || { base: d3.transition().duration(300) };
  scene.markLayers.forEach((layer, mark) => {
    if (mark === activeMark) return;
    layer.interrupt().transition(resolvedTransition.base).style('opacity', 0);
  });
  scene.textLayer.interrupt().transition(resolvedTransition.base).style('opacity', activeMark === 'text' ? 1 : 0);
}

export function staggerDelay(spec, datum, index, override) {
  const stagger = override === undefined ? effectiveTransitionSpec(spec).stagger : override;
  if (!stagger) return 0;
  if (typeof stagger === 'number') return index * stagger;
  const step = stagger.step ?? stagger.ms ?? DEFAULT_TIMING.transition.stagger.step;
  const max = stagger.max ?? DEFAULT_TIMING.transition.stagger.max;
  if (stagger.by) {
    const value = Number(datum[stagger.by] ?? datum.__row?.[stagger.by] ?? index);
    if (Number.isFinite(value)) return Math.min(value * step, max);
  }
  return Math.min(index * step, max);
}

export function curveFor(spec, d3) {
  const curves = { linear: d3.curveLinear, monotoneX: d3.curveMonotoneX, basis: d3.curveBasis, step: d3.curveStep };
  return curves[spec.curve] || d3.curveMonotoneX;
}

export function drawPath(selection, transition, d3) {
  selection.each(function() {
    const path = d3.select(this);
    const total = this.getTotalLength();
    path.attr('stroke-dasharray', `${total} ${total}`)
      .attr('stroke-dashoffset', total)
      .style('opacity', 1)
      .transition(transition)
      .attr('stroke-dashoffset', 0)
      .on('end', function() {
        d3.select(this).attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
      });
  });
}

export function fadeNonBarShapes(chart) {
  chart.g.selectAll('circle,path:not(.sl-line)').transition(chart.transition.base).style('opacity', 0);
}

export function fadeNonLineShapes(chart) {
  chart.g.selectAll('rect.sl-bar,circle.sl-point,circle.sl-unit').transition(chart.transition.base).style('opacity', 0);
}

export function fadeNonPointShapes(chart) {
  chart.g.selectAll('rect.sl-bar,path.sl-line,circle.sl-line-point,circle.sl-unit').transition(chart.transition.base).style('opacity', 0);
}

export function fadeNonUnitShapes(chart) {
  chart.g.selectAll('rect.sl-bar,path.sl-line,circle.sl-line-point,circle.sl-point').transition(chart.transition.base).style('opacity', 0);
}

export function applyPlotClip(chart, enabled) {
  if (!enabled) { chart.g.attr('clip-path', null); return; }
  const id = `sl-mark-clip-${chart.scene.node.dataset.viewId || 'main'}`;
  ensureClipRect(chart.scene, id, { x: 0, y: 0, width: chart.innerWidth, height: chart.innerHeight });
  chart.g.attr('clip-path', `url(#${id})`);
}

export function drawTextBoard(scene, spec) {
  const items = Array.isArray(spec.text) ? spec.text : [spec.text || ''];
  scene.textLayer
    .attr('x', 0).attr('y', 0).attr('width', scene.width).attr('height', scene.height)
    .html(`<div class="sl-text-board"><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`);
}

export function drawUnsupported(chart, spec, availableTypes = []) {
  chart.g.append('text')
    .attr('x', chart.innerWidth / 2).attr('y', chart.innerHeight / 2)
    .attr('text-anchor', 'middle').attr('fill', 'var(--sl-muted)')
    .text(`Unsupported chart idiom for "${spec.mark}"${availableTypes.length ? ` · available: ${availableTypes.join(', ')}` : ''}`);
}

export function bandOrLinear(rows, channel, range, d3) {
  if (!channel) return d3.scaleLinear().domain([0, 1]).range(range);
  if (channel.type === 'quantitative') return quantitativeScale(rows, channel, range, d3);
  if (channel.type === 'temporal') {
    return d3.scaleTime().domain(channel.domain || d3.extent(rows, (d) => new Date(d[channel.field]))).range(range);
  }
  return d3.scaleBand().domain(channelDomain(rows, channel)).range(range).padding(0.24);
}

export function quantitativeScale(rows, channel = {}, range, d3) {
  const scaleType = channel.scale?.type || channel.scaleType || 'linear';
  const domain = quantitativeDomain(rows, channel, scaleType === 'log' ? 1 : undefined);
  if (scaleType === 'log') {
    const safeDomain = domain.map((value) => Math.max(Number(value) || 1, 0.1));
    return d3.scaleLog().domain(safeDomain).range(range).nice();
  }
  if (scaleType === 'sqrt') return d3.scaleSqrt().domain(domain).range(range).nice();
  return d3.scaleLinear().domain(domain).range(range).nice();
}

export function position(scale, value) {
  const scaled = scale(value);
  if (typeof scale.bandwidth === 'function') return scaled + scale.bandwidth() / 2;
  return scaled;
}

export function niceExtent(rows, field, floor) {
  const values = rows.map((row) => Number(row[field])).filter(Number.isFinite);
  if (!values.length) return [0, 1];
  const min = floor ?? Math.min(...values);
  const max = Math.max(...values);
  return min === max ? [min - 1, max + 1] : [min, max];
}

export function quantitativeDomain(rows, channel = {}, floor) {
  if (Array.isArray(channel.domain)) return channel.domain;
  return niceExtent(rows, channel.field, floor);
}

export function channelDomain(rows, channel = {}) {
  if (Array.isArray(channel.domain)) return channel.domain;
  return Array.from(new Set(rows.map((row) => row[channel.field])));
}

export function colorScale(rows, channel, d3) {
  const resolved = resolveColorChannel(rows, channel);
  if (!resolved) return () => cssColor('var(--sl-accent)', '#4e79a7');
  channel = resolved;
  if (channel.value) return () => cssColor(channel.value, '#4e79a7');
  if (channel.hue || channel.luminance) return compositeColorScale(channel, d3);
  if (!channel.field) return () => cssColor('var(--sl-accent)', '#4e79a7');
  if (channel.type === 'quantitative') return luminanceColorScale(rows, channel, d3);
  // Use story-level registry for consistent key→color mapping across scenes.
  const fieldRegistry = !channel.range && _storyColorRegistry?.get(channel.field);
  if (fieldRegistry) {
    const fallback = cssColor('var(--sl-accent)', '#4e79a7');
    return (row) => fieldRegistry.get(String(row[channel.field])) ?? fallback;
  }
  const domain = channelDomain(rows, channel);
  const scale = d3.scaleOrdinal(colorRange(channel.range || categoricalRange(domain))).domain(domain);
  return (row) => scale(row[channel.field]);
}

export function drawXAxis(chart, scale, title, d3, transition = chart.transition.base) {
  if (!scale) {
    markAxisInactive(chart.scene.xAxis);
    chart.scene.xAxis.transition(transition).style('opacity', 0);
    chart.scene.xLabel.transition(transition).style('opacity', 0);
    return;
  }
  applyXAxisClip(chart);
  const tickCount = themeValue('--sl-tick-count', 6);
  const labelOffset = themeValue('--sl-axis-label-offset', 48);
  let axis = typeof scale.bandwidth === 'function' ? d3.axisBottom(scale) : d3.axisBottom(scale).ticks(tickCount);
  // Adaptive label thinning for band (categorical) x-axes:
  // when available px-per-band < threshold, skip every Nth label so they never overlap.
  if (typeof scale.bandwidth === 'function') {
    const domain = scale.domain();
    const minPxPerLabel = 44; // ~5 chars × 7px + 9px padding
    const pxPerBand = domain.length > 0 ? chart.innerWidth / domain.length : Infinity;
    if (pxPerBand < minPxPerLabel) {
      const step = Math.ceil(minPxPerLabel / pxPerBand);
      axis = axis.tickValues(domain.filter((_, i) => i % step === 0));
    }
  }
  const transform = `translate(${chart.margin.left},${chart.margin.top + chart.innerHeight})`;
  const xAxis = chart.scene.xAxis.interrupt().attr('transform', transform);
  renderAxisWithGuard(xAxis, axis, transition, axisKind('bottom', scale));
  xAxis.selectAll('.tick text').attr('dy', '0.8em');
  alignEdgeTickLabels(xAxis, scale, d3);
  xAxis.transition(transition).style('opacity', 1);
  if (title) {
    chart.scene.xLabel
      .attr('x', chart.innerWidth / 2).attr('y', chart.margin.top + chart.innerHeight + labelOffset)
      .attr('text-anchor', 'middle').attr('transform', `translate(${chart.margin.left},0)`)
      .text(title).transition(transition).style('opacity', 1);
  } else {
    chart.scene.xLabel.transition(transition).style('opacity', 0);
  }
}

export function drawYAxis(chart, scale, title, d3, transition = chart.transition.base) {
  if (!scale) {
    markAxisInactive(chart.scene.yAxis);
    chart.scene.yAxis.transition(transition).style('opacity', 0);
    chart.scene.yLabel.transition(transition).style('opacity', 0);
    return;
  }
  const tickCount = themeValue('--sl-tick-count', 6);
  const labelOffset = themeValue('--sl-axis-label-offset', 48);
  let axis = typeof scale.bandwidth === 'function' ? d3.axisLeft(scale) : d3.axisLeft(scale).ticks(tickCount);
  // Adaptive label thinning for band (categorical) y-axes (horizontal bar charts):
  if (typeof scale.bandwidth === 'function') {
    const domain = scale.domain();
    const minPxPerLabel = 22; // vertical: ~1 line height
    const pxPerBand = domain.length > 0 ? chart.innerHeight / domain.length : Infinity;
    if (pxPerBand < minPxPerLabel) {
      const step = Math.ceil(minPxPerLabel / pxPerBand);
      axis = axis.tickValues(domain.filter((_, i) => i % step === 0));
    }
  }
  const yAxis = chart.scene.yAxis.interrupt().attr('transform', `translate(${chart.margin.left},${chart.margin.top})`);
  renderAxisWithGuard(yAxis, axis, transition, axisKind('left', scale));
  yAxis.transition(transition).style('opacity', 1);
  if (title) {
    chart.scene.yLabel
      .attr('x', -chart.innerHeight / 2).attr('y', chart.margin.left - labelOffset)
      .attr('text-anchor', 'middle').attr('transform', `translate(0,${chart.margin.top}) rotate(-90)`)
      .text(title).transition(transition).style('opacity', 1);
  } else {
    chart.scene.yLabel.transition(transition).style('opacity', 0);
  }
}

export function drawGrid(chart, y, d3, transition = chart.transition.base) {
  updateGrid(chart, y, d3, transition);
}

export function updateGrid(chart, y, d3, transition = chart.transition.base) {
  if (!y) {
    markAxisInactive(chart.scene.grid);
    chart.scene.grid.transition(transition).style('opacity', 0);
    return;
  }
  const grid = chart.scene.grid.interrupt().attr('transform', null);
  renderAxisWithGuard(grid, d3.axisLeft(y).ticks(themeValue('--sl-tick-count', 6)).tickSize(-chart.innerWidth).tickFormat(''), transition, axisKind('grid-left', y));
  grid.transition(transition).style('opacity', 1);
}

export function drawLegend(chart, rows, channel, d3) {
  const colorRows = chart.domainRows?.length ? chart.domainRows : rows;
  channel = resolveColorChannel(colorRows, channel);
  if (!channel || channel.value || (!channel.field && !channel.hue && !channel.luminance)) {
    chart.scene.legend.transition(chart.transition.base).style('opacity', 0);
    return;
  }
  const legendChannel = channel.hue?.field ? channel.hue : channel.luminance?.field ? channel.luminance : channel;
  const quantitativeLegend = legendChannel.type === 'quantitative';
  const domain = quantitativeLegend
    ? quantitativeLegendDomain(colorRows, legendChannel, d3)
    : channelDomain(colorRows, legendChannel);
  const fieldRegistry = !channel.range && !channel.hue && !channel.luminance && !quantitativeLegend
    ? _storyColorRegistry?.get(legendChannel.field)
    : null;
  const scale = channel.hue || channel.luminance
    ? compositeColorScale(channel, d3)
    : quantitativeLegend
      ? luminanceColorScale(colorRows, legendChannel, d3)
      : fieldRegistry
        ? (d) => fieldRegistry.get(String(d)) ?? cssColor('var(--sl-accent)', '#4e79a7')
        : d3.scaleOrdinal(channel.range || categoricalRange(domain)).domain(domain);
  const legendRow = (value) => ({ [legendChannel.field]: value });
  const legend = chart.scene.legend.interrupt().style('opacity', 1)
    .attr('transform', `translate(${chart.margin.left},${Math.max(18, chart.margin.top - 32)})`);
  const items = legend.selectAll('g.sl-legend-item').data(domain, (d) => d);
  const entered = items.enter().append('g').attr('class', 'sl-legend-item').style('opacity', 0);
  const swatchSize = themeValue('--sl-legend-swatch-size', 9);
  const swatchRadius = themeValue('--sl-legend-swatch-radius', 1.5);
  entered.append('rect').attr('width', swatchSize).attr('height', swatchSize).attr('rx', swatchRadius);
  entered.append('text').attr('x', swatchSize + 6).attr('y', swatchSize - 0.5);
  items.merge(entered).transition(chart.transition.base).style('opacity', 1)
    .attr('transform', (_, index) => `translate(${legendItemX(domain, index)},0)`);
  items.merge(entered).select('rect').transition(chart.transition.base)
    .attr('fill', (d) => channel.hue || channel.luminance ? scale(legendRow(d)) : scale(d));
  items.merge(entered).select('text').text((d) => quantitativeLegend ? d3.format('~g')(d) : d);
  items.exit().transition(chart.transition.base).style('opacity', 0).remove();
}

export function bindTooltip(selection, spec, tooltip) {
  selection
    .on('mouseenter', (event, row) => { const html = tooltipHtml(row, spec.encoding?.tooltip); if (html) showTooltip(tooltip, event, html); })
    .on('mousemove', (event) => moveTooltip(tooltip, event))
    .on('mouseleave', () => hideTooltip(tooltip));
}

export function showTooltip(tooltip, event, html) {
  tooltip.innerHTML = html;
  tooltip.style.opacity = '1';
  moveTooltip(tooltip, event);
}

export function moveTooltip(tooltip, event) {
  tooltip.style.left = `${event.clientX + 14}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
}

export function hideTooltip(tooltip) { tooltip.style.opacity = '0'; }

export function markAxisInactive(axisGroup) {
  const node = axisGroup.node();
  if (!node) return;
  node.__scrollyLiteAxisActive = false;
}

function applyXAxisClip(chart) {
  const id = `sl-x-axis-clip-${chart.scene.node.dataset.viewId || 'main'}`;
  ensureClipRect(chart.scene, id, { x: -28, y: -8, width: chart.innerWidth + 56, height: 72 });
  chart.scene.xAxis.attr('clip-path', `url(#${id})`);
}

function ensureClipRect(scene, id, rect) {
  let defs = scene.svg.select('defs');
  if (defs.empty()) defs = scene.svg.append('defs');
  defs.selectAll(`#${id}`).data([null]).join('clipPath').attr('id', id)
    .selectAll('rect').data([null]).join('rect')
    .attr('x', rect.x).attr('y', rect.y).attr('width', rect.width).attr('height', rect.height);
}

function alignEdgeTickLabels(axisGroup, scale, d3) {
  if (typeof scale.bandwidth === 'function' || typeof scale.range !== 'function') return;
  const range = scale.range();
  const min = Math.min(...range), max = Math.max(...range);
  axisGroup.selectAll('.tick').each(function() {
    const tick = d3.select(this);
    const match = (tick.attr('transform') || '').match(/translate\(([-\d.]+)/);
    if (!match) return;
    const x = Number(match[1]);
    const text = tick.select('text');
    if (Math.abs(x - min) <= 1) text.attr('text-anchor', 'start').attr('dx', '0.15em');
    else if (Math.abs(x - max) <= 1) text.attr('text-anchor', 'end').attr('dx', '-0.15em');
    else text.attr('text-anchor', 'middle').attr('dx', null);
  });
}

function axisKind(placement, scale) {
  return `${placement}:${typeof scale.bandwidth === 'function' ? 'band' : 'continuous'}`;
}

function renderAxisWithGuard(axisGroup, axis, transition, kind) {
  const node = axisGroup.node();
  const canTransition = node?.__scrollyLiteAxisActive && node.__scrollyLiteAxisKind === kind;
  if (node) { node.__scrollyLiteAxisActive = true; node.__scrollyLiteAxisKind = kind; }
  if (canTransition) { axisGroup.transition(transition).call(axis); return; }
  axisGroup.call(axis);
}

function resolveColorChannel(rows, channel) {
  if (channel === false) return null;
  if (channel?.value) return channel;
  if (channel?.hue || channel?.luminance) {
    return {
      ...channel,
      ...(channel.hue ? { hue: normalizeColorSubchannel(rows, channel.hue) } : {}),
      ...(channel.luminance ? { luminance: normalizeColorSubchannel(rows, channel.luminance) } : {})
    };
  }
  if (channel?.field) return { ...channel, type: channel.type || inferFieldType(rows, channel.field) };
  const field = defaultColorField(rows);
  if (!field) return null;
  return { field, type: inferFieldType(rows, field), inferred: true };
}

function normalizeColorSubchannel(rows, channel = {}) {
  if (!channel.field) return channel;
  return { ...channel, type: channel.type || inferFieldType(rows, channel.field) };
}

function defaultColorField(rows) {
  const preferred = ['type', 'kind', 'category', 'group', 'series', 'period'];
  return preferred.find((field) => rows.some((row) => row[field] != null));
}

function inferFieldType(rows, field) {
  const values = rows.map((row) => row[field]).filter((value) => value != null && value !== '');
  if (!values.length) return 'nominal';
  return values.every((value) => Number.isFinite(Number(value))) ? 'quantitative' : 'nominal';
}

// Automatic categorical color assignment: resolve the active palette from CSS
// variables, then use greedy farthest-first hue selection so that the n chosen
// colors are as distinct as possible (Rules #4 + #5).
function categoricalRange(domain) {
  const resolved = DEFAULT_PALETTE.map((entry) => themeColor(entry));
  // Sequential slot assignment: Nth category → series-N. Consistent with the
  // stacked/grouped bar idiom's explicit 'var(--sl-series-N)' range and with
  // the story-level registry, so fallback scenes never get mismatched colors.
  return domain.map((_, i) => resolved[i % resolved.length]);
}

function luminanceColorScale(rows, channel, d3) {
  const domain = quantitativeDomain(rows, channel);
  const base = cssColor(channel.base || channel.value || themeColor(DEFAULT_LUMINANCE_BASE), '#4e79a7');
  const lightness = channel.lightness || [22, -18];
  const scale = d3.scaleLinear().domain(domain).range(lightness).clamp(true);
  return (row = {}) => adjustLightness(base, scale(Number(row[channel.field])), d3);
}

function themeColor([name, fallback] = []) {
  if (!name) return fallback;
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function colorRange(range = []) {
  return range.map((color, index) => cssColor(color, themeColor(DEFAULT_PALETTE[index % DEFAULT_PALETTE.length])));
}

function cssColor(color, fallback = '#4e79a7') {
  if (typeof color !== 'string') return color || fallback;
  const value = color.trim();
  if (!value.startsWith('var(')) return value || fallback;
  if (typeof document === 'undefined') return fallback;
  const name = value.match(/^var\(\s*(--[^,\s)]+)/)?.[1];
  if (!name) return fallback;
  const resolved = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const inlineFallback = value.match(/,\s*([^)]+)\)$/)?.[1]?.trim();
  return resolved || inlineFallback || fallback;
}

function compositeColorScale(channel, d3) {
  const hue = channel.hue || {};
  const luminance = channel.luminance || {};
  const hueDomain = hue.domain || [];
  const hueScale = d3.scaleOrdinal(colorRange(hue.range || categoricalRange(hueDomain))).domain(hueDomain);
  const luminanceDomain = luminance.domain || [];
  const continuousLuminance = luminance.type === 'quantitative' ||
    (luminanceDomain.length === 2 && luminanceDomain.every((value) => Number.isFinite(Number(value))));
  const lightness = luminance.lightness || [18, 0, -18];
  const lightnessScale = continuousLuminance
    ? d3.scaleLinear().domain(luminanceDomain.map(Number)).range([lightness[0], lightness[lightness.length - 1]]).clamp(true)
    : d3.scaleOrdinal(lightness).domain(luminanceDomain);
  return (row = {}) => {
    const base = cssColor(hue.value || hueScale(row[hue.field]), '#4e79a7');
    const luminanceValue = row[luminance.field];
    const offset = luminance.field && (continuousLuminance || luminanceDomain.includes(luminanceValue))
      ? Number(lightnessScale(continuousLuminance ? Number(luminanceValue) : luminanceValue)) || 0
      : 0;
    return adjustLightness(base, offset, d3);
  };
}

function adjustLightness(color, offset, d3) {
  const resolved = cssColor(color, '#4e79a7');
  const hcl = d3.hcl(resolved);
  if (!Number.isFinite(hcl.l)) return resolved;
  hcl.l = clamp(hcl.l + offset, 0, 100);
  return hcl.formatHex();
}

function quantitativeLegendDomain(rows, channel, d3) {
  const [min, max] = quantitativeDomain(rows, channel);
  if (min === max) return [min];
  return d3.ticks(min, max, 3);
}

function legendItemX(domain, index) {
  return domain.slice(0, index).reduce((x, value) => x + String(value).length * 7 + 30, 0);
}

function tooltipHtml(row, tooltipSpec) {
  if (tooltipSpec === false) return '';
  const source = row?.__row && typeof row.__row === 'object' ? row.__row : row;
  const items = Array.isArray(tooltipSpec)
    ? tooltipSpec
    : Object.keys(source || {})
        .filter((field) => !field.startsWith('__') && (source[field] == null || typeof source[field] !== 'object'))
        .map((field) => ({ field, title: titleize(field) }));
  return items
    .map((item) => `<strong>${escapeHtml(item.title || titleize(item.field))}</strong>: ${escapeHtml(source[item.field])}`)
    .join('<br>');
}
