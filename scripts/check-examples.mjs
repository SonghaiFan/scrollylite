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
assertMinimalEsmExample(minimalHtml);
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

function assertMinimalEsmExample(source) {
  if (!source.includes('type="module"')) {
    throw new Error("Minimal example must use a module script.");
  }
  if (!source.includes('from "https://cdn.jsdelivr.net/npm/scrollylite@0.1.1/+esm"')) {
    throw new Error("Minimal example must follow the D3-style jsDelivr +esm import.");
  }
  if (!source.includes('from "https://cdn.jsdelivr.net/npm/d3@7/+esm"')) {
    throw new Error("Minimal example must import D3 from jsDelivr +esm.");
  }
  if (!source.includes('from "https://cdn.jsdelivr.net/npm/arquero@8/+esm"')) {
    throw new Error("Minimal example must import Arquero from jsDelivr +esm.");
  }
  if (!source.includes("d3, aq")) {
    throw new Error("Minimal example must pass d3 and aq explicitly to createStory.");
  }
  if (
    source.includes("dist/scrollylite.global.js") ||
    source.includes("window.ScrollyLite") ||
    source.includes("= ScrollyLite")
  ) {
    throw new Error("Minimal example must not use the global script build.");
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
