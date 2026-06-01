import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { filename } = await params;

  if (!filename || typeof filename !== 'string') {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const safeFilename = path.basename(filename);
  const filepath = path.join(process.cwd(), 'uploaded', 'maps', safeFilename);

  try {
    const file = await fs.readFile(filepath);
    const ext = path.extname(safeFilename).toLowerCase();

    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';

    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (err) {
    return new NextResponse('Not Found', { status: 404 });
  }
}
