import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = new URL("../dist/", import.meta.url);

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const tsc = spawnSync("npx", ["tsc", "-p", "tsconfig.json"], {
  cwd: root,
  encoding: "utf8",
  stdio: "pipe"
});
if (tsc.status !== 0) {
  process.stderr.write(tsc.stdout || "");
  process.stderr.write(tsc.stderr || "");
  throw new Error("TypeScript build failed.");
}

await cp(new URL("../src/styles.css", import.meta.url), new URL("../dist/scrollylite.css", import.meta.url));
await cp(new URL("../src/themes", import.meta.url), new URL("../dist/themes", import.meta.url), {
  recursive: true,
  filter: (path) => !path.endsWith(".DS_Store")
});
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
  entryPoints: [new URL("../src/browser.ts", import.meta.url).pathname],
  format: "iife",
  globalName: "ScrollyLite",
  legalComments: "none",
  minify: true,
  outfile: new URL("../dist/scrollylite.global.js", import.meta.url).pathname,
  target: "es2020"
});

console.log(`Built ${join(root, "dist")}`);
