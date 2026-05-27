/**
 * ExamsPage.jsx — Buster Call exam countdown management.
 */
import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import BusterCallCard from '../components/dashboard/BusterCallCard';
import { Plus, Skull, X, CheckCircle2 } from 'lucide-react';

export default function ExamsPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', subject: '', examDate: '', alertThresholdDays: 7, notes: '',
  });

  useEffect(() => {
    api.get('/exams').then(({ data }) => {
      setExams(data.exams || []);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/exams', form);
      // Recompute daysRemaining
      const msRemaining = new Date(data.exam.examDate) - new Date();
      const daysRemaining = Math.ceil(msRemaining / (1000*60*60*24));
      setExams(prev => [...prev, { ...data.exam, daysRemaining }].sort((a,b) => a.daysRemaining - b.daysRemaining));
      setShowForm(false);
      setForm({ title:'',subject:'',examDate:'',alertThresholdDays:7,notes:'' });
      toast.success('☠️ Buster Call added!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add exam.');
    }
  };

  const handleMarkDone = async (id) => {
    try {
      await api.patch(`/exams/${id}`, { isCompleted: true });
      setExams(prev => prev.filter(e => e._id !== id));
      toast.success('✅ Buster Call survived!');
    } catch (_) {}
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/exams/${id}`);
      setExams(prev => prev.filter(e => e._id !== id));
    } catch (_) {}
  };

  // Sort by urgency
  const urgent = exams.filter(e => e.daysRemaining <= 7);
  const upcoming = exams.filter(e => e.daysRemaining > 7);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">☠️ Buster Calls</h1>
          <p className="page-subtitle">Exam and deadline countdowns</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} /> Add Buster Call
        </button>
      </div>

      {/* ── Form ──────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'rgba(255,56,96,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>New Buster Call</h3>
            <button className="btn-icon" onClick={() => setShowForm(false)}><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="grid-2col">
              <div className="form-group">
                <label className="label">Exam / Event Title</label>
                <input className="input" required value={form.title}
                  onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="NPTEL Final Exam" />
              </div>
              <div className="form-group">
                <label className="label">Subject</label>
                <input className="input" value={form.subject}
                  onChange={e => setForm({...form, subject: e.target.value})}
                  placeholder="Sustainable Development" />
              </div>
              <div className="form-group">
                <label className="label">Exam Date & Time</label>
                <input className="input" type="datetime-local" required value={form.examDate}
                  onChange={e => setForm({...form, examDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Alert Threshold (days)</label>
                <input className="input" type="number" min={1} max={30} value={form.alertThresholdDays}
                  onChange={e => setForm({...form, alertThresholdDays: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="form-group">
              <label className="label">Notes</label>
              <input className="input" value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
                placeholder="Covers Modules 1-4, 75% weightage..." />
            </div>
            <button className="btn btn-danger" type="submit">
              <Skull size={14} /> Set Buster Call
            </button>
          </form>
        </div>
      )}

      {/* ── Urgent Exams (≤7 days) ─────────────────────────────────────── */}
      {urgent.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Skull size={14} color="var(--buster-500)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--buster-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              CRITICAL — {urgent.length} incoming
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {urgent.map(exam => (
              <div key={exam._id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <BusterCallCard exam={exam} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, paddingTop: 6 }}>
                  <button onClick={() => handleMarkDone(exam._id)} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
                    <CheckCircle2 size={12} /> Done
                  </button>
                  <button onClick={() => handleDelete(exam._id)} className="btn btn-ghost btn-sm">
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Upcoming Exams ────────────────────────────────────────────── */}
      {upcoming.length > 0 && (
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Upcoming
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {upcoming.map(exam => (
              <div key={exam._id} style={{ position: 'relative' }}>
                <BusterCallCard exam={exam} />
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                  <button onClick={() => handleMarkDone(exam._id)} className="btn-icon" style={{ width: 24, height: 24 }}>
                    <CheckCircle2 size={12} />
                  </button>
                  <button onClick={() => handleDelete(exam._id)} className="btn-icon" style={{ width: 24, height: 24 }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />}

      {!loading && exams.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Skull size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
          <div>No Buster Calls active.</div>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Add an exam to start the countdown!</div>
        </div>
      )}
    </div>
  );
}
