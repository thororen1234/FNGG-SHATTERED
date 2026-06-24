import { NextResponse } from 'next/server';
import { getData } from '@/app/lib/data';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dayParam = searchParams.get('day');
  const puzzleParam = searchParams.get('puzzle') || 'shattered';

  const data = await getData();
  const puzzleData = data[puzzleParam] || { days: {} };

  let output = '';

  if (puzzleParam === 'og') {
    if (dayParam === 'all') {
      const codes = [];
      for (let d = 1; d <= 6; d++) {
        try {
          const file = await fs.readFile(path.join(process.cwd(), 'uploaded', 'mappings', 'og', `day-${d}.json`));
          const json = JSON.parse(file);
          const dayCodes = Object.keys(json).filter(k => k !== 'count').sort();
          if (dayCodes.length > 0) {
            codes.push(`# Day ${d}\n${dayCodes.join('\n')}`);
          }
        } catch(e) {}
      }
      output = codes.join('\n\n');
    } else {
      try {
        const day = String(parseInt(dayParam) || 1);
        const file = await fs.readFile(path.join(process.cwd(), 'uploaded', 'mappings', 'og', `day-${day}.json`));
        const json = JSON.parse(file);
        output = Object.keys(json).filter(k => k !== 'count').sort().join('\n');
      } catch(e) {}
    }
  } else {
    if (dayParam === 'all') {
      output = Object.entries(puzzleData.days || {})
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([d, codes]) => `# Day ${d}\n${codes.join('\n')}`)
        .join('\n\n');
    } else {
      const day = String(parseInt(dayParam) || 1);
      const codes = (puzzleData.days || {})[day] || [];
      output = codes.join('\n');
    }
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