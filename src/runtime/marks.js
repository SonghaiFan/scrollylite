import { narrativeTransition } from "../scrolly-meta.js?v=semantic-key-10";
import { DEFAULT_TIMING, defaultTransition } from "../timing.js";
import { SCROLL_TRANSITION_NAME } from "../transition-progress.js?v=scroll-transition-name-2";
import { clamp, escapeHtml, getD3, titleize } from "./utils.js";

const DEFAULT_PALETTE = [
  "#2f7d7e",
  "#b05d3b",
  "#536a9e",
  "#8d6e3f",
  "#557f4d",
  "#9b4f6d",
  "#c18f2f",
  "#4f7f99"
];
const DEFAULT_LUMINANCE_BASE = "#2f7d7e";
const SEMANTIC_CATEGORY_COLORS = {
  "hot": "#b05d3b",
  "hot days": "#b05d3b",
  "cold": "#536a9e",
  "cold days": "#536a9e"
};

export function transitionSpec(spec, previousSpec, { scrollDriven = false } = {}) {
  const local = narrativeTransition(spec);
  const previous = previousSpec ? narrativeTransition(previousSpec) : {};
  const transition = {
    ...defaultTransition(),
    ...previous,
    ...local
  };
  const d3 = getD3();
  const ease = easeFor(transition.ease, d3);
  const base = (scrollDriven ? d3.transition(SCROLL_TRANSITION_NAME) : d3.transition())
    .duration(transition.duration)
    .ease(ease);
  return { ...transition, base };
}

export function effectiveTransitionSpec(spec = {}) {
  return defaultTransition(narrativeTransition(spec));
}

export function easeFor(name, d3) {
  const eases = {
    linear: d3.easeLinear,
    cubic: d3.easeCubic,
    cubicInOut: d3.easeCubicInOut,
    exp: d3.easeExp,
    expInOut: d3.easeExpInOut,
    elastic: d3.easeElasticOut,
    back: d3.easeBackOut
  };
  return eases[name] || d3.easeCubicInOut;
}

export function activeMarkLayer(scene, mark, transition) {
  fadeLayers(scene, mark, transition);
  if (!scene.markLayers.has(mark)) {
    scene.markLayers.set(
      mark,
      scene.markRoot.append("g").attr("class", `sl-mark-layer sl-${mark}-layer`)
    );
  }

  const layer = scene.markLayers.get(mark);
  layer.interrupt().style("display", null).transition(transition.base).style("opacity", 1);
  return layer;
}

export function fadeLayers(scene, activeMark, transition = { base: getD3().transition().duration(300) }) {
  scene.markLayers.forEach((layer, mark) => {
    if (mark === activeMark) return;
    layer.interrupt().transition(transition.base).style("opacity", 0);
  });

  scene.textLayer
    .interrupt()
    .transition(transition.base)
    .style("opacity", activeMark === "text" ? 1 : 0);
}

export function staggerDelay(spec, datum, index, override) {
  const stagger = override === undefined ? effectiveTransitionSpec(spec).stagger : override;
  if (!stagger) return 0;
  if (typeof stagger === "number") return index * stagger;

  const step = stagger.step ?? stagger.ms ?? DEFAULT_TIMING.transition.stagger.step;
  const max = stagger.max ?? DEFAULT_TIMING.transition.stagger.max;
  if (stagger.by) {
    const value = Number(datum[stagger.by] ?? datum.__row?.[stagger.by] ?? index);
    if (Number.isFinite(value)) return Math.min(value * step, max);
  }
  return Math.min(index * step, max);
}

export function curveFor(spec, d3) {
  const curves = {
    linear: d3.curveLinear,
    monotoneX: d3.curveMonotoneX,
    basis: d3.curveBasis,
    step: d3.curveStep
  };
  return curves[spec.curve] || d3.curveMonotoneX;
}

export function drawPath(selection, transition) {
  selection.each(function () {
    const path = getD3().select(this);
    const total = this.getTotalLength();
    path
      .attr("stroke-dasharray", `${total} ${total}`)
      .attr("stroke-dashoffset", total)
      .style("opacity", 1)
      .transition(transition)
      .attr("stroke-dashoffset", 0)
      .on("end", function () {
        getD3()
          .select(this)
          .attr("stroke-dasharray", null)
          .attr("stroke-dashoffset", null);
      });
  });
}

