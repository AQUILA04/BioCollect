import { readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const localesDir = join(packageDir, "src", "locales");
const output = join(packageDir, "src", "generated-locales.ts");
const files = (await readdir(localesDir)).filter(file => /^[a-z]{2,3}\.ts$/.test(file)).sort();

const imports = files.map(file => {
  const name = file.slice(0, -3);
  return `import { ${name} } from "./locales/${name}";`;
}).join("\n");
const definitions = files.map(file => {
  const name = file.slice(0, -3);
  return `  { code: "${name}", label: ${name}.meta.name, direction: ${name}.meta.direction, translation: ${name} },`;
}).join("\n");

await writeFile(output, `// Généré automatiquement depuis src/locales/*.ts. Ne pas modifier à la main.\nimport type { LocaleDefinition } from "./types";\n${imports}\n\nexport const generatedLocales: LocaleDefinition[] = [\n${definitions}\n];\n`);
