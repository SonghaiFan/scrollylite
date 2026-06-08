import { diffViewStates } from "../grammar/diff.js";
import { layoutClasses } from "../layouts/index.js";
import { externalizeScrollyViewSpec } from "../scrolly-meta.js";
import { compileEffectiveView } from "./view-compile.js";
import { dash, escapeHtml } from "./utils.js";

export function renderShell(target, spec, options = {}) {
  target.className = [
    "sl-root",
    ...layoutClasses(spec.layout)
  ].join(" ");

  const intro = document.createElement("section");
  intro.className = "sl-intro";
  intro.innerHTML = `
    <div class="sl-intro-inner">
      <p class="sl-kicker">ScrollyLite</p>
      <h1 class="sl-title">${escapeHtml(spec.title || "Untitled story")}</h1>
      <p class="sl-description">${escapeHtml(spec.description || "")}</p>
    </div>
  `;
  target.append(intro);

  const story = document.createElement("section");
  story.className = "sl-story";

  const steps = document.createElement("article");
  steps.className = "sl-steps";

  spec.steps.forEach((step, index) => {
    const node = document.createElement("section");
    node.className = ["sl-step", ...stepClasses(step)].join(" ");
    node.id = step.id;
    node.dataset.stepIndex = String(index);
    node.dataset.transitionScene = (step.transition?.scene || []).join(" ");
    node.dataset.action = (step.action || []).join(" ");
    node.innerHTML = `
      <div class="sl-step-stack">
        ${options.debug ? renderStepTransitionInspector(spec.steps, index, options) : ""}
        <div class="sl-step-card">
          <div class="sl-step-number">${String(index + 1).padStart(2, "0")}</div>
          <h2>${escapeHtml(step.title || `Step ${index + 1}`)}</h2>
          <p>${escapeHtml(step.body || "")}</p>
          ${options.debug ? renderStepInspector(step) : ""}
        </div>
      </div>
    `;
    steps.append(node);
  });

  const figureWrap = document.createElement("aside");
  figureWrap.className = "sl-figure-wrap";

  const figure = document.createElement("figure");
  figure.className = "sl-figure";
  figure.innerHTML = `
    <figcaption class="sl-figure-header">
      <p class="sl-figure-title"></p>
      <span class="sl-mark-name"></span>
    </figcaption>
  `;

  const viewNodes = {};
  Object.entries(spec.views).forEach(([viewId]) => {
    const view = document.createElement("div");
    view.className = "sl-view";
    view.dataset.viewId = viewId;
    figure.append(view);
    viewNodes[viewId] = view;
  });

  figureWrap.append(figure);
  story.append(steps, figureWrap);
  target.append(story);

  const progress = document.createElement("div");
  progress.className = "sl-progress";
  progress.innerHTML = `<div class="sl-progress-fill"></div>`;
  if (spec.layout.progress) target.append(progress);

  const nav = document.createElement("nav");
  nav.className = "sl-nav";
  nav.setAttribute("aria-label", "Story steps");
  spec.steps.forEach((step, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.stepIndex = String(index);
    button.setAttribute("aria-label", step.title || `Step ${index + 1}`);
    nav.append(button);
  });
  if (spec.layout.nav) target.append(nav);

  const tooltip = document.createElement("div");
  tooltip.className = "sl-tooltip";
  target.append(tooltip);

  return {
    root: target,
    story,
    figure,
    figureTitle: figure.querySelector(".sl-figure-title"),
    markName: figure.querySelector(".sl-mark-name"),
    steps: Array.from(steps.querySelectorAll(".sl-step")),
    navButtons: Array.from(nav.querySelectorAll("button")),
    progressFill: progress.querySelector(".sl-progress-fill"),
    views: viewNodes,
    tooltip
  };
}

function renderStepInspector(step = {}) {
  const authoringCode = step.inspector?.authoringCode;
  const compiledSpec = stepCompiledViewSpec(step);

  if (!authoringCode && !compiledSpec) return "";

  return `
    <section class="sl-step-inspector" aria-label="Step authoring and compiled specification">
      <div class="sl-step-inspector-grid">
        ${authoringCode ? renderCodePanel("Authoring code", authoringCode) : ""}
        ${compiledSpec ? `
          <details class="sl-compiled-spec">
            <summary>Compiled specification</summary>
            ${renderCodePanel("Compiled specification", JSON.stringify(compiledSpec, null, 2))}
          </details>
        ` : ""}
      </div>
    </section>
  `;
}

