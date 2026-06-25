import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    if (!slug || !Array.isArray(slug)) return new Response('Bad Request', { status: 400 });

    const safeSlug = slug.map(s => path.basename(s));
    const filename = safeSlug.pop();
    const cleanFilename = filename.endsWith('.webp') ? filename : `${filename}.webp`;

    let filePath = path.join(process.cwd(), 'uploaded', 'images', ...safeSlug, cleanFilename);

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
