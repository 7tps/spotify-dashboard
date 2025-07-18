import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: [
      'user-read-playback-state',
      'user-read-currently-playing',
      'user-read-email',
      'user-read-private',
      'streaming',
    ].join(' '),
    show_dialog: 'true',
  });
  const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  return NextResponse.redirect(spotifyAuthUrl);
} 