import React, { useState, useEffect } from "react";
import { User, UserProgress, TenantUser } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  TrendingUp,
  Award,
  Clock,
  RefreshCw,
  AlertTriangle,
  Loader2
} from "lucide-react";

import ProgressChart from "../components/progress/ProgressChart";
import AchievementsBadges from "../components/progress/AchievementsBadges";
import SkillRadar from "../components/progress/SkillRadar";
import PointsWidget from "../components/progress/PointsWidget";
import Leaderboard from "../components/progress/Leaderboard";

export default function ProgressPage() {
  const [userProgress, setUserProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProgressData = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await User.me();
      if (!user) {
        setError("User context not found. Please log in again.");
        setLoading(false);
        return;
      }

      // Try to get tenant but don't require it
      let tenantId = null;

      try {
        const tenantContextString = localStorage.getItem('tenant_context');
        if (tenantContextString) {
          const tenantContext = JSON.parse(tenantContextString);
          tenantId = tenantContext.tenant_id;
        }

        if (!tenantId && TenantUser && typeof TenantUser.filter === 'function') {
          const tenantUsers = await TenantUser.filter({ user_id: user.id, status: 'active' });
          if (tenantUsers && tenantUsers.length > 0) {
            tenantId = tenantUsers[0].tenant_id;
          }
        }
      } catch (error) {
        console.log('[PROGRESS] Could not find tenant, continuing without it:', error);
      }

      console.log(`[PROGRESS] Fetching progress for user: ${user.id}, tenant: ${tenantId || 'none'}`);

      if (!UserProgress || typeof UserProgress.filter !== 'function') {
        console.error('[PROGRESS] UserProgress entity not available');
        throw new Error("User progress system not available");
      }

      // Fetch any progress record for this user
      const progressRecords = await UserProgress.filter({ user_id: user.id });

      if (progressRecords && progressRecords.length > 0) {
        console.log('[PROGRESS] ✅ Found user progress record');
        setUserProgress(progressRecords[0]);
      } else {
        console.log('[PROGRESS] ✅ No progress record found - creating new one');
        // Create new progress record with tenant_id=null if unassigned
        const newProgressRecord = await UserProgress.create({
          user_id: user.id,
          user_full_name: user.full_name,
          tenant_id: tenantId,
          is_super_admin_activity: false,
          total_scenarios_completed: 0,
          total_scenarios_attempted: 0,
          average_score: 0,
          total_time_spent: 0,
          points: 0,
          level: 1,
          points_to_next_level: 100,
          skill_levels: {
            malware_detection: 10,
            network_analysis: 10,
            incident_response: 10,
            threat_hunting: 10,
          },
          achievements: [],
          current_streak: 0,
          longest_streak: 0,
          quiz_attempts: 0,
          quiz_completions: 0,
          total_quiz_points: 0
        });
        setUserProgress(newProgressRecord);
        console.log('[PROGRESS] ✅ New progress record created');
      }
    } catch (err) {
      console.error("Error fetching progress data:", err);
      setError(err.message || "Failed to load progress data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgressData();
  }, []);

  const {
    total_scenarios_completed = 0,
    total_scenarios_attempted = 0,
    average_score = 0,
    current_streak = 0,
    longest_streak = 0,
    total_time_spent = 0,
    achievements = [],
    skill_levels = {},
    weekly_activity = []
  } = userProgress || {};

  const completionRate = total_scenarios_attempted
    ? (total_scenarios_completed / total_scenarios_attempted * 100).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-12 h-12 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-900 text-white p-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Progress</h2>
        <p className="text-slate-400 text-center">{error}</p>
        <Button onClick={fetchProgressData} variant="outline" className="mt-4 border-red-400 text-red-300 hover:bg-red-900">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Progress Dashboard</h1>
            <p className="text-slate-400 mt-1">Track your SOC training progress and achievements</p>
          </div>
        </div>

        {/* Points Widget */}
        <div className="mb-8">
            <PointsWidget userProgress={userProgress} />
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Scenarios Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {total_scenarios_completed}
              </div>
              <p className="text-xs text-slate-400">
                {total_scenarios_attempted} attempted
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-teal-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {average_score}%
              </div>
              <p className="text-xs text-slate-400">
                {completionRate}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Current Streak</CardTitle>
              <Award className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {current_streak}
              </div>
              <p className="text-xs text-slate-400">
                Best: {longest_streak} days
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Time Spent</CardTitle>
              <Clock className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {Math.round(total_time_spent / 60)}h
              </div>
              <p className="text-xs text-slate-400">
                {total_time_spent} minutes total
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ProgressChart weeklyActivity={weekly_activity} />
          </div>

          <div className="space-y-6">
            <Leaderboard />
            <AchievementsBadges achievements={achievements} />
            <SkillRadar skillLevels={skill_levels} />
          </div>
        </div>
      </div>
    </div>
  );
}