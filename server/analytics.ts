import type { Goal, Activity, Todo, Note, ProgressEntry, TimeSession } from "@shared/schema";

interface AnalyticsData {
  goals: Goal[];
  activities: Activity[];
  todos: Todo[];
  notes: Note[];
  progressEntries: ProgressEntry[];
  timeSessions: TimeSession[];
  period: string;
  currentDate: Date;
}

interface InsightsData {
  goals: Goal[];
  activities: Activity[];
  todos: Todo[];
  progressEntries: ProgressEntry[];
  timeSessions: TimeSession[];
  currentDate: Date;
}

interface ComprehensiveStats {
  overview: {
    totalGoals: number;
    completedGoals: number;
    goalCompletionRate: number;
    totalTodos: number;
    completedTodos: number;
    todoCompletionRate: number;
    overdueTodos: number;
    totalActivities: number;
    totalNotes: number;
    totalProgressEntries: number;
  };
  timeTracking: {
    totalTimeToday: number;
    totalTimeThisWeek: number;
    totalTimeThisMonth: number;
    averageSessionDuration: number;
    mostProductiveTimeOfDay: string;
    activityBreakdown: Array<{
      activityId: string;
      activityTitle: string;
      totalTime: number;
      percentage: number;
    }>;
  };
  productivity: {
    weeklyTodoCompletion: Array<{
      date: string;
      completed: number;
      created: number;
      completionRate: number;
    }>;
    goalProgress: Array<{
      goalId: string;
      title: string;
      progressPercentage: number;
      daysUntilTarget: number;
    }>;
    progressTrend: {
      thisWeek: number;
      lastWeek: number;
      changePercentage: number;
      trend: 'up' | 'down' | 'stable';
    };
  };
  engagement: {
    dailyActiveHours: Array<{
      hour: number;
      sessionsCount: number;
      totalMinutes: number;
    }>;
    weeklyPattern: Array<{
      dayOfWeek: string;
      totalSessions: number;
      totalTime: number;
    }>;
    streaks: {
      currentProgressStreak: number;
      longestProgressStreak: number;
      currentTodoStreak: number;
      longestTodoStreak: number;
    };
  };
  wellbeing: {
    moodDistribution: Array<{
      mood: string;
      count: number;
      percentage: number;
    }>;
    averageMoodScore: number;
    moodTrend: 'improving' | 'declining' | 'stable';
    productivitySatisfaction: Array<{
      satisfaction: string;
      count: number;
      percentage: number;
    }>;
    averageProductivityScore: number;
    productivityTrend: 'improving' | 'declining' | 'stable';
    healthDistribution: Array<{
      health: string;
      count: number;
      percentage: number;
    }>;
    averageHealthScore: number;
    healthTrend: 'improving' | 'declining' | 'stable';
    averageSleepHours: number;
    sleepTrend: 'improving' | 'declining' | 'stable';
    dailyWellbeingPattern: Array<{
      date: string;
      mood: string;
      productivity: string;
      health: string;
      sleepHours: number;
      moodScore: number;
      productivityScore: number;
      healthScore: number;
    }>;
  };
  insights?: ProductivityInsights;
}

interface ProductivityInsights {
  recommendations: Array<{
    type: 'goal' | 'todo' | 'time' | 'progress' | 'balance';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    actionable: boolean;
  }>;
  achievements: Array<{
    title: string;
    description: string;
    earnedDate: string;
  }>;
  patterns: Array<{
    pattern: string;
    description: string;
    significance: 'positive' | 'negative' | 'neutral';
  }>;
}

