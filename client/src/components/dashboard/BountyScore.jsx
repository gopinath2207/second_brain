/**
 * BountyScore.jsx — Gamified bounty score display widget.
 */
import React from 'react';
import { TrendingUp } from 'lucide-react';

const RANKS = [
  { min: 0,     max: 99,    title: 'Pirate Apprentice', icon: '🏴‍☠️', color: '#888' },
  { min: 100,   max: 499,   title: 'Rookie Pirate',     icon: '⚓',   color: '#00aaff' },
  { min: 500,   max: 999,   title: 'Super Rookie',      icon: '🌊',   color: '#aa44ff' },
  { min: 1000,  max: 4999,  title: 'Warlord of Study',  icon: '⚔️',   color: '#ff8800' },
  { min: 5000,  max: 9999,  title: "Yonko's Commander", icon: '💀',   color: '#ff3860' },
  { min: 10000, max: Infinity, title: 'Pirate King',    icon: '👑',   color: '#00ff9d' },
];

const getRank = (pts) => RANKS.find(r => pts >= r.min && pts <= r.max) || RANKS[0];

export default function BountyScore({ user }) {
  const points = user?.bountyPoints || 0;
  const rank = getRank(points);
  const nextRank = RANKS[RANKS.indexOf(rank) + 1];
  const progress = nextRank
    ? ((points - rank.min) / (nextRank.min - rank.min)) * 100
    : 100;

  return (
    <div className="card" style={{
      background: 'linear-gradient(135deg, rgba(255,215,0,0.04), rgba(255,215,0,0.08))',
      border: '1px solid rgba(255,215,0,0.15)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <TrendingUp size={16} color="var(--nami-500)" />
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Bounty Board</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        {/* Rank icon */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `${rank.color}22`,
          border: `2px solid ${rank.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, flexShrink: 0,
        }}>
          {rank.icon}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>
            Current Rank
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: rank.color, fontSize: '0.95rem' }}>
            {rank.title}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700,
            color: 'var(--nami-500)',
            textShadow: '0 0 20px rgba(255,215,0,0.4)',
          }}>
            ฿ {points.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Progress to next rank */}
      {nextRank && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>Progress to {nextRank.title}</span>
            <span style={{ color: 'var(--nami-500)' }}>{nextRank.min - points} pts away</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${rank.color}99, ${rank.color})`,
                boxShadow: `0 0 8px ${rank.color}66`,
              }}
            />
          </div>
        </div>
      )}

      {!nextRank && (
        <div style={{ textAlign: 'center', color: 'var(--zoro-500)', fontSize: '0.875rem', fontWeight: 600 }}>
          👑 You are the Pirate King!
        </div>
      )}
    </div>
  );
}
