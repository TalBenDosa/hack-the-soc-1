import React, { useState, useEffect } from "react";
import { Investigation, Scenario, UserProgress, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Activity, 
  Target,
  TrendingUp,
  CheckCircle,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import LiveEventFeed from "../components/dashboard/LiveEventFeed";

export default function Dashboard() {
  const [investigations, setInvestigations] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await User.me();
      console.log('[DASHBOARD] Current user:', currentUser.email);

      // Load all public data
      const investigationsData = await Investigation.list("-created_date", 10);
      const scenariosData = await Scenario.list(null, 6);
      const progressData = await UserProgress.filter({ user_id: currentUser.id });
      
      setInvestigations(investigationsData);
      setScenarios(scenariosData);
      setUserProgress(progressData[0] || null);
      
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      const errorMessage = error?.message || error?.toString() || "A network error occurred. Please check your connection and try again.";
      setError(errorMessage);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">SOC Dashboard</h1>
            <p className="text-slate-400 mt-1">Real-time security operations center monitoring</p>
          </div>
          <div className="flex gap-3 self-start md:self-auto">
            <Link to={createPageUrl("Scenarios")}>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                <Target className="w-4 h-4 mr-2" />
                Start Training
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Card className="bg-red-900/50 border-red-500/50 text-red-300 p-4 mb-6 flex items-center gap-4">
            <AlertTriangle className="w-5 h-5"/>
            <div>
              <p className="font-bold">Failed to Load Data</p>
              <p>{error}</p>
              <Button onClick={loadDashboardData} variant="outline" className="mt-2 border-red-400 text-red-300 hover:bg-red-900">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Active Investigations</CardTitle>
              <Activity className="h-4 w-4 text-teal-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {investigations.filter(i => i.status === 'active').length}
              </div>
              <p className="text-xs text-slate-400">
                {investigations.filter(i => i.status === 'completed').length} completed today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Threat Level</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">Medium</div>
              <p className="text-xs text-slate-400">
                +12% from last week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Scenarios Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {userProgress?.total_scenarios_completed || 0}
              </div>
              <p className="text-xs text-slate-400">
                {userProgress?.total_scenarios_attempted || 0} attempted
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
                {userProgress?.average_score || 0}%
              </div>
              <p className="text-xs text-slate-400">
                Current streak: {userProgress?.current_streak || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
            <LiveEventFeed />
        </div>
      </div>
    </div>
  );
}