/**
 * BusterCallCard.jsx — High-priority exam countdown widget.
 * Changes visual state as the exam date approaches.
 */
import React, { useState, useEffect } from 'react';
import { Skull, Clock } from 'lucide-react';

const getUrgencyStyle = (days) => {
  if (days <= 2) return { bg: 'rgba(255,56,96,0.2)', border: 'rgba(255,56,96,0.6)', glow: 'var(--buster-glow)' };
  if (days <= 7) return { bg: 'rgba(255,56,96,0.1)', border: 'rgba(255,56,96,0.4)', glow: '' };
  return { bg: 'rgba(255,56,96,0.05)', border: 'rgba(255,56,96,0.2)', glow: '' };
};

export default function BusterCallCard({ exam }) {
  const [timeLeft, setTimeLeft] = useState('');
  const days = exam.daysRemaining;
  const style = getUrgencyStyle(days);

  // Live countdown (hours:min:sec for urgent exams)
  useEffect(() => {
    if (days > 2) {
      setTimeLeft(`${days}d`);
      return;
    }
    const tick = () => {
      const diff = new Date(exam.examDate) - new Date();
      if (diff <= 0) { setTimeLeft('NOW'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [exam.examDate, days]);

  return (
    <div style={{
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: 'var(--radius-lg)',
      padding: '14px 16px',
      minWidth: 220,
      boxShadow: style.glow,
      transition: 'all 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Skull size={12} color="var(--buster-500)" />
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--buster-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Buster Call
            </span>
          </div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {exam.title}
          </div>
          {exam.subject && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {exam.subject}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Clock size={11} color="var(--text-muted)" />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {new Date(exam.examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          </div>
        </div>

        {/* Countdown */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="countdown-number" style={{ fontSize: days <= 2 ? '1.5rem' : '1.8rem' }}>
            {timeLeft}
          </div>
          {days > 2 && (
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>remaining</div>
          )}
        </div>
      </div>

      {/* Progress bar (how close to exam) */}
      <div className="progress-bar" style={{ marginTop: 10 }}>
        <div
          className="progress-bar-fill danger"
          style={{ width: `${Math.max(5, Math.min(100, 100 - (days / 30) * 100))}%` }}
        />
      </div>
    </div>
  );
}
