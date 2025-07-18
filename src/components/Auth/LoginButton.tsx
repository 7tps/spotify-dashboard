import React from 'react';
import { Nunito } from 'next/font/google';

const nunito = Nunito({ subsets: ['latin'], weight: ['700'] });

const LoginButton: React.FC = () => {
  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <button
      onClick={handleLogin}
      className={`px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition text-lg shadow font-bold ${nunito.className}`}
    >
      Login with Spotify
    </button>
  );
};

export default LoginButton; 