function renderStepTransitionInspector(steps = [], index, options = {}) {
  if (index <= 0) return "";
  const previousStep = steps[index - 1];
  const currentStep = steps[index];
  const previousSpec = stepEffectiveViewSpec(previousStep);
  const currentSpec = stepEffectiveViewSpec(currentStep);
  if (!previousSpec || !currentSpec) return "";

  const idiom = options.idioms?.get?.(currentSpec) || null;
  const previousPlanSpec = prepareIdiomSpec(idiom, previousSpec);
  const currentPlanSpec = prepareIdiomSpec(idiom, currentSpec);
  const diff = diffViewStates(previousPlanSpec, currentPlanSpec);
  const transitionScenes = currentStep.transition?.scene || [];
  const transitionPlan = idiom?.resolveTransitionPlan?.(previousPlanSpec, currentPlanSpec) || {};
  const transitionPlanKey = idiom?.inspect?.transitionPlanKey || "transitionPlan";
  const summary = transitionScenes.length ? transitionScenes.join(" + ") : "ordinary update";
  const transitionDebug = {
    from: stepLabel(index - 1),
    to: stepLabel(index),
    inferredTransition: transitionScenes,
    structuralDiff: diff.changed,
    semanticDeltas: diff.deltas.map(summarizeDelta),
    [transitionPlanKey]: compactTransitionPlan(transitionPlan)
  };

  return `
    <details class="sl-transition-inspector">
      <summary>
        <span>${escapeHtml(stepLabel(index - 1))} → ${escapeHtml(stepLabel(index))}</span>
        <strong>${escapeHtml(summary)}</strong>
      </summary>
      <div class="sl-step-inspector-grid">
        ${renderCodePanel("Inferred transition", JSON.stringify(transitionScenes, null, 2))}
        ${renderCodePanel("Diff result", JSON.stringify(transitionDebug, null, 2))}
      </div>
    </details>
  `;
}

function renderCodePanel(title, code) {
  return `
    <section class="sl-code-panel" aria-label="${escapeHtml(title)}">
      <h3>${escapeHtml(title)}</h3>
      <pre><code>${escapeHtml(code)}</code></pre>
    </section>
  `;
}

function stepClasses(step = {}) {
  return [
    ...(step.transition?.scene || []).map((scene) => `sl-scene-${dash(scene)}`),
    ...(step.action || []).map((action) => `sl-action-${dash(action)}`)
  ];
}

function stepCompiledViewSpec(step = {}) {
  const viewSpec = step.views?.main || Object.values(step.views || {})[0] || null;
  if (!viewSpec?.mark || viewSpec.mark === "text") return null;
  return externalizeScrollyViewSpec(viewSpec);
}

function stepEffectiveViewSpec(step = {}) {
  const viewSpec = stepCompiledViewSpec(step);
  if (!viewSpec) return null;
  return compileEffectiveView(viewSpec, step.transition || {}).effectiveViewSpec;
}

function prepareIdiomSpec(idiom, spec) {
  if (!spec) return null;
  return idiom?.prepareSpec?.(spec) || spec;
}

function stepLabel(index) {
  return `Step ${String(index + 1).padStart(2, "0")}`;
}

function summarizeDelta(delta = {}) {
  return {
    type: delta.type,
    action: delta.action,
    previous: compactDiffValue(delta.previous),
    next: compactDiffValue(delta.next)
  };
}

function compactTransitionPlan(plan = {}) {
  const compact = { ...plan };
  delete compact.diff;
  if (plan.update) {
    compact.update = {
      mode: plan.update.mode,
      reason: plan.update.reason,
      target: plan.update.target,
      changedAxes: plan.update.changedAxes,
      stages: plan.update.stages,
      timing: plan.update.timing
    };
  }
  if (plan.key) compact.key = plan.key;
  if (plan.enter) compact.enter = plan.enter;
  if (plan.exit) compact.exit = plan.exit;
  return compact;
}

function compactDiffValue(value) {
  if (value == null || typeof value !== "object") return value ?? null;
  const text = JSON.stringify(value);
  if (text.length <= 320) return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  return {
    keys: Object.keys(value),
    summary: text.slice(0, 320)
  };
}