export function fadeNonBarShapes(chart) {
  chart.g.selectAll("circle,path:not(.sl-line)").transition(chart.transition.base).style("opacity", 0);
}

export function fadeNonLineShapes(chart) {
  chart.g.selectAll("rect.sl-bar,circle.sl-point,circle.sl-unit").transition(chart.transition.base).style("opacity", 0);
}

export function fadeNonPointShapes(chart) {
  chart.g.selectAll("rect.sl-bar,path.sl-line,circle.sl-line-point,circle.sl-unit").transition(chart.transition.base).style("opacity", 0);
}

export function fadeNonUnitShapes(chart) {
  chart.g.selectAll("rect.sl-bar,path.sl-line,circle.sl-line-point,circle.sl-point").transition(chart.transition.base).style("opacity", 0);
}

export function applyPlotClip(chart, enabled) {
  if (!enabled) {
    chart.g.attr("clip-path", null);
    return;
  }

  const id = `sl-mark-clip-${chart.scene.node.dataset.viewId || "main"}`;
  ensureClipRect(chart.scene, id, {
    x: 0,
    y: 0,
    width: chart.innerWidth,
    height: chart.innerHeight
  });

  chart.g.attr("clip-path", `url(#${id})`);
}

export function drawTextBoard(scene, spec) {
  const items = Array.isArray(spec.text) ? spec.text : [spec.text || ""];
  scene.textLayer
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", scene.width)
    .attr("height", scene.height)
    .html(
      `<div class="sl-text-board">
        <ul>
          ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </div>`
    );
}

export function drawUnsupported(chart, spec, availableTypes = []) {
  chart.g
    .append("text")
    .attr("x", chart.innerWidth / 2)
    .attr("y", chart.innerHeight / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--sl-muted)")
    .text(
      `Unsupported mark renderer for "${spec.mark}"${
        availableTypes.length ? ` · available: ${availableTypes.join(", ")}` : ""
      }`
    );
}

export function bandOrLinear(rows, channel, range, d3) {
  if (!channel) return d3.scaleLinear().domain([0, 1]).range(range);
  if (channel.type === "quantitative") {
    return quantitativeScale(rows, channel, range, d3);
  }
  if (channel.type === "temporal") {
    return d3
      .scaleTime()
      .domain(channel.domain || d3.extent(rows, (d) => new Date(d[channel.field])))
      .range(range);
  }
  return d3
    .scaleBand()
    .domain(channelDomain(rows, channel))
    .range(range)
    .padding(0.24);
}

export function quantitativeScale(rows, channel = {}, range, d3) {
  const scaleType = channel.scale?.type || channel.scaleType || "linear";
  const domain = quantitativeDomain(rows, channel, scaleType === "log" ? 1 : undefined);
  if (scaleType === "log") {
    const safeDomain = domain.map((value) => Math.max(Number(value) || 1, 0.1));
    return d3.scaleLog().domain(safeDomain).range(range).nice();
  }
  if (scaleType === "sqrt") return d3.scaleSqrt().domain(domain).range(range).nice();
  return d3.scaleLinear().domain(domain).range(range).nice();
}

export function position(scale, value) {
  const scaled = scale(value);
  if (typeof scale.bandwidth === "function") return scaled + scale.bandwidth() / 2;
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
  if (!resolved) return () => "var(--sl-accent)";
  channel = resolved;
  if (channel.value) return () => channel.value;
  if (channel.hue || channel.luminance) return compositeColorScale(channel, d3);
  if (!channel.field) return () => "var(--sl-accent)";

  if (channel.type === "quantitative") return luminanceColorScale(rows, channel, d3);

  const domain = channelDomain(rows, channel);
  const scale = d3.scaleOrdinal(channel.range || categoricalRange(domain)).domain(domain);
  return (row) => scale(row[channel.field]);
}

