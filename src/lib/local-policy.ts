import { NextResponse } from 'next/server';

/**
 * Hard stop for capabilities removed from this local build.
 * Callers must return this before any fetch, DNS lookup, or socket.
 */
export function denyLocalCapability(): NextResponse {
  return NextResponse.json(
    { error: 'Disabled in this local build.' },
    { status: 404, headers: { 'Cache-Control': 'no-store' } },
  );
}
