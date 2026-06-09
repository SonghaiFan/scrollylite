import { readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const chartsDir = join(root, "src", "charts");
const manifestPath = join(chartsDir, "manifest.ts");

const entries = await readdir(chartsDir);
const idioms = [];

for (const entry of entries) {
  const fullPath = join(chartsDir, entry);
  if (!(await stat(fullPath)).isDirectory()) continue;
  const hasPlugin = await stat(join(fullPath, "plugin.ts")).then(() => true).catch(() => false)
    || await stat(join(fullPath, "plugin.js")).then(() => true).catch(() => false);
  if (hasPlugin) idioms.push(entry);
}

idioms.sort();

await writeFile(manifestPath, manifestSource(idioms));
console.log(`Wrote manifest for ${idioms.length} idioms.`);

function manifestSource(names) {
  const importLines = names.map((name) => `import * as ${identifier(name)} from "./${name}/plugin.js";`);
  const moduleLines = names.map((name) => `  ${identifier(name)}`);
  return `${[
    "import type { ChartPlugin } from '../types/index.js';",
    "// Generated from src/charts/*/plugin.ts.",
    "// Run scripts/sync-chart-manifest.mjs after adding or removing a chart idiom folder.",
    ...importLines,
    "",
    "// eslint-disable-next-line @typescript-eslint/no-explicit-any",
    "export const chartModules: Array<{ plugin: ChartPlugin<any> }> = [",
    `${moduleLines.join(",\n")}`,
    "];",
    ""
  ].join("\n")}`;
}

function identifier(name) {
  return name.replace(/[^a-zA-Z0-9_$]/g, "_").replace(/^[^a-zA-Z_$]/, "_$&");
}
