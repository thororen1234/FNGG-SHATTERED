import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from "path";

const HARVESTED_FILES = ['input.txt', 'harvested.txt'].map(f => resolve(f));
const SEEN_FILE = resolve('seen_ids.txt');
const ID_RE = /\b[0-9A-Za-z]{4}-[0-9A-Za-z]{4}-[0-9A-Za-z]{4}\b/g;

function loadSeen() {
  if (!existsSync(SEEN_FILE)) return new Set();
  return new Set(
    readFileSync(SEEN_FILE, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
  );
}

function saveSeen(seen) {
  const sorted = [...seen].sort();
  writeFileSync(SEEN_FILE, sorted.join('\n'), 'utf-8');
}

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

  const seen = loadSeen();
  const newIds = [...found].filter(id => !seen.has(id)).sort();

  console.log(`\nFound ${found.size} unique IDs total, ${newIds.length} are new.\n`);

  if (newIds.length === 0) {
    console.log('Nothing new to submit.');
    return;
  }

  const items = newIds.map(id => `"${id}"`).join(', ');
  console.log(`const fragments = [${items}];\n`);

  for (const id of newIds) seen.add(id);
  saveSeen(seen);
  console.log(`seen_ids.txt updated (${seen.size} total IDs tracked).`);
}

main();
process.exit(0);
