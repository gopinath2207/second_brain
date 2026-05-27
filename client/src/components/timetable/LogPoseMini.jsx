/**
 * LogPoseMini.jsx — Mini timetable widget for the dashboard.
 * Shows today's classes and highlights the currently active one.
 */
import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Radio } from 'lucide-react';

function isActive(startTime, endTime) {
  const now = new Date();
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= startMins && nowMins < endMins;
}

function isNext(startTime) {
  const now = new Date();
  const [sh, sm] = startTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return startMins > nowMins && startMins - nowMins <= 30;
}

export default function LogPoseMini({ classes, loading }) {
  const [tick, setTick] = useState(0);

  // Refresh every minute to update active status
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Radio size={16} color="var(--zoro-500)" />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Log Pose — Today</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {loading ? (
        [1,2].map(i => (
          <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 8 }} />
        ))
      ) : classes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          🌊 Clear seas today — no classes scheduled
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {classes.map((cls) => {
            const active = isActive(cls.startTime, cls.endTime);
            const upcoming = !active && isNext(cls.startTime);
            return (
              <div
                key={cls._id}
                className={`timetable-slot ${active ? 'active' : ''}`}
                style={{
                  opacity: cls.endTime < new Date().toTimeString().slice(0,5) ? 0.5 : 1,
                }}
              >
                <div style={{
                  width: 3, borderRadius: 4,
                  background: active ? 'var(--zoro-500)' : cls.color || 'var(--border-default)',
                  minHeight: 40, alignSelf: 'stretch', flexShrink: 0,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cls.title}
                    </span>
                    {active && (
                      <span className="badge badge-green" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                        LIVE
                      </span>
                    )}
                    {upcoming && (
                      <span className="badge badge-gold" style={{ fontSize: '0.6rem', padding: '1px 6px' }}>
                        SOON
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <Clock size={10} /> {cls.startTime} – {cls.endTime}
                    </span>
                    {cls.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <MapPin size={10} /> {cls.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
