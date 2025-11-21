import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Star, Trophy, TrendingUp } from 'lucide-react';

export default function PointsWidget({ userProgress }) {
    if (!userProgress) {
        return (
            <Card className="bg-slate-800 border-slate-700 text-center p-6">
                <Trophy className="w-12 h-12 mx-auto text-yellow-400/50 mb-4" />
                <h3 className="text-lg font-bold text-white">Start Your Journey!</h3>
                <p className="text-slate-400">Complete lessons, quizzes, and scenarios to earn points and level up.</p>
            </Card>
        );
    }

    const { points = 0, level = 1, points_to_next_level = 100 } = userProgress;
    
    // Calculate previous level's threshold to get progress within current level
    const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000];
    const currentLevelThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextLevelThreshold = points_to_next_level;

    const pointsInCurrentLevel = points - currentLevelThreshold;
    const pointsForThisLevel = nextLevelThreshold - currentLevelThreshold;
    const progressPercentage = pointsForThisLevel > 0 ? Math.min((pointsInCurrentLevel / pointsForThisLevel) * 100, 100) : 0;
    
    const pointsToNextLevel = Math.max(0, nextLevelThreshold - points);

    return (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-800/50 border-slate-700 p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-teal-500/20 border-2 border-teal-500 rounded-full flex items-center justify-center relative">
                        <span className="text-4xl font-bold text-teal-400">{level}</span>
                        <div className="absolute -bottom-2 bg-slate-700 px-2 py-0.5 rounded-full text-xs text-teal-300 border border-slate-600">
                           LEVEL
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">Total Experience</p>
                        <h3 className="text-3xl font-bold text-white flex items-center gap-2">
                           <Star className="w-6 h-6 text-yellow-400" />
                           {points.toLocaleString()} XP
                        </h3>
                    </div>
                </div>
                <div className="w-full sm:w-1/2 flex flex-col justify-center">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Level {level}</span>
                        <span className="font-semibold text-white">{pointsToNextLevel.toLocaleString()} XP to Level {level + 1}</span>
                        <span>Level {level + 1}</span>
                    </div>
                    <Progress value={progressPercentage} className="h-3 bg-slate-700 [&>div]:bg-teal-400" />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>{currentLevelThreshold.toLocaleString()} XP</span>
                        <span>{nextLevelThreshold.toLocaleString()} XP</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}