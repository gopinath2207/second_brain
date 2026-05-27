/**
 * AuthPage.jsx — Login and Registration page with One Piece aesthetic.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, registerUser, clearError } from '../store/authSlice';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Anchor } from 'lucide-react';

export default function AuthPage({ mode = 'login' }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);

  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    dispatch(clearError());
  }, [mode, dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const action = mode === 'login'
      ? loginUser({ email: form.email, password: form.password })
      : registerUser({ username: form.username, email: form.email, password: form.password });

    const result = await dispatch(action);
    if (!result.error) {
      toast.success(mode === 'login' ? '⚓ Welcome back, Pirate!' : '🌊 Crew member registered!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(0,255,157,0.1)',
            border: '2px solid rgba(0,255,157,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: 'var(--zoro-glow)',
          }}>
            <Anchor size={28} color="var(--zoro-500)" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>
            {mode === 'login' ? 'Set Sail Again' : 'Join the Crew'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {mode === 'login'
              ? 'Log in to your Second Brain'
              : 'Create your pirate account'}
          </p>
        </div>

        {/* ── Form ─────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="label">Pirate Name</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="e.g. ZoroSword"
                className="input"
                required
                minLength={3}
                maxLength={30}
                autoComplete="username"
              />
            </div>
          )}

          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="pirate@grandline.com"
              className="input"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="input"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: 0, display: 'flex',
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: 8, width: '100%', minHeight: 44 }}
          >
            {loading ? (
              <span>Navigating the seas…</span>
            ) : (
              <span>{mode === 'login' ? 'Log In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        {/* ── Switch mode ───────────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <>
              New to the crew?{' '}
              <Link to="/register" style={{ color: 'var(--zoro-500)', fontWeight: 600 }}>
                Join Now
              </Link>
            </>
          ) : (
            <>
              Already a pirate?{' '}
              <Link to="/login" style={{ color: 'var(--zoro-500)', fontWeight: 600 }}>
                Log In
              </Link>
            </>
          )}
        </div>

        {/* ── Decorative quote ─────────────────────────────────────────── */}
        <div style={{
          marginTop: 24, padding: '12px 16px',
          background: 'rgba(0,255,157,0.04)',
          border: '1px solid rgba(0,255,157,0.1)',
          borderRadius: 8, textAlign: 'center',
          fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic',
        }}>
          "I don't know. I can't tell you where the One Piece is. But... those eyes of yours,
          they can still see hope." — Shanks
        </div>
      </div>
    </div>
  );
}
