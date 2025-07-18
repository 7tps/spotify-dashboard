import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // try to get the token from the query string or auth header
  const url = new URL(req.url);
  let token = url.searchParams.get('access_token');
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    }
  }
  if (!token) {
    return NextResponse.json({ error: 'No access token' }, { status: 401 });
  }
  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
} 