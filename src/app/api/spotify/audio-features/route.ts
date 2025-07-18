import { NextRequest, NextResponse } from 'next/server';

async function fetchSpotifyAudioFeatures(token: string, id: string) {
  const res = await fetch(`https://api.spotify.com/v1/audio-features/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let token = url.searchParams.get('access_token');
  const id = url.searchParams.get('id');
  if (!token || !id) {
    return NextResponse.json({ error: 'Missing access token or track id' }, { status: 400 });
  }

  let res = await fetchSpotifyAudioFeatures(token, id);

  if (res.status === 401) {
    return NextResponse.json({ error: 'Spotify session expired. Please log in again.' }, { status: 401 });
  }

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
} 