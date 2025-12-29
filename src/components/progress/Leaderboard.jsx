import React, { useState, useEffect } from "react";
import { UserProgress } from "@/entities/UserProgress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // Get all user progress records, sorted by points
      const allProgress = await UserProgress.list("-points", 10);
      
      // Map to leaderboard format
      const leaderboardData = allProgress.map((progress, index) => ({
        rank: index + 1,
        name: progress.user_full_name || "Anonymous",
        points: progress.points || 0,
        level: progress.level || 1,
      }));
      
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      setLeaderboard([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-300" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-400" />;
    return <span className="text-slate-400 font-semibold">{rank}</span>;
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Global Leaderboard
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchLeaderboard}
          disabled={loading}
          className="text-slate-400 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(entry.rank)}
                  </div>
                  <div>
                    <p className="text-white font-medium">{entry.name}</p>
                    <p className="text-xs text-slate-400">Level {entry.level}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-teal-400 font-bold">{entry.points}</p>
                  <p className="text-xs text-slate-400">points</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-8">No activity yet</p>
        )}
      </CardContent>
    </Card>
  );
}