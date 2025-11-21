import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from "lucide-react";

export default function ProgressChart({ weeklyActivity = [] }) {
  // Group activity by date for the chart
  const progressData = React.useMemo(() => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Find activity for this date
      const dayActivity = weeklyActivity.find(activity => {
        if (!activity.week_start) return false;
        const activityDate = new Date(activity.week_start).toISOString().split('T')[0];
        return activityDate === dateStr;
      });
      
      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        points: dayActivity?.points_earned || 0,
        activities: dayActivity?.activities_completed || 0
      });
    }
    
    return last7Days;
  }, [weeklyActivity]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-white font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'points' ? 'Points' : 'Activities'}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-400" />
          Activity Progress (Last 7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="points" 
              stroke="#14b8a6" 
              strokeWidth={3}
              dot={{ fill: "#14b8a6", strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="activities" 
              stroke="#f59e0b" 
              strokeWidth={2}
              dot={{ fill: "#f59e0b", strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}