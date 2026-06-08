import { narrativeObjectKey } from "../../scrolly-meta.js";
import { titleize } from "../../labels.js";
import { colorField } from "./encoding.js";
import {
  aggregateFieldSpec,
  compileCartesianCoordinate,
  compileCartesianScale,
  compileFilter,
  compileHighlight,
  identitySpec,
  mergeXYChannel,
  withObject,
  withSceneState
} from "../compiler-utils.js";

export function createPointSpecCompiler(context = {}) {
  return {
    base: compilePointBase,
    operations: {
      filter: compileFilter,
      highlight: compileHighlight,
      coordinate: compilePointCoordinate,
      scale: compilePointScale,
      aggregate: compilePointAggregate,
      layout: compilePointLayout
    }
  };
}

function compilePointBase(spec, context = {}) {
  return identitySpec(spec);
}

function compilePointCoordinate(spec, operationSpec = {}, context = {}) {
  return compileCartesianCoordinate(spec, operationSpec, context);
}

function compilePointScale(spec, operationSpec = {}, context = {}) {
  return compileCartesianScale(spec, operationSpec, context);
}

function compilePointAggregate(spec, granularitySpec = {}, context = {}) {
  const mode = granularitySpec.mode || "detail";
  const authoredGroupby = normalizeFields(granularitySpec.groupby);
  const parentField =
    granularitySpec.parentField ||
    parentFromGroupby(authoredGroupby) ||
    colorField(spec.encoding);
  const detail = granularitySpec.detail || narrativeObjectKey(spec) || spec.encoding?.key?.field || spec.encoding?.x?.field;

  if (mode === "aggregate") {
    const groupby = authoredGroupby.length ? authoredGroupby : [parentField].filter(Boolean);
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
        groupby,
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
      detail
    }
  });
}

function compilePointLayout(spec, operationSpec = {}, context = {}) {
  return spec;
}

function aggregateTitle(op, title) {
  if (!op || op === "sum" || new RegExp(`^${op}\\s`, "i").test(title)) return titleize(title);
  return `${titleize(op)} ${lowerFirst(titleize(title))}`;
}

function lowerFirst(value) {
  return String(value || "").replace(/^\w/, (letter) => letter.toLowerCase());
}

function normalizeFields(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function parentFromGroupby(groupby = []) {
  if (!groupby.length) return null;
  return groupby.length === 1 ? groupby[0] : groupby;
}
