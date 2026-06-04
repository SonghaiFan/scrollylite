import { readFile } from "node:fs/promises";

const arqueroImport =
  process.env.ARQUERO_IMPORT ||
  "/tmp/scrolly-arquero-exp/node_modules/arquero/src/index.js";

const aq = await import(arqueroImport);
const { op } = aq;

const csv = await readFile(new URL("../src/data/weather_sample.csv", import.meta.url), "utf8");
const source = aq.fromCSV(csv);

const labels = {
  hot_days: "Hot days",
  cold_days: "Cold days"
};

const granularityTransformSpec = [
  {
    fold: {
      fields: ["hot_days", "cold_days"],
      sourceAs: "__measure",
      valueAs: "days",
      labelAs: "temperature_kind",
      labels
    }
  },
  {
    aggregate: {
      groupby: ["decade", "__measure", "temperature_kind"],
      fields: [{ op: "sum", field: "days", as: "days" }]
    }
  },
  {
    semanticKey: {
      fields: ["decade", "__measure"],
      as: "__semanticKey"
    }
  },
  {
    sort: {
      fields: ["decade", "__measure"]
    }
  }
];

const observationCold = source
  .derive({
    __measure: aq.escape("cold_days"),
    __semanticKey: (d) => d.decade + "|cold_days"
  })
  .select("decade", "cold_days", "__measure", "__semanticKey");

const foldedGranularity = applyArqueroTransforms(source, granularityTransformSpec.slice(0, 1));
const aggregatedGranularity = applyArqueroTransforms(source, granularityTransformSpec);

const cold1990Observation = observationCold
  .filter((d) => d.decade === "1990s")
  .object();

const cold1990Segment = aggregatedGranularity
  .filter((d) => d.decade === "1990s" && d.__measure === "cold_days")
  .object();

const hot1990Segment = aggregatedGranularity
  .filter((d) => d.decade === "1990s" && d.__measure === "hot_days")
  .object();

console.log(
  JSON.stringify(
    {
      observationColdSample: observationCold.objects({ limit: 3 }),
      foldedSample: foldedGranularity.objects({ limit: 4 }),
      aggregatedSample: aggregatedGranularity
        .objects()
        .filter((row) => row.decade === "1990s" || row.decade === "2000s"),
      objectConsistencyCheck: {
        sameColdKey:
          cold1990Observation.__semanticKey === cold1990Segment.__semanticKey,
        observationColdKey: cold1990Observation.__semanticKey,
        granularityColdKey: cold1990Segment.__semanticKey,
        granularityHotKey: hot1990Segment.__semanticKey
      }
    },
    null,
    2
  )
);

function applyArqueroTransforms(table, transforms) {
  return transforms.reduce((dt, transform) => {
    if (transform.fold) return foldWithLineage(dt, transform.fold);
    if (transform.aggregate) return aggregateRows(dt, transform.aggregate);
    if (transform.semanticKey) return deriveSemanticKey(dt, transform.semanticKey);
    if (transform.sort) return sortRows(dt, transform.sort);
    return dt;
  }, table);
}

function foldWithLineage(table, fold) {
  const sourceAs = fold.sourceAs || "__measure";
  const valueAs = fold.valueAs || "value";
  let dt = table.fold(fold.fields || [], { as: [sourceAs, valueAs] });

  if (fold.labels && fold.labelAs) {
    dt = dt.params({ labels: fold.labels }).derive({
      [fold.labelAs]: (d, $) => $.labels[d.__measure] ?? d.__measure
    });
  }

  return dt;
}

function aggregateRows(table, aggregate) {
  const values = Object.fromEntries(
    (aggregate.fields || []).map((fieldSpec) => [
      fieldSpec.as || `${fieldSpec.op}_${fieldSpec.field}`,
      aggregateExpression(fieldSpec)
    ])
  );
  return table.groupby(...(aggregate.groupby || [])).rollup(values);
}

function aggregateExpression(fieldSpec) {
  const field = fieldSpec.field;
  if (fieldSpec.op === "mean") return op.mean(field);
  if (fieldSpec.op === "min") return op.min(field);
  if (fieldSpec.op === "max") return op.max(field);
  if (fieldSpec.op === "count") return op.count();
  return op.sum(field);
}

function deriveSemanticKey(table, semanticKey) {
  const fields = semanticKey.fields || [];
  const as = semanticKey.as || "__semanticKey";
  return table.derive({
    [as]: aq.escape((row) => fields.map((field) => row[field]).join("|"))
  });
}

function sortRows(table, sort) {
  return table.orderby(...(sort.fields || []));
}