export function drawXAxis(chart, scale, title, d3) {
  if (!scale) {
    markAxisInactive(chart.scene.xAxis);
    chart.scene.xAxis.transition(chart.transition.base).style("opacity", 0);
    chart.scene.xLabel.transition(chart.transition.base).style("opacity", 0);
    return;
  }

  applyXAxisClip(chart);
  const axis = typeof scale.bandwidth === "function" ? d3.axisBottom(scale) : d3.axisBottom(scale).ticks(6);
  const transform = `translate(${chart.margin.left},${chart.margin.top + chart.innerHeight})`;
  const xAxis = chart.scene.xAxis
    .interrupt()
    .attr("transform", transform);

  renderAxisWithGuard(xAxis, axis, chart.transition.base, axisKind("bottom", scale));
  xAxis.selectAll(".tick text").attr("dy", "0.8em");
  alignEdgeTickLabels(xAxis, scale, d3);
  xAxis.transition(chart.transition.base).style("opacity", 1);

  if (title) {
    chart.scene.xLabel
      .attr("x", chart.innerWidth / 2)
      .attr("y", chart.margin.top + chart.innerHeight + 48)
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${chart.margin.left},0)`)
      .text(title)
      .transition(chart.transition.base)
      .style("opacity", 1);
  } else {
    chart.scene.xLabel.transition(chart.transition.base).style("opacity", 0);
  }
}

export function drawYAxis(chart, scale, title, d3) {
  if (!scale) {
    markAxisInactive(chart.scene.yAxis);
    chart.scene.yAxis.transition(chart.transition.base).style("opacity", 0);
    chart.scene.yLabel.transition(chart.transition.base).style("opacity", 0);
    return;
  }

  const axis = typeof scale.bandwidth === "function" ? d3.axisLeft(scale) : d3.axisLeft(scale).ticks(6);
  const yAxis = chart.scene.yAxis
    .interrupt()
    .attr("transform", `translate(${chart.margin.left},${chart.margin.top})`);

  renderAxisWithGuard(yAxis, axis, chart.transition.base, axisKind("left", scale));
  yAxis.transition(chart.transition.base).style("opacity", 1);

  if (title) {
    chart.scene.yLabel
      .attr("x", -chart.innerHeight / 2)
      .attr("y", chart.margin.left - 48)
      .attr("text-anchor", "middle")
      .attr("transform", `translate(0,${chart.margin.top}) rotate(-90)`)
      .text(title)
      .transition(chart.transition.base)
      .style("opacity", 1);
  } else {
    chart.scene.yLabel.transition(chart.transition.base).style("opacity", 0);
  }
}

export function drawGrid(chart, y, d3) {
  updateGrid(chart, y, d3);
}

export function updateGrid(chart, y, d3) {
  if (!y) {
    markAxisInactive(chart.scene.grid);
    chart.scene.grid.transition(chart.transition.base).style("opacity", 0);
    return;
  }

  const grid = chart.scene.grid
    .interrupt()
    .attr("transform", null);

  renderAxisWithGuard(
    grid,
    d3.axisLeft(y).ticks(6).tickSize(-chart.innerWidth).tickFormat(""),
    chart.transition.base,
    axisKind("grid-left", y)
  );
  grid.transition(chart.transition.base).style("opacity", 1);
}

export function drawLegend(chart, rows, channel, d3) {
  const colorRows = chart.domainRows?.length ? chart.domainRows : rows;
  channel = resolveColorChannel(colorRows, channel);
  if (!channel || channel.value || (!channel.field && !channel.hue && !channel.luminance)) {
    chart.scene.legend.transition(chart.transition.base).style("opacity", 0);
    return;
  }

  const legendChannel = channel.hue?.field ? channel.hue : channel.luminance?.field ? channel.luminance : channel;
  const quantitativeLegend = legendChannel.type === "quantitative";
  const domain = quantitativeLegend
    ? quantitativeLegendDomain(colorRows, legendChannel, d3)
    : channelDomain(colorRows, legendChannel);
  const scale = channel.hue || channel.luminance
    ? compositeColorScale(channel, d3)
    : quantitativeLegend
      ? luminanceColorScale(colorRows, legendChannel, d3)
      : d3.scaleOrdinal(channel.range || categoricalRange(domain)).domain(domain);
  const legendRow = (value) => ({ [legendChannel.field]: value });
  const legend = chart.scene.legend
    .interrupt()
    .style("opacity", 1)
    .attr(
      "transform",
      `translate(${chart.margin.left},${Math.max(18, chart.margin.top - 32)})`
    );

  const items = legend.selectAll("g.sl-legend-item").data(domain, (d) => d);
  const entered = items
    .enter()
    .append("g")
    .attr("class", "sl-legend-item")
    .style("opacity", 0);

  entered.append("rect").attr("width", 9).attr("height", 9).attr("rx", 1.5);
  entered.append("text").attr("x", 15).attr("y", 8.5);

  items
    .merge(entered)
    .transition(chart.transition.base)
    .style("opacity", 1)
    .attr("transform", (_, index) => `translate(${legendItemX(domain, index)},0)`);

  items
    .merge(entered)
    .select("rect")
    .transition(chart.transition.base)
    .attr("fill", (d) => channel.hue || channel.luminance ? scale(legendRow(d)) : scale(d));

  items
    .merge(entered)
    .select("text")
    .text((d) => quantitativeLegend ? d3.format("~g")(d) : d);

  items.exit().transition(chart.transition.base).style("opacity", 0).remove();
}

export function bindTooltip(selection, spec, tooltip) {
  selection
    .on("mouseenter", (event, row) => {
      const html = tooltipHtml(row, spec.encoding?.tooltip);
      if (html) showTooltip(tooltip, event, html);
    })
    .on("mousemove", (event) => moveTooltip(tooltip, event))
    .on("mouseleave", () => hideTooltip(tooltip));
}

export function showTooltip(tooltip, event, html) {
  tooltip.innerHTML = html;
  tooltip.style.opacity = "1";
  moveTooltip(tooltip, event);
}

export function moveTooltip(tooltip, event) {
  tooltip.style.left = `${event.clientX + 14}px`;
  tooltip.style.top = `${event.clientY + 14}px`;
}

export function hideTooltip(tooltip) {
  tooltip.style.opacity = "0";
}

function applyXAxisClip(chart) {
  const id = `sl-x-axis-clip-${chart.scene.node.dataset.viewId || "main"}`;
  const labelPadding = 28;
  ensureClipRect(chart.scene, id, {
    x: -labelPadding,
    y: -8,
    width: chart.innerWidth + labelPadding * 2,
    height: 72
  });

  chart.scene.xAxis.attr("clip-path", `url(#${id})`);
}

function ensureClipRect(scene, id, rect) {
  let defs = scene.svg.select("defs");
  if (defs.empty()) defs = scene.svg.append("defs");

  defs
    .selectAll(`#${id}`)
    .data([null])
    .join("clipPath")
    .attr("id", id)
    .selectAll("rect")
    .data([null])
    .join("rect")
    .attr("x", rect.x)
    .attr("y", rect.y)
    .attr("width", rect.width)
    .attr("height", rect.height);
}

function alignEdgeTickLabels(axisGroup, scale, d3) {
  if (typeof scale.bandwidth === "function" || typeof scale.range !== "function") return;

  const range = scale.range();
  const min = Math.min(...range);
  const max = Math.max(...range);
  axisGroup.selectAll(".tick").each(function () {
    const tick = d3.select(this);
    const transform = tick.attr("transform") || "";
    const match = transform.match(/translate\(([-\d.]+)/);
    if (!match) return;

    const x = Number(match[1]);
    const text = tick.select("text");
    if (Math.abs(x - min) <= 1) text.attr("text-anchor", "start").attr("dx", "0.15em");
    else if (Math.abs(x - max) <= 1) text.attr("text-anchor", "end").attr("dx", "-0.15em");
    else text.attr("text-anchor", "middle").attr("dx", null);
  });
}

function renderAxisWithGuard(axisGroup, axis, transition, kind) {
  const node = axisGroup.node();
  const canTransition = node?.__scrollyLiteAxisActive && node.__scrollyLiteAxisKind === kind;
  if (node) {
    node.__scrollyLiteAxisActive = true;
    node.__scrollyLiteAxisKind = kind;
  }

  if (canTransition) {
    axisGroup.transition(transition).call(axis);
    return;
  }

  axisGroup.call(axis);
}

export function markAxisInactive(axisGroup) {
  const node = axisGroup.node();
  if (!node) return;
  node.__scrollyLiteAxisActive = false;
}

function axisKind(placement, scale) {
  return `${placement}:${typeof scale.bandwidth === "function" ? "band" : "continuous"}`;
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
  if (channel?.field) {
    return {
      ...channel,
      type: channel.type || inferFieldType(rows, channel.field)
    };
  }

  const field = defaultColorField(rows);
  if (!field) return null;
  return {
    field,
    type: inferFieldType(rows, field),
    inferred: true
  };
}

function normalizeColorSubchannel(rows, channel = {}) {
  if (!channel.field) return channel;
  return {
    ...channel,
    type: channel.type || inferFieldType(rows, channel.field)
  };
}

function defaultColorField(rows) {
  const preferred = ["type", "kind", "category", "group", "series", "period"];
  return preferred.find((field) => rows.some((row) => row[field] != null));
}

function inferFieldType(rows, field) {
  const values = rows
    .map((row) => row[field])
    .filter((value) => value != null && value !== "");
  if (!values.length) return "nominal";
  return values.every((value) => Number.isFinite(Number(value))) ? "quantitative" : "nominal";
}

function categoricalRange(domain) {
  return domain.map((value, index) => (
    semanticCategoryColor(value) || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length]
  ));
}

function semanticCategoryColor(value) {
  return SEMANTIC_CATEGORY_COLORS[String(value ?? "").trim().toLowerCase()];
}

function luminanceColorScale(rows, channel, d3) {
  const domain = quantitativeDomain(rows, channel);
  const base = channel.base || channel.value || DEFAULT_LUMINANCE_BASE;
  const lightness = channel.lightness || [22, -18];
  const scale = d3
    .scaleLinear()
    .domain(domain)
    .range(lightness)
    .clamp(true);

  return (row = {}) => adjustLightness(base, scale(Number(row[channel.field])), d3);
}

function compositeColorScale(channel, d3) {
  const hue = channel.hue || {};
  const luminance = channel.luminance || {};
  const hueDomain = hue.domain || [];
  const hueScale = d3.scaleOrdinal(hue.range || categoricalRange(hueDomain)).domain(hueDomain);
  const luminanceDomain = luminance.domain || [];
  const continuousLuminance =
    luminance.type === "quantitative" ||
    (luminanceDomain.length === 2 && luminanceDomain.every((value) => Number.isFinite(Number(value))));
  const lightness = luminance.lightness || [18, 0, -18];
  const lightnessScale = continuousLuminance
    ? d3.scaleLinear()
        .domain(luminanceDomain.map(Number))
        .range([lightness[0], lightness[lightness.length - 1]])
        .clamp(true)
    : d3
        .scaleOrdinal(lightness)
        .domain(luminanceDomain);

  return (row = {}) => {
    const base = hue.value || hueScale(row[hue.field]);
    const luminanceValue = row[luminance.field];
    const offset =
      luminance.field && (continuousLuminance || luminanceDomain.includes(luminanceValue))
        ? Number(lightnessScale(continuousLuminance ? Number(luminanceValue) : luminanceValue)) || 0
        : 0;
    return adjustLightness(base, offset, d3);
  };
}

function adjustLightness(color, offset, d3) {
  const hcl = d3.hcl(color || "var(--sl-accent)");
  if (!Number.isFinite(hcl.l)) return color || "var(--sl-accent)";
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
  if (tooltipSpec === false) return "";
  const source = row?.__row && typeof row.__row === "object" ? row.__row : row;
  const items = Array.isArray(tooltipSpec)
    ? tooltipSpec
    : Object.keys(source || {})
        .filter((field) => !field.startsWith("__") && (source[field] == null || typeof source[field] !== "object"))
        .map((field) => ({ field, title: titleize(field) }));

  return items
    .map((item) => `<strong>${escapeHtml(item.title || titleize(item.field))}</strong>: ${escapeHtml(source[item.field])}`)
    .join("<br>");
}