// Helper function to get date range based on period
function getDateRange(period: string, currentDate: Date): { startDate: Date; endDate: Date } {
  const endDate = new Date(currentDate);
  const startDate = new Date(currentDate);
  
  switch (period) {
    case 'day':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      startDate.setDate(currentDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(currentDate.getMonth() - 1);
      break;
    case 'year':
      startDate.setFullYear(currentDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(currentDate.getDate() - 7); // Default to week
  }
  
  return { startDate, endDate };
}

// Helper function to filter data by date range
function filterByDateRange<T extends { createdAt?: Date; entryDate?: Date; startTime?: Date }>(
  items: T[],
  startDate: Date,
  endDate: Date
): T[] {
  return items.filter(item => {
    const itemDate = item.createdAt || item.entryDate || item.startTime;
    if (!itemDate) return false;
    const date = new Date(itemDate);
    return date >= startDate && date <= endDate;
  });
}

export function calculateComprehensiveStats(data: AnalyticsData): ComprehensiveStats {
  const { goals, activities, todos, notes, progressEntries, timeSessions, currentDate } = data;
  const { startDate, endDate } = getDateRange(data.period, currentDate);

  // Overview calculations
  const completedGoals = goals.filter(g => g.isCompleted).length;
  const goalCompletionRate = goals.length > 0 ? Math.round((completedGoals / goals.length) * 100) : 0;
  
  const completedTodos = todos.filter(t => t.isCompleted).length;
  const todoCompletionRate = todos.length > 0 ? Math.round((completedTodos / todos.length) * 100) : 0;
  
  const overdueTodos = todos.filter(t => 
    !t.isCompleted && t.dueDate && new Date(t.dueDate) < currentDate
  ).length;

  // Time tracking calculations
  const completedSessions = timeSessions.filter(s => !s.isActive && s.duration);
  
  const todaySessions = completedSessions.filter(s => {
    const sessionDate = new Date(s.startTime);
    return sessionDate.toDateString() === currentDate.toDateString();
  });
  
  const thisWeekSessions = completedSessions.filter(s => {
    const sessionDate = new Date(s.startTime);
    const oneWeekAgo = new Date(currentDate);
    oneWeekAgo.setDate(currentDate.getDate() - 7);
    return sessionDate >= oneWeekAgo;
  });

  const thisMonthSessions = completedSessions.filter(s => {
    const sessionDate = new Date(s.startTime);
    const oneMonthAgo = new Date(currentDate);
    oneMonthAgo.setMonth(currentDate.getMonth() - 1);
    return sessionDate >= oneMonthAgo;
  });

  const totalTimeToday = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalTimeThisWeek = thisWeekSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalTimeThisMonth = thisMonthSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  
  const averageSessionDuration = completedSessions.length > 0 
    ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
    : 0;

  // Most productive time of day
  const hourlyActivity = new Array(24).fill(0);
  completedSessions.forEach(session => {
    const hour = new Date(session.startTime).getHours();
    hourlyActivity[hour] += session.duration || 0;
  });
  const mostProductiveHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));
  const mostProductiveTimeOfDay = `${mostProductiveHour}:00-${mostProductiveHour + 1}:00`;

  // Activity breakdown
  const activityTimeMap = new Map<string, number>();
  const activityTitleMap = new Map<string, string>();
  
  activities.forEach(activity => {
    activityTitleMap.set(activity.id, activity.title);
  });
  
  completedSessions.forEach(session => {
    if (session.activityId && session.duration) {
      const currentTime = activityTimeMap.get(session.activityId) || 0;
      activityTimeMap.set(session.activityId, currentTime + session.duration);
    }
  });

  const totalTrackedTime = Array.from(activityTimeMap.values()).reduce((sum, time) => sum + time, 0);
  
  const activityBreakdown = Array.from(activityTimeMap.entries())
    .map(([activityId, totalTime]) => ({
      activityId,
      activityTitle: activityTitleMap.get(activityId) || 'Unknown Activity',
      totalTime,
      percentage: totalTrackedTime > 0 ? Math.round((totalTime / totalTrackedTime) * 100) : 0
    }))
    .sort((a, b) => b.totalTime - a.totalTime)
    .slice(0, 10); // Top 10 activities

  // Productivity trends
  const weeklyTodoCompletion = calculateWeeklyTodoTrends(todos, currentDate);
  const goalProgress = calculateGoalProgress(goals, currentDate);
  const progressTrend = calculateProgressTrend(progressEntries, currentDate);

  // Engagement patterns
  const dailyActiveHours = calculateDailyActiveHours(timeSessions);
  const weeklyPattern = calculateWeeklyPattern(timeSessions);
  const streaks = calculateStreaks(progressEntries, todos, currentDate);

  // Wellbeing patterns (mood and productivity from progress entries)
  const filteredProgressEntries = filterByDateRange(progressEntries, startDate, endDate);
  const wellbeing = calculateWellbeingMetrics(filteredProgressEntries, currentDate);

  return {
    overview: {
      totalGoals: goals.length,
      completedGoals,
      goalCompletionRate,
      totalTodos: todos.length,
      completedTodos,
      todoCompletionRate,
      overdueTodos,
      totalActivities: activities.length,
      totalNotes: notes.length,
      totalProgressEntries: progressEntries.length,
    },
    timeTracking: {
      totalTimeToday,
      totalTimeThisWeek,
      totalTimeThisMonth,
      averageSessionDuration,
      mostProductiveTimeOfDay,
      activityBreakdown,
    },
    productivity: {
      weeklyTodoCompletion,
      goalProgress,
      progressTrend,
    },
    engagement: {
      dailyActiveHours,
      weeklyPattern,
      streaks,
    },
    wellbeing
  };
}

function calculateWeeklyTodoTrends(todos: Todo[], currentDate: Date) {
  const trends = [];
  const now = new Date(currentDate);
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayTodos = todos.filter(todo => {
      const createdDate = new Date(todo.createdAt || '');
      return createdDate >= dayStart && createdDate <= dayEnd;
    });
    
    const completedOnDay = dayTodos.filter(todo => {
      // For now, assume todos are completed when they're marked as completed
      // In the future, we could add a completedAt field to track completion time
      return todo.isCompleted;
    });
    
    trends.push({
      date: date.toISOString().split('T')[0],
      completed: completedOnDay.length,
      created: dayTodos.length,
      completionRate: dayTodos.length > 0 ? Math.round((completedOnDay.length / dayTodos.length) * 100) : 0
    });
  }
  
  return trends;
}

