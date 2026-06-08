import { narrativeObjectKey } from "../../scrolly-meta.js?v=semantic-key-10";
import { titleize } from "../../labels.js?v=semantic-key-1";
import {
  aggregateFieldSpec,
  applyFilterFocus,
  applyXYGuide,
  applyXYObservation,
  identitySpec,
  mergeXYChannel,
  withObject,
  withSceneState
} from "../compiler-utils.js?v=semantic-key-1";

export function createPointSceneCompiler() {
  return {
    base: identitySpec,
    scenes: {
      focus: applyFilterFocus,
      guide: applyXYGuide,
      granularity: applyPointGranularity,
      observation: applyXYObservation
    }
  };
}

function applyPointGranularity(spec, granularitySpec = {}) {
  const mode = granularitySpec.mode || "detail";
  const parentField = granularitySpec.parentField || granularitySpec.groupby?.[0] || spec.encoding?.color?.field;
  const detail = granularitySpec.detail || narrativeObjectKey(spec) || spec.encoding?.key?.field || spec.encoding?.x?.field;

  if (mode === "aggregate") {
    const groupby = granularitySpec.groupby || [parentField].filter(Boolean);
    const x = mergeXYChannel(spec.encoding?.x, granularitySpec.x || spec.encoding?.x, "quantitative");
    const y = mergeXYChannel(spec.encoding?.y, granularitySpec.y || spec.encoding?.y, "quantitative");
    const xAs = granularitySpec.x?.as || x.field;
    const yAs = granularitySpec.y?.as || y.field;
    const countAs = granularitySpec.countAs || "count";
    const xAggregate = aggregateFieldSpec(granularitySpec.x, x.field, xAs, "mean");
    const yAggregate = aggregateFieldSpec(granularitySpec.y, y.field, yAs, "mean");
    const fields = [
      xAggregate,
      yAggregate,
      { op: "count", as: countAs }
    ];

    return withSceneState(withObject({
      ...spec,
      transform: [
        ...(spec.transform || []),
        {
          aggregate: {
            groupby,
            fields
          }
        }
      ],
      encoding: {
        ...spec.encoding,
        x: { ...x, field: xAs, title: granularitySpec.x?.title || aggregateTitle(xAggregate.op, x.title || x.field) },
        y: { ...y, field: yAs, title: granularitySpec.y?.title || aggregateTitle(yAggregate.op, y.title || y.field) },
        ...(granularitySpec.size !== false
          ? {
              size: {
                field: countAs,
                type: "quantitative",
                ...(granularitySpec.sizeRange ? { range: granularitySpec.sizeRange } : {})
              }
            }
          : {})
      }
    }, {
      key: granularitySpec.key || groupby
    }), {
      granularity: {
        mode,
        parentField,
        countAs
      }
    });
  }

  return withSceneState(withObject({
    ...spec
  }, {
    key: granularitySpec.key || detail
  }), {
    granularity: {
      mode: "detail",
      parentField,
      detail
    }
  });
}

function aggregateTitle(op, title) {
  if (!op || op === "sum" || new RegExp(`^${op}\\s`, "i").test(title)) return titleize(title);
  return `${titleize(op)} ${lowerFirst(titleize(title))}`;
}

function lowerFirst(value) {
  return String(value || "").replace(/^\w/, (letter) => letter.toLowerCase());
}
