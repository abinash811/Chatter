#!/usr/bin/env node
// Pulls one component's exact source from the CARE UI registry (ADR 0008)
// and writes it into components/ui/.
//
// Usage:
//   node scripts/pull-care-component.mjs <name>
//   node scripts/pull-care-component.mjs <name> --from /path/to/local/careui/checkout
//
// Why not `npx shadcn add @care-ui/<name>`: components.json registers the
// registry correctly, but the shadcn CLI substitutes a URL's {name}
// placeholder with a non-global String.replace (verified in its own
// bundle, chunk-B2MD6U5O.js's Kl()) — it only replaces the FIRST
// occurrence. CARE's registry serves each item at
// registry/care-ui/<name>/<name>.json (the name twice), so the CLI's own
// registries feature can't address it. This script reads the same JSON
// format directly instead.
//
// --from is for environments without network access to careui.ohc.network
// (this fetch is blocked by egress policy in some sandboxed sessions) —
// point it at a local `git clone https://github.com/ohcnetwork/careui`
// checkout and it reads the identical JSON from disk.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const [, , name, ...rest] = process.argv;
if (!name) {
  console.error("Usage: node scripts/pull-care-component.mjs <name> [--from <local-careui-checkout>]");
  process.exit(1);
}

const fromIdx = rest.indexOf("--from");
const localRoot = fromIdx !== -1 ? rest[fromIdx + 1] : null;

async function loadRegistryItem(componentName) {
  if (localRoot) {
    const candidates = [
      path.join(localRoot, "public/registry/care-ui", componentName, `${componentName}.json`),
      path.join(localRoot, "registry/care-ui", componentName, `${componentName}.json`),
    ];
    for (const p of candidates) {
      if (existsSync(p)) return JSON.parse(await readFile(p, "utf8"));
    }
    throw new Error(`No local registry file found for "${componentName}" under ${localRoot}`);
  }
  const url = `https://careui.ohc.network/registry/care-ui/${componentName}/${componentName}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
  return res.json();
}

const item = await loadRegistryItem(name);

for (const file of item.files ?? []) {
  if (!file.content) continue;
  const targetName = path.basename(file.target ?? file.path);
  const destPath = path.join("components/ui", targetName);
  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, file.content, "utf8");
  console.log(`wrote ${destPath}`);
}

if (item.dependencies?.length) {
  console.log(`\nnpm dependencies (check real versions with npm view before installing):`);
  for (const dep of item.dependencies) console.log(`  ${dep}`);
}
if (item.registryDependencies?.length) {
  console.log(`\nalso depends on these care-ui components — pull those too:`);
  for (const dep of item.registryDependencies) console.log(`  node scripts/pull-care-component.mjs ${dep}`);
}
console.log(`\nNext: export "${name}" from components/ui/index.ts, adapt to our token names if it references any of its own, then npm run check:all.`);
