export function applyTransforms(source, transforms = [], aq = getArquero()) {
  let table = aq.from(source.map((row) => ({ ...row })));

  transforms.forEach((transform) => {
    if (transform.filter) table = filterRows(table, transform.filter, aq);
    if (transform.timeUnit) table = timeUnitRows(table, transform.timeUnit, aq);
    if (transform.fold) table = foldRows(table, transform.fold, aq);
    if (transform.bin) table = binRows(table, transform.bin, aq);
    if (transform.aggregate) table = aggregateRows(table, transform.aggregate, aq);
    if (transform.sort) table = sortRows(table, transform.sort, aq);
    if (transform.limit) table = table.slice(0, transform.limit);
  });

  return table.objects();
}

function timeUnitRows(table, timeUnit, aq) {
  const as = timeUnit.as || `${timeUnit.field}_${timeUnit.unit}`;
  if (timeUnit.unit !== "month") return table;
  return table.derive({
    [as]: aq.escape((row) => monthLabel(row[timeUnit.field]))
  });
}

function monthLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "");
  return date.toLocaleString("en", { month: "short" });
}

function filterRows(table, filter, aq) {
  return table.filter(aq.escape((row) => matchFilter(row, filter)));
}

function foldRows(table, fold, aq) {
  const fields = fold.fields || [];
  const [keyAs = "key", valueAs = "value"] = fold.as || [];
  const sourceAs = fold.sourceAs || "__foldField";
  const labelAs = fold.labelAs || keyAs;

  let folded = table.fold(fields, { as: [sourceAs, valueAs] });

  if (sourceAs !== keyAs || fold.labels) {
    const labels = fold.labels || {};
    folded = folded.derive({
      [labelAs]: aq.escape((row) => labels[row[sourceAs]] ?? row[sourceAs])
    });
  }

  return folded;
}

function binRows(table, bin, aq) {
  const as = bin.as || `${bin.field}_bin`;
  const startAs = `${as}_start`;
  const endAs = `${as}_end`;
  const rows = table.objects();
  const values = rows.map((row) => Number(row[bin.field])).filter(Number.isFinite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = bin.step || Math.ceil((max - min) / (bin.maxbins || 10));

  return table.derive({
    [startAs]: aq.escape((row) => {
      const value = Number(row[bin.field]);
      return Math.floor((value - min) / step) * step + min;
    }),
    [endAs]: aq.escape((row) => {
      const value = Number(row[bin.field]);
      return Math.floor((value - min) / step) * step + min + step;
    }),
    [as]: aq.escape((row) => {
      const value = Number(row[bin.field]);
      const start = Math.floor((value - min) / step) * step + min;
      return `${start}-${start + step}`;
    })
  });
}

function aggregateRows(table, aggregate, aq) {
  const groupby = aggregate.groupby || [];
  const fields = aggregate.fields || [{ op: "count", as: "count" }];
  const values = Object.fromEntries(
    fields.map((fieldSpec) => [
      fieldSpec.as || `${fieldSpec.op || "count"}_${fieldSpec.field || "rows"}`,
      aggregateExpression(fieldSpec, aq)
    ])
  );

  return table.groupby(...groupby).rollup(values);
}

function aggregateExpression(fieldSpec, aq) {
  const op = fieldSpec.op || "count";
  const field = fieldSpec.field;
  if (op === "count") return aq.op.count();
  if (op === "mean") return aq.op.mean(field);
  if (op === "min") return aq.op.min(field);
  if (op === "max") return aq.op.max(field);
  if (op === "median") return aq.op.median(field);
  return aq.op.sum(field);
}

function sortRows(table, sort, aq) {
  if (Array.isArray(sort.fields)) {
    return table.orderby(...sort.fields.map((field) => sortField(field, aq)));
  }
  return table.orderby(sortField(sort, aq));
}

function sortField(sort, aq) {
  if (typeof sort === "string") return sort;
  if (sort.order === "descending") return aq.desc(sort.field);
  return sort.field;
}

function matchFilter(row, filter) {
  if (typeof filter === "string") return matchFilterExpression(row, filter);
  const value = row[filter.field];
  if ("equal" in filter) return value === filter.equal;
  if ("notEqual" in filter) return value !== filter.notEqual;
  if ("oneOf" in filter) return filter.oneOf.includes(value);
  if ("gte" in filter && value < filter.gte) return false;
  if ("gt" in filter && value <= filter.gt) return false;
  if ("lte" in filter && value > filter.lte) return false;
  if ("lt" in filter && value >= filter.lt) return false;
  return true;
}

function matchFilterExpression(row, expression) {
  const match = String(expression).trim().match(/^datum\.([A-Za-z_$][\w$]*)\s*(==|===|!=|!==|>=|>|<=|<)\s*(.+)$/);
  if (!match) return true;
  const [, field, operator, rawValue] = match;
  const left = row[field];
  const right = parseFilterLiteral(rawValue);
  if (operator === "==" || operator === "===") return left === right;
  if (operator === "!=" || operator === "!==") return left !== right;
  if (operator === ">=") return left >= right;
  if (operator === ">") return left > right;
  if (operator === "<=") return left <= right;
  if (operator === "<") return left < right;
  return true;
}

function parseFilterLiteral(value) {
  const trimmed = String(value).trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  const number = Number(trimmed);
  return Number.isNaN(number) ? trimmed : number;
}

function getArquero() {
  if (!globalThis.aq) {
    throw new Error("ScrollyLite data transforms require Arquero on globalThis.aq.");
  }
  return globalThis.aq;
}
