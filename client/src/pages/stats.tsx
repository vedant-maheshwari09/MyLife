import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  CheckCircle, 
  Clock, 
  Calendar, 
  X, 
  Brain,
  Star,
  Award,
  Zap,
  Activity,
  AlertTriangle,
  Lightbulb,
  Timer,
  Plus,
  Minus,
  LineChart,
  BarChart,
  Heart,
  Moon
} from "lucide-react";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from "recharts";
import { useState } from "react";

interface StatsData {
  overview: {
    totalProgressEntries: number;
  };
  timeTracking: {
    totalTimeToday: number;
    totalTimeThisWeek: number;
    totalTimeThisMonth: number;
    averageSessionDuration: number;
    mostProductiveTimeOfDay: string;
    activityBreakdown: Array<{
      activity: string;
      time: number;
    }>;
  };
  productivity: {
    weeklyTodoCompletion: Array<{
      date: string;
      completed: number;
      created: number;
      completionRate: number;
    }>;
    goalProgress: any[];
    progressTrend: {
      thisWeek: number;
      lastWeek: number;
      changePercentage: number;
      trend: string;
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
  insights?: {
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
  };
}

export default function StatsPage() {
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  const { data: stats, isLoading, isError } = useQuery<StatsData>({
    queryKey: ['/api/stats', period],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        includeInsights: 'true'
      });
      const response = await fetch(`/api/stats?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      return response.json();
    },
  });

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSignificanceIcon = (significance: 'positive' | 'negative' | 'neutral') => {
    switch (significance) {
      case 'positive': return <Plus className="w-3 h-3 text-green-600" />;
      case 'negative': return <Minus className="w-3 h-3 text-red-600" />;
      case 'neutral': return <AlertTriangle className="w-3 h-3 text-amber-600" />;
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="bg-card/80 backdrop-blur-sm border-b border-border p-4">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-foreground">Statistics</h1>
              <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Unable to Load Statistics</h3>
            <p className="text-muted-foreground">Please try again later</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">Analytics Dashboard</h1>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation('/')}
              data-testid="button-close-stats"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Progress-focused analytics with comprehensive insights
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto p-4">
          {isLoading ? (
            <div className="space-y-4">
              {/* Loading skeletons */}
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-8 w-12 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i}>
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : stats ? (
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="space-y-4">
              {/* Period selector */}
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="week" data-testid="tab-week">Week</TabsTrigger>
                <TabsTrigger value="month" data-testid="tab-month">Month</TabsTrigger>
              </TabsList>

              <TabsContent value={period} className="space-y-4">
                {/* Progress Overview */}
                <div className="grid grid-cols-1 gap-3">
                  <Card data-testid="card-progress-overview">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Brain className="w-4 h-4 text-primary" />
                        Progress Entries
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.overview.totalProgressEntries}</div>
                      <p className="text-xs text-muted-foreground">
                        total reflections logged
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress Streaks */}
                {stats.engagement && (
                  <Card data-testid="card-progress-streaks">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Progress Streaks
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{stats.engagement.streaks?.currentProgressStreak || 0}</div>
                          <p className="text-xs text-muted-foreground">Current streak</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-amber-500">{stats.engagement.streaks?.longestProgressStreak || 0}</div>
                          <p className="text-xs text-muted-foreground">Longest streak</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}



                {/* Wellbeing Metrics */}
                {stats.wellbeing && (
                  <>
                    {/* Wellbeing Trends Chart */}
                    {stats.wellbeing.dailyWellbeingPattern && stats.wellbeing.dailyWellbeingPattern.length > 0 && (
                      <Card data-testid="card-wellbeing-trends">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <LineChart className="w-5 h-5 text-primary" />
                            Wellbeing Trends
                          </CardTitle>
                          <CardDescription>
                            Mood, productivity, health & sleep patterns over time
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsLineChart data={stats.wellbeing.dailyWellbeingPattern}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis 
                                  dataKey="date" 
                                  className="text-xs fill-muted-foreground"
                                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                />
                                <YAxis 
                                  domain={[1, 5]}
                                  className="text-xs fill-muted-foreground"
                                />
                                <Tooltip 
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                                          <p className="text-sm font-medium">{new Date(label).toLocaleDateString()}</p>
                                          {payload.map((entry, index) => (
                                            <p key={index} className="text-sm" style={{ color: entry.color }}>
                                              {entry.name}: {entry.value}/5
                                            </p>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="moodScore" 
                                  stroke="#8b5cf6" 
                                  strokeWidth={2}
                                  name="Mood"
                                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="productivityScore" 
                                  stroke="#06b6d4" 
                                  strokeWidth={2}
                                  name="Productivity"
                                  dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="healthScore" 
                                  stroke="#10b981" 
                                  strokeWidth={2}
                                  name="Health"
                                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                                />
                              </RechartsLineChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Mood Distribution Chart */}
                    {stats.wellbeing.moodDistribution.length > 0 && (
                      <Card data-testid="card-mood-tracking">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Brain className="w-5 h-5 text-primary" />
                            Mood Analysis
                          </CardTitle>
                          <CardDescription>
                            Your emotional wellbeing patterns
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">{stats.wellbeing.averageMoodScore}/5</div>
                              <p className="text-xs text-muted-foreground">Average mood</p>
                            </div>
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${
                                stats.wellbeing.moodTrend === 'improving' ? 'text-green-600' :
                                stats.wellbeing.moodTrend === 'declining' ? 'text-red-600' : 'text-amber-600'
                              }`}>
                                {stats.wellbeing.moodTrend === 'improving' ? '↗️' :
                                 stats.wellbeing.moodTrend === 'declining' ? '↘️' : '→'}
                              </div>
                              <p className="text-xs text-muted-foreground">Trend: {stats.wellbeing.moodTrend}</p>
                            </div>
                          </div>
                          
                          {/* Mood Distribution Bar Chart */}
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsBarChart data={stats.wellbeing.moodDistribution}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis 
                                  dataKey="mood" 
                                  className="text-xs fill-muted-foreground"
                                />
                                <YAxis className="text-xs fill-muted-foreground" />
                                <Tooltip 
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                                          <p className="text-sm font-medium">Mood: {label}</p>
                                          <p className="text-sm">Count: {payload[0]?.value}</p>
                                          <p className="text-sm">Percentage: {stats.wellbeing.moodDistribution.find(m => m.mood === label)?.percentage}%</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar 
                                  dataKey="count" 
                                  fill="url(#moodGradient)"
                                  radius={[4, 4, 0, 0]}
                                />
                                <defs>
                                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0.8}/>
                                  </linearGradient>
                                </defs>
                              </RechartsBarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Productivity Satisfaction Chart */}
                    {stats.wellbeing.productivitySatisfaction.length > 0 && (
                      <Card data-testid="card-productivity-satisfaction">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            Productivity Analysis
                          </CardTitle>
                          <CardDescription>
                            How satisfied you feel with your productivity
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">{stats.wellbeing.averageProductivityScore}/5</div>
                              <p className="text-xs text-muted-foreground">Average satisfaction</p>
                            </div>
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${
                                stats.wellbeing.productivityTrend === 'improving' ? 'text-green-600' :
                                stats.wellbeing.productivityTrend === 'declining' ? 'text-red-600' : 'text-amber-600'
                              }`}>
                                {stats.wellbeing.productivityTrend === 'improving' ? '↗️' :
                                 stats.wellbeing.productivityTrend === 'declining' ? '↘️' : '→'}
                              </div>
                              <p className="text-xs text-muted-foreground">Trend: {stats.wellbeing.productivityTrend}</p>
                            </div>
                          </div>
                          
                          {/* Productivity Distribution Bar Chart */}
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsBarChart data={stats.wellbeing.productivitySatisfaction}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis 
                                  dataKey="satisfaction" 
                                  className="text-xs fill-muted-foreground"
                                />
                                <YAxis className="text-xs fill-muted-foreground" />
                                <Tooltip 
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                                          <p className="text-sm font-medium">Satisfaction: {label}</p>
                                          <p className="text-sm">Count: {payload[0]?.value}</p>
                                          <p className="text-sm">Percentage: {stats.wellbeing.productivitySatisfaction.find(p => p.satisfaction === label)?.percentage}%</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar 
                                  dataKey="count" 
                                  fill="url(#productivityGradient)"
                                  radius={[4, 4, 0, 0]}
                                />
                                <defs>
                                  <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.8}/>
                                  </linearGradient>
                                </defs>
                              </RechartsBarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Health Distribution Chart */}
                    {stats.wellbeing.healthDistribution && stats.wellbeing.healthDistribution.length > 0 && (
                      <Card data-testid="card-health-tracking">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Heart className="w-5 h-5 text-primary" />
                            Health Analysis
                          </CardTitle>
                          <CardDescription>
                            How you're feeling physically each day
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">{stats.wellbeing.averageHealthScore}/5</div>
                              <p className="text-xs text-muted-foreground">Average health</p>
                            </div>
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${
                                stats.wellbeing.healthTrend === 'improving' ? 'text-green-600' :
                                stats.wellbeing.healthTrend === 'declining' ? 'text-red-600' : 'text-amber-600'
                              }`}>
                                {stats.wellbeing.healthTrend === 'improving' ? '↗️' :
                                 stats.wellbeing.healthTrend === 'declining' ? '↘️' : '→'}
                              </div>
                              <p className="text-xs text-muted-foreground">Trend: {stats.wellbeing.healthTrend}</p>
                            </div>
                          </div>
                          
                          {/* Health Distribution Bar Chart */}
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsBarChart data={stats.wellbeing.healthDistribution}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis 
                                  dataKey="health" 
                                  className="text-xs fill-muted-foreground"
                                />
                                <YAxis className="text-xs fill-muted-foreground" />
                                <Tooltip 
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                                          <p className="text-sm font-medium">Health: {label}</p>
                                          <p className="text-sm">Count: {payload[0]?.value}</p>
                                          <p className="text-sm">Percentage: {stats.wellbeing.healthDistribution.find(h => h.health === label)?.percentage}%</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar 
                                  dataKey="count" 
                                  fill="url(#healthGradient)"
                                  radius={[4, 4, 0, 0]}
                                />
                                <defs>
                                  <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#059669" stopOpacity={0.8}/>
                                  </linearGradient>
                                </defs>
                              </RechartsBarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Sleep Analysis Chart */}
                    {stats.wellbeing.averageSleepHours && stats.wellbeing.averageSleepHours > 0 && (
                      <Card data-testid="card-sleep-tracking">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Moon className="w-5 h-5 text-primary" />
                            Sleep Analysis
                          </CardTitle>
                          <CardDescription>
                            Your sleep patterns and trends
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">{stats.wellbeing.averageSleepHours}h</div>
                              <p className="text-xs text-muted-foreground">Average sleep</p>
                            </div>
                            <div className="text-center">
                              <div className={`text-2xl font-bold ${
                                stats.wellbeing.sleepTrend === 'improving' ? 'text-green-600' :
                                stats.wellbeing.sleepTrend === 'declining' ? 'text-red-600' : 'text-amber-600'
                              }`}>
                                {stats.wellbeing.sleepTrend === 'improving' ? '↗️' :
                                 stats.wellbeing.sleepTrend === 'declining' ? '↘️' : '→'}
                              </div>
                              <p className="text-xs text-muted-foreground">Trend: {stats.wellbeing.sleepTrend}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                {/* AI Insights */}
                {stats.insights && (
                  <Card data-testid="card-ai-insights">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="w-5 h-5 text-primary" />
                        AI Insights
                      </CardTitle>
                      <CardDescription>
                        AI-powered insights based on all your data - goals, todos, activities, and progress
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Recommendations */}
                      {stats.insights.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            Recommendations
                          </h4>
                          <div className="space-y-2">
                            {stats.insights.recommendations.slice(0, 3).map((rec, index) => (
                              <div key={index} className="p-3 bg-muted/50 rounded-lg" data-testid={`recommendation-${index}`}>
                                <div className="flex items-start gap-2 mb-1">
                                  <Badge variant="outline" className={getPriorityColor(rec.priority)}>
                                    {rec.priority}
                                  </Badge>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{rec.title}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Achievements */}
                      {stats.insights.achievements.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                            <Award className="w-4 h-4 text-yellow-500" />
                            Recent Achievements
                          </h4>
                          <div className="space-y-2">
                            {stats.insights.achievements.slice(0, 2).map((achievement, index) => (
                              <div key={index} className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800" data-testid={`achievement-${index}`}>
                                <div className="flex items-start gap-2">
                                  <Star className="w-4 h-4 text-yellow-600 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium">{achievement.title}</p>
                                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Patterns */}
                      {stats.insights.patterns.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Patterns Detected</h4>
                          <div className="space-y-2">
                            {stats.insights.patterns.slice(0, 2).map((pattern, index) => (
                              <div key={index} className="p-3 bg-muted/30 rounded-lg" data-testid={`pattern-${index}`}>
                                <div className="flex items-start gap-2">
                                  {getSignificanceIcon(pattern.significance)}
                                  <div>
                                    <p className="text-sm font-medium">{pattern.pattern}</p>
                                    <p className="text-xs text-muted-foreground">{pattern.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </div>
    </div>
  );
}