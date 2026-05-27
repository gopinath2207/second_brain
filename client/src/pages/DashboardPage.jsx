/**
 * DashboardPage.jsx — The Crow's Nest: central command dashboard.
 * Displays: Buster Call countdowns, today's classes, habit quick-add, AI plan preview, Bounty.
 */
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import BusterCallCard from '../components/dashboard/BusterCallCard';
import DailySchedule from '../components/dashboard/DailySchedule';
import BountyScore from '../components/dashboard/BountyScore';
import HakiQuickAdd from '../components/habits/HakiQuickAdd';
import LogPoseMini from '../components/timetable/LogPoseMini';
import { Zap } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useSelector((s) => s.auth);
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [habits, setHabits] = useState([]);
  const [todayPlan, setTodayPlan] = useState(null);
  const [todayClasses, setTodayClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [examsRes, habitsRes, planRes, classesRes] = await Promise.allSettled([
          api.get('/exams'),
          api.get('/habits'),
          api.get('/planner/today'),
          api.get('/timetable/today'),
        ]);

        if (examsRes.status === 'fulfilled') setExams(examsRes.value.data.exams || []);
        if (habitsRes.status === 'fulfilled') setHabits(habitsRes.value.data.habits || []);
        if (planRes.status === 'fulfilled') setTodayPlan(planRes.value.data.plan);
        if (classesRes.status === 'fulfilled') setTodayClasses(classesRes.value.data.entries || []);
      } catch (_) {}
      setLoading(false);
    };
    load();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="animate-fade-in">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: 4 }}>
          {greeting()},{' '}
          <span className="text-neon">{user?.username || 'Pirate'}</span> ⚔️
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── Buster Call Countdowns (pinned if urgent) ─────────────────── */}
      {exams.filter(e => e.daysRemaining <= 14).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Zap size={14} color="var(--buster-500)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--buster-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Buster Calls Active
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {exams.filter(e => e.daysRemaining <= 14).map(exam => (
              <BusterCallCard key={exam._id} exam={exam} />
            ))}
          </div>
        </div>
      )}

      {/* ── Main Grid ────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16,
        marginBottom: 20,
      }}>
        {/* Bounty Score */}
        <BountyScore user={user} />

        {/* Today's Log Pose (classes) */}
        <LogPoseMini classes={todayClasses} loading={loading} />
      </div>

      {/* ── Bottom section: Haki Quick Add + AI Plan ─────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {/* Haki Training Quick Add */}
        <HakiQuickAdd habits={habits} setHabits={setHabits} />

        {/* Today's AI Plan preview */}
        <DailySchedule plan={todayPlan} loading={loading} onViewFull={() => navigate('/planner')} />
      </div>
    </div>
  );
}
