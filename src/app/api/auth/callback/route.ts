import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
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

  const res = NextResponse.redirect(
    new URL(`/dashboard?access_token=${data.access_token}`, req.url)
  );
  if (data.refresh_token) {
    console.log('Setting refresh token cookie:', data.refresh_token);
    res.cookies.set('spotify_refresh_token', data.refresh_token, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60, 
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' ? true : false,
    });
  }
  return res;
} 