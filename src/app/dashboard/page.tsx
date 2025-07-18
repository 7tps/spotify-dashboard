'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Nunito } from 'next/font/google';
import { motion } from 'framer-motion';

const nunito = Nunito({ subsets: ['latin'], weight: ['700'] });

interface NowPlayingItem {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  duration_ms: number;
}

interface PlaybackState {
  progress_ms: number;
  is_playing: boolean;
  duration_ms: number;
}

interface AudioFeatures {
  tempo: number;
  energy: number;
  valence: number;
  danceability: number;
  acousticness: number;
  liveness: number;
}

const featureLabels: { [key: string]: string } = {
  tempo: 'Tempo',
  energy: 'Energy',
  valence: 'Valence',
  danceability: 'Danceability',
  acousticness: 'Acousticness',
  liveness: 'Liveness',
};

async function fetchWithRefresh(url: string, token: string): Promise<Response> {
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    const refreshRes = await fetch('/api/auth/refresh');
    if (refreshRes.ok) {
      const { access_token } = await refreshRes.json();
      localStorage.setItem('spotify_access_token', access_token);
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
    }
  }
  if (res.status === 403) {
    try {
      const errorBody = await res.json();
      // eslint-disable-next-line no-console
      console.error('Spotify 403 error:', errorBody);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Spotify 403 error: (no body)', e);
    }
  }
  return res;
}

