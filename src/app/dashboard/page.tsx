'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Nunito, Inter } from 'next/font/google';
import { motion } from 'framer-motion';

const nunito = Nunito({ subsets: ['latin'], weight: ['700'] });
const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700'] });

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

const NUM_PARTICLES = 72;
const useParticleConfig = () => {
  return useMemo(() => {
    if (typeof window === 'undefined') return [];
    return Array.from({ length: NUM_PARTICLES }).map((_, i) => ({
      size: 16 + Math.random() * 24,
      baseX: Math.random(),
      baseY: Math.random(),
      speed: 0.12 + Math.random() * 0.18,
      opacity: 0.10 + Math.random() * 0.18,
      driftSpeed: 0.2 + Math.random() * 0.25,
      driftRadius: 16 + Math.random() * 32,
      driftPhase: Math.random() * Math.PI * 2,
    }));
  }, []);
};

const DashboardPage: React.FC = () => {
  const [nowPlayingItem, setNowPlayingItem] = useState<NowPlayingItem | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark' | 'auto') || 'auto';
    }
    return 'auto';
  });
  const presetAccents = [
    { name: 'Green', value: '#1DB954' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Purple', value: '#A259FF' },
    { name: 'Orange', value: '#F59E42' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Pink', value: '#EC4899' },
  ];
  const [accent, setAccent] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accent') || '#1DB954';
    }
    return '#1DB954';
  });

  // apply theme
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('light', 'dark');
    if (theme === 'light') {
      html.classList.add('light');
      html.style.setProperty('--card-bg', 'rgba(255,255,255,0.92)');
    } else if (theme === 'dark') {
      html.classList.add('dark');
      html.style.setProperty('--card-bg', 'rgba(35,37,38,0.82)');
    } else {
      html.style.setProperty('--card-bg', 'rgba(255,255,255,0.92)');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Helper to convert hex to rgb
  function hexToRgb(hex: string) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const num = parseInt(c, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255].join(',');
  }

  // Apply accent color to <html>
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(accent));
    localStorage.setItem('accent', accent);
  }, [accent]);

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

  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  useEffect(() => {
    const fetchNowPlaying = async () => {
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
          setLoading(true); // Only loading if nothing is playing
        } else if (!res.ok) {
          setError('Failed to fetch now playing info.');
          setNowPlayingItem(null);
          setAudioFeatures(null);
          prevSongIdRef.current = null;
          setLoading(true); // Only loading if error and no song
        } else {
          const data = await res.json();
          const newSongId = data?.item?.id || null;
          const isPlaying = data?.is_playing;
          if (newSongId && prevSongIdRef.current !== newSongId) {
            setLoading(true); // Only loading when song changes
            // Song changed, update everything
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
              try {
                const errorBody = await featuresRes.json();
                // eslint-disable-next-line no-console
                console.error('Failed to fetch audio features for song id', newSongId, errorBody);
              } catch (e) {
                // eslint-disable-next-line no-console
                console.error('Failed to fetch audio features for song id', newSongId, '(no body)', e);
              }
            }
            setLoading(false); // Done loading new song
          } else if (newSongId && prevSongIdRef.current === newSongId) {
            // Song is the same (even if playing/paused), only update playback state and progress
            setPlaybackState({
              progress_ms: data.progress_ms,
              is_playing: data.is_playing,
              duration_ms: data.item.duration_ms,
            });
            setLocalProgress(data.progress_ms);
            progressRef.current = data.progress_ms;
            // Do not update nowPlayingItem or audioFeatures
            setLoading(false); // Not loading if song is the same
          } else {
            // no song or invalid data
            setNowPlayingItem(null);
            setPlaybackState(null);
            setAudioFeatures(null);
            prevSongIdRef.current = null;
            setLoading(true); // Only loading if nothing is playing
          }
        }
      } catch (e) {
        setError('Failed to fetch now playing info.');
        setNowPlayingItem(null);
        setPlaybackState(null);
        setAudioFeatures(null);
        prevSongIdRef.current = null;
        setLoading(true); // Only loading if error and no song
        // eslint-disable-next-line no-console
        console.error('Error fetching now playing:', e);
      }
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

  // compute background and text classes based on theme
  const isLight = theme === 'light';
  const bgGradient = isLight
    ? 'bg-gradient-to-br from-white via-[rgba(var(--accent-rgb),0.15)] to-[rgba(var(--accent-rgb),0.25)]'
    : 'bg-gradient-to-br from-[#191414] via-[rgba(var(--accent-rgb),0.15)] to-[rgba(var(--accent-rgb),0.25)]';
  const textColor = isLight ? 'text-black' : 'text-white';

  // Animation state for audio-reactive background
  const [bgPulse, setBgPulse] = useState(1);
  const animationRef = useRef<number | null>(null);

  // Animate background pulse based on audio features and playback
  useEffect(() => {
    if (!audioFeatures || !playbackState) return;
    let running = true;
    let lastTime = performance.now();
    const baseTempo = audioFeatures.tempo || 120;
    const energy = audioFeatures.energy || 0.5;
    const loudness = ('loudness' in audioFeatures && typeof (audioFeatures as any).loudness === 'number') ? Math.max(((audioFeatures as any).loudness + 60) / 60, 0) : 0.5;
    function animate(time: number) {
      if (!running) return;
      const elapsed = (time - lastTime) / 1000;
      // Pulse speed is based on tempo (BPM)
      const speed = baseTempo / 60;
      // Pulse intensity is based on energy and loudness
      const intensity = 0.08 + 0.12 * energy + 0.10 * loudness;
      // Sine wave for pulsing
      const pulse = 1 + Math.sin((performance.now() / 1000) * speed * Math.PI * 2) * intensity;
      setBgPulse(pulse);
      animationRef.current = requestAnimationFrame(animate);
    }
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [audioFeatures, playbackState]);

  // Smooth parallax state for particle field
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const mouseRef = useRef({ x: 0, y: 0 });
  const animParallax = useRef({ x: 0, y: 0 });

  // Mouse move handler updates ref, not state
  const handleParallax = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width - 0.5) * 2; // -1 to 1
    const y = ((e.clientY - top) / height - 0.5) * 2; // -1 to 1
    mouseRef.current = { x, y };
  };

  // rAF loop to smoothly interpolate parallax
  useEffect(() => {
    let running = true;
    function animate() {
      if (!running) return;
      // Smoothly interpolate animParallax towards mouseRef
      animParallax.current.x += (mouseRef.current.x - animParallax.current.x) * 0.08;
      animParallax.current.y += (mouseRef.current.y - animParallax.current.y) * 0.08;
      setParallax({ x: animParallax.current.x, y: animParallax.current.y });
      requestAnimationFrame(animate);
    }
    animate();
    return () => { running = false; };
  }, []);

  // Add time state for drifting
  const [driftTime, setDriftTime] = useState(0);
  useEffect(() => {
    let running = true;
    let last = performance.now();
    function tick(now: number) {
      if (!running) return;
      setDriftTime((t) => t + (now - last) / 1000);
      last = now;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return () => { running = false; };
  }, []);

  const PARTICLE_CONFIG = useParticleConfig();
  if (!hasMounted) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      onMouseMove={handleParallax}
    >
      {hasMounted && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          {PARTICLE_CONFIG.map((p, i) => {
            // drifting offset
            const driftX = Math.sin(driftTime * p.driftSpeed + p.driftPhase) * p.driftRadius;
            const driftY = Math.cos(driftTime * p.driftSpeed + p.driftPhase) * p.driftRadius;
            // twinkling opacity
            const twinkle = 0.5 + 0.5 * Math.sin(driftTime * p.driftSpeed * 0.7 + p.driftPhase * 1.7);
            const opacity = p.opacity * twinkle;
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `calc(${p.baseX * 100}% )`,
                  top: `calc(${p.baseY * 100}% )`,
                  width: p.size,
                  height: p.size,
                  background: 'var(--accent)',
                  opacity,
                  borderRadius: '50%',
                  filter: 'blur(2px)',
                  transform: `translate3d(${parallax.x * p.speed * 180 + driftX}px, ${parallax.y * p.speed * 120 + driftY}px, 0)`,
                  transition: 'transform 0.3s cubic-bezier(.4,0,.2,1), opacity 1.2s cubic-bezier(.4,0,.2,1)',
                  pointerEvents: 'none',
                }}
              />
            );
          })}
        </div>
      )}
      {/* Radial accent burst for depth */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(var(--accent-rgb),0.35) 0%, rgba(var(--accent-rgb),0.18) 40%, transparent 80%)`,
          filter: `blur(0px)`
        }}
      />
      {/* Settings Button */}
      <button
        className="absolute top-6 right-6 z-20 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 shadow-lg transition"
        aria-label="Open settings"
        onClick={() => setSettingsOpen(true)}
      >
        {/* Standard Gear Icon, color changes with theme */}
        <svg
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          className={isLight ? 'text-black' : 'text-white'}
        >
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
            <h2 className={`text-2xl font-extrabold mb-6 text-center text-[var(--accent)] ${nunito.className}`}>Settings</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-800 font-medium">Theme</span>
                <div className="flex gap-2">
                  <label className="flex items-center gap-1 text-gray-700">
                    <input
                      type="radio"
                      name="theme"
                      value="auto"
                      checked={theme === 'auto'}
                      onChange={() => setTheme('auto')}
                    />
                    Auto
                  </label>
                  <label className="flex items-center gap-1 text-gray-700">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={theme === 'light'}
                      onChange={() => setTheme('light')}
                    />
                    Light
                  </label>
                  <label className="flex items-center gap-1 text-gray-700">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={theme === 'dark'}
                      onChange={() => setTheme('dark')}
                    />
                    Dark
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-800 font-medium">Accent Color</span>
                <div className="flex gap-2">
                  {presetAccents.map((preset) => (
                    <button
                      key={preset.value}
                      className={`w-6 h-6 rounded-full border-2 ${accent === preset.value ? 'border-[var(--accent)] scale-110' : 'border-gray-300'} focus:outline-none transition`}
                      style={{ backgroundColor: preset.value }}
                      aria-label={preset.name}
                      onClick={() => setAccent(preset.value)}
                    />
                  ))}
                </div>
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
                className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg font-bold shadow hover:opacity-90 transition"
                onClick={() => setSettingsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Simple card (not glassmorphism) */}
      <main className={`z-10 w-full max-w-lg mx-auto px-12 py-14 rounded-3xl shadow-2xl bg-[var(--card-bg)] border border-white/30 flex flex-col items-center ${inter.className} ${textColor}`}
      >
        <img src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg" alt="Spotify Logo" width={56} height={56} className="mb-6 drop-shadow-xl" />
        <h1 className={`text-4xl font-extrabold mb-8 tracking-tight text-center drop-shadow-lg ${nunito.className} ${textColor}`}>Now Playing</h1>
        {/* Song Info */}
        {loading ? (
          <div className="text-lg font-semibold opacity-70 mb-8">Loading...</div>
        ) : error ? (
          <div className="text-lg font-bold text-red-500 mb-8">{error}</div>
        ) : nowPlayingItem ? (
          <>
            <div className="flex flex-col items-center w-full mb-8">
              <img
                src={nowPlayingItem.album.images[0]?.url}
                alt="Album Art"
                className="w-56 h-56 rounded-2xl shadow-2xl mb-6 border-4 border-white/40"
              />
              <div className={`text-2xl sm:text-3xl font-extrabold text-center mb-2 leading-tight ${nunito.className} ${textColor}`}>{nowPlayingItem.name}</div>
              <div className={`text-lg font-medium text-center mb-6 ${isLight ? 'text-gray-700' : 'text-white/80'}`}>{nowPlayingItem.artists.map((a) => a.name).join(', ')}</div>
              {/* Progress Bar */}
              <div className="w-full flex flex-col items-center mb-2">
                <div className="w-full h-2 bg-white/30 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(localProgress / (playbackState?.duration_ms || 1)) * 100}%`, backgroundColor: 'var(--accent)' }}
                  />
                </div>
                <div className={`flex justify-between w-full text-xs font-semibold tracking-wide ${isLight ? 'text-gray-600' : 'text-white/70'}`}> 
                  <span>{new Date(localProgress).toISOString().substr(14, 5)}</span>
                  <span>{new Date(playbackState?.duration_ms || 0).toISOString().substr(14, 5)}</span>
                </div>
              </div>
            </div>
            {/* Audio Features Visualizer */}
            {audioFeatures ? (
              <div className="w-full mt-8">
                <h2 className={`text-lg font-bold mb-4 text-center ${nunito.className} ${textColor}`}>Audio Features</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(featureLabels).map(([key, label]) => (
                    <div key={key} className="flex flex-col items-center">
                      <span className={`${isLight ? 'text-gray-700' : 'text-white/80'} text-sm mb-1`}>{label}</span>
                      <motion.div
                        className="w-20 h-4 rounded-full overflow-hidden mb-1"
                        initial={{ width: 0 }}
                        animate={{ width: audioFeatures[key as keyof AudioFeatures] !== undefined ? `${Math.min((key === 'tempo' ? audioFeatures[key as keyof AudioFeatures] / 200 : audioFeatures[key as keyof AudioFeatures]) * 100, 100)}%` : '0%' }}
                        transition={{ duration: 0.6 }}
                      >
                        <div
                          className="h-4 rounded-full"
                          style={{ width: '100%', backgroundColor: 'var(--accent)' }}
                        />
                      </motion.div>
                      <span className={`${isLight ? 'text-gray-600' : 'text-white/70'} text-xs`}>
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
                <h2 className={`text-lg font-bold mb-4 text-center ${nunito.className} ${textColor}`}>Audio Features</h2>
                <div className={`${isLight ? 'text-gray-500' : 'text-white/60'} text-center`}>Audio features not available for this track.</div>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
};

export default DashboardPage;