'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginButton from '../components/Auth/LoginButton';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

const HomePage: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let storedToken = typeof window !== 'undefined' ? localStorage.getItem('spotify_access_token') : null;
    if (!storedToken) {
      const cookieToken = getCookie('spotify_access_token');
      if (cookieToken) {
        localStorage.setItem('spotify_access_token', cookieToken);
        storedToken = cookieToken;
      }
    }
    setToken(storedToken);
  }, []);

  useEffect(() => {
    console.log('Token in effect:', token);
    if (token) {
      try {
        router.replace('/dashboard');
        setTimeout(() => {
          if (window.location.pathname !== '/dashboard') {
            window.location.replace('/dashboard');
          }
        }, 500);
      } catch (e) {
        window.location.replace('/dashboard');
      }
    }
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#191414] via-[#232526] to-[#1DB954] relative overflow-hidden">
      <div className="absolute w-[600px] h-[600px] bg-[#1DB954]/20 rounded-full blur-3xl top-[-200px] left-[-200px] z-0" />
      <div className="absolute w-[400px] h-[400px] bg-[#191414]/40 rounded-full blur-2xl bottom-[-100px] right-[-100px] z-0" />
      <main className="z-10 w-full max-w-md mx-auto p-8 rounded-2xl shadow-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center">
        <div className="flex flex-col items-center mb-8">
          <img src="https://upload.wikimedia.org/wikipedia/commons/8/84/Spotify_icon.svg" alt="Spotify Logo" width={64} height={64} className="mb-2 drop-shadow-lg" />
          <h1 className="text-3xl font-bold text-white mt-4 mb-2 tracking-tight text-center drop-shadow-lg">Spotify Now Playing Dashboard</h1>
          <p className="text-white/80 text-center text-lg font-medium">See what’s playing, live audio features, and more.</p>
        </div>
        <LoginButton />
      </main>
    </div>
  );
};

export default HomePage;
