import { NextResponse } from 'next/server';

export function compressResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  status: number = 200
): NextResponse {
  const jsonString = JSON.stringify(data);

  const response = new NextResponse(jsonString, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(jsonString, 'utf-8').toString(),
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
      Vary: 'Accept-Encoding',
    },
  });

  return response;
}

export function setCacheHeaders(
  response: NextResponse,
  options: {
    maxAge?: number;
    staleWhileRevalidate?: number;
    isPrivate?: boolean;
  } = {}
): NextResponse {
  const {
    maxAge = 60,
    staleWhileRevalidate = 30,
    isPrivate = false,
  } = options;

  const directive = isPrivate ? 'private' : 'public';
  response.headers.set(
    'Cache-Control',
    `${directive}, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
  response.headers.set('Vary', 'Accept-Encoding, Authorization');

  return response;
}
