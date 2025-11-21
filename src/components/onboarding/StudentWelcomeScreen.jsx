import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { UserProgress } from '@/entities/all';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, Star, Award, TrendingUp, Zap, Loader2 } from 'lucide-react';

const StatCard = ({ icon, value, label, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 + delay, duration: 0.5 }}
        className="bg-white/5 backdrop-blur-sm p-4 rounded-xl flex flex-col items-center justify-center space-y-2 border border-white/10"
    >
        <div className="text-yellow-400">{icon}</div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
    </motion.div>
);

export default function StudentWelcomeScreen({ user, tenant }) {
    const navigate = useNavigate();
    const [progressData, setProgressData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProgress = async () => {
            if (!user || !tenant) {
                setProgressData({ points: 0, level: 1, points_to_next_level: 100, achievements: [], current_streak: 0 });
                setLoading(false);
                return;
            }
            
            setLoading(true);
            try {
                const progressRecords = await UserProgress.filter({ user_id: user.id, tenant_id: tenant.id });
                if (progressRecords && progressRecords.length > 0) {
                    setProgressData(progressRecords[0]);
                } else {
                    // If no progress record, show a default state. Gamification service will create it.
                    setProgressData({
                        points: 0,
                        level: 1,
                        points_to_next_level: 100,
                        achievements: [],
                        current_streak: 0,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch user progress for welcome screen:", error);
                // Set default state on error too
                setProgressData({ points: 0, level: 1, points_to_next_level: 100, achievements: [], current_streak: 0 });
            } finally {
                setLoading(false);
            }
        };
        fetchProgress();
    }, [user, tenant]);

    const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000];
    const currentLevel = progressData?.level || 1;
    const currentPoints = progressData?.points || 0;
    const nextLevelThreshold = progressData?.points_to_next_level || LEVEL_THRESHOLDS[currentLevel] || (currentPoints + 100);
    const prevLevelThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0;

    const pointsInCurrentLevel = currentPoints - prevLevelThreshold;
    const pointsForThisLevel = nextLevelThreshold - prevLevelThreshold;
    const progressPercentage = pointsForThisLevel > 0 ? Math.min((pointsInCurrentLevel / pointsForThisLevel) * 100, 100) : 0;
    const pointsToNext = Math.max(0, nextLevelThreshold - currentPoints);

    return (
        <div className="w-full min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
                <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-teal-500 rounded-full filter blur-3xl"></div>
                <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-purple-500 rounded-full filter blur-3xl"></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="w-full max-w-xl mx-auto text-center z-10"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
                    className="mx-auto w-24 h-24 mb-6 bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700"
                >
                    <Shield className="w-12 h-12 text-teal-400" />
                </motion.div>
                
                 <motion.h1 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-3xl sm:text-4xl font-extrabold text-teal-400 tracking-tight mb-4 whitespace-nowrap"
                >
                    Welcome to HACK THE SOC
                </motion.h1>

                <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="max-w-md mx-auto text-slate-300 mb-10"
                >
                    Your cybersecurity journey continues. Dive in to grow your skills and empower yourself in the field of Cyber Security.
                </motion.p>
                
                {loading ? (
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-slate-400 my-10" />
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <StatCard icon={<Star className="w-6 h-6" />} value={currentPoints.toLocaleString()} label="XP Points" delay={0} />
                            <StatCard icon={<Award className="w-6 h-6" />} value={progressData?.achievements?.length || 0} label="Achievements" delay={0.1} />
                            <StatCard icon={<TrendingUp className="w-6 h-6" />} value={currentLevel} label="Level" delay={0.2} />
                            <StatCard icon={<Zap className="w-6 h-6" />} value={progressData?.current_streak || 0} label="Day Streak" delay={0.3} />
                        </div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.1, duration: 0.5 }}
                            className="w-full max-w-md mx-auto"
                        >
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>Level {currentLevel}</span>
                                <span>{pointsToNext.toLocaleString()} XP to next level</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2 bg-white/10 [&>div]:bg-teal-400" />
                        </motion.div>
                    </>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="mt-12"
                >
                    <Button
                        onClick={() => navigate(createPageUrl('Dashboard'))}
                        size="lg"
                        className="bg-teal-500 hover:bg-teal-600 text-white font-bold text-base px-8 py-6 rounded-full shadow-lg shadow-teal-500/20"
                    >
                        Continue to Dashboard &rarr;
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    );
}