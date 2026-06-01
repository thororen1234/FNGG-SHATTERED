import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const MESSAGES_FILE = resolve('messages.txt');
const ID_RE = /\b([0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4})\b/gi;

function main() {
  if (!existsSync(MESSAGES_FILE)) {
    console.error('messages.txt not found!');
    process.exit(1);
  }

  const text = readFileSync(MESSAGES_FILE, 'utf-8');
  const found = new Set([...text.matchAll(ID_RE)].map(m => m[1].toUpperCase()));
  const items = [...found].map(id => `"${id}"`).join(', ');
  console.log(`const fragments = [${items}];\n`);
}

main();
