import { NextResponse } from 'next/server';
import { getData } from '@/app/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dayParam = searchParams.get('day');

  const data = await getData();

  let output = '';

  if (dayParam === 'all') {
    output = Object.entries(data.days || {})
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([d, codes]) => `# Day ${d}\n${codes.join('\n')}`)
      .join('\n\n');
  } else {
    const day = String(parseInt(dayParam) || 1);
    const codes = (data.days || {})[day] || [];
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