/**
 * LoadingScreen.jsx — Full-page loading screen with One Piece animation.
 * Shown while the app is initializing or authenticating.
 */
import React from 'react';

export default function LoadingScreen({ message = 'Setting sail...' }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg-void)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20, zIndex: 9999,
    }}>
      {/* Animated anchor */}
      <div style={{
        fontSize: 56,
        animation: 'spin 2s linear infinite',
      }}>
        ⚓
      </div>

      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1.1rem',
        color: 'var(--text-secondary)',
      }}>
        {message}
      </div>

      {/* Loading bar */}
      <div style={{
        width: 200, height: 2,
        background: 'var(--bg-active)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: '40%',
          background: 'var(--zoro-500)',
          borderRadius: 'var(--radius-full)',
          animation: 'loadingSlide 1.2s ease-in-out infinite',
          boxShadow: 'var(--zoro-glow-sm)',
        }} />
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes loadingSlide {
          0%   { transform: translateX(-100%); width: 40%; }
          50%  { width: 70%; }
          100% { transform: translateX(350%); width: 40%; }
        }
      `}</style>
    </div>
  );
}
