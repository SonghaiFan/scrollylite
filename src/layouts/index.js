const layoutRegistry = new Map();

export function registerLayout(name, preset) {
  const key = normalizeLayoutName(name);
  if (!key) throw new Error("Layout name is required.");
  layoutRegistry.set(key, {
    classes: [],
    ...preset,
    name: key
  });
}

export function resolveLayout(designSpace = {}) {
  const layout = designSpace.layout || {};
  const requested = layout.preset || layout.name;

  if (requested) {
    return layoutRegistry.get(normalizeLayoutName(requested)) || layoutRegistry.get("floatToText");
  }

  if (layout.layering === "textOverVis") return layoutRegistry.get("textOverVis");
  if (layout.binding === "floatToText") return layoutRegistry.get("floatToText");
  return layoutRegistry.get("floatToText");
}

export function layoutClasses(designSpace = {}) {
  return resolveLayout(designSpace)?.classes || [];
}

export function availableLayouts() {
  return Array.from(layoutRegistry.keys()).sort();
}

function normalizeLayoutName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const compact = raw.replace(/[\s_-]+([a-z])/gi, (_, letter) => letter.toUpperCase());
  return compact.charAt(0).toLowerCase() + compact.slice(1);
}

registerLayout("floatToText", {
  classes: ["sl-layout-preset-float-to-text"]
});

registerLayout("textOverVis", {
  classes: ["sl-layout-preset-text-over-vis"]
});
