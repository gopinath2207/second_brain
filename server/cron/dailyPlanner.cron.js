/**
 * dailyPlanner.cron.js — Autonomous AI Day Planner
 *
 * Fires daily at 5:00 AM IST (23:30 UTC previous day) for all users.
 * Aggregates context → calls Gemini → saves DayPlan → sends FCM notification.
 */
const cron = require('node-cron');
const User = require('../models/User');
const Block = require('../models/Block');
const HabitLog = require('../models/HabitLog');
const Habit = require('../models/Habit');
const TimetableEntry = require('../models/TimetableEntry');
const DayPlan = require('../models/DayPlan');
const { generateContent, parseAIJson } = require('../services/ai.service');
const { notifyPlanReady } = require('../services/fcm.service');

/**
 * Aggregate context for a single user.
 * Returns the data Gemini needs to generate a conflict-free schedule.
 */
const aggregateContextForUser = async (userId) => {
  const now = new Date();
  const todayDayOfWeek = now.getDay();

  // Yesterday's date range
  const yesterdayStart = new Date(now);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterdayStart);
  yesterdayEnd.setHours(23, 59, 59, 999);

  // 1. Yesterday's unfinished checkbox tasks
  const unfinishedBlocks = await Block.find({
    user: userId,
    type: 'checkbox',
    checked: false,
    isDeleted: false,
    updatedAt: { $lte: yesterdayEnd },
  })
    .sort({ order: 1 })
    .limit(10)
    .select('textContent content')
    .lean();

  // 2. Today's timetable classes
  const todayClasses = await TimetableEntry.find({
    user: userId,
    isActive: true,
    $or: [
      { isRecurring: true, daysOfWeek: todayDayOfWeek },
    ],
  })
    .sort({ startTime: 1 })
    .lean();

  // 3. Habits not yet completed today
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const allHabits = await Habit.find({ user: userId, isActive: true }).lean();
  const todayLogs = await HabitLog.find({
    user: userId,
    date: { $gte: todayStart },
  })
    .select('habit')
    .lean();
  const completedHabitIds = new Set(todayLogs.map((l) => l.habit.toString()));
  const pendingHabits = allHabits.filter((h) => !completedHabitIds.has(h._id.toString()));

  // 4. Next unchecked study topic (checkbox block, ordered)
  const nextTopic = await Block.findOne({
    user: userId,
    type: 'checkbox',
    checked: false,
    isDeleted: false,
  })
    .sort({ order: 1 })
    .select('textContent content')
    .lean();

  return {
    unfinishedTasks: unfinishedBlocks.map((b) => b.textContent || b.content).filter(Boolean),
    todayClasses: todayClasses.map((c) => ({
      title: c.title,
      subject: c.subject,
      startTime: c.startTime,
      endTime: c.endTime,
    })),
    pendingHabits: pendingHabits.map((h) => ({ name: h.name, icon: h.icon })),
    nextSkillTopic: nextTopic?.textContent || nextTopic?.content || null,
  };
};

/**
 * Build the Gemini prompt for schedule generation.
 */
const buildPlannerPrompt = (context) => {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return `You are an elite student productivity planner. Generate an optimized daily schedule for ${today}.

CONTEXT:
- Unfinished tasks from yesterday: ${JSON.stringify(context.unfinishedTasks)}
- Fixed classes today: ${JSON.stringify(context.todayClasses)}
- Pending habits (Haki Training): ${JSON.stringify(context.pendingHabits)}
- Next skill tree topic to study: ${context.nextSkillTopic || 'None specified'}

RULES:
1. Do NOT schedule anything during class times
2. Include at least one break after every 90 minutes of study
3. Place Haki Training habits in the morning (6-8 AM)
4. Prioritize unfinished tasks before new topics
5. Include a review session at the end of the day (9-10 PM)
6. Return ONLY a valid JSON object with NO other text

OUTPUT FORMAT:
{
  "reasoning": "Brief explanation of your scheduling decisions (2-3 sentences)",
  "schedule": [
    {
      "time": "06:00",
      "endTime": "06:30",
      "duration": 30,
      "title": "Activity name",
      "description": "Brief description",
      "category": "haki_training|study|class|break|review|coding|rest|other",
      "priority": 1
    }
  ]
}

Categories must be one of: haki_training, study, class, break, review, coding, rest, other
Priority: 1=critical, 2=high, 3=normal, 4=low

Generate the schedule now:`;
};

/**
 * Rule-based fallback plan generator — works with ZERO API keys.
 * Creates a sensible schedule directly from the user's timetable + habits.
 */
