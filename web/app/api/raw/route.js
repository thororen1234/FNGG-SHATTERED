import { NextResponse } from 'next/server';
import { getEventData } from '@/app/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dayParam = searchParams.get('day');
  const mode = searchParams.get('mode') || 'br';
  const chapter = searchParams.get('chapter');
  const season = searchParams.get('season');

  const puzzleData = await getEventData(mode, chapter, season);

  let output = '';

  if (dayParam === 'all') {
    output = Object.entries(puzzleData.days || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([d, codes]) => {
        if (codes && codes.length > 0) {
          return `# Day ${d}\n${codes.join('\n')}`;
        }
        return null;
      })
      .filter(Boolean)
      .join('\n\n');
  } else {
    const day = String(parseInt(dayParam) || 1);
    const codes = (puzzleData.days || {})[day] || [];
    output = codes.join('\n');
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