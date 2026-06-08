import { dataName } from "../scrolly-meta.js?v=semantic-key-11";
import { normalizeScrollDriverConfig } from "../scroll-drivers/index.js";
import { getD3, uniqueTokens } from "./utils.js";

export function compileSpec(spec) {
  if (!spec || typeof spec !== "object") {
    throw new Error("ScrollyLite requires a story spec object.");
  }

  const steps = Array.isArray(spec.steps) ? spec.steps : [];
  if (!steps.length) {
    throw new Error("ScrollyLite spec must contain at least one step.");
  }

  const layout = {
    offset: 0.55,
    nav: true,
    progress: true,
    scroll: {},
    ...(spec.layout || {})
  };
  layout.preset = layout.preset || "floatToText";
  layout.scroll = normalizeScrollDriverConfig(layout.scroll);

  const normalizedSteps = steps.map((step, index) => ({
    ...step,
    id: step.id || `step-${index + 1}`,
    transition: normalizeStepTransition(step.transition),
    action: normalizeStepAction(step, index),
    views: normalizeStepViews(step)
  }));
  const viewData = collectViewDataSources(normalizedSteps);

  return {
    ...spec,
    data: {
      ...(spec.data || {}),
      ...viewData.data
    },
    views: spec.views || { main: {} },
    theme: spec.theme || {},
    layout,
    steps: viewData.steps
  };
}

export function storySignature(spec) {
  return (spec.steps || []).map((step, index) => ({
    index,
    id: step.id,
    title: step.title,
    transition: step.transition?.scene || [],
    action: step.action || []
  }));
}

export async function loadData(dataSpec) {
  const d3 = getD3();
  const entries = await Promise.all(
    Object.entries(dataSpec).map(async ([name, source]) => {
      if (Array.isArray(source)) return [name, source];
      if (Array.isArray(source.values)) return [name, source.values];
      if (!source.url) return [name, []];

      if ((source.type || "csv") === "csv") {
        const rows = await d3.csv(source.url, d3.autoType);
        return [name, rows];
      }

      if (source.type === "json") {
        const rows = await d3.json(source.url);
        return [name, Array.isArray(rows) ? rows : rows.values || []];
      }

      throw new Error(`Unsupported data type for "${name}": ${source.type}`);
    })
  );

  return Object.fromEntries(entries);
}

export function viewRows(dataSpec, datasets) {
  if (Array.isArray(dataSpec)) return dataSpec;
  if (Array.isArray(dataSpec?.values)) return dataSpec.values;
  const name = dataName(dataSpec);
  return name ? datasets[name] || [] : [];
}

export function domainTransforms(transforms = []) {
  return transforms.filter((transform) => !transform.filter && !transform.limit);
}

function normalizeStepTransition(transition = {}) {
  return {
    scene: uniqueTokens(transition.scene)
  };
}

function normalizeStepAction(step = {}, index = 0) {
  const fallback = index === 0 ? ["step", "tooltip", "enter"] : ["step", "tooltip"];
  return uniqueTokens(step.action?.length ? step.action : fallback);
}

function normalizeStepViews(step) {
  if (step.views) return step.views;
  if (step.view) return { main: step.view };
  return {};
}

function collectViewDataSources(steps) {
  const data = {};
  const normalizedSteps = steps.map((step, stepIndex) => ({
    ...step,
    views: Object.fromEntries(
      Object.entries(step.views || {}).map(([viewId, viewSpec]) => {
        if (!viewSpec?.data?.url) return [viewId, viewSpec];
        const name = viewSpec.data.name || `__step_${stepIndex + 1}_${viewId}`;
        data[name] = normalizeUrlDataSource(viewSpec.data);
        return [
          viewId,
          {
            ...viewSpec,
            data: { name }
          }
        ];
      })
    )
  }));
  return { data, steps: normalizedSteps };
}

function normalizeUrlDataSource(dataSpec) {
  return {
    ...dataSpec,
    type: dataSpec.type || dataSpec.format?.type || dataTypeFromUrl(dataSpec.url)
  };
}

function dataTypeFromUrl(url = "") {
  return String(url).toLowerCase().endsWith(".json") ? "json" : "csv";
}
