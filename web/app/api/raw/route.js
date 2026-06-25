import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dayParam = searchParams.get('day');
  const mode = searchParams.get('mode') || 'br';
  const chapter = searchParams.get('chapter');
  const season = searchParams.get('season');

  const parts = [mode];
  if (chapter) parts.push(chapter);
  if (season) parts.push(season);

  const eventDir = path.join(process.cwd(), 'uploaded', 'mappings', ...parts);

  let output = '';

  try {
    const jsonFiles = [];
    async function scanDir(d) {
      try {
        const entries = await fs.readdir(d, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory() && !e.name.startsWith('.')) {
            await scanDir(path.join(d, e.name));
          } else if (e.isFile() && e.name.match(/^\d+\.json$/)) {
            jsonFiles.push(path.join(d, e.name));
          }
        }
      } catch (e) { }
    }

    await scanDir(eventDir);

    const targetFiles = (dayParam === 'all')
      ? jsonFiles
      : jsonFiles.filter(f => path.basename(f) === `${parseInt(dayParam) || 1}.json`);

    const mappingsDir = path.join(process.cwd(), 'uploaded', 'mappings');
    const grouped = {};

    for (const file of targetFiles) {
      const rel = path.relative(mappingsDir, file).split(path.sep);

      let eventChap = rel.length > 2 ? rel[1] : '?';
      let eventSeas = rel.length > 3 ? rel[2] : '';

      const header = eventSeas
        ? `# Chapter ${eventChap} Season ${eventSeas}\n`
        : `# Chapter ${eventChap}\n`;

      const dayNum = path.basename(file, '.json');

      if (!grouped[header]) grouped[header] = {};
      if (!grouped[header][dayNum]) grouped[header][dayNum] = new Set();

      try {
        const content = await fs.readFile(file, 'utf-8');
        const data = JSON.parse(content);
        for (const k of Object.keys(data)) {
          if (k !== 'count') grouped[header][dayNum].add(k);
        }
      } catch (e) { }
    }

    const eventBlocks = [];
    const sortedHeaders = Object.keys(grouped).sort();

    for (const header of sortedHeaders) {
      const puzzleBlocks = [];
      const sortedDays = Object.keys(grouped[header]).sort((a, b) => parseInt(a) - parseInt(b));

      for (const d of sortedDays) {
        if (grouped[header][d].size > 0) {
          puzzleBlocks.push(`## Puzzle ${d}\n${Array.from(grouped[header][d]).join('\n')}`);
        }
      }

      if (puzzleBlocks.length > 0) {
        eventBlocks.push(`${header}\n${puzzleBlocks.join('\n\n')}`);
      }
    }

    output = eventBlocks.join('\n\n\n');
  } catch (err) {
    output = '';
  }

  return new NextResponse(output, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}