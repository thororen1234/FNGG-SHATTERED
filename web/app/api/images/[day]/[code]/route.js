import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET(request, { params }) {
  try {
    const { day, code } = await params;

    const filename = code.endsWith('.webp') ? code : `${code}.webp`;
    let filePath = path.join(process.cwd(), 'uploaded', 'images', day, filename);

    try {
      const buffer = await fs.readFile(filePath);
      return new Response(buffer, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=86400, immutable'
        }
      });
    } catch (e) {
      if (day !== 'day-1') {
        const fallbackPath = path.join(process.cwd(), 'uploaded', 'images', 'day-1', filename);
        try {
          const fallbackBuffer = await fs.readFile(fallbackPath);
          return new Response(fallbackBuffer, {
            headers: {
              'Content-Type': 'image/webp',
              'Cache-Control': 'public, max-age=86400, immutable'
            }
          });
        } catch (fallbackErr) {
          return new Response('Not found in target or fallback pool', {
            status: 404,
            headers: { 'Cache-Control': 'no-store, must-revalidate' }
          });
        }
      }

      return new Response('Not found', {
        status: 404,
        headers: { 'Cache-Control': 'no-store, must-revalidate' }
      });
    }
  } catch (err) {
    return new Response('Internal Server Error', {
      status: 500,
      headers: { 'Cache-Control': 'no-store, must-revalidate' }
    });
  }
}