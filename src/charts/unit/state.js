export function expandUnits(rows, spec, d3) {
  const unit = spec.unit || {};
  const valueField = unit.valueField;
  const rowKey = unit.key || spec.key || "id";
  const maxUnits = unit.maxUnits || 240;
  const units = [];

  rows.forEach((row, rowIndex) => {
    const count = Math.max(0, Math.round(Number(valueField ? row[valueField] : 1) || 1));
    d3.range(count).forEach((unitIndex) => {
      units.push({
        ...row,
        __row: row,
        __unitIndex: unitIndex,
        __rowIndex: rowIndex,
        __unitKey: `${row[rowKey] ?? rowIndex}-${unitIndex}`
      });
    });
  });

  return units.slice(0, maxUnits);
}

export function unitLayout(units, chart, spec, deps) {
  const { bandOrLinear, d3, drawGrid, drawXAxis, drawYAxis, niceExtent, position, updateGrid } = deps;
  const unit = spec.unit || {};
  const layout = unit.layout || "grid";
  const columns = unit.columns || Math.max(8, Math.floor(Math.sqrt(units.length) * 1.4));
  const requestedRadius = unit.radius || 12;
  const groupField = unit.groupField || spec.encoding?.color?.field;
  const xField = unit.xField || spec.encoding?.x?.field;
  const yField = unit.yField || spec.encoding?.y?.field;

  if (layout === "timeline" && xField) {
    const stackByX = stackIndex(units, (d) => d.__row[xField]);
    const stackHeight = maxStackDepth(units, stackByX);
    const radius = fitRadius(chart, requestedRadius, {
      columns: Math.max(uniqueCount(units, (d) => d.__row[xField]), 1),
      rows: Math.max(stackHeight, 1)
    });
    const cell = radius * 2.45;
    const x = unitXScale(
      units,
      { field: xField, type: unit.xType || "quantitative" },
      [radius, chart.innerWidth - radius],
      { bandOrLinear, d3 }
    );
    const base = chart.innerHeight - radius;
    drawXAxis(chart, x, unit.xTitle || xField, d3);
    drawYAxis(chart, null, null, d3);
    updateGrid(chart, null, d3);
    return {
      name: "timeline",
      axes: true,
      r: radius,
      x: (d) => position(x, d.__row[xField]),
      y: (d) => base - stackByX(d) * cell
    };
  }

  if (layout === "dodge" && xField) {
    let radius = fitRadius(chart, requestedRadius, {
      columns: Math.max(uniqueCount(units, (d) => d.__row[xField]), 1),
      rows: 1
    });
    const x = unitXScale(
      units,
      { field: xField, type: unit.xType || "quantitative" },
      [radius, chart.innerWidth - radius],
      { bandOrLinear, d3 }
    );
    let placed = dodgeForHeight(units, radius, chart.innerHeight, (d) => position(x, d.__row[xField]));
    radius = placed.radius;
    const yByKey = new Map(placed.map((circle) => [circle.data.__unitKey, circle.y]));
    drawXAxis(chart, x, unit.xTitle || xField, d3);
    drawYAxis(chart, null, null, d3);
    updateGrid(chart, null, d3);
    return {
      name: "dodge",
      axes: true,
      r: radius,
      x: (d) => position(x, d.__row[xField]),
      y: (d) => chart.innerHeight - radius - yByKey.get(d.__unitKey)
    };
  }

  if (layout === "groupedGrid" && groupField) {
    const groups = Array.from(new Set(units.map((d) => d.__row[groupField])));
    const groupScale = d3.scaleBand().domain(groups).range([0, chart.innerWidth]).padding(0.18);
    const groupCounts = countBy(units, (d) => d.__row[groupField]);
    const radius = fitGroupedRadius(chart, requestedRadius, groupScale.bandwidth(), d3.max(groupCounts.values()) || 1, unit.groupColumns);
    const cell = radius * 2.45;
    const groupColumns = Math.max(3, unit.groupColumns || Math.floor(groupScale.bandwidth() / cell));
    const stackByGroup = stackIndex(units, (d) => d.__row[groupField]);
    drawXAxis(chart, groupScale, unit.xTitle || groupField, d3);
    drawYAxis(chart, null, null, d3);
    updateGrid(chart, null, d3);
    return {
      name: "groupedGrid",
      axes: true,
      r: radius,
      x: (d) => groupScale(d.__row[groupField]) + (stackByGroup(d) % groupColumns) * cell + radius,
      y: (d) => chart.innerHeight - radius - Math.floor(stackByGroup(d) / groupColumns) * cell
    };
  }

  if ((layout === "point" || layout === "scatter") && xField && yField) {
    const radius = fitRadius(chart, requestedRadius, {
      columns: Math.max(uniqueCount(units, (d) => d.__row[xField]), 1),
      rows: Math.max(uniqueCount(units, (d) => d.__row[yField]), 1)
    });
    const x = unitXScale(
      units,
      { field: xField, type: unit.xType || "quantitative" },
      [radius, chart.innerWidth - radius],
      { bandOrLinear, d3 }
    );
    const y = d3
      .scaleLinear()
      .domain(niceExtent(units.map((d) => d.__row), yField))
      .range([chart.innerHeight - radius, radius])
      .nice();
    drawGrid(chart, y, d3);
    drawXAxis(chart, x, unit.xTitle || xField, d3);
    drawYAxis(chart, y, unit.yTitle || yField, d3);
    return {
      name: "point",
      axes: true,
      r: radius,
      x: (d) => position(x, d.__row[xField]),
      y: (d) => clamp(y(d.__row[yField]) + ((d.__unitIndex % 5) - 2) * radius * 0.35, radius, chart.innerHeight - radius)
    };
  }

  const rowsNeeded = Math.ceil(units.length / columns);
  const radius = fitRadius(chart, requestedRadius, { columns, rows: rowsNeeded });
  const cell = radius * 2.45;
  updateGrid(chart, null, d3);
  drawXAxis(chart, null, null, d3);
  drawYAxis(chart, null, null, d3);
  const startX = Math.max(0, (chart.innerWidth - columns * cell) / 2);
  const startY = Math.max(0, (chart.innerHeight - rowsNeeded * cell) / 2);
  return {
    name: "grid",
    axes: false,
    r: radius,
    x: (_, i) => startX + (i % columns) * cell + radius,
    y: (_, i) => startY + Math.floor(i / columns) * cell + radius
  };
}

