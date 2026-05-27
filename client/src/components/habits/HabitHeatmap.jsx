/**
 * HabitHeatmap.jsx — GitHub-style activity heatmap for habit completions.
 */
import React, { useState } from 'react';

const getLevel = (count) => {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
};

export default function HabitHeatmap({ data = [] }) {
  const [tooltip, setTooltip] = useState(null);

  // Build a full 365-day grid
  const today = new Date();
  const cells = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const entry = data.find(item => item._id === dateStr);
    cells.push({ date: dateStr, count: entry?.count || 0 });
  }

  // Group into weeks
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="card">
      <h3 style={{ marginBottom: 14, fontSize: '0.95rem' }}>Activity Heatmap (Past Year)</h3>

      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'flex', gap: 3, minWidth: 'max-content' }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {week.map((cell, di) => (
                <div
                  key={di}
                  className={`heatmap-cell level-${getLevel(cell.count)}`}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ date: cell.date, count: cell.count, x: rect.left, y: rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  title={`${cell.date}: ${cell.count} completions`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Less</span>
        {[0,1,2,3,4].map(l => (
          <div key={l} className={`heatmap-cell level-${l}`} style={{ width: 12, height: 12 }} />
        ))}
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>More</span>
      </div>
    </div>
  );
}
