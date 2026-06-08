import { readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const chartsDir = join(root, "src", "charts");
const manifestPath = join(chartsDir, "manifest.js");
const moduleCacheKey = "semantic-key-1";

const entries = await readdir(chartsDir);
const idioms = [];

for (const entry of entries) {
  const fullPath = join(chartsDir, entry);
  if (!(await stat(fullPath)).isDirectory()) continue;
  try {
    await stat(join(fullPath, "plugin.js"));
    idioms.push(entry);
  } catch {
    // A chart folder becomes a runtime plugin only when it exposes plugin.js.
  }
}

idioms.sort();

const importLines = idioms.map((name) => `import * as ${identifier(name)} from "./${name}/plugin.js?v=${moduleCacheKey}";`);
const moduleLines = idioms.map((name) => `  ${identifier(name)}`);
const source = `${[
  "// Generated from src/charts/*/plugin.js.",
  "// Run scripts/sync-chart-manifest.mjs after adding or removing a chart idiom folder.",
  ...importLines,
  "",
  "export const chartModules = [",
  `${moduleLines.join(",\n")}`,
  "];",
  ""
].join("\n")}`;

await writeFile(manifestPath, source);

function identifier(name) {
  return name.replace(/[^a-zA-Z0-9_$]/g, "_").replace(/^[^a-zA-Z_$]/, "_$&");
}