function unitXScale(units, channel, range, deps) {
  const rows = units.map((d) => d.__row);
  const scale = deps.bandOrLinear(rows, channel, range, deps.d3);
  if (typeof scale.nice === "function") scale.nice();
  return scale;
}

function fitRadius(chart, requestedRadius, { columns = 1, rows = 1 } = {}) {
  return Math.max(
    2,
    Math.min(
      requestedRadius,
      chart.innerWidth / Math.max(columns * 2.45, 1),
      chart.innerHeight / Math.max(rows * 2.45, 1)
    )
  );
}

function fitGroupedRadius(chart, requestedRadius, groupWidth, maxGroupCount, fixedGroupColumns) {
  let radius = Math.min(requestedRadius, groupWidth / 3 / 2.45);
  for (let i = 0; i < 5; i += 1) {
    const cell = radius * 2.45;
    const groupColumns = Math.max(3, fixedGroupColumns || Math.floor(groupWidth / cell));
    const groupRows = Math.max(1, Math.ceil(maxGroupCount / groupColumns));
    radius = Math.min(requestedRadius, groupWidth / Math.max(groupColumns * 2.45, 1), chart.innerHeight / Math.max(groupRows * 2.45, 1));
  }
  return Math.max(2, radius);
}

function stackIndex(values, group) {
  const counts = new Map();
  const indexes = new Map();
  values.forEach((value) => {
    const key = group(value);
    const index = counts.get(key) || 0;
    counts.set(key, index + 1);
    indexes.set(value.__unitKey, index);
  });
  return (value) => indexes.get(value.__unitKey) || 0;
}

function maxStackDepth(values, stackByValue) {
  return values.reduce((max, value) => Math.max(max, stackByValue(value) + 1), 0);
}

function uniqueCount(values, key) {
  return new Set(values.map(key)).size;
}

function countBy(values, key) {
  const counts = new Map();
  values.forEach((value) => {
    const group = key(value);
    counts.set(group, (counts.get(group) || 0) + 1);
  });
  return counts;
}

function dodgeForHeight(units, radius, height, x) {
  let fittedRadius = radius;
  let placed = dodge(units, {
    radius: fittedRadius * 2.15,
    x
  });
  while (fittedRadius > 2 && maxPlacedY(placed) > height - fittedRadius * 2) {
    fittedRadius -= 0.75;
    placed = dodge(units, {
      radius: fittedRadius * 2.15,
      x
    });
  }
  placed.radius = Math.max(2, fittedRadius);
  return placed;
}

function maxPlacedY(placed) {
  return placed.reduce((max, circle) => Math.max(max, circle.y || 0), 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dodge(data, { radius = 1, x = (d) => d } = {}) {
  const radius2 = radius ** 2;
  const circles = data
    .map((datum, index, values) => ({
      x: +x(datum, index, values),
      data: datum
    }))
    .sort((a, b) => a.x - b.x);
  const epsilon = 1e-3;
  let head = null;
  let tail = null;

  function intersects(x, y) {
    let a = head;
    while (a) {
      if (radius2 - epsilon > (a.x - x) ** 2 + (a.y - y) ** 2) return true;
      a = a.next;
    }
    return false;
  }

  for (const b of circles) {
    while (head && head.x < b.x - radius2) head = head.next;
    if (intersects(b.x, (b.y = 0))) {
      let a = head;
      b.y = Infinity;
      do {
        const y = a.y + Math.sqrt(radius2 - (a.x - b.x) ** 2);
        if (y < b.y && !intersects(b.x, y)) b.y = y;
        a = a.next;
      } while (a);
    }
    b.next = null;
    if (head === null) head = tail = b;
    else tail = tail.next = b;
  }

  return circles;
}
