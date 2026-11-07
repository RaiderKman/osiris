import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * No analytics. Sign-in is enforced by tools/local-server.mjs, which is the
 * only supported listener, before this function runs.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}
