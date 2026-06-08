import { spawnSync } from "node:child_process";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const expectedApi = [
  "availableChartIdioms",
  "bar",
  "createStory",
  "defineChartIdiom",
  "line",
  "point",
  "registerChartIdiom",
  "registerChartModule",
  "story",
  "unit"
];

let tarball = null;
let consumerDir = null;

try {
  const pack = run("npm", ["pack", "--json", "--ignore-scripts"], root);
  const [packed] = JSON.parse(pack.stdout);
  tarball = join(root, packed.filename);
  consumerDir = await mkdtemp(join(tmpdir(), "scrollylite-consumer-"));

  await writeFile(
    join(consumerDir, "package.json"),
    JSON.stringify({ type: "module", private: true }, null, 2)
  );
  run("npm", [
    "install",
    "--ignore-scripts",
    "--legacy-peer-deps",
    "--no-audit",
    "--no-fund",
    tarball
  ], consumerDir);

  await writeConsumerSmoke(consumerDir);
  run("node", ["consumer-smoke.mjs"], consumerDir);
  console.log("Pack consumer invariants ok.");
} finally {
  if (tarball) await rm(tarball, { force: true });
  if (consumerDir) await rm(consumerDir, { recursive: true, force: true });
}

async function writeConsumerSmoke(dir) {
const source = `
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import * as api from "scrollylite";
import * as browserApi from "scrollylite/browser";

const expectedApi = ${JSON.stringify(expectedApi, null, 2)};
const actualApi = Object.keys(api).sort();
assertSame(actualApi, expectedApi, "public API");
assertSame(Object.keys(browserApi).sort(), expectedApi, "browser public API");
assertSame(Object.keys(globalThis.ScrollyLite).sort(), expectedApi, "browser global API");
assertSame(api.availableChartIdioms(), ["bar", "line", "point", "unit"], "chart idioms");

const spec = api.story()
  .data("rows", { url: "./rows.csv", type: "csv" })
  .view("main", { height: 420 })
  .step("Baseline", api.bar("rows").x("category").y("value"))
  .toSpec();
if (!spec.steps?.length) throw new Error("story builder did not emit steps");

await assertRejects(
  () => api.createStory({ steps: [{ views: { main: { mark: "bar" } } }] }),
  "Pass { d3 } to createStory()",
  "createStory dependency contract"
);

const entry = fileURLToPath(import.meta.resolve("scrollylite"));
const browserEntry = fileURLToPath(import.meta.resolve("scrollylite/browser"));
const style = fileURLToPath(import.meta.resolve("scrollylite/style.css"));
const theme = fileURLToPath(import.meta.resolve("scrollylite/themes/default.css"));
const root = entry.replace(/\\/dist\\/scrollylite\\.esm\\.js$/, "");
const globalScript = root + "/dist/scrollylite.global.js";
assertSame(browserEntry, root + "/dist/scrollylite.browser.js", "browser export");
await assertFile(root + "/dist/index.d.ts", "types");
await assertFile(root + "/dist/browser.d.ts", "browser types");
await assertFile(globalScript, "global script");
assertSame(style, root + "/dist/scrollylite.css", "style export");
assertSame(theme, root + "/dist/themes/default.css", "theme export");
await assertFile(style, "style");
await assertFile(theme, "theme");
await assertGlobalScript(globalScript);

function assertSame(actual, expected, label) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) {
    throw new Error(\`\${label} mismatch: expected \${right}, got \${left}\`);
  }
}

async function assertRejects(fn, message, label) {
  try {
    await fn();
  } catch (error) {
    if (String(error?.message || error).includes(message)) return;
    throw new Error(\`\${label} rejected with wrong error: \${error?.message || error}\`);
  }
  throw new Error(\`\${label} did not reject\`);
}

async function assertFile(path, label) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) throw new Error(\`missing \${label}: \${path}\`);
}

async function assertGlobalScript(path) {
  const context = { console };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(await readFile(path, "utf8"), context);
  assertSame(Object.keys(context.ScrollyLite).sort(), expectedApi, "global script API");
}
`;
  await writeFile(join(dir, "consumer-smoke.mjs"), source);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.status === 0) return result;

  const rendered = [result.stdout, result.stderr].filter(Boolean).join("\n");
  throw new Error(`${command} ${args.join(" ")} failed:\n${rendered}`);
}
