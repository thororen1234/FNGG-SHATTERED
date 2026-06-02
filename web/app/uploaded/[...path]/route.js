import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { path: filePathParams } = await params;

  if (!filePathParams || !Array.isArray(filePathParams)) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  const safeSegments = filePathParams.map(segment => path.basename(segment));
  const filepath = path.join(process.cwd(), 'uploaded', ...safeSegments);

  try {
    const file = await fs.readFile(filepath);
    const ext = path.extname(filepath).toLowerCase();

    let mimeType = 'application/octet-stream';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.json') mimeType = 'application/json';
    else if (ext === '.txt') mimeType = 'text/plain';
    else if (ext === '.pdf') mimeType = 'application/pdf';

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
