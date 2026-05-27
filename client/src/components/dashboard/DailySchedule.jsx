/**
 * DailySchedule.jsx — AI-generated day plan preview widget.
 */
import React from 'react';
import { Brain, ChevronRight, CheckCircle2, Circle } from 'lucide-react';

const CATEGORY_COLORS = {
  study:          '#00ff9d',
  haki_training:  '#ff6b35',
  class:          '#0070f3',
  break:          '#8b949e',
  review:         '#aa44ff',
  coding:         '#00d4ff',
  rest:           '#484f58',
  other:          '#8b949e',
};

export default function DailySchedule({ plan, loading, onViewFull }) {
  if (loading) {
    return (
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Brain size={16} color="var(--zoro-500)" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Grand Line Plan</span>
        </div>
        {[1,2,3].map(i => (
          <div key={i} className="skeleton" style={{ height: 48, marginBottom: 8, borderRadius: 8 }} />
        ))}
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 180, textAlign: 'center' }}>
        <Brain size={32} color="var(--text-muted)" />
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>No plan for today</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            The AI planner runs at 5:00 AM. Generate one now!
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onViewFull}>
          Generate Plan
        </button>
      </div>
    );
  }

  // Show first 5 items
  const preview = plan.schedule?.slice(0, 5) || [];

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={16} color="var(--zoro-500)" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Grand Line Plan</span>
        </div>
        <button
          onClick={onViewFull}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.75rem' }}
        >
          Full plan <ChevronRight size={12} />
        </button>
      </div>

      {/* AI reasoning */}
      {plan.aiReasoning && (
        <div style={{
          background: 'rgba(0,255,157,0.04)', border: '1px solid rgba(0,255,157,0.1)',
          borderRadius: 6, padding: '8px 10px', marginBottom: 12,
          fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic',
        }}>
          💡 {plan.aiReasoning}
        </div>
      )}

      {/* Schedule items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {preview.map((item, i) => (
          <div key={i} className="schedule-item" style={{ padding: '8px 10px' }}>
            <div
              className="category-dot"
              style={{ background: CATEGORY_COLORS[item.category] || '#666' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="schedule-title" style={{
                fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textDecoration: item.isCompleted ? 'line-through' : 'none',
              }}>
                {item.title}
              </div>
              <div className="schedule-time">
                {item.time} – {item.endTime}
              </div>
            </div>
            {item.isCompleted
              ? <CheckCircle2 size={14} color="var(--zoro-500)" />
              : <Circle size={14} color="var(--text-muted)" />
            }
          </div>
        ))}

        {plan.schedule?.length > 5 && (
          <button onClick={onViewFull} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--zoro-500)', fontSize: '0.8rem', padding: '4px 0',
            textAlign: 'center', fontWeight: 500,
          }}>
            +{plan.schedule.length - 5} more items →
          </button>
        )}
      </div>
    </div>
  );
}
