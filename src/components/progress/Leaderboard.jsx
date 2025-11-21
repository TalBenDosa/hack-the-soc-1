
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, RefreshCw, Loader2, Crown, Shield, Star } from 'lucide-react';
import { UserProgress } from '@/entities/all';
import { Button } from '@/components/ui/button';

export default function Leaderboard() {
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadLeaderboardData = async () => {
        setLoading(true);
        try {
            const tenantContextString = localStorage.getItem('tenant_context');
            if (!tenantContextString) {
                console.warn("[Leaderboard] Tenant context not found. Cannot load leaderboard.");
                setLeaderboardData([]);
                setLoading(false);
                return;
            }
            const tenantContext = JSON.parse(tenantContextString);
            const tenantId = tenantContext.tenant_id;

            console.log(`[Leaderboard] Loading leaderboard for tenant: ${tenantId}`);

            // Add null check before calling filter
            if (!UserProgress || typeof UserProgress.filter !== 'function') {
                console.error('[Leaderboard] UserProgress entity not available');
                setLeaderboardData([]);
                setLoading(false);
                return;
            }

            // Fetch all progress records for the specific tenant
            const progressRecords = await UserProgress.filter({ tenant_id: tenantId });
            console.log(`[Leaderboard] Found ${progressRecords.length} progress records.`);

            // Use a Map to ensure each user appears only once with their highest score
            const userScores = new Map();
            for (const record of progressRecords) {
                if (!record.user_id) continue;
                
                const existing = userScores.get(record.user_id);
                // Only add or update if the user is not in the map OR this new record has more points
                if (!existing || record.points > existing.points) {
                    userScores.set(record.user_id, {
                        user_id: record.user_id,
                        full_name: record.user_full_name || `User ${record.user_id.slice(0,5)}...`,
                        points: record.points || 0,
                        level: record.level || 1,
                        quiz_completions: record.quiz_completions || 0, // Changed from quizzes_completed to quiz_completions
                        scenarios_completed: record.total_scenarios_completed || 0,
                    });
                }
            }

            // Convert map values to an array and sort by points
            const processedData = Array.from(userScores.values());
            processedData.sort((a, b) => b.points - a.points);
            
            console.log('[Leaderboard] Processed leaderboard data:', processedData);
            setLeaderboardData(processedData.slice(0, 10));

        } catch (error) {
            console.error("Failed to load leaderboard data:", error);
            setLeaderboardData([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadLeaderboardData();
    }, []);

    const getRankIcon = (rank) => {
        if (rank === 0) return <Crown className="w-5 h-5 text-yellow-400" />;
        if (rank === 1) return <Shield className="w-5 h-5 text-slate-400" />;
        if (rank === 2) return <Star className="w-5 h-5 text-orange-400" />;
        return <span className="text-sm font-bold text-slate-500 w-5 text-center">{rank + 1}</span>;
    };

    return (
        <Card className="bg-slate-800/50 border-slate-700 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    Leaderboard
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={loadLeaderboardData} className="w-8 h-8">
                    <RefreshCw className={`w-4 h-4 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                    </div>
                ) : leaderboardData.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <p>No activity yet.</p>
                        <p className="text-xs">Complete quizzes and scenarios to appear here!</p>
                    </div>
                ) : (
                    <ul className="space-y-4">
                        {leaderboardData.map((user, index) => (
                            <li key={user.user_id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                                <div className="flex-shrink-0">{getRankIcon(index)}</div>
                                <div className="flex-grow">
                                    <p className="font-medium text-white truncate">{user.full_name}</p>
                                    <p className="text-xs text-slate-400">
                                        Level {user.level} • {user.quiz_completions} quizzes • {user.scenarios_completed} scenarios
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-teal-400">{user.points}</p>
                                    <p className="text-xs text-slate-500">points</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
