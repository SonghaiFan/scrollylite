import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const chartsDir = join(root, "src", "charts");
const manifestPath = join(chartsDir, "manifest.js");

const entries = await readdir(chartsDir);
const idioms = [];

for (const entry of entries) {
  const fullPath = join(chartsDir, entry);
  if (!(await stat(fullPath)).isDirectory()) continue;
  try {
    await stat(join(fullPath, "plugin.js"));
    idioms.push(entry);
  } catch {
    // Not a runtime chart idiom.
  }
}

idioms.sort();

const expected = manifestSource(idioms);
const actual = await readFile(manifestPath, "utf8");

if (actual !== expected) {
  throw new Error("src/charts/manifest.js is stale. Run node scripts/sync-chart-manifest.mjs.");
}

console.log(`Chart manifest covers ${idioms.length} idioms.`);

function manifestSource(names) {
  const importLines = names.map((name) => `import * as ${identifier(name)} from "./${name}/plugin.js";`);
  const moduleLines = names.map((name) => `  ${identifier(name)}`);
  return `${[
    "// Generated from src/charts/*/plugin.js.",
    "// Run scripts/sync-chart-manifest.mjs after adding or removing a chart idiom folder.",
    ...importLines,
    "",
    "export const chartModules = [",
    `${moduleLines.join(",\n")}`,
    "];",
    ""
  ].join("\n")}`;
}

function identifier(name) {
  return name.replace(/[^a-zA-Z0-9_$]/g, "_").replace(/^[^a-zA-Z_$]/, "_$&");
}
