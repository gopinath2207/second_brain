/**
 * TimetablePage.jsx — Full Log Pose timetable management.
 * Features: Add / Edit / Delete entries, hover-expand cards, Today + Week views.
 */
import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Clock, Plus, MapPin, Wifi, Trash2, X, Edit2, ExternalLink, Calendar, User, RotateCcw } from 'lucide-react';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const COLORS_LIST = ['#00ff9d','#0070f3','#aa44ff','#ff6b35','#ff3860','#ffd700','#00d4ff','#ff44aa'];

const BLANK_FORM = {
  title: '', subject: '', startTime: '', endTime: '',
  isRecurring: true, daysOfWeek: [], location: '',
  professor: '', isOnline: false, meetLink: '', color: '#00ff9d',
};

function isActive(startTime, endTime) {
  const now = new Date();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const s = sh*60+sm, e = eh*60+em, n = now.getHours()*60+now.getMinutes();
  return n >= s && n < e;
}

function duration(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh*60+em) - (sh*60+sm);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins/60)}h${mins%60 ? ` ${mins%60}m` : ''}`;
}

// ── Hover-expand timetable card ───────────────────────────────────────────────
function TimetableCard({ entry, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const active = isActive(entry.startTime, entry.endTime);
  const accentColor = entry.color || 'var(--zoro-500)';

  return (
    <div
      className={`timetable-slot ${active ? 'active' : ''}`}
      style={{
        flexDirection: 'column', gap: 0, padding: 0,
        border: `1px solid ${expanded ? accentColor + '60' : 'var(--border-subtle)'}`,
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: 10,
        transition: 'all 0.2s ease',
        overflow: 'hidden',
        boxShadow: expanded ? `0 4px 20px ${accentColor}18` : 'none',
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* ── Always-visible summary row ────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {entry.title}
            </span>
            {entry.subject && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
                borderRadius: 20, background: accentColor + '22', color: accentColor,
                border: `1px solid ${accentColor}44`,
              }}>
                {entry.subject}
              </span>
            )}
            {active && (
              <span style={{
                fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px',
                borderRadius: 20, background: 'rgba(0,255,157,0.15)',
                color: 'var(--zoro-500)', border: '1px solid rgba(0,255,157,0.3)',
                animation: 'pulse 2s infinite',
              }}>
                ● LIVE
              </span>
            )}
            {entry.isOnline && <Wifi size={12} color="var(--text-muted)" />}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={11}/> {entry.startTime} – {entry.endTime}
              <span style={{ marginLeft: 2, opacity: 0.6 }}>({duration(entry.startTime, entry.endTime)})</span>
            </span>
            {entry.location && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <MapPin size={11}/> {entry.location}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons — always visible */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
            title="Edit class"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '5px', borderRadius: 6,
              display: 'flex', alignItems: 'center', transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--zoro-500)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(entry._id); }}
            title="Delete class"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '5px', borderRadius: 6,
              display: 'flex', alignItems: 'center', transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--buster-500)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── Expanded detail panel — appears on hover ──────────────────────── */}
      <div style={{
        maxHeight: expanded ? 160 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.25s ease',
      }}>
        <div style={{
          padding: '0 14px 14px',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 8, borderTop: `1px solid ${accentColor}28`,
          paddingTop: 10, marginTop: 0,
        }}>
          {/* Days of week */}
          {entry.daysOfWeek?.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <Calendar size={13} style={{ color: accentColor, marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 3 }}>REPEATS</div>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {entry.daysOfWeek.map(d => (
                    <span key={d} style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px',
                      borderRadius: 10, background: accentColor + '20', color: accentColor,
                    }}>
                      {DAYS_SHORT[d]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Professor */}
          {entry.professor && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <User size={13} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>PROFESSOR</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{entry.professor}</div>
              </div>
            </div>
          )}

          {/* Location */}
          {entry.location && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <MapPin size={13} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>LOCATION</div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{entry.location}</div>
              </div>
            </div>
          )}

          {/* Online / Meet link */}
          {entry.isOnline && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <Wifi size={13} style={{ color: 'var(--zoro-500)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>ONLINE CLASS</div>
                {entry.meetLink ? (
                  <a
                    href={entry.meetLink} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '0.78rem', color: 'var(--zoro-500)', display: 'flex', alignItems: 'center', gap: 3 }}
                    onClick={e => e.stopPropagation()}
                  >
                    Join Meeting <ExternalLink size={10} />
                  </a>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No link set</div>
                )}
              </div>
            </div>
          )}

          {/* Duration */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <Clock size={13} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>DURATION</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{duration(entry.startTime, entry.endTime)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TimetablePage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('today');
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState(BLANK_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [tick, setTick] = useState(0);
  const formRef = useRef();

  // Clock tick for live detection
  useEffect(() => {
    const id = setInterval(() => setTick(t => t+1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { loadEntries(); }, [viewMode]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const endpoint = viewMode === 'today' ? '/timetable/today' : '/timetable';
      const { data } = await api.get(endpoint);
      setEntries(data.entries || []);
    } catch (_) {}
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(BLANK_FORM);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const openEdit = (entry) => {
    setEditingId(entry._id);
    setForm({
      title: entry.title || '',
      subject: entry.subject || '',
      startTime: entry.startTime || '',
      endTime: entry.endTime || '',
      isRecurring: entry.isRecurring ?? true,
      daysOfWeek: entry.daysOfWeek || [],
      location: entry.location || '',
      professor: entry.professor || '',
      isOnline: entry.isOnline || false,
      meetLink: entry.meetLink || '',
      color: entry.color || '#00ff9d',
    });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleDayToggle = (day) => {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        // ── Edit mode: PATCH existing entry ─────────────────────────────────
        const { data } = await api.patch(`/timetable/${editingId}`, form);
        setEntries(prev =>
          prev.map(en => en._id === editingId ? data.entry : en)
            .sort((a,b) => a.startTime.localeCompare(b.startTime))
        );
        toast.success('✏️ Class updated!');
      } else {
        // ── Create mode: POST new entry ──────────────────────────────────────
        const { data } = await api.post('/timetable', form);
        setEntries(prev => [...prev, data.entry].sort((a,b) => a.startTime.localeCompare(b.startTime)));
        toast.success('⚓ Class added to Log Pose!');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(BLANK_FORM);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save class.');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this class from Log Pose?')) return;
    try {
      await api.delete(`/timetable/${id}`);
      setEntries(prev => prev.filter(e => e._id !== id));
      toast('🗑️ Class removed.');
    } catch (_) { toast.error('Failed to delete.'); }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(BLANK_FORM);
  };

  // Group week entries by day
  const weekGroups = DAYS.map((day, idx) => ({
    day,
    entries: entries.filter(e => e.daysOfWeek?.includes(idx))
      .sort((a,b) => a.startTime.localeCompare(b.startTime)),
  }));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">📡 Log Pose</h1>
          <p className="page-subtitle">Your academic navigation system</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setViewMode(viewMode === 'today' ? 'week' : 'today')}
          >
            {viewMode === 'today' ? '📅 Week View' : '📆 Today'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus size={14} /> Add Class
          </button>
        </div>
      </div>

      {/* ── Add / Edit Form ──────────────────────────────────────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16 }} ref={formRef}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>
              {editingId ? '✏️ Edit Class' : '➕ New Class / Event'}
            </h3>
            <button className="btn-icon" onClick={cancelForm}><X size={16} /></button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="grid-2col">
              <div className="form-group">
                <label className="label">Class Title *</label>
                <input className="input" required value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})} placeholder="Data Structures" />
              </div>
              <div className="form-group">
                <label className="label">Subject Code</label>
                <input className="input" value={form.subject}
                  onChange={e => setForm({...form, subject: e.target.value})} placeholder="CS301" />
              </div>
              <div className="form-group">
                <label className="label">Start Time *</label>
                <input className="input" type="time" required value={form.startTime}
                  onChange={e => setForm({...form, startTime: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">End Time *</label>
                <input className="input" type="time" required value={form.endTime}
                  onChange={e => setForm({...form, endTime: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Location</label>
                <input className="input" value={form.location}
                  onChange={e => setForm({...form, location: e.target.value})} placeholder="Room 301" />
              </div>
              <div className="form-group">
                <label className="label">Professor</label>
                <input className="input" value={form.professor}
                  onChange={e => setForm({...form, professor: e.target.value})} placeholder="Dr. Smith" />
              </div>
            </div>

            {/* Days */}
            <div className="form-group">
              <label className="label">Repeat on Days</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DAYS.map((day, idx) => (
                  <button
                    key={day} type="button"
                    onClick={() => handleDayToggle(idx)}
                    style={{
                      padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer',
                      background: form.daysOfWeek.includes(idx) ? 'var(--zoro-500)' : 'var(--bg-elevated)',
                      color: form.daysOfWeek.includes(idx) ? '#000' : 'var(--text-secondary)',
                      border: `1px solid ${form.daysOfWeek.includes(idx) ? 'var(--zoro-500)' : 'var(--border-subtle)'}`,
                      fontWeight: form.daysOfWeek.includes(idx) ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {day.slice(0,3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="form-group">
              <label className="label">Color</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {COLORS_LIST.map(c => (
                  <button key={c} type="button" onClick={() => setForm({...form, color: c})}
                    style={{
                      width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: `3px solid ${form.color === c ? 'white' : 'transparent'}`,
                      transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                      transition: 'transform 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Online toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={form.isOnline}
                  onChange={e => setForm({...form, isOnline: e.target.checked})} />
                <span>Online Class</span>
              </label>
              {form.isOnline && (
                <input className="input" style={{ flex: 1 }} value={form.meetLink}
                  onChange={e => setForm({...form, meetLink: e.target.value})}
                  placeholder="https://meet.google.com/..." />
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-primary" type="submit" disabled={submitting} style={{ flex: 1 }}>
                {submitting ? 'Saving…' : (editingId ? '✏️ Save Changes' : '⚓ Add to Log Pose')}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={cancelForm}>
                  <RotateCcw size={14} /> Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── Today View ──────────────────────────────────────────────────── */}
      {viewMode === 'today' && (
        <div>
          {loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, marginBottom: 8, borderRadius: 8 }} />)
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Clock size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div>No classes today. Enjoy the calm seas!</div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={openCreate}>
                <Plus size={13} /> Add a class
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {entries.map(entry => (
                <TimetableCard
                  key={entry._id}
                  entry={entry}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Week View ───────────────────────────────────────────────────── */}
      {viewMode === 'week' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {weekGroups.filter(g => g.entries.length > 0).map(({ day, entries: dayEntries }) => (
            <div key={day} className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {day}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dayEntries.map(entry => (
                  <TimetableCard
                    key={entry._id}
                    entry={entry}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
          {weekGroups.every(g => g.entries.length === 0) && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Calendar size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div>No classes scheduled this week.</div>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={openCreate}>
                <Plus size={13} /> Add a class
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
