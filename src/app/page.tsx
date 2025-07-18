'use client';

import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    // check for token
    let storedToken = typeof window !== 'undefined' ? localStorage.getItem('spotify_access_token') : null;
    if (!storedToken) {
      // check for token in cookie
      const cookieToken = getCookie('spotify_access_token');
      if (cookieToken) {
        localStorage.setItem('spotify_access_token', cookieToken);
        storedToken = cookieToken;
      }
    }
    setToken(storedToken);
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      {!token ? (
        <LoginButton />
      ) : (
        <div className="text-xl">Welcome! You are logged in with Spotify.</div>
      )}
    </main>
  );
};

export default HomePage;
