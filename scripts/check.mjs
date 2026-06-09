import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const targets = [
  "examples",
  "src",
  "scripts"
];
const staleTextTargets = [
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "index.html",
  "package.json",
  "README.md",
  "docs",
  "examples",
  "src"
];
const forbiddenRepoText = [
  "scrolly-grammar-template",
  'src="https://cdn.jsdelivr.net/npm/scrollylite@0.1.0"',
  "src/data/weather",
  "src/specs/",
  "scatter-story"
];
const files = [];
const textFiles = [];

for (const target of targets) {
  await collect(join(root, target));
}

for (const target of staleTextTargets) {
  await collectText(join(root, target));
}

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: root,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    throw new Error(`Syntax check failed: ${file}`);
  }
}

for (const file of textFiles.sort()) {
  const text = await readFile(file, "utf8");
  const forbidden = forbiddenRepoText.find((token) => text.includes(token));
  if (forbidden) {
    throw new Error(`Forbidden stale reference "${forbidden}" in ${file}`);
  }
}
await assertDebugInspectorGate();

console.log(`Checked ${files.length} JavaScript modules.`);

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "dist" || entry.name === "node_modules") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collect(path);
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".mjs")) {
      files.push(path);
    }
  }
}

async function collectText(path) {
  const entries = await readdir(path, { withFileTypes: true }).catch(() => null);
  if (!entries) {
    if (/\.(css|html|js|md|mjs)$/.test(path)) textFiles.push(path);
    return;
  }

  for (const entry of entries) {
    if (entry.name === "dist" || entry.name === "node_modules") continue;
    const childPath = join(path, entry.name);
    if (entry.isDirectory()) {
      await collectText(childPath);
    } else if (/\.(css|html|js|md|mjs)$/.test(entry.name)) {
      textFiles.push(childPath);
    }
  }
}

async function assertDebugInspectorGate() {
  const shell = await readFile(join(root, "src", "runtime", "shell.js"), "utf8");
  const runtime = await readFile(join(root, "src", "scrollylite.js"), "utf8");
  if (!shell.includes("options.debug ? renderStepInspector(step) : \"\"")) {
    throw new Error("Step inspector must be gated behind createStory({ debug: true }).");
  }
  if (!shell.includes("options.debug ? renderStepTransitionInspector(spec.steps, index, options) : \"\"")) {
    throw new Error("Transition inspector must be gated behind createStory({ debug: true }).");
  }
  if (!runtime.includes("debug: options.debug === true")) {
    throw new Error("createStory must pass an explicit boolean debug option to renderShell.");
  }
}