const generateTemplatePlan = (context) => {
  const schedule = [];
  let itemId = 1;

  const addItem = (time, endTime, title, description, category, priority = 3) => {
    schedule.push({
      time, endTime,
      duration: (() => {
        const [sh, sm] = time.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
      })(),
      title, description, category, priority,
      isCompleted: false,
    });
    itemId++;
  };

  // Morning habits (6:00 - 7:30)
  const habits = context.pendingHabits.slice(0, 3);
  let habitStart = 6 * 60; // 6:00 AM in minutes
  habits.forEach((h) => {
    const startH = String(Math.floor(habitStart / 60)).padStart(2, '0');
    const startM = String(habitStart % 60).padStart(2, '0');
    habitStart += 20;
    const endH = String(Math.floor(habitStart / 60)).padStart(2, '0');
    const endM = String(habitStart % 60).padStart(2, '0');
    addItem(`${startH}:${startM}`, `${endH}:${endM}`, `${h.icon} ${h.name}`, 'Haki Training session', 'haki_training', 2);
    habitStart += 5; // 5min break between habits
  });

  // Morning study block (if no class before 10am)
  if (!context.todayClasses.some(c => c.startTime < '10:00')) {
    addItem('08:00', '10:00', '📚 Morning Study Block', context.nextSkillTopic || 'Review notes and assignments', 'study', 2);
  }

  // Scheduled classes (from timetable)
  context.todayClasses.forEach((cls) => {
    addItem(cls.startTime, cls.endTime, `🎓 ${cls.title}`, cls.subject || 'Class session', 'class', 1);
    // 15-min break after each class
    const [eh, em] = cls.endTime.split(':').map(Number);
    const breakEnd = `${String(eh).padStart(2,'0')}:${String(em + 15).padStart(2,'0')}`;
    addItem(cls.endTime, breakEnd, '☕ Break', 'Short recovery break', 'break', 4);
  });

  // Afternoon study (2:00 - 4:30)
  const hasAfternoonClass = context.todayClasses.some(c => c.startTime >= '14:00' && c.startTime <= '16:00');
  if (!hasAfternoonClass) {
    addItem('14:00', '16:30', '💻 Deep Work Session',
      context.unfinishedTasks.length > 0
        ? `Complete: ${context.unfinishedTasks[0]}`
        : (context.nextSkillTopic || 'Practice problems and coding'),
      'coding', 2
    );
  }

  // Evening review (9:00 PM)
  addItem('21:00', '22:00', '🌙 Evening Review', 'Review today\'s progress, plan tomorrow', 'review', 3);
  addItem('22:30', '23:00', '😴 Wind Down', 'Prepare for sleep. Consistency builds the Grand Line!', 'rest', 4);

  // Sort by time
  schedule.sort((a, b) => a.time.localeCompare(b.time));

  return {
    schedule,
    reasoning: `Template-based schedule generated from your ${context.todayClasses.length} classes and ${context.pendingHabits.length} pending habits. Configure GROQ_API_KEY at console.groq.com (free) for AI-powered personalized plans.`,
  };
};

/**
 * Generate a day plan for a single user.
 * @param {string} userId
 * @returns {Promise<DayPlan>}
 */
const generateDayPlan = async (userId) => {
  console.log(`[Planner] Generating plan for user ${userId}`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Create a placeholder plan with 'generating' status
  let plan = await DayPlan.findOneAndUpdate(
    { user: userId, date: today },
    {
      user: userId,
      date: today,
      status: 'generating',
      schedule: [],
      generatedBy: process.env.GROQ_API_KEY ? 'groq-llama-3.3-70b' : 'gemini-2.0-flash',
    },
    { upsert: true, new: true }
  );

  try {
    // Aggregate context
    const context = await aggregateContextForUser(userId);
    const prompt = buildPlannerPrompt(context);

    let parsed;
    try {
      // Call AI (Groq → Gemini fallback)
      const responseText = await generateContent(prompt);
      parsed = parseAIJson(responseText);
      console.log(`[Planner] AI response parsed successfully`);
    } catch (aiErr) {
      // All AI providers failed — use rule-based template fallback
      console.warn(`[Planner] AI unavailable (${aiErr.message.split('\n')[0]}). Using template plan.`);
      parsed = generateTemplatePlan(context);
    }

    // Validate parsed response
    if (!parsed.schedule || !Array.isArray(parsed.schedule)) {
      throw new Error('Invalid schedule format.');
    }

    // Update plan with generated schedule
    plan.schedule = parsed.schedule;
    plan.aiReasoning = parsed.reasoning || '';
    plan.status = 'ready';
    plan.contextSnapshot = {
      unfinishedTaskCount: context.unfinishedTasks.length,
      classCount: context.todayClasses.length,
      pendingHabits: context.pendingHabits.map((h) => h.name),
      nextSkillTopic: context.nextSkillTopic,
    };

    await plan.save();
    console.log(`[Planner] Plan generated for user ${userId}: ${plan.schedule.length} items`);

    // Send FCM notification if user has tokens
    const user = await User.findById(userId).select('fcmTokens notificationsEnabled').lean();
    if (user?.notificationsEnabled && user?.fcmTokens?.length > 0) {
      await notifyPlanReady(user, today);
      plan.notificationSent = true;
      await plan.save();
    }

    return plan;
  } catch (err) {
    console.error(`[Planner] Failed for user ${userId}: ${err.message}`);
    plan.status = 'failed';
    await plan.save();
    throw err;
  }
};

/**
 * Start the cron job — fires at 5:00 AM IST daily (11:30 PM UTC).
 * In production, ensure the server timezone is correct or use UTC cron.
 */
const startDailyPlannerCron = () => {
  // Cron: 30 23 * * * = 11:30 PM UTC = 5:00 AM IST
  cron.schedule('30 23 * * *', async () => {
    console.log('[Cron] 5:00 AM — Starting Daily Grand Line Planner...');

    try {
      // Get all users with notifications enabled
      const users = await User.find({ notificationsEnabled: true }).select('_id').lean();
      console.log(`[Cron] Planning for ${users.length} crew members...`);

      // Generate plans sequentially to avoid Gemini rate limits
      for (const user of users) {
        try {
          await generateDayPlan(user._id.toString());
          // Small delay between users to respect rate limits
          await new Promise((r) => setTimeout(r, 2000));
        } catch (err) {
          console.error(`[Cron] Failed for user ${user._id}: ${err.message}`);
          // Continue with next user
        }
      }

      console.log('[Cron] Daily planning complete. Sail on!');
    } catch (err) {
      console.error(`[Cron] Fatal error in daily planner: ${err.message}`);
    }
  }, {
    timezone: 'Asia/Kolkata',
  });

  console.log('⏰  Daily Planner cron scheduled for 5:00 AM IST');
};

module.exports = { startDailyPlannerCron, generateDayPlan };
