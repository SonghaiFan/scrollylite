import { chartModules } from "../src/charts/manifest.js";
import {
  createChartIdiomRegistry,
  createSpecCompilerRegistry,
  registerChartModules
} from "../src/charts/index.js";
import { createDemoSpec, availableStories } from "../examples/weather/specs/demo.js";
import { compileSpec } from "../src/runtime/spec.js";
import * as sourceApi from "../dist/index.js";
import * as distApi from "../dist/scrollylite.esm.js";

const publicApi = [
  "availableChartIdioms",
  "bar",
  "createChart",
  "createPage",
  "createStory",
  "defineChartIdiom",
  "line",
  "point",
  "registerChartIdiom",
  "registerChartModule",
  "story",
  "unit"
];
const registry = createChartIdiomRegistry();
registerChartModules(registry, chartModules, {});
const compilerKeys = Object.keys(createSpecCompilerRegistry(chartModules)).sort();
const storySteps = Object.fromEntries(
  availableStories().map(({ id }) => [
    id,
    compileSpec(createDemoSpec({ storyId: id })).steps.length
  ])
);
const themeSpec = sourceApi.story()
  .theme("./theme.css", { accent: "#b05d3b" })
  .theme({ variables: { muted: "#777" } })
  .data("rows", { values: [{ category: "A", value: 1 }] })
  .step("Theme", sourceApi.bar("rows").x("category").y("value"))
  .toSpec();
const actionBase = sourceApi.bar("rows").x("category").y("value").key("category");
const actionSpec = sourceApi.story()
  .data("rows", {
    values: [
      { category: "A", value: 1 },
      { category: "B", value: 2 }
    ]
  })
  .action("scroller")
  .step("Scroller default", actionBase)
  .step("Stepper override", actionBase.where({ category: "A" }), { action: "stepper" })
  .step({
    title: "Scroller object override",
    view: actionBase.where({ category: "B" }),
    action: "scroller"
  })
  .toSpec();

const expected = ["bar", "line", "point", "unit"];
assertSame(Object.keys(sourceApi).sort(), publicApi, "source public API");
assertSame(Object.keys(distApi).sort(), publicApi, "dist public API");
assertSame(registry.types(), expected, "chart idiom registry");
assertSame(compilerKeys, expected, "spec compiler registry");
assertSame(themeSpec.theme, {
  href: "./theme.css",
  accent: "#b05d3b",
  variables: { muted: "#777" }
}, "story theme builder");
assertSame(actionSpec.steps.map((step) => step.action), [
  ["scroll", "tooltip", "enter"],
  ["step", "tooltip"],
  ["scroll", "tooltip"]
], "story action aliases and per-step overrides");
await assertRejects(
  () => sourceApi.createStory({ steps: [{ views: { main: { mark: "bar" } } }] }),
  "Pass { d3 } to createStory()",
  "source createStory dependency contract"
);
await assertRejects(
  () => distApi.createStory({ steps: [{ views: { main: { mark: "bar" } } }] }),
  "Pass { d3 } to createStory()",
  "dist createStory dependency contract"
);

for (const id of expected) {
  if (!storySteps[id]) {
    throw new Error(`Story "${id}" did not compile.`);
  }
}

console.log(JSON.stringify({
  types: registry.types(),
  compilerKeys,
  stories: storySteps
}, null, 2));

function assertSame(actual, expected, label) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) {
    throw new Error(`${label} mismatch: expected ${right}, got ${left}`);
  }
}

async function assertRejects(fn, message, label) {
  try {
    await fn();
  } catch (error) {
    if (String(error?.message || error).includes(message)) return;
    throw new Error(`${label} rejected with wrong error: ${error?.message || error}`);
  }
  throw new Error(`${label} did not reject.`);
}
