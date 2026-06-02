import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from "path";

const HARVESTED_FILES = ['input.txt', 'harvested.txt'].map(f => resolve(f));
const ID_RE = /\b[0-9A-Za-z]{4}-[0-9A-Za-z]{4}-[0-9A-Za-z]{4}\b/g;

function extractIds(text) {
  const matches = text.match(ID_RE) || [];
  return new Set(matches);
}

function main() {
  let found = new Set();

  for (const f of HARVESTED_FILES) {
    if (!existsSync(f)) {
      console.warn(`Warning: ${f} not found, skipping.`);
      continue;
    }
    const text = readFileSync(f, 'utf-8');
    const ids = extractIds(text);
    console.log(`${f}: ${ids.size} IDs found.`);
    for (const id of ids) found.add(id);
  }

  console.log(`\nFound ${found.size} unique IDs total.\n`);
  const items = [...found].sort().map(id => `"${id}"`).join(', ');
  console.log(`const fragments = [${items}];\n`);
}

main();
process.exit(0);
