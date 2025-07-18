import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('access_token');
  const id = url.searchParams.get('id');
  if (!token || !id) {
    return NextResponse.json({ error: 'Missing access token or track id' }, { status: 400 });
  }
  const res = await fetch(`https://api.spotify.com/v1/audio-features/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
} 