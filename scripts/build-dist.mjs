import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = new URL("../dist/", import.meta.url);
const srcDir = new URL("../src/", import.meta.url);
const entries = [
  "browser.d.ts",
  "browser.js",
  "charts",
  "data/transforms.js",
  "grammar",
  "identity",
  "index.d.ts",
  "index.js",
  "labels.js",
  "layouts",
  "runtime",
  "scroll-drivers",
  "scrolly-meta.js",
  "scrollylite.js",
  "themes",
  "timing.js",
  "transition-progress.js",
  "transitions"
];

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

for (const entry of entries) {
  await copyEntry(entry);
}

await cp(new URL("../src/styles.css", import.meta.url), new URL("../dist/scrollylite.css", import.meta.url));
await writeFile(
  new URL("../dist/scrollylite.esm.js", import.meta.url),
  'export * from "./index.js";\n'
);
await writeFile(
  new URL("../dist/scrollylite.browser.js", import.meta.url),
  'export * from "./browser.js";\n'
);
await esbuild.build({
  bundle: true,
  entryPoints: [new URL("../src/browser.js", import.meta.url).pathname],
  format: "iife",
  globalName: "ScrollyLite",
  legalComments: "none",
  minify: true,
  outfile: new URL("../dist/scrollylite.global.js", import.meta.url).pathname,
  target: "es2020"
});

console.log(`Built ${join(root, "dist")}`);

async function copyEntry(entry) {
  const source = new URL(entry, srcDir);
  const target = new URL(entry, distDir);
  await mkdir(new URL("./", target), { recursive: true });
  await cp(source, target, {
    recursive: true,
    filter: (path) => !path.endsWith(".DS_Store") && !path.endsWith("README.md")
  });
}
