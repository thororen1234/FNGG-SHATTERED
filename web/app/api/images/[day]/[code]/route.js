import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { day, code } = await params;

    const filename = code.endsWith('.webp') ? code : `${code}.webp`;
    let filePath = path.join(process.cwd(), 'uploaded', 'images', day, filename);

    const buffer = await fs.readFile(filePath);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=86400, immutable'
      }
    });
  } catch (err) {
    const is404 = err.code === 'ENOENT';
    return new Response(is404 ? 'Not found' : 'Internal Server Error', {
      status: is404 ? 404 : 500,
      headers: { 'Cache-Control': 'no-store, must-revalidate' }
    });
  }
}