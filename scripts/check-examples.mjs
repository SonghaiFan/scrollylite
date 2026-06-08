import { readFile, stat } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createDemoSpec, availableStories } from "../examples/weather/specs/demo.js";
import { compileSpec } from "../src/runtime/spec.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const exampleDir = join(root, "examples", "weather");
const htmlPath = join(exampleDir, "index.html");
const html = await readFile(htmlPath, "utf8");
const minimalDir = join(root, "examples", "minimal");
const minimalHtml = await readFile(join(minimalDir, "index.html"), "utf8");

await assertHtmlLocalAssets(html, exampleDir);
await assertHtmlLocalAssets(minimalHtml, minimalDir);
assertPublicApiImports(html);
assertMinimalGlobalExample(minimalHtml);
await assertCompiledStoryDataUrls();

console.log("Example invariants ok.");

async function assertHtmlLocalAssets(source, baseDir) {
  const attrs = [...source.matchAll(/\s(?:href|src)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) =>
      value &&
      !value.startsWith("http://") &&
      !value.startsWith("https://") &&
      !value.startsWith("?") &&
      !value.startsWith("#")
    );
  const moduleImports = [...source.matchAll(/\bfrom\s+"([^"]+)"/g)]
    .map((match) => match[1])
    .filter((value) => value.startsWith("."));

  for (const value of [...attrs, ...moduleImports]) {
    await assertFile(resolveExamplePath(value, baseDir), `Example asset does not exist: ${value}`);
  }
}

function assertPublicApiImports(source) {
  const imports = [...source.matchAll(/\bfrom\s+"([^"]+)"/g)].map((match) => match[1]);
  const badImport = imports.find((value) =>
    value.startsWith("../../src/") &&
    value !== "../../src/index.js"
  );
  if (badImport) {
    throw new Error(`Example must import library code only through src/index.js, got ${badImport}`);
  }
}

function assertMinimalGlobalExample(source) {
  if (!source.includes("dist/scrollylite.global.js")) {
    throw new Error("Minimal example must use the global script build.");
  }
  if (!source.includes("const { createStory, story, bar } = ScrollyLite")) {
    throw new Error("Minimal example must use the ScrollyLite global.");
  }
  if (source.includes('type="module"') || source.includes(" from ")) {
    throw new Error("Minimal example must not use module imports.");
  }
  if (source.includes("d3:") || source.includes("aq:")) {
    throw new Error("Minimal example must not pass d3 or aq explicitly.");
  }
  if (source.includes("stroy")) {
    throw new Error("Minimal example contains a misspelled story variable.");
  }
}

async function assertCompiledStoryDataUrls() {
  for (const { id } of availableStories()) {
    const compiled = compileSpec(createDemoSpec({ storyId: id }));
    for (const source of Object.values(compiled.data || {})) {
      if (!source?.url) continue;
      await assertFile(resolveExamplePath(source.url, exampleDir), `Story "${id}" data file does not exist: ${source.url}`);
    }
  }
}

function resolveExamplePath(value, baseDir) {
  return normalize(join(baseDir, value.split("#")[0].split("?")[0]));
}

async function assertFile(path, message) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) throw new Error(message);
}
