/**
 * Sidebar.jsx — Navigation sidebar with One Piece theme.
 * Shows page list, nav items, and user's Bounty score.
 */
import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import api from '../../api/axios';
import {
  LayoutDashboard, BookOpen, Clock, Flame, Brain,
  Sword, LogOut, Plus, ChevronRight, Skull, Map, Trash2
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard',  label: 'The Crow\'s Nest',  icon: LayoutDashboard, desc: 'Overview' },
  { path: '/blocks',     label: 'Sea Charts',         icon: Map,             desc: 'Notes & Pages' },
  { path: '/timetable',  label: 'Log Pose',           icon: Clock,           desc: 'Timetable' },
  { path: '/habits',     label: 'Haki Training',      icon: Flame,           desc: 'Habits' },
  { path: '/planner',    label: 'Grand Line Plan',    icon: Brain,           desc: 'AI Planner' },
  { path: '/exams',      label: 'Buster Calls',       icon: Skull,           desc: 'Exam Countdowns' },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [pages, setPages] = useState([]);

  // Fetch pages for sidebar
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/pages');
        setPages(data.pages?.slice(0, 8) || []);
      } catch (_) {}
    };
    load();
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleCreatePage = async () => {
    try {
      const { data } = await api.post('/pages', { title: 'Untitled Sea Chart' });
      setPages((p) => [...p, data.page]);
      navigate(`/blocks/${data.page._id}`);
    } catch (_) {}
  };

  const handleDeletePage = async (e, pageId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Delete this Sea Chart and all its blocks?')) return;
    try {
      await api.delete(`/pages/${pageId}`);
      setPages((p) => p.filter((pg) => pg._id !== pageId));
      // If currently viewing this page, go back to /blocks
      if (window.location.pathname.includes(pageId)) navigate('/blocks');
    } catch (_) {}
  };

  const getBountyRank = (pts) => {
    if (pts < 100) return '🏴‍☠️';
    if (pts < 500) return '⚓';
    if (pts < 1000) return '🌊';
    if (pts < 5000) return '⚔️';
    if (pts < 10000) return '💀';
    return '👑';
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 99, display: 'block',
          }}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* ── Logo / Brand ─────────────────────────────────────────────── */}
        <div style={{
          padding: '20px 16px 12px',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--zoro-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, boxShadow: 'var(--zoro-glow-sm)',
            }}>
              ⚓
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.95rem', color: 'var(--text-primary)',
              }}>
                Second Brain
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Student OS v1.0
              </div>
            </div>
          </div>
        </div>

        {/* ── User Bounty Card ─────────────────────────────────────────── */}
        {user && (
          <div style={{
            margin: '12px 12px 0',
            padding: '10px 12px',
            background: 'rgba(255,215,0,0.05)',
            border: '1px solid rgba(255,215,0,0.15)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>
                  {getBountyRank(user.bountyPoints)} {user.username}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '0.9rem',
                  color: 'var(--nami-500)', fontWeight: 700,
                }}>
                  ฿ {(user.bountyPoints || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                <div>Bounty</div>
                <div style={{ color: 'var(--zoro-500)' }}>{user.title || 'Pirate Apprentice'}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
              style={{ marginBottom: 2 }}
            >
              <Icon size={16} className="nav-icon" style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
            </NavLink>
          ))}

          {/* ── Sea Charts (Pages) Section ─────────────────────────────── */}
          <div style={{ margin: '16px 0 8px', padding: '0 8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 4,
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Sea Charts
              </span>
              <button
                onClick={handleCreatePage}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 2, borderRadius: 4,
                  display: 'flex', alignItems: 'center',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--zoro-500)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                title="New page"
              >
                <Plus size={14} />
              </button>
            </div>

            {pages.map((page) => (
              <div key={page._id} style={{ position: 'relative' }} className="sidebar-page-row">
                <NavLink
                  to={`/blocks/${page._id}`}
                  className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                  style={{ marginBottom: 2, paddingLeft: 12, fontSize: '0.82rem', paddingRight: 28 }}
                >
                  <span>{page.icon || '🗺️'}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {page.title || 'Untitled'}
                  </span>
                  <ChevronRight size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
                </NavLink>
                {/* Delete button — shows on hover */}
                <button
                  onClick={(e) => handleDeletePage(e, page._id)}
                  className="sidebar-page-delete"
                  title="Delete page"
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '3px',
                    color: 'var(--text-muted)', borderRadius: 4,
                    opacity: 0, transition: 'opacity 0.15s, color 0.15s',
                    display: 'flex', alignItems: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--buster-500)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </nav>

        {/* ── Logout ───────────────────────────────────────────────────── */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleLogout}
            className="sidebar-nav-item"
            style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            <span>Abandon Ship</span>
          </button>
        </div>
      </aside>
    </>
  );
}
