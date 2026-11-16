// Empacota a API em um único arquivo ESM. Dependências npm ficam externas; pacotes do workspace
// (@projacseg/*, publicados como TypeScript) são embutidos no bundle.
import { build } from "esbuild";
import { readFile } from "node:fs/promises";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const external = Object.keys(pkg.dependencies ?? {}).filter(
  (name) => !name.startsWith("@projacseg/"),
);

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  external,
  logLevel: "info",
});
