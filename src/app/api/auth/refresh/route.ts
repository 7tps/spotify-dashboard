import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const refresh_token = req.cookies.get('spotify_refresh_token')?.value;
  if (!refresh_token) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token,
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
  });

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data }, { status: 400 });
  }

  return NextResponse.json({ access_token: data.access_token });
} 