/**
 * HakiQuickAdd.jsx — One-click habit logging widget for the dashboard.
 * Zero-friction: single tap completes a habit.
 */
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { logHabit, unlogHabit, optimisticToggle } from '../../store/habitSlice';
import { updateUserBounty } from '../../store/authSlice';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Flame, CheckCircle2 } from 'lucide-react';

export default function HakiQuickAdd({ habits, setHabits }) {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [animatingId, setAnimatingId] = useState(null);

  const handleToggle = async (habit) => {
    const willComplete = !habit.completedToday;
    setAnimatingId(habit._id);

    // Optimistic update
    setHabits(prev => prev.map(h => h._id === habit._id
      ? { ...h, completedToday: willComplete }
      : h
    ));

    setTimeout(() => setAnimatingId(null), 400);

    try {
      if (willComplete) {
        const result = await dispatch(logHabit({ id: habit._id })).unwrap();
        toast.success(`${habit.icon} +${result.bountyEarned} Bounty! ${habit.name} complete!`);
        // Update bounty in store
        if (user) {
          dispatch(updateUserBounty((user.bountyPoints || 0) + result.bountyEarned));
        }
      } else {
        const result = await dispatch(unlogHabit(habit._id)).unwrap();
        toast('Habit undone.', { icon: '↩️' });
        // Decrement bounty immediately in store
        if (user) {
          dispatch(updateUserBounty(Math.max(0, (user.bountyPoints || 0) - (result.bountyReturned || habit.bountyReward))));
        }
      }
    } catch (err) {
      // Revert on error
      setHabits(prev => prev.map(h => h._id === habit._id
        ? { ...h, completedToday: !willComplete }
        : h
      ));
      toast.error(err || 'Failed to update habit.');
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Flame size={16} color="#ff6b35" />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Haki Training</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {habits.filter(h => h.completedToday).length}/{habits.length} done
        </span>
      </div>

      {habits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          <Flame size={24} style={{ marginBottom: 8, opacity: 0.3 }} />
          <div>No habits configured yet.</div>
          <a href="/habits" style={{ color: 'var(--zoro-500)', fontSize: '0.8rem' }}>
            Set up Haki Training →
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {habits.map((habit) => (
            <button
              key={habit._id}
              onClick={() => handleToggle(habit)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px',
                background: habit.completedToday ? 'rgba(0,255,157,0.06)' : 'var(--bg-elevated)',
                border: `1px solid ${habit.completedToday ? 'rgba(0,255,157,0.25)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left',
                width: '100%',
                transform: animatingId === habit._id ? 'scale(0.97)' : 'scale(1)',
              }}
            >
              {/* Icon */}
              <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>
                {habit.icon}
              </span>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.875rem', fontWeight: 500,
                  color: habit.completedToday ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: habit.completedToday ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {habit.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  +{habit.bountyReward} bounty
                </div>
              </div>

              {/* Check indicator */}
              <CheckCircle2
                size={18}
                color={habit.completedToday ? 'var(--zoro-500)' : 'var(--text-muted)'}
                style={{
                  flexShrink: 0,
                  filter: habit.completedToday ? 'drop-shadow(0 0 6px rgba(0,255,157,0.5))' : 'none',
                  transition: 'all 0.2s',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
