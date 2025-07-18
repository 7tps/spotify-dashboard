# Spotify Now Playing Dashboard

A sleek, real-time music dashboard UI that mimics Spotify’s "Now Playing" screen. Built with Next.js, Tailwind CSS, and Framer Motion, it fetches data from Spotify’s API and visually displays the current track, album art, artist, playback progress, and audio features.

## Features
- User authentication via Spotify OAuth 2.0
- Display current playing song, artist, and album cover
- Animated progress bar with elapsed/total time
- Real-time audio features (tempo, loudness, etc.)
- Responsive layout (mobile + desktop)
- Animated visualizer (Framer Motion)

## Tech Stack
- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- TypeScript

## Folder Structure
```
src/
  app/                # Next.js app directory
  assets/             # Custom images, SVGs, etc.
  components/         # Reusable UI components
    Auth/             # Login button, auth callbacks
    NowPlaying/       # Now Playing widget components
    Visualizer/       # Audio visualizer components
    common/           # Buttons, loaders, etc.
  hooks/              # Custom React hooks
  lib/                # API utilities (Spotify, auth)
  styles/             # Tailwind/global styles
  types/              # TypeScript types/interfaces
  utils/              # Utility functions/helpers
public/                # Static assets
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
2. Set up your Spotify API credentials in `.env.local`:
   ```env
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
   ```
3. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

