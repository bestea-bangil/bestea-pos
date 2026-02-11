import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/supabase/health';

export const dynamic = 'force-dynamic';

export async function GET() {
  const isConnected = await checkDatabaseConnection();

  if (isConnected) {
    return NextResponse.json(
      { status: 'ok', message: 'Database connection is active' },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { status: 'error', message: 'Database connection failed' },
    { status: 503 }
  );
}
