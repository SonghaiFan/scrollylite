export const DESIGN_SPACE = {
  layout: {
    axis: ["horizontal", "vertical"],
    binding: ["floatToText", "fixedToText"],
    container: ["textContainer", "visContainer"],
    layering: ["textOverVis", "visOverText"]
  },
  transition: {
    scene: ["focus", "guide", "granularity", "observation"],
    segue: ["pointToLine", "lineToArea", "morph", "divisionMerge", "packUnpack"]
  },
  action: ["header", "inline", "tooltip", "enter", "exit", "step", "scroll"]
};

const ALIASES = new Map(
  Object.entries({
    "float-to-text": "floatToText",
    floattotext: "floatToText",
    "fixed-to-text": "fixedToText",
    fixedtotext: "fixedToText",
    "text-container": "textContainer",
    textcontainer: "textContainer",
    "vis-container": "visContainer",
    viscontainer: "visContainer",
    "text-over-vis": "textOverVis",
    textovervis: "textOverVis",
    "vis-over-text": "visOverText",
    visovertext: "visOverText",
    "point-to-line": "pointToLine",
    pointtoline: "pointToLine",
    "line-to-area": "lineToArea",
    linetoarea: "lineToArea",
    "division-merge": "divisionMerge",
    "division/merge": "divisionMerge",
    divisionmerge: "divisionMerge",
    "pack-unpack": "packUnpack",
    "pack/unpack": "packUnpack",
    packunpack: "packUnpack",
    "in-line": "inline"
  })
);

export function normalizeDesignSpace(input = {}, inherited = {}) {
  const layout = normalizeLayout(input.layout, inherited.layout);
  const transition = normalizeTransition(input.transition, inherited.transition);
  const action = normalizeAction(input.action, inherited.action);

  return {
    layout,
    transition,
    action
  };
}

export function designSpaceSignature(spec) {
  return (spec.steps || []).map((step, index) => {
    const ds = step.designSpace || {};
    return {
      index,
      id: step.id,
      title: step.title,
      layout: compactJoin(
        [ds.layout?.axis, ds.layout?.binding, ds.layout?.container, ds.layout?.layering],
        " + "
      ),
      transition: compactJoin(
        [
          ds.transition?.scene?.length ? `Scene:${ds.transition.scene.join(",")}` : "",
          ds.transition?.segue?.length ? `Segue:${ds.transition.segue.join(",")}` : ""
        ],
        " | "
      ),
      action: ds.action || []
    };
  });
}

export function designSpaceClasses(designSpace) {
  const ds = designSpace || {};
  return [
    ds.layout?.axis && `sl-layout-${dash(ds.layout.axis)}`,
    ds.layout?.binding && `sl-binding-${dash(ds.layout.binding)}`,
    ds.layout?.container && `sl-container-${dash(ds.layout.container)}`,
    ds.layout?.layering && `sl-layering-${dash(ds.layout.layering)}`,
    ...(ds.transition?.scene || []).map((scene) => `sl-scene-${dash(scene)}`),
    ...(ds.transition?.segue || []).map((segue) => `sl-segue-${dash(segue)}`),
    ...(ds.action || []).map((action) => `sl-action-${dash(action)}`)
  ].filter(Boolean);
}

function normalizeLayout(input, inherited = {}) {
  const value = typeof input === "string" ? { layering: input } : input || {};
  return {
    preset: normalizeToken(value.preset ?? value.name ?? inherited?.preset ?? ""),
    axis: normalizeToken(value.axis ?? inherited?.axis ?? "vertical"),
    binding: normalizeToken(value.binding ?? inherited?.binding ?? "floatToText"),
    container: normalizeToken(value.container ?? inherited?.container ?? "visContainer"),
    layering: normalizeToken(value.layering ?? value.z ?? inherited?.layering ?? "")
  };
}

function normalizeTransition(input, inherited = {}) {
  const base = inherited || {};
  const transition = typeof input === "string" || Array.isArray(input)
    ? inferTransitionBuckets(input)
    : input || {};

  return {
    scene: uniqueTokens([...(base.scene || []), ...(asArray(transition.scene) || [])]),
    segue: uniqueTokens([...(base.segue || []), ...(asArray(transition.segue) || [])])
  };
}

function normalizeAction(input, inherited = []) {
  const inheritedActions = Array.isArray(inherited) ? inherited : [];
  const actions = input == null ? inheritedActions : asArray(input);
  return uniqueTokens(actions.length ? actions : ["step", "tooltip"]);
}

function inferTransitionBuckets(input) {
  const tokens = uniqueTokens(asArray(input));
  return {
    scene: tokens.filter((token) => DESIGN_SPACE.transition.scene.includes(token)),
    segue: tokens.filter((token) => DESIGN_SPACE.transition.segue.includes(token))
  };
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function uniqueTokens(values) {
  return Array.from(new Set(values.map(normalizeToken).filter(Boolean)));
}

function normalizeToken(value) {
  if (value == null) return "";
  const compact = String(value).trim();
  if (!compact) return "";
  const lower = compact.replace(/\s+/g, "-").toLowerCase();
  return ALIASES.get(lower) || lower.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function compactJoin(values, separator) {
  return values.filter(Boolean).join(separator);
}

function dash(value) {
  return String(value).replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