function calculateGoalProgress(goals: Goal[], currentDate: Date) {
  return goals
    .filter(goal => !goal.isCompleted && goal.targetDate)
    .map(goal => {
      const targetDate = new Date(goal.targetDate!);
      const daysUntilTarget = Math.ceil((targetDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate progress based on time elapsed vs total time
      const startDate = new Date(goal.createdAt || currentDate);
      const totalDays = Math.ceil((targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const timeProgressPercentage = totalDays > 0 ? Math.min(Math.round((elapsedDays / totalDays) * 100), 100) : 0;
      
      return {
        goalId: goal.id,
        title: goal.title,
        progressPercentage: timeProgressPercentage,
        daysUntilTarget: Math.max(daysUntilTarget, 0)
      };
    })
    .sort((a, b) => a.daysUntilTarget - b.daysUntilTarget);
}

function calculateProgressTrend(progressEntries: ProgressEntry[], currentDate: Date) {
  const oneWeekAgo = new Date(currentDate);
  oneWeekAgo.setDate(currentDate.getDate() - 7);
  const twoWeeksAgo = new Date(currentDate);
  twoWeeksAgo.setDate(currentDate.getDate() - 14);
  
  const thisWeekEntries = progressEntries.filter(entry => {
    const entryDate = new Date(entry.entryDate);
    return entryDate >= oneWeekAgo;
  }).length;
  
  const lastWeekEntries = progressEntries.filter(entry => {
    const entryDate = new Date(entry.entryDate);
    return entryDate >= twoWeeksAgo && entryDate < oneWeekAgo;
  }).length;
  
  const changePercentage = lastWeekEntries > 0 
    ? Math.round(((thisWeekEntries - lastWeekEntries) / lastWeekEntries) * 100)
    : thisWeekEntries > 0 ? 100 : 0;
  
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (changePercentage > 10) trend = 'up';
  else if (changePercentage < -10) trend = 'down';
  
  return {
    thisWeek: thisWeekEntries,
    lastWeek: lastWeekEntries,
    changePercentage,
    trend
  };
}

function calculateDailyActiveHours(timeSessions: TimeSession[]) {
  const hourlyData = new Array(24).fill(0).map((_, hour) => ({
    hour,
    sessionsCount: 0,
    totalMinutes: 0
  }));
  
  timeSessions
    .filter(session => !session.isActive && session.duration)
    .forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourlyData[hour].sessionsCount++;
      hourlyData[hour].totalMinutes += Math.round((session.duration || 0) / 60);
    });
  
  return hourlyData;
}

function calculateWeeklyPattern(timeSessions: TimeSession[]) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weeklyData = dayNames.map(dayOfWeek => ({
    dayOfWeek,
    totalSessions: 0,
    totalTime: 0
  }));
  
  timeSessions
    .filter(session => !session.isActive && session.duration)
    .forEach(session => {
      const dayOfWeek = new Date(session.startTime).getDay();
      weeklyData[dayOfWeek].totalSessions++;
      weeklyData[dayOfWeek].totalTime += session.duration || 0;
    });
  
  return weeklyData;
}

function calculateStreaks(progressEntries: ProgressEntry[], todos: Todo[], currentDate: Date) {
  // Progress streak calculation
  const progressDates = progressEntries
    .map(entry => new Date(entry.entryDate).toDateString())
    .sort();
  
  let currentProgressStreak = 0;
  let longestProgressStreak = 0;
  let currentStreak = 0;
  
  // Check for current progress streak
  const today = currentDate.toDateString();
  let checkDate = new Date(currentDate);
  
  while (progressDates.includes(checkDate.toDateString())) {
    currentProgressStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  // Calculate longest progress streak
  for (let i = 1; i < progressDates.length; i++) {
    const prevDate = new Date(progressDates[i - 1]);
    const currDate = new Date(progressDates[i]);
    const dayDifference = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (dayDifference === 1) {
      currentStreak++;
    } else {
      longestProgressStreak = Math.max(longestProgressStreak, currentStreak + 1);
      currentStreak = 0;
    }
  }
  longestProgressStreak = Math.max(longestProgressStreak, currentStreak + 1);
  
  // Todo completion streak calculation (similar logic)
  // Note: Using createdAt as proxy since completedAt doesn't exist yet
  const completedTodos = todos.filter(todo => todo.isCompleted);
  const todoCompletionDates = completedTodos
    .map(todo => new Date(todo.createdAt || '').toDateString())
    .sort();
  
  let currentTodoStreak = 0;
  let longestTodoStreak = 0;
  
  // Similar calculation for todos...
  checkDate = new Date(currentDate);
  while (todoCompletionDates.includes(checkDate.toDateString())) {
    currentTodoStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  currentStreak = 0;
  for (let i = 1; i < todoCompletionDates.length; i++) {
    const prevDate = new Date(todoCompletionDates[i - 1]);
    const currDate = new Date(todoCompletionDates[i]);
    const dayDifference = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (dayDifference === 1) {
      currentStreak++;
    } else {
      longestTodoStreak = Math.max(longestTodoStreak, currentStreak + 1);
      currentStreak = 0;
    }
  }
  longestTodoStreak = Math.max(longestTodoStreak, currentStreak + 1);
  
  return {
    currentProgressStreak,
    longestProgressStreak,
    currentTodoStreak,
    longestTodoStreak
  };
}

// Helper function to calculate correlation between two arrays
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  const sumYY = y.reduce((sum, val) => sum + val * val, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

// Helper function to convert mood/productivity/health emojis to numeric scores
function getEmoticonScore(emoticon: string, type: 'mood' | 'productivity' | 'health'): number {
  if (type === 'mood') {
    const moodScores: Record<string, number> = {
      '😄': 5, // Very happy
      '🙂': 4, // Happy  
      '😐': 3, // Neutral
      '😕': 2, // Sad
      '😢': 1, // Very sad
    };
    return moodScores[emoticon] || 3; // Default to neutral
  } else if (type === 'productivity') {
    const productivityScores: Record<string, number> = {
      '🤩': 5, // Very satisfied
      '😊': 4, // Satisfied
      '😐': 3, // Neutral
      '😔': 2, // Not satisfied
      '😩': 1, // Very unsatisfied  
    };
    return productivityScores[emoticon] || 3; // Default to neutral
  } else {
    const healthScores: Record<string, number> = {
      '💪': 5, // Excellent
      '😊': 4, // Good
      '😐': 3, // Okay
      '😷': 2, // Unwell
      '🤒': 1, // Very unwell
    };
    return healthScores[emoticon] || 3; // Default to okay
  }
}

function calculateWellbeingMetrics(progressEntries: ProgressEntry[], currentDate: Date) {
  // Filter entries with wellbeing data
  const entriesWithMood = progressEntries.filter(entry => entry.mood);
  const entriesWithProductivity = progressEntries.filter(entry => entry.productivitySatisfaction);
  const entriesWithHealth = progressEntries.filter(entry => entry.healthFeeling);
  const entriesWithSleep = progressEntries.filter(entry => entry.sleepHours !== null);

  // Calculate mood distribution
  const moodCounts: Record<string, number> = {};
  entriesWithMood.forEach(entry => {
    if (entry.mood) {
      moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    }
  });

  const moodDistribution = Object.entries(moodCounts).map(([mood, count]) => ({
    mood,
    count,
    percentage: entriesWithMood.length > 0 ? Math.round((count / entriesWithMood.length) * 100) : 0
  }));

  // Calculate productivity distribution
  const productivityCounts: Record<string, number> = {};
  entriesWithProductivity.forEach(entry => {
    if (entry.productivitySatisfaction) {
      productivityCounts[entry.productivitySatisfaction] = (productivityCounts[entry.productivitySatisfaction] || 0) + 1;
    }
  });

  const productivitySatisfaction = Object.entries(productivityCounts).map(([satisfaction, count]) => ({
    satisfaction,
    count,
    percentage: entriesWithProductivity.length > 0 ? Math.round((count / entriesWithProductivity.length) * 100) : 0
  }));

  // Calculate health distribution
  const healthCounts: Record<string, number> = {};
  entriesWithHealth.forEach(entry => {
    if (entry.healthFeeling) {
      healthCounts[entry.healthFeeling] = (healthCounts[entry.healthFeeling] || 0) + 1;
    }
  });

  const healthDistribution = Object.entries(healthCounts).map(([health, count]) => ({
    health,
    count,
    percentage: entriesWithHealth.length > 0 ? Math.round((count / entriesWithHealth.length) * 100) : 0
  }));

  // Calculate sleep statistics
  const sleepHours = entriesWithSleep.map(entry => entry.sleepHours!).filter(hours => hours > 0);
  const averageSleepHours = sleepHours.length > 0 ? 
    Math.round((sleepHours.reduce((sum, hours) => sum + hours, 0) / sleepHours.length) * 10) / 10 : 0;

  // Calculate average scores
  const moodScores = entriesWithMood.map(entry => getEmoticonScore(entry.mood!, 'mood'));
  const productivityScores = entriesWithProductivity.map(entry => getEmoticonScore(entry.productivitySatisfaction!, 'productivity'));
  const healthScores = entriesWithHealth.map(entry => getEmoticonScore(entry.healthFeeling!, 'health'));

  const averageMoodScore = moodScores.length > 0 ? 
    Math.round((moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length) * 10) / 10 : 0;
  
  const averageProductivityScore = productivityScores.length > 0 ? 
    Math.round((productivityScores.reduce((sum, score) => sum + score, 0) / productivityScores.length) * 10) / 10 : 0;
  
  const averageHealthScore = healthScores.length > 0 ? 
    Math.round((healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length) * 10) / 10 : 0;

  // Calculate trends by comparing recent vs earlier entries
  const midpoint = Math.floor(progressEntries.length / 2);
  const recentEntries = progressEntries.slice(midpoint);
  const earlierEntries = progressEntries.slice(0, midpoint);

  const recentMoodScores = recentEntries.filter(e => e.mood).map(e => getEmoticonScore(e.mood!, 'mood'));
  const earlierMoodScores = earlierEntries.filter(e => e.mood).map(e => getEmoticonScore(e.mood!, 'mood'));
  
  const recentProductivityScores = recentEntries.filter(e => e.productivitySatisfaction).map(e => getEmoticonScore(e.productivitySatisfaction!, 'productivity'));
  const earlierProductivityScores = earlierEntries.filter(e => e.productivitySatisfaction).map(e => getEmoticonScore(e.productivitySatisfaction!, 'productivity'));
  
  const recentHealthScores = recentEntries.filter(e => e.healthFeeling).map(e => getEmoticonScore(e.healthFeeling!, 'health'));
  const earlierHealthScores = earlierEntries.filter(e => e.healthFeeling).map(e => getEmoticonScore(e.healthFeeling!, 'health'));
  
  const recentSleepHours = recentEntries.filter(e => e.sleepHours !== null).map(e => e.sleepHours!);
  const earlierSleepHours = earlierEntries.filter(e => e.sleepHours !== null).map(e => e.sleepHours!);

  const recentAvgMood = recentMoodScores.length > 0 ? recentMoodScores.reduce((s, n) => s + n, 0) / recentMoodScores.length : 0;
  const earlierAvgMood = earlierMoodScores.length > 0 ? earlierMoodScores.reduce((s, n) => s + n, 0) / earlierMoodScores.length : 0;
  
  const recentAvgProductivity = recentProductivityScores.length > 0 ? recentProductivityScores.reduce((s, n) => s + n, 0) / recentProductivityScores.length : 0;
  const earlierAvgProductivity = earlierProductivityScores.length > 0 ? earlierProductivityScores.reduce((s, n) => s + n, 0) / earlierProductivityScores.length : 0;

  const moodTrend: 'improving' | 'declining' | 'stable' = recentAvgMood > earlierAvgMood + 0.3 ? 'improving' : 
                   recentAvgMood < earlierAvgMood - 0.3 ? 'declining' : 'stable';
  
  const productivityTrend: 'improving' | 'declining' | 'stable' = recentAvgProductivity > earlierAvgProductivity + 0.3 ? 'improving' : 
                           recentAvgProductivity < earlierAvgProductivity - 0.3 ? 'declining' : 'stable';
  
  const recentAvgHealth = recentHealthScores.length > 0 ? recentHealthScores.reduce((s, n) => s + n, 0) / recentHealthScores.length : 0;
  const earlierAvgHealth = earlierHealthScores.length > 0 ? earlierHealthScores.reduce((s, n) => s + n, 0) / earlierHealthScores.length : 0;
  
  const healthTrend: 'improving' | 'declining' | 'stable' = recentAvgHealth > earlierAvgHealth + 0.3 ? 'improving' : 
                      recentAvgHealth < earlierAvgHealth - 0.3 ? 'declining' : 'stable';
  
  const recentAvgSleep = recentSleepHours.length > 0 ? recentSleepHours.reduce((s, n) => s + n, 0) / recentSleepHours.length : 0;
  const earlierAvgSleep = earlierSleepHours.length > 0 ? earlierSleepHours.reduce((s, n) => s + n, 0) / earlierSleepHours.length : 0;
  
  const sleepTrend: 'improving' | 'declining' | 'stable' = recentAvgSleep > earlierAvgSleep + 0.5 ? 'improving' : 
                     recentAvgSleep < earlierAvgSleep - 0.5 ? 'declining' : 'stable';

  // Create daily pattern for visualization
  const dailyWellbeingPattern = progressEntries
    .filter(entry => entry.mood || entry.productivitySatisfaction || entry.healthFeeling || entry.sleepHours)
    .map(entry => ({
      date: new Date(entry.entryDate).toISOString().split('T')[0],
      mood: entry.mood || '',
      productivity: entry.productivitySatisfaction || '',
      health: entry.healthFeeling || '',
      sleepHours: entry.sleepHours || 0,
      moodScore: entry.mood ? getEmoticonScore(entry.mood, 'mood') : 0,
      productivityScore: entry.productivitySatisfaction ? getEmoticonScore(entry.productivitySatisfaction, 'productivity') : 0,
      healthScore: entry.healthFeeling ? getEmoticonScore(entry.healthFeeling, 'health') : 0
    }))
    .slice(-14); // Last 14 days

  return {
    moodDistribution,
    averageMoodScore,
    moodTrend,
    productivitySatisfaction,
    averageProductivityScore, 
    productivityTrend,
    healthDistribution,
    averageHealthScore,
    healthTrend,
    averageSleepHours,
    sleepTrend,
    dailyWellbeingPattern
  };
}

export function generateProductivityInsights(data: InsightsData): ProductivityInsights {
  const { goals, activities, todos, progressEntries, timeSessions, currentDate } = data;
  
  const recommendations: Array<{
    type: 'goal' | 'todo' | 'time' | 'progress' | 'balance';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    actionable: boolean;
  }> = [];
  const achievements: Array<{
    title: string;
    description: string;
    earnedDate: string;
  }> = [];
  const patterns: Array<{
    pattern: string;
    description: string;
    significance: 'positive' | 'negative' | 'neutral';
  }> = [];
  
  // Analyze completion rates
  const completedGoals = goals.filter(g => g.isCompleted).length;
  const goalCompletionRate = goals.length > 0 ? (completedGoals / goals.length) * 100 : 0;
  const completedTodos = todos.filter(t => t.isCompleted).length;
  const todoCompletionRate = todos.length > 0 ? (completedTodos / todos.length) * 100 : 0;
  
  // Generate recommendations based on patterns
  if (goalCompletionRate < 30) {
    recommendations.push({
      type: 'goal',
      title: 'Focus on Smaller Goals',
      description: 'Your goal completion rate is low. Try breaking larger goals into smaller, more achievable milestones.',
      priority: 'high',
      actionable: true
    });
  }
  
  if (todoCompletionRate > 80) {
    achievements.push({
      title: 'Task Master',
      description: `Excellent work! You've completed ${todoCompletionRate.toFixed(1)}% of your tasks.`,
      earnedDate: currentDate.toISOString()
    });
  }
  
  // Analyze time tracking patterns
  const recentSessions = timeSessions.filter(session => {
    const sessionDate = new Date(session.startTime);
    const oneWeekAgo = new Date(currentDate);
    oneWeekAgo.setDate(currentDate.getDate() - 7);
    return sessionDate >= oneWeekAgo && !session.isActive;
  });
  
  if (recentSessions.length === 0) {
    recommendations.push({
      type: 'time',
      title: 'Start Time Tracking',
      description: 'Begin tracking your time to understand how you spend your day and identify areas for improvement.',
      priority: 'medium',
      actionable: true
    });
  }
  
  // Analyze overdue tasks
  const overdueTodos = todos.filter(t => 
    !t.isCompleted && t.dueDate && new Date(t.dueDate) < currentDate
  );
  
  if (overdueTodos.length > 5) {
    recommendations.push({
      type: 'todo',
      title: 'Address Overdue Tasks',
      description: `You have ${overdueTodos.length} overdue tasks. Consider rescheduling or breaking them into smaller pieces.`,
      priority: 'high',
      actionable: true
    });
  }
  
  // Analyze progress consistency
  const progressThisWeek = progressEntries.filter(entry => {
    const entryDate = new Date(entry.entryDate);
    const oneWeekAgo = new Date(currentDate);
    oneWeekAgo.setDate(currentDate.getDate() - 7);
    return entryDate >= oneWeekAgo;
  }).length;
  
  if (progressThisWeek >= 5) {
    achievements.push({
      title: 'Consistent Progress',
      description: 'Great job logging your progress regularly this week!',
      earnedDate: currentDate.toISOString()
    });
  } else if (progressThisWeek < 2) {
    recommendations.push({
      type: 'progress',
      title: 'Log Daily Progress',
      description: 'Regular progress logging helps maintain momentum and track your improvement over time.',
      priority: 'medium',
      actionable: true
    });
  }

  // Advanced Wellbeing Analysis with Health Correlations
  const entriesWithWellbeingData = progressEntries.filter(entry => 
    entry.mood || entry.productivitySatisfaction || entry.healthFeeling || entry.sleepHours
  );
  
  if (entriesWithWellbeingData.length >= 5) {
    // Comprehensive correlation analysis
    const correlationData = entriesWithWellbeingData.map(entry => ({
      mood: entry.mood ? getEmoticonScore(entry.mood, 'mood') : 0,
      productivity: entry.productivitySatisfaction ? getEmoticonScore(entry.productivitySatisfaction, 'productivity') : 0,
      health: entry.healthFeeling ? getEmoticonScore(entry.healthFeeling, 'health') : 0,
      sleep: entry.sleepHours || 0
    })).filter(d => d.mood > 0 && d.productivity > 0 && d.health > 0 && d.sleep > 0);
    
    if (correlationData.length >= 3) {
      // Mood-Productivity correlation
      const moodProductivityCorr = calculateCorrelation(
        correlationData.map(d => d.mood),
        correlationData.map(d => d.productivity)
      );
      
      // Health-Productivity correlation
      const healthProductivityCorr = calculateCorrelation(
        correlationData.map(d => d.health),
        correlationData.map(d => d.productivity)
      );
      
      // Sleep-Mood correlation
      const sleepMoodCorr = calculateCorrelation(
        correlationData.map(d => d.sleep),
        correlationData.map(d => d.mood)
      );
      
      // Sleep-Health correlation
      const sleepHealthCorr = calculateCorrelation(
        correlationData.map(d => d.sleep),
        correlationData.map(d => d.health)
      );
      
      // Generate insights based on correlations
      if (moodProductivityCorr > 0.6) {
        patterns.push({
          pattern: 'Strong Mood-Productivity Link',
          description: 'Your mood and productivity are highly correlated. Focus on mood-boosting activities to increase productivity.',
          significance: 'positive'
        });
      }
      
      if (healthProductivityCorr > 0.5) {
        patterns.push({
          pattern: 'Health Drives Productivity',
          description: 'Your physical health strongly impacts productivity. Prioritize wellness activities.',
          significance: 'positive'
        });
      }
      
      if (sleepMoodCorr > 0.4) {
        patterns.push({
          pattern: 'Sleep Affects Mood',
          description: 'Better sleep correlates with improved mood. Aim for consistent sleep schedules.',
          significance: 'positive'
        });
      }
      
      if (sleepHealthCorr > 0.4) {
        patterns.push({
          pattern: 'Sleep-Health Connection',
          description: 'Quality sleep is linked to how healthy you feel. Prioritize sleep hygiene.',
          significance: 'positive'
        });
      }
      
      // Identify poor sleep patterns
      const avgSleep = correlationData.reduce((sum, d) => sum + d.sleep, 0) / correlationData.length;
      if (avgSleep < 7) {
        recommendations.push({
          type: 'balance',
          title: 'Improve Sleep Duration',
          description: `Your average sleep is ${avgSleep.toFixed(1)} hours. Aim for 7-9 hours for optimal wellbeing.`,
          priority: 'high',
          actionable: true
        });
      }
      
      // Check for health decline patterns
      const recentHealth = correlationData.slice(-3).map(d => d.health);
      const earlyHealth = correlationData.slice(0, 3).map(d => d.health);
      const recentAvgHealth = recentHealth.reduce((sum, h) => sum + h, 0) / recentHealth.length;
      const earlyAvgHealth = earlyHealth.reduce((sum, h) => sum + h, 0) / earlyHealth.length;
      
      if (recentAvgHealth < earlyAvgHealth - 0.5) {
        recommendations.push({
          type: 'balance',
          title: 'Health Attention Needed',
          description: 'Your health scores have been declining. Consider adjusting your routine or consulting healthcare.',
          priority: 'high',
          actionable: true
        });
      }
    }
  }
  
  // Activity Balance Analysis
  const activitySessions = timeSessions.filter(s => !s.isActive && s.activityId);
  const activityTimeMap = new Map<string, number>();
  
  activitySessions.forEach(session => {
    const activity = activities.find(a => a.id === session.activityId);
    if (activity) {
      const currentTime = activityTimeMap.get(activity.title) || 0;
      activityTimeMap.set(activity.title, currentTime + (session.duration || 0));
    }
  });
  
  const totalTrackedTime = Array.from(activityTimeMap.values()).reduce((sum, time) => sum + time, 0);
  
  if (totalTrackedTime > 0) {
    // Check for work-life balance
    const workKeywords = ['work', 'job', 'office', 'meeting', 'project', 'coding', 'development'];
    const lifeKeywords = ['family', 'friends', 'hobby', 'exercise', 'relax', 'entertainment', 'personal'];
    
    let workTime = 0;
    let lifeTime = 0;
    
    activityTimeMap.forEach((time, activityName) => {
      const lowerName = activityName.toLowerCase();
      if (workKeywords.some(keyword => lowerName.includes(keyword))) {
        workTime += time;
      } else if (lifeKeywords.some(keyword => lowerName.includes(keyword))) {
        lifeTime += time;
      }
    });
    
    const workPercentage = (workTime / totalTrackedTime) * 100;
    const lifePercentage = (lifeTime / totalTrackedTime) * 100;
    
    if (workPercentage > 70) {
      recommendations.push({
        type: 'balance',
        title: 'Work-Life Balance',
        description: `${workPercentage.toFixed(0)}% of your time is work-focused. Consider scheduling more personal activities.`,
        priority: 'medium',
        actionable: true
      });
    }
    
    if (lifePercentage < 20 && workPercentage > 50) {
      recommendations.push({
        type: 'balance',
        title: 'Schedule Personal Time',
        description: 'You might be overworking. Block time for hobbies, relationships, and self-care.',
        priority: 'high',
        actionable: true
      });
    }
  }
  
  // Predictive Goal Completion Analysis
  const activeGoals = goals.filter(g => !g.isCompleted);
  activeGoals.forEach(goal => {
    if (goal.targetDate) {
      const daysUntilDue = Math.ceil((new Date(goal.targetDate).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check if goal has related todos
      const relatedTodos = todos.filter(t => 
        t.title.toLowerCase().includes(goal.title.toLowerCase().split(' ')[0]) ||
        (goal.description && t.description?.toLowerCase().includes(goal.description.toLowerCase().split(' ')[0]))
      );
      
      const completedRelatedTodos = relatedTodos.filter(t => t.isCompleted).length;
      const todoCompletionRate = relatedTodos.length > 0 ? (completedRelatedTodos / relatedTodos.length) * 100 : 0;
      
      if (daysUntilDue <= 7 && todoCompletionRate < 50) {
        recommendations.push({
          type: 'goal',
          title: `Goal At Risk: ${goal.title}`,
          description: `This goal is due soon with ${todoCompletionRate.toFixed(0)}% related tasks completed. Focus efforts here.`,
          priority: 'high',
          actionable: true
        });
      } else if (daysUntilDue <= 30 && todoCompletionRate > 80) {
        patterns.push({
          pattern: 'Goal On Track',
          description: `${goal.title} is progressing well with most related tasks completed.`,
          significance: 'positive'
        });
      }
    }
  });
  
  // Activity Engagement Patterns
  const activityEngagement = activities.map(activity => {
    const sessions = timeSessions.filter(s => s.activityId === activity.id && !s.isActive);
    const totalTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const sessionCount = sessions.length;
    
    return {
      activity: activity.title,
      totalTime,
      sessionCount,
      avgSessionTime: sessionCount > 0 ? totalTime / sessionCount : 0
    };
  }).filter(a => a.sessionCount > 0);
  
  // Find most and least engaged activities
  if (activityEngagement.length > 0) {
    const sortedByTime = [...activityEngagement].sort((a, b) => b.totalTime - a.totalTime);
    const mostEngaged = sortedByTime[0];
    const leastEngaged = sortedByTime[sortedByTime.length - 1];
    
    if (mostEngaged.totalTime > leastEngaged.totalTime * 3) {
      patterns.push({
        pattern: 'Activity Preference',
        description: `You spend 3x more time on "${mostEngaged.activity}" than "${leastEngaged.activity}".`,
        significance: 'neutral'
      });
    }
  }
  
  // Generate mood and productivity predictions
  const recentMoodScores = progressEntries.slice(-7)
    .filter(entry => entry.mood)
    .map(entry => getEmoticonScore(entry.mood!, 'mood'));
  
  if (recentMoodScores.length >= 3) {
    const moodTrend = recentMoodScores[recentMoodScores.length - 1] - recentMoodScores[0];
    
    if (moodTrend > 1) {
      achievements.push({
        title: 'Mood Improvement',
        description: 'Your mood has been consistently improving this week!',
        earnedDate: currentDate.toISOString()
      });
    } else if (moodTrend < -1) {
      recommendations.push({
        type: 'balance',
        title: 'Mood Support',
        description: 'Your mood has been declining. Consider stress-reduction activities or talking to someone.',
        priority: 'high',
        actionable: true
      });
    }
  }
  
  // Cross-domain insights combining multiple data sources
  const activeGoalsCount = goals.filter(g => !g.isCompleted).length;
  const pendingTodosCount = todos.filter(t => !t.isCompleted).length;
  const recentProgressCount = progressEntries.filter(entry => {
    const entryDate = new Date(entry.entryDate);
    const threeDaysAgo = new Date(currentDate);
    threeDaysAgo.setDate(currentDate.getDate() - 3);
    return entryDate >= threeDaysAgo;
  }).length;
  
  // Comprehensive productivity recommendation
  if (activeGoalsCount > 0 && pendingTodosCount > 10 && recentProgressCount < 2) {
    recommendations.push({
      type: 'balance',
      title: 'Overwhelm Prevention',
      description: `You have ${activeGoalsCount} active goals and ${pendingTodosCount} pending tasks. Consider focusing on fewer priorities and logging daily progress.`,
      priority: 'high',
      actionable: true
    });
  }
  
  // Activity-goal alignment analysis
  if (activities.length > 0 && activeGoalsCount > 0) {
    const goalKeywords = goals.map(g => g.title.toLowerCase().split(' ')).flat();
    const activityNames = activities.map(a => a.title.toLowerCase());
    
    const alignedActivities = activityNames.filter(activityName => 
      goalKeywords.some(keyword => activityName.includes(keyword))
    );
    
    if (alignedActivities.length < Math.min(activities.length * 0.5, activeGoalsCount * 0.5)) {
      recommendations.push({
        type: 'goal',
        title: 'Align Activities with Goals',
        description: 'Consider adding activities that directly support your current goals for better progress tracking.',
        priority: 'medium',
        actionable: true
      });
    }
  }
  
  // Analyze mood and productivity patterns
  const entriesWithBothMetrics = progressEntries.filter(entry => entry.mood && entry.productivitySatisfaction);
  
  if (entriesWithBothMetrics.length >= 5) {
    // Calculate correlation between mood and productivity  
    const moodScores = entriesWithBothMetrics.map(entry => getEmoticonScore(entry.mood!, 'mood'));
    const productivityScores = entriesWithBothMetrics.map(entry => getEmoticonScore(entry.productivitySatisfaction!, 'productivity'));
    
    const correlation = calculateCorrelation(moodScores, productivityScores);
    
    if (correlation > 0.6) {
      patterns.push({
        pattern: 'Strong Mood-Productivity Link',
        description: 'Your mood and productivity are highly correlated. Better mood days tend to be more productive.',
        significance: 'positive'
      });
    } else if (correlation < -0.3) {
      patterns.push({
        pattern: 'Inverse Mood-Productivity Pattern',
        description: 'Interesting pattern: you seem to be more productive on lower mood days. This might indicate pushing through challenges.',
        significance: 'neutral'
      });
    }

    // Analyze mood trends
    const recentMoodEntries = progressEntries.filter(entry => {
      const entryDate = new Date(entry.entryDate);
      const twoWeeksAgo = new Date(currentDate);
      twoWeeksAgo.setDate(currentDate.getDate() - 14);
      return entryDate >= twoWeeksAgo && entry.mood;
    });

    if (recentMoodEntries.length >= 7) {
      const recentMoodScores = recentMoodEntries.map(entry => getEmoticonScore(entry.mood!, 'mood'));
      const averageMood = recentMoodScores.reduce((sum, score) => sum + score, 0) / recentMoodScores.length;
      
      if (averageMood >= 4.0) {
        achievements.push({
          title: 'Positive Wellbeing',
          description: 'Your mood has been consistently positive lately. Keep up the great work!',
          earnedDate: currentDate.toISOString()
        });
      } else if (averageMood <= 2.5) {
        recommendations.push({
          type: 'balance',
          title: 'Focus on Wellbeing',
          description: 'Your mood has been lower recently. Consider activities that boost your wellbeing like exercise, rest, or connecting with others.',
          priority: 'high',
          actionable: true
        });
      }
    }

    // Analyze productivity satisfaction patterns
    const recentProductivityEntries = progressEntries.filter(entry => {
      const entryDate = new Date(entry.entryDate);
      const twoWeeksAgo = new Date(currentDate);
      twoWeeksAgo.setDate(currentDate.getDate() - 14);
      return entryDate >= twoWeeksAgo && entry.productivitySatisfaction;
    });

    if (recentProductivityEntries.length >= 7) {
      const recentProductivityScores = recentProductivityEntries.map(entry => getEmoticonScore(entry.productivitySatisfaction!, 'productivity'));
      const averageProductivity = recentProductivityScores.reduce((sum, score) => sum + score, 0) / recentProductivityScores.length;
      
      if (averageProductivity <= 2.5) {
        recommendations.push({
          type: 'progress',
          title: 'Improve Productivity Satisfaction',
          description: 'Your productivity satisfaction has been low. Try setting smaller, achievable goals or adjusting your daily routine.',
          priority: 'medium',
          actionable: true
        });
      }
    }

    // Weekly patterns
    const dayOfWeekPatterns = new Map<string, { moodSum: number, productivitySum: number, count: number }>();
    entriesWithBothMetrics.forEach(entry => {
      const dayOfWeek = new Date(entry.entryDate).toLocaleDateString('en-US', { weekday: 'long' });
      const current = dayOfWeekPatterns.get(dayOfWeek) || { moodSum: 0, productivitySum: 0, count: 0 };
      current.moodSum += getEmoticonScore(entry.mood!, 'mood');
      current.productivitySum += getEmoticonScore(entry.productivitySatisfaction!, 'productivity');
      current.count += 1;
      dayOfWeekPatterns.set(dayOfWeek, current);
    });

    // Find best and worst days
    let bestDay = '';
    let worstDay = '';
    let bestScore = 0;
    let worstScore = 10;
    
    dayOfWeekPatterns.forEach((data, day) => {
      if (data.count >= 2) { // Need at least 2 entries
        const avgScore = (data.moodSum + data.productivitySum) / (data.count * 2);
        if (avgScore > bestScore) {
          bestScore = avgScore;
          bestDay = day;
        }
        if (avgScore < worstScore) {
          worstScore = avgScore;
          worstDay = day;
        }
      }
    });

    if (bestDay && worstDay && bestDay !== worstDay) {
      patterns.push({
        pattern: `Weekly Wellbeing Pattern`,
        description: `${bestDay}s tend to be your best days for mood and productivity, while ${worstDay}s are more challenging.`,
        significance: 'neutral'
      });
    }
  }
  
  // Identify patterns
  if (recentSessions.length > 0) {
    const avgSessionLength = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / recentSessions.length;
    
    if (avgSessionLength < 900) { // Less than 15 minutes
      patterns.push({
        pattern: 'Short Focus Sessions',
        description: 'Your average work session is quite short. This might indicate frequent interruptions.',
        significance: 'negative'
      });
    } else if (avgSessionLength > 7200) { // More than 2 hours
      patterns.push({
        pattern: 'Extended Focus Sessions',
        description: 'You have excellent focus with long work sessions. Consider taking breaks to maintain productivity.',
        significance: 'positive'
      });
    }
  }
  
  // Work-life balance insights
  const workActivities = activities.filter(a => 
    a.title.toLowerCase().includes('work') || 
    a.title.toLowerCase().includes('project') ||
    a.title.toLowerCase().includes('meeting')
  );
  
  const personalActivities = activities.filter(a => 
    a.title.toLowerCase().includes('personal') || 
    a.title.toLowerCase().includes('hobby') ||
    a.title.toLowerCase().includes('exercise')
  );
  
  if (workActivities.length > personalActivities.length * 3) {
    recommendations.push({
      type: 'balance',
      title: 'Consider Work-Life Balance',
      description: 'You have significantly more work-related activities. Consider adding personal and wellness activities.',
      priority: 'medium',
      actionable: true
    });
  }
  
  return {
    recommendations: recommendations.slice(0, 5), // Limit to top 5
    achievements: achievements.slice(0, 3), // Limit to recent 3
    patterns: patterns.slice(0, 5) // Limit to top 5
  };
}