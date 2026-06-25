import fs from 'fs/promises';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    if (!slug || !Array.isArray(slug)) return new Response('{}', { status: 404 });

    const filePath = path.join(process.cwd(), 'uploaded', 'mappings', ...slug);

    try {
      const buffer = await fs.readFile(filePath);
      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    } catch (e) {
      return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (err) {
    return new Response('{}', { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
