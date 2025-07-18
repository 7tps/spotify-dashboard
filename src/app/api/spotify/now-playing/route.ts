import { NextRequest, NextResponse } from 'next/server';

async function fetchSpotifyNowPlaying(token: string) {
  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res;
}

export async function GET(req: NextRequest) {
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

  let res = await fetchSpotifyNowPlaying(token);

  if (res.status === 401) {
    return NextResponse.json({ error: 'Spotify session expired. Please log in again.' }, { status: 401 });
  }

  if (res.status === 204) {
    // No content
    return new Response(null, { status: 204 });
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON from Spotify' }, { status: 500 });
  }

  return NextResponse.json(data, { status: res.status });
} 