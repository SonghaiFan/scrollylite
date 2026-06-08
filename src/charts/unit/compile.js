import {
  applyFilterFocus,
  cloneEncoding,
  copyDefined,
  identitySpec,
  resolveGuideStaging,
  withObject,
  withSceneState
} from "../compiler-utils.js?v=semantic-key-1";
import {
  narrativeObjectKey,
  narrativeUnit,
  withNarrative
} from "../../scrolly-meta.js?v=semantic-key-10";

export function createUnitSceneCompiler() {
  return {
    base: identitySpec,
    scenes: {
      focus: applyFilterFocus,
      guide: applyUnitGuide
    }
  };
}

function applyUnitGuide(spec, guideSpec = {}) {
  const unit = {
    ...(narrativeUnit(spec) || {}),
    ...copyDefined(guideSpec, [
      "layout",
      "columns",
      "groupColumns",
      "radius",
      "xField",
      "xType",
      "xTitle",
      "yField",
      "yTitle",
      "groupField",
      "valueField",
      "labelField",
      "maxUnits"
    ])
  };
  const encoding = cloneEncoding(spec.encoding);
  if (guideSpec.color) encoding.color = guideSpec.color;

  return withSceneState(withObject(withNarrative({
    ...spec,
    encoding
  }, {
    unit
  }), {
    key: guideSpec.key || narrativeObjectKey(spec)
  }), {
    guide: {
      layout: unit.layout || "grid",
      xField: unit.xField || null,
      yField: unit.yField || null,
      groupField: unit.groupField || null,
      valueField: unit.valueField || null,
      staging: resolveGuideStaging(guideSpec, "unit")
    }
  });
}
