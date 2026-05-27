/**
 * HabitsPage.jsx — Full Haki Training management with charts and heatmap.
 */
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchHabits, fetchHabitAnalytics, createHabit,
  logHabit, unlogHabit, optimisticToggle, deleteHabit,
} from '../store/habitSlice';
import { updateUserBounty } from '../store/authSlice';
import toast from 'react-hot-toast';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { Flame, Plus, Trash2, CheckCircle2, BarChart2, X } from 'lucide-react';
import HabitHeatmap from '../components/habits/HabitHeatmap';

const ICONS = ['⚔️','🏋️','📚','🧘','💻','🎯','🌊','🔥','⚡','🎓','🏃','✍️'];
const COLORS = ['#00ff9d','#0070f3','#aa44ff','#ff6b35','#ff3860','#ffd700','#00d4ff'];

export default function HabitsPage() {
  const dispatch = useDispatch();
  const { list: habits, analytics, loading, analyticsLoading } = useSelector((s) => s.habits);
  const { user } = useSelector((s) => s.auth);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '⚔️', color: '#00ff9d', bountyReward: 10 });
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'analytics'

  useEffect(() => {
    dispatch(fetchHabits());
    dispatch(fetchHabitAnalytics(30));
  }, [dispatch]);

  const handleToggle = async (habit) => {
    dispatch(optimisticToggle({ id: habit._id, completed: !habit.completedToday }));
    try {
      if (!habit.completedToday) {
        const result = await dispatch(logHabit({ id: habit._id })).unwrap();
        toast.success(`${habit.icon} +${result.bountyEarned} Bounty!`);
        // Instantly update sidebar bounty score
        if (user) dispatch(updateUserBounty((user.bountyPoints || 0) + result.bountyEarned));
      } else {
        const result = await dispatch(unlogHabit(habit._id)).unwrap();
        toast('↩️ Habit undone.');
        // Instantly decrement sidebar bounty score
        if (user) dispatch(updateUserBounty(Math.max(0, (user.bountyPoints || 0) - (result.bountyReturned || habit.bountyReward))));
      }
    } catch (err) {
      dispatch(optimisticToggle({ id: habit._id, completed: habit.completedToday }));
      toast.error(err || 'Failed.');
    }
  };

  const handleCreateHabit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await dispatch(createHabit(form)).unwrap();
      setForm({ name: '', icon: '⚔️', color: '#00ff9d', bountyReward: 10 });
      setShowForm(false);
      toast.success('⚔️ New Haki Training added!');
    } catch (err) {
      toast.error(err || 'Failed to create habit.');
    }
  };

  const handleDeleteHabit = async (habit) => {
    if (!window.confirm(`Retire "${habit.name}"? This will remove it from your training.`)) return;
    try {
      await dispatch(deleteHabit(habit._id)).unwrap();
      toast.success(`${habit.icon} Habit retired.`);
    } catch (err) {
      toast.error(err || 'Failed to delete habit.');
    }
  };

  const completedCount = habits.filter(h => h.completedToday).length;

  return (
    <div className="animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">⚔️ Haki Training</h1>
          <p className="page-subtitle">
            {completedCount}/{habits.length} complete today
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'today' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('today')}
          >
            Today
          </button>
          <button
            className={`btn btn-ghost btn-sm ${activeTab === 'analytics' ? '' : ''}`}
            onClick={() => setActiveTab('analytics')}
            style={{ background: activeTab === 'analytics' ? 'rgba(0,255,157,0.1)' : '' }}
          >
            <BarChart2 size={14} /> Analytics
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> New Habit
          </button>
        </div>
      </div>

      {/* ── Add Habit Form ──────────────────────────────────────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>New Haki Training</h3>
            <button className="btn-icon" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <form onSubmit={handleCreateHabit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="label">Name</label>
              <input
                className="input" type="text" required
                placeholder="e.g. Morning Run, 1 LeetCode, Meditation"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="label">Icon</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ICONS.map(icon => (
                    <button
                      key={icon} type="button"
                      onClick={() => setForm({...form, icon})}
                      style={{
                        background: form.icon === icon ? 'rgba(0,255,157,0.15)' : 'var(--bg-elevated)',
                        border: `1px solid ${form.icon === icon ? 'var(--zoro-500)' : 'var(--border-subtle)'}`,
                        borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 16,
                      }}
                    >{icon}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="label">Bounty Reward (pts)</label>
                <input
                  className="input" type="number" min={1} max={100}
                  value={form.bountyReward}
                  onChange={e => setForm({...form, bountyReward: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Color</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {COLORS.map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => setForm({...form, color: c})}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c,
                      border: `3px solid ${form.color === c ? 'white' : 'transparent'}`,
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Add Training</button>
          </form>
        </div>
      )}

      {/* ── Tab: Today ──────────────────────────────────────────────────── */}
      {activeTab === 'today' && (
        <div>
          {/* Progress bar */}
          {habits.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Today's Progress</span>
                <span style={{ color: 'var(--zoro-500)', fontWeight: 700 }}>
                  {Math.round((completedCount / habits.length) * 100)}%
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${(completedCount / habits.length) * 100}%` }} />
              </div>
            </div>
          )}

          {loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, marginBottom: 8, borderRadius: 8 }} />)
          ) : habits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Flame size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div>No Haki Training configured.</div>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Add habits above to start your training!</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {habits.map(habit => (
                <div key={habit._id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  background: habit.completedToday ? 'rgba(0,255,157,0.05)' : 'var(--bg-surface)',
                  border: `1px solid ${habit.completedToday ? 'rgba(0,255,157,0.2)' : 'var(--border-subtle)'}`,
                  borderRadius: 10, transition: 'all 0.2s',
                  position: 'relative',
                }} className="habit-row">
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{habit.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: '0.95rem',
                      color: habit.completedToday ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: habit.completedToday ? 'line-through' : 'none',
                    }}>
                      {habit.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      +{habit.bountyReward} bounty · {habit.currentStreak || 0}🔥 streak
                    </div>
                  </div>

                  {/* Delete button — hover reveal */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteHabit(habit); }}
                    className="habit-delete-btn"
                    title="Retire habit"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', padding: '4px', borderRadius: 6,
                      opacity: 0, transition: 'opacity 0.15s, color 0.15s',
                      display: 'flex', alignItems: 'center', flexShrink: 0,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--buster-500)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <Trash2 size={15} />
                  </button>

                  <button
                    onClick={() => handleToggle(habit)}
                    style={{
                      background: habit.completedToday ? 'var(--zoro-500)' : 'transparent',
                      border: `2px solid ${habit.completedToday ? 'var(--zoro-500)' : 'var(--border-strong)'}`,
                      borderRadius: '50%', width: 36, height: 36,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s', flexShrink: 0,
                      boxShadow: habit.completedToday ? 'var(--zoro-glow-sm)' : 'none',
                    }}
                  >
                    {habit.completedToday && (
                      <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                        <path d="M2 6L5.5 9.5L12 2" stroke="#0d1117" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Analytics ──────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div>
          {analyticsLoading ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ) : analytics ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 30-day line graph */}
              <div className="card">
                <h3 style={{ marginBottom: 16, fontSize: '0.95rem' }}>30-Day Completion Trend</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={analytics.lineData}>
                    <defs>
                      <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00ff9d" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                      tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                        borderRadius: 8, color: 'var(--text-primary)', fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone" dataKey="completions" stroke="#00ff9d"
                      fill="url(#completionGrad)" strokeWidth={2}
                      dot={{ r: 3, fill: '#00ff9d' }} activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Heatmap */}
              <HabitHeatmap data={analytics.heatmapData} />

              {/* Stats */}
              <div className="grid-3col" style={{ gap: 12 }}>
                <div className="card" style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--zoro-500)', fontFamily: 'var(--font-mono)' }}>
                    ฿{analytics.totalBountyInPeriod?.toLocaleString() || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Bounty (30d)</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {analytics.lineData?.filter(d => d.completions > 0).length || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Active Days</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 16 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--shanks-500)', fontFamily: 'var(--font-mono)' }}>
                    {habits.length}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Active Habits</div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No analytics data yet. Start logging habits!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
