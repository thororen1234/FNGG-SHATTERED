import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    if (!slug || !Array.isArray(slug)) return new NextResponse('Bad Request', { status: 400 });

    const safeSlug = slug.map(s => path.basename(s));
    const filepath = path.join(process.cwd(), 'uploaded', 'maps', ...safeSlug);

    try {
      const file = await fs.readFile(filepath);
      const ext = path.extname(filepath).toLowerCase();

      let mimeType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.gif') mimeType = 'image/gif';

      return new NextResponse(file, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (err) {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (err) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