const DashboardPage: React.FC = () => {
  const [nowPlayingItem, setNowPlayingItem] = useState<NowPlayingItem | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const progressRef = useRef<number>(0);
  const prevSongIdRef = useRef<string | null>(null); 

  useEffect(() => {
    const tokenFromQuery = searchParams.get('access_token');
    if (tokenFromQuery) {
      localStorage.setItem('spotify_access_token', tokenFromQuery);
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
        // use the proxy endpoint for now playing
        const res = await fetch(`/api/spotify/now-playing?access_token=${token}`);
        if (res.status === 204) {
          setError('Nothing is currently playing.');
          setNowPlayingItem(null);
          setPlaybackState(null);
          setAudioFeatures(null);
          prevSongIdRef.current = null;
        } else if (!res.ok) {
          setError('Failed to fetch now playing info.');
          setNowPlayingItem(null);
          setPlaybackState(null);
          setAudioFeatures(null);
          prevSongIdRef.current = null;
        } else {
          const data = await res.json();
          const newSongId = data?.item?.id || null;
          if (newSongId && prevSongIdRef.current !== newSongId) {
            setNowPlayingItem(data.item);
            setPlaybackState({
              progress_ms: data.progress_ms,
              is_playing: data.is_playing,
              duration_ms: data.item.duration_ms,
            });
            setLocalProgress(data.progress_ms);
            progressRef.current = data.progress_ms;
            prevSongIdRef.current = newSongId;
            const featuresRes = await fetch(`/api/spotify/audio-features?access_token=${token}&id=${newSongId}`);
            if (featuresRes.ok) {
              const features = await featuresRes.json();
              if (
                typeof features.tempo === 'number' &&
                typeof features.energy === 'number' &&
                typeof features.valence === 'number' &&
                typeof features.danceability === 'number' &&
                typeof features.acousticness === 'number' &&
                typeof features.liveness === 'number'
              ) {
                setAudioFeatures(features);
              } else {
                setAudioFeatures(null);
                // eslint-disable-next-line no-console
                console.warn('Audio features missing or incomplete:', features);
              }
            } else {
              setAudioFeatures(null);
              // eslint-disable-next-line no-console
              console.warn('Failed to fetch audio features for song id', newSongId);
            }
          } else if (newSongId && prevSongIdRef.current === newSongId) {
            // only update progress and playback state
            setPlaybackState({
              progress_ms: data.progress_ms,
              is_playing: data.is_playing,
              duration_ms: data.item.duration_ms,
            });
            setLocalProgress(data.progress_ms);
            progressRef.current = data.progress_ms;
            // dont refetch audio features or song info
          } else {
            // no song or invalid data
            setNowPlayingItem(null);
            setPlaybackState(null);
            setAudioFeatures(null);
            prevSongIdRef.current = null;
          }
        }
      } catch (e) {
        setError('Failed to fetch now playing info.');
        setNowPlayingItem(null);
        setPlaybackState(null);
        setAudioFeatures(null);
        prevSongIdRef.current = null;
        // eslint-disable-next-line no-console
        console.error('Error fetching now playing:', e);
      }
      setLoading(false);
    };
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!playbackState?.is_playing) return;
    const interval = setInterval(() => {
      setLocalProgress((prev) => {
        if (prev + 100 >= (playbackState?.duration_ms || 0)) return playbackState?.duration_ms || 0;
        progressRef.current = prev + 100;
        return prev + 100;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [playbackState]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] via-[#232526] to-[#1DB954] relative overflow-hidden">
      {/* Settings Button */}
      <button
        className="absolute top-6 right-6 z-20 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 shadow-lg transition"
        aria-label="Open settings"
        onClick={() => setSettingsOpen(true)}
      >
        {/* Standard Gear Icon */}
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1.5 1.1V21a2 2 0 1 1-4 0v-.1A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82-.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.1-1.5H3a2 2 0 1 1 0-4h.1A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6c.2-.08.41-.13.62-.16V3a2 2 0 1 1 4 0v.1c.21.03.42.08.62.16a1.65 1.65 0 0 0 1.82.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.08.2.13.41.16.62H21a2 2 0 1 1 0 4h-.1c-.03.21-.08.42-.16.62Z" />
        </svg>
      </button>
      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60">
          <div className="bg-white/90 rounded-2xl shadow-2xl p-8 w-full max-w-md relative border border-white/30">
            <button
              className="absolute top-4 right-4 text-gray-700 hover:text-black text-2xl font-bold"
              aria-label="Close settings"
              onClick={() => setSettingsOpen(false)}
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 text-center text-[#1DB954]">Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-800 font-medium">Theme</span>
                <span className="text-gray-500 italic">(coming soon)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-800 font-medium">Visualizer Type</span>
                <span className="text-gray-500 italic">(coming soon)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-800 font-medium">Show Lyrics</span>
                <span className="text-gray-500 italic">(coming soon)</span>
              </div>
            </div>
            <div className="mt-8 flex justify-center">
              <button
                className="px-6 py-2 bg-[#1DB954] text-white rounded-lg font-bold shadow hover:bg-[#159c43] transition"
                onClick={() => setSettingsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="absolute w-[600px] h-[600px] bg-[#1DB954]/20 rounded-full blur-3xl top-[-200px] left-[-200px] z-0" />
      <div className="absolute w-[400px] h-[400px] bg-[#191414]/40 rounded-full blur-2xl bottom-[-100px] right-[-100px] z-0" />
      <main className="z-10 w-full max-w-lg mx-auto p-8 rounded-2xl shadow-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center">
        <img src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg" alt="Spotify Logo" width={48} height={48} className="mb-4 drop-shadow-lg" />
        <h1 className={`text-2xl font-bold text-white mb-6 tracking-tight text-center drop-shadow-lg ${nunito.className}`}>Now Playing</h1>
        {loading ? (
          <div className="text-white/80 text-lg">Loading...</div>
        ) : error ? (
          <div className="text-red-400 text-lg font-medium">{error}</div>
        ) : nowPlayingItem ? (
          <>
            <div className="flex flex-col items-center w-full">
              <img
                src={nowPlayingItem.album.images[0]?.url}
                alt="Album Art"
                className="w-48 h-48 rounded-xl shadow-lg mb-4 border border-white/20"
              />
              <div className={`text-white text-xl font-semibold text-center mb-1 ${nunito.className}`}>{nowPlayingItem.name}</div>
              <div className="text-white/80 text-center mb-4">
                {nowPlayingItem.artists.map((a) => a.name).join(', ')}
              </div>
              {/* Progress Bar */}
              <div className="w-full flex flex-col items-center">
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-2 bg-[#1DB954] rounded-full transition-all duration-300"
                    style={{
                      width: `${(localProgress / (playbackState?.duration_ms || 1)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between w-full text-xs text-white/70">
                  <span>
                    {new Date(localProgress).toISOString().substr(14, 5)}
                  </span>
                  <span>
                    {new Date(playbackState?.duration_ms || 0).toISOString().substr(14, 5)}
                  </span>
                </div>
              </div>
            </div>
            {/* Audio Features Visualizer */}
            {audioFeatures ? (
              <div className="w-full mt-8">
                <h2 className={`text-lg font-bold text-white mb-4 text-center ${nunito.className}`}>Audio Features</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(featureLabels).map(([key, label]) => (
                    <div key={key} className="flex flex-col items-center">
                      <span className="text-white/80 text-sm mb-1">{label}</span>
                      <motion.div
                        className="w-20 h-4 rounded-full bg-[#1DB954]/30 overflow-hidden mb-1"
                        initial={{ width: 0 }}
                        animate={{ width: audioFeatures[key as keyof AudioFeatures] !== undefined ? `${Math.min((key === 'tempo' ? audioFeatures[key as keyof AudioFeatures] / 200 : audioFeatures[key as keyof AudioFeatures]) * 100, 100)}%` : '0%' }}
                        transition={{ duration: 0.6 }}
                      >
                        <div
                          className="h-4 bg-[#1DB954] rounded-full"
                          style={{
                            width: '100%',
                          }}
                        />
                      </motion.div>
                      <span className="text-white/70 text-xs">
                        {key === 'tempo'
                          ? Math.round(audioFeatures[key as keyof AudioFeatures]) + ' BPM'
                          : Math.round((audioFeatures[key as keyof AudioFeatures] as number) * 100)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full mt-8">
                <h2 className={`text-lg font-bold text-white mb-4 text-center ${nunito.className}`}>Audio Features</h2>
                <div className="text-white/60 text-center">Audio features not available for this track.</div>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
};

export default DashboardPage; 