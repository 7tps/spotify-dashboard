import { NextRequest, NextResponse } from 'next/server';

const scopes = [
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-read-email',
  'user-read-private',
  'streaming',
  'user-modify-playback-state',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
];

export async function GET(req: NextRequest) {
  const redirectUri = 'http://127.0.0.1:3000/api/auth/callback';
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    show_dialog: 'true',
  });
  const spotifyAuthUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  return NextResponse.redirect(spotifyAuthUrl);
} 