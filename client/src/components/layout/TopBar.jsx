/**
 * TopBar.jsx — Fixed top navigation bar with search and mobile menu toggle.
 */
import React from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Menu, Bell, Wifi, WifiOff } from 'lucide-react';

const PAGE_TITLES = {
  '/dashboard': { title: "The Crow's Nest", subtitle: 'Your mission control' },
  '/blocks':    { title: 'Sea Charts',       subtitle: 'Knowledge base' },
  '/timetable': { title: 'Log Pose',         subtitle: 'Today\'s route' },
  '/habits':    { title: 'Haki Training',    subtitle: 'Daily discipline' },
  '/planner':   { title: 'Grand Line Plan',  subtitle: 'AI-powered schedule' },
  '/exams':     { title: 'Buster Calls',     subtitle: 'Exam countdowns' },
};

export default function TopBar({ onMenuClick }) {
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const { saving } = useSelector((s) => s.blocks);

  // Find the current page's title
  const currentPath = Object.keys(PAGE_TITLES).find((k) => location.pathname.startsWith(k));
  const pageInfo = PAGE_TITLES[currentPath] || { title: 'Second Brain', subtitle: '' };

  return (
    <header className="topbar">
      {/* ── Mobile menu toggle ────────────────────────────────────────── */}
      <button
        className="btn-icon"
        onClick={onMenuClick}
        style={{ display: 'none' }}
        aria-label="Open menu"
        id="mobile-menu-btn"
      >
        <Menu size={20} />
      </button>

      {/* ── Page title ───────────────────────────────────────────────── */}
      <div style={{ flex: 1 }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
        }}>
          {pageInfo.title}
        </h1>
        {pageInfo.subtitle && (
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            {pageInfo.subtitle}
          </p>
        )}
      </div>

      {/* ── Right side ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Sync indicator */}
        {saving && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.75rem', color: 'var(--text-muted)',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--zoro-500)',
              animation: 'pulseGreen 1s infinite',
            }} />
            Syncing...
          </div>
        )}

        {/* User avatar initials */}
        {user && (
          <div
            title={`${user.username} — ฿${user.bountyPoints || 0}`}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,255,157,0.15)',
              border: '1px solid rgba(0,255,157,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: 'var(--zoro-500)',
              cursor: 'default',
              fontFamily: 'var(--font-display)',
            }}
          >
            {user.username?.[0]?.toUpperCase() || 'P'}
          </div>
        )}
      </div>

      {/* Mobile menu button CSS */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
