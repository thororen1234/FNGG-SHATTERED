import { syncAllDays } from '@/app/lib/sync';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await syncAllDays();
    return NextResponse.json({ success: true, message: 'Sync complete' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
