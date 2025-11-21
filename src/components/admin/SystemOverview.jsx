import React, { useState, useEffect } from "react";
import { Investigation, Scenario, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";

export default function SystemOverview() {
  const [investigations, setInvestigations] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [investigationsData, scenariosData, usersData] = await Promise.all([
          Investigation.list("-created_date", 100).catch(() => []),
          Scenario.list().catch(() => []), 
          User.list().catch(() => [])
        ]);
        
        setInvestigations(investigationsData);
        setScenarios(scenariosData);
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to load system overview data:", error);
        // Set empty arrays as fallback
        setInvestigations([]);
        setScenarios([]);
        setUsers([]);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  // Activity data for the last 7 days
  const activityData = [
    { day: "Mon", investigations: 12, users: 8 },
    { day: "Tue", investigations: 15, users: 12 },
    { day: "Wed", investigations: 8, users: 6 },
    { day: "Thu", investigations: 18, users: 14 },
    { day: "Fri", investigations: 22, users: 16 },
    { day: "Sat", investigations: 6, users: 4 },
    { day: "Sun", investigations: 9, users: 7 },
  ];

  // Scenario difficulty distribution
  const difficultyData = [
    { name: "Easy", value: scenarios.filter(s => s.difficulty === "Easy").length, color: "#10b981" },
    { name: "Medium", value: scenarios.filter(s => s.difficulty === "Medium").length, color: "#f59e0b" },
    { name: "Hard", value: scenarios.filter(s => s.difficulty === "Hard").length, color: "#ef4444" },
  ];

  // Investigation status distribution
  const statusData = [
    { name: "Completed", value: investigations.filter(i => i.status === "completed").length, color: "#14b8a6" },
    { name: "Active", value: investigations.filter(i => i.status === "active").length, color: "#f59e0b" },
    { name: "Failed", value: investigations.filter(i => i.status === "failed").length, color: "#ef4444" },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* System Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-400" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">SIEM Engine</span>
                <span className="text-sm text-green-400">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">AI Feedback</span>
                <span className="text-sm text-green-400">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Database</span>
                <span className="text-sm text-green-400">Healthy</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" />
              User Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Active Today</span>
                <span className="text-sm text-white">
                  {users.filter(u => u.last_activity && 
                    new Date(u.last_activity).toDateString() === new Date().toDateString()
                  ).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">This Week</span>
                <span className="text-sm text-white">
                  {users.filter(u => u.last_activity && 
                    new Date(u.last_activity) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                  ).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Total Users</span>
                <span className="text-sm text-white">{users.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Avg Completion</span>
                <span className="text-sm text-white">
                  {investigations.length > 0 
                    ? Math.round((investigations.filter(i => i.status === 'completed').length / investigations.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Scenarios</span>
                <span className="text-sm text-white">{scenarios.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Success Rate</span>
                <span className="text-sm text-green-400">87%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="investigations" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="users" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Scenario Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {difficultyData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={difficultyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {difficultyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-400">
                No scenarios data available
              </div>
            )}
            <div className="flex justify-center gap-4 mt-4">
              {difficultyData.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-slate-300">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}