'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface NowPlaying {
  item: {
    name: string;
    artists: { name: string }[];
    album: { images: { url: string }[] };
    duration_ms: number;
  };
  progress_ms: number;
  is_playing: boolean;
}

const DashboardPage: React.FC = () => {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const tokenFromQuery = searchParams.get('access_token');
    if (tokenFromQuery) {
      localStorage.setItem('spotify_access_token', tokenFromQuery);
      // remove token from the URL
      router.replace('/dashboard');
    }
  }, [searchParams, router]);

  useEffect(() => {
    const fetchNowPlaying = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('spotify_access_token');
      if (!token) {
        setError('No access token found. Please log in.');
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 204) {
          setError('Nothing is currently playing.');
          setNowPlaying(null);
        } else if (!res.ok) {
          setError('Failed to fetch now playing info.');
          setNowPlaying(null);
        } else {
          const data = await res.json();
          setNowPlaying(data);
        }
      } catch (e) {
        setError('Failed to fetch now playing info.');
        setNowPlaying(null);
      }
      setLoading(false);
    };
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] via-[#232526] to-[#1DB954] relative overflow-hidden">
      <div className="absolute w-[600px] h-[600px] bg-[#1DB954]/20 rounded-full blur-3xl top-[-200px] left-[-200px] z-0" />
      <div className="absolute w-[400px] h-[400px] bg-[#191414]/40 rounded-full blur-2xl bottom-[-100px] right-[-100px] z-0" />
      <main className="z-10 w-full max-w-lg mx-auto p-8 rounded-2xl shadow-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center">
        <img src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg" alt="Spotify Logo" width={48} height={48} className="mb-4 drop-shadow-lg" />
        <h1 className="text-2xl font-bold text-white mb-6 tracking-tight text-center drop-shadow-lg">Now Playing</h1>
        {loading ? (
          <div className="text-white/80 text-lg">Loading...</div>
        ) : error ? (
          <div className="text-red-400 text-lg font-medium">{error}</div>
        ) : nowPlaying && nowPlaying.item ? (
          <div className="flex flex-col items-center w-full">
            <img
              src={nowPlaying.item.album.images[0]?.url}
              alt="Album Art"
              className="w-48 h-48 rounded-xl shadow-lg mb-4 border border-white/20"
            />
            <div className="text-white text-xl font-semibold text-center mb-1">
              {nowPlaying.item.name}
            </div>
            <div className="text-white/80 text-center mb-4">
              {nowPlaying.item.artists.map((a) => a.name).join(', ')}
            </div>
            {/* Progress Bar */}
            <div className="w-full flex flex-col items-center">
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-2">
                <div
                  className="h-2 bg-[#1DB954] rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (nowPlaying.progress_ms / nowPlaying.item.duration_ms) * 100
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between w-full text-xs text-white/70">
                <span>
                  {new Date(nowPlaying.progress_ms).toISOString().substr(14, 5)}
                </span>
                <span>
                  {new Date(nowPlaying.item.duration_ms).toISOString().substr(14, 5)}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default DashboardPage; 