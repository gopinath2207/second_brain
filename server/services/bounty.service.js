/**
 * bounty.service.js — Calculates and updates a user's Bounty score.
 * The "Bounty" is a gamified progress metric combining:
 * - Habit completions (streaks multiply rewards)
 * - Block task checkoffs
 * - AI plan adherence
 */
const User = require('../models/User');
const HabitLog = require('../models/HabitLog');
const Block = require('../models/Block');

/**
 * Recalculate a user's total bounty from scratch.
 * Called periodically or after major updates.
 * @param {string} userId
 * @returns {Promise<number>} New bounty total
 */
const recalculateBounty = async (userId) => {
  // Sum all bounty from habit logs
  const habitBountyResult = await HabitLog.aggregate([
    { $match: { user: userId } },
    { $group: { _id: null, total: { $sum: '$bountyEarned' } } },
  ]);

  // Count checked blocks (5 bounty per checked block)
  const checkedBlocks = await Block.countDocuments({
    user: userId,
    checked: true,
    isDeleted: false,
  });

  const habitBounty = habitBountyResult[0]?.total || 0;
  const blockBounty = checkedBlocks * 5;
  const totalBounty = habitBounty + blockBounty;

  // Update user
  await User.findByIdAndUpdate(userId, {
    bountyPoints: totalBounty,
    title: User.getBountyTitle ? User.getBountyTitle(totalBounty) : 'Pirate',
  });

  return totalBounty;
};

/**
 * Get a user's current rank/title based on bounty points.
 */
const getBountyRank = (points) => {
  if (points < 100) return { title: 'Pirate Apprentice', color: '#888', icon: '🏴‍☠️' };
  if (points < 500) return { title: 'Rookie Pirate', color: '#00aaff', icon: '⚓' };
  if (points < 1000) return { title: 'Super Rookie', color: '#aa44ff', icon: '🌊' };
  if (points < 5000) return { title: 'Warlord of Study', color: '#ff8800', icon: '⚔️' };
  if (points < 10000) return { title: "Yonko's Commander", color: '#ff0044', icon: '💀' };
  return { title: 'Pirate King', color: '#00ff9d', icon: '👑' };
};

module.exports = { recalculateBounty, getBountyRank };
