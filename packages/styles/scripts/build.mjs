import { mkdir, readFile, writeFile } from "node:fs/promises";

// index.css is the single source of truth for section ordering.
const source = new URL("../src/", import.meta.url);
const entry = await readFile(new URL("index.css", source), "utf8");
const sections = [];
for (const line of entry.trim().split(/\r?\n/)) {
  const match = /^@import "\.\/([a-z-]+\.css)";$/.exec(line.trim());
  if (!match) throw new Error(`Unexpected stylesheet entry: ${line}`);
  const css = await readFile(new URL(match[1], source), "utf8");
  if (/@import\b/.test(css)) throw new Error(`Nested imports are unsupported: ${match[1]}`);
  sections.push(`/* ${match[1]} */\n${css.trim()}\n`);
}
const dist = new URL("../dist/", import.meta.url);
await mkdir(dist, { recursive: true });
await writeFile(new URL("index.css", dist), sections.join("\n"));
console.log(`Built @tilcayo/styles (${sections.length} sections)`);
