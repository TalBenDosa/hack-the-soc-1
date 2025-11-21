import React, { useState, useEffect } from 'react';
import { RuleTestSession, SiemRule } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { 
    TrendingUp, 
    Target, 
    Zap, 
    Brain,
    Trophy,
    Clock,
    CheckCircle,
    AlertTriangle,
    Award,
    BarChart3
} from 'lucide-react';

export default function PerformanceDashboard() {
    const [performanceData, setPerformanceData] = useState({
        overall_stats: {
            rules_created: 15,
            average_accuracy: 87,
            sessions_completed: 12,
            total_points: 4500,
            current_streak: 7,
            time_spent_hours: 23.5
        },
        skill_progression: [
            { skill: 'Detection Logic', current: 85, target: 90, improvement: '+12%' },
            { skill: 'False Positive Reduction', current: 78, target: 85, improvement: '+8%' },
            { skill: 'Performance Optimization', current: 72, target: 80, improvement: '+15%' },
            { skill: 'Multi-Source Correlation', current: 65, target: 75, improvement: '+20%' }
        ],
        accuracy_trend: [
            { session: 1, accuracy: 65, session_name: 'Brute Force' },
            { session: 2, accuracy: 72, session_name: 'Malware Detection' },
            { session: 3, accuracy: 78, session_name: 'Data Exfiltration' },
            { session: 4, accuracy: 85, session_name: 'Insider Threat' },
            { session: 5, accuracy: 91, session_name: 'APT Detection' },
            { session: 6, accuracy: 87, session_name: 'Ransomware' }
        ],
        challenge_performance: [
            { category: 'Malware', completed: 8, accuracy: 89, avg_time: 45 },
            { category: 'Network Attacks', completed: 5, accuracy: 82, avg_time: 62 },
            { category: 'Insider Threats', completed: 3, accuracy: 94, avg_time: 38 },
            { category: 'APT Campaigns', completed: 2, accuracy: 76, avg_time: 85 }
        ],
        recent_achievements: [
            { name: 'Malware Hunter', description: 'Created 5 effective malware detection rules', earned_date: '2024-01-15', points: 500 },
            { name: 'False Positive Slayer', description: 'Achieved FP rate under 5%', earned_date: '2024-01-12', points: 300 },
            { name: 'Speed Demon', description: 'Completed challenge in record time', earned_date: '2024-01-10', points: 200 }
        ]
    });

    const skillColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
    const performanceColors = ['#14b8a6', '#8b5cf6', '#f97316', '#06b6d4'];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
                    <p className="text-white font-medium">{`Session ${label}`}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {`${entry.dataKey}: ${entry.value}%`}
                        </p>
                    ))}
                    {payload[0]?.payload?.session_name && (
                        <p className="text-xs text-slate-400 mt-1">
                            {payload[0].payload.session_name}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                            <Target className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">{performanceData.overall_stats.rules_created}</div>
                        <div className="text-sm text-slate-400">Rules Created</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                            <TrendingUp className="w-6 h-6 text-green-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">{performanceData.overall_stats.average_accuracy}%</div>
                        <div className="text-sm text-slate-400">Avg Accuracy</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                            <CheckCircle className="w-6 h-6 text-teal-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">{performanceData.overall_stats.sessions_completed}</div>
                        <div className="text-sm text-slate-400">Sessions Done</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                            <Trophy className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">{performanceData.overall_stats.total_points}</div>
                        <div className="text-sm text-slate-400">Total Points</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                            <Zap className="w-6 h-6 text-orange-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">{performanceData.overall_stats.current_streak}</div>
                        <div className="text-sm text-slate-400">Day Streak</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                            <Clock className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">{performanceData.overall_stats.time_spent_hours}h</div>
                        <div className="text-sm text-slate-400">Time Spent</div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Accuracy Progression */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            Accuracy Progression
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={performanceData.accuracy_trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="session" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" domain={[60, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line 
                                    type="monotone" 
                                    dataKey="accuracy" 
                                    stroke="#14b8a6" 
                                    strokeWidth={3}
                                    dot={{ fill: "#14b8a6", strokeWidth: 2, r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Challenge Performance */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-400" />
                            Performance by Category
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={performanceData.challenge_performance}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="category" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#1e293b', 
                                        border: '1px solid #475569', 
                                        borderRadius: '6px' 
                                    }} 
                                />
                                <Bar dataKey="accuracy" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Skill Progression */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        Skill Development
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {performanceData.skill_progression.map((skill, index) => (
                            <div key={skill.skill} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-white">{skill.skill}</span>
                                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                            {skill.improvement}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-300">{skill.current}%</span>
                                        <span className="text-slate-500">/ {skill.target}%</span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <Progress value={skill.current} className="h-3" />
                                    <div 
                                        className="absolute top-0 h-3 w-0.5 bg-yellow-400" 
                                        style={{ left: `${skill.target}%` }}
                                    />
                                </div>
                                <div className="text-xs text-slate-500">
                                    Target: {skill.target}%
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Achievements & Detailed Performance */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Achievements */}
                <Card className="lg:col-span-2 bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-400" />
                            Recent Achievements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {performanceData.recent_achievements.map((achievement, index) => (
                                <div key={index} className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg">
                                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                                        <Trophy className="w-6 h-6 text-yellow-400" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-white">{achievement.name}</h4>
                                        <p className="text-sm text-slate-400">{achievement.description}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-slate-500">
                                                {new Date(achievement.earned_date).toLocaleDateString()}
                                            </span>
                                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                                +{achievement.points} pts
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Challenge Statistics */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle>Challenge Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {performanceData.challenge_performance.map((category, index) => (
                                <div key={category.category} className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-white">{category.category}</span>
                                        <span className="text-sm text-slate-400">{category.completed} completed</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Accuracy: {category.accuracy}%</span>
                                            <span>Avg Time: {category.avg_time}m</span>
                                        </div>
                                        <Progress value={category.accuracy} className="h-2" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 p-3 bg-slate-700/30 rounded-lg">
                            <h4 className="text-sm font-medium text-white mb-2">Next Milestone</h4>
                            <p className="text-xs text-slate-400">
                                Complete 3 more APT challenges to unlock Expert tier
                            </p>
                            <Progress value={67} className="h-2 mt-2" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}