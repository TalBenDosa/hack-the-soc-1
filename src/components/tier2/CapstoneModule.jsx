import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
    Trophy, 
    Target, 
    Clock,
    CheckCircle,
    AlertTriangle,
    Star,
    Shield,
    Code,
    Database
} from 'lucide-react';

export default function CapstoneModule() {
    const [currentChallenge, setCurrentChallenge] = useState(0);
    const [completedChallenges, setCompletedChallenges] = useState([]);
    const [overallScore, setOverallScore] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(7200); // 2 hours in seconds

    const capstoneChallenge = [
        {
            id: 'capstone-1',
            title: 'Multi-Stage Ransomware Detection',
            description: 'Write a comprehensive rule that detects the complete ransomware attack chain from initial infection to file encryption.',
            difficulty: 'Expert',
            estimated_time: 45,
            objectives: [
                'Detect initial payload execution',
                'Identify file encryption activities',
                'Capture ransom note creation',
                'Minimize false positives'
            ],
            scoring_criteria: {
                accuracy: 40,
                performance: 20,
                false_positive_rate: 25,
                documentation: 15
            }
        },
        {
            id: 'capstone-2', 
            title: 'APT Lateral Movement Chain',
            description: 'Create correlation rules to detect sophisticated lateral movement techniques used by advanced persistent threats.',
            difficulty: 'Expert',
            estimated_time: 60,
            objectives: [
                'Detect credential dumping',
                'Identify pass-the-hash attacks',
                'Track suspicious remote connections',
                'Correlate across multiple data sources'
            ],
            scoring_criteria: {
                accuracy: 35,
                performance: 15,
                false_positive_rate: 30,
                correlation_complexity: 20
            }
        },
        {
            id: 'capstone-3',
            title: 'Insider Threat Behavioral Analysis',
            description: 'Develop behavioral rules to detect malicious insider activities and data exfiltration attempts.',
            difficulty: 'Expert', 
            estimated_time: 50,
            objectives: [
                'Detect unusual data access patterns',
                'Identify after-hours activity',
                'Track large data transfers',
                'Account for legitimate business activities'
            ],
            scoring_criteria: {
                accuracy: 30,
                behavioral_analysis: 25,
                false_positive_rate: 25,
                business_context: 20
            }
        }
    ];

    const currentChallengeData = capstoneChallenge[currentChallenge];
    const progressPercent = Math.round((completedChallenges.length / capstoneChallenge.length) * 100);

    // Format time remaining
    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        // Timer countdown
        const timer = setInterval(() => {
            setTimeRemaining(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-yellow-600/20 p-3 rounded-lg">
                            <Trophy className="w-8 h-8 text-yellow-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Capstone Project</h1>
                            <p className="text-slate-400">Prove your SIEM rule mastery with complex real-world challenges</p>
                        </div>
                    </div>
                    
                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4 text-center">
                                <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                                <div className="text-xl font-bold text-white">{formatTime(timeRemaining)}</div>
                                <div className="text-sm text-slate-400">Time Remaining</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4 text-center">
                                <Target className="w-6 h-6 text-green-400 mx-auto mb-2" />
                                <div className="text-xl font-bold text-white">{completedChallenges.length}</div>
                                <div className="text-sm text-slate-400">Challenges Complete</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4 text-center">
                                <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                                <div className="text-xl font-bold text-white">{overallScore}%</div>
                                <div className="text-sm text-slate-400">Overall Score</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4 text-center">
                                <Trophy className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                                <div className="text-xl font-bold text-white">{progressPercent}%</div>
                                <div className="text-sm text-slate-400">Progress</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-slate-800 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-300">Capstone Progress</span>
                            <span className="text-sm font-bold text-white">{completedChallenges.length} / {capstoneChallenge.length}</span>
                        </div>
                        <Progress value={progressPercent} className="h-3" />
                    </div>
                </div>

                {/* Current Challenge */}
                {currentChallengeData && (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Challenge Details */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-2xl text-white mb-2">
                                                {currentChallengeData.title}
                                            </CardTitle>
                                            <div className="flex items-center gap-3">
                                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                                    {currentChallengeData.difficulty}
                                                </Badge>
                                                <div className="flex items-center gap-1 text-sm text-slate-400">
                                                    <Clock className="w-4 h-4" />
                                                    {currentChallengeData.estimated_time} min
                                                </div>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                                            Challenge {currentChallenge + 1} of {capstoneChallenge.length}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                
                                <CardContent>
                                    <p className="text-slate-300 mb-6 leading-relaxed">
                                        {currentChallengeData.description}
                                    </p>

                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                                            <Target className="w-5 h-5 text-teal-400" />
                                            Challenge Objectives
                                        </h3>
                                        <div className="grid md:grid-cols-2 gap-3">
                                            {currentChallengeData.objectives.map((objective, index) => (
                                                <div key={index} className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
                                                    <div className="w-6 h-6 bg-teal-500/20 rounded-full flex items-center justify-center mt-0.5">
                                                        <span className="text-xs font-bold text-teal-400">{index + 1}</span>
                                                    </div>
                                                    <span className="text-slate-300 text-sm">{objective}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                        <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" />
                                            Capstone Requirements
                                        </h4>
                                        <ul className="text-sm text-slate-300 space-y-1">
                                            <li>• Write complete, production-ready SIEM rules</li>
                                            <li>• Provide detailed documentation for each rule</li>
                                            <li>• Explain your logic and expected outcomes</li>
                                            <li>• Include tuning recommendations for false positives</li>
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <Button 
                                    className="bg-teal-600 hover:bg-teal-700 flex-1"
                                    onClick={() => {
                                        // Navigate to rule editor in capstone mode
                                        window.location.href = '/Tier2Training?mode=use-case&capstone=true';
                                    }}
                                >
                                    <Code className="w-4 h-4 mr-2" />
                                    Start Challenge
                                </Button>
                                
                                {currentChallenge > 0 && (
                                    <Button 
                                        variant="outline" 
                                        className="border-slate-600 text-slate-300"
                                        onClick={() => setCurrentChallenge(currentChallenge - 1)}
                                    >
                                        Previous
                                    </Button>
                                )}
                                
                                {currentChallenge < capstoneChallenge.length - 1 && (
                                    <Button 
                                        variant="outline" 
                                        className="border-slate-600 text-slate-300"
                                        onClick={() => setCurrentChallenge(currentChallenge + 1)}
                                    >
                                        Next
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Scoring & Progress Sidebar */}
                        <div className="space-y-6">
                            {/* Scoring Criteria */}
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Star className="w-5 h-5 text-yellow-400" />
                                        Scoring Criteria
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {Object.entries(currentChallengeData.scoring_criteria).map(([criteria, weight]) => (
                                            <div key={criteria} className="flex justify-between items-center">
                                                <span className="text-sm text-slate-300 capitalize">
                                                    {criteria.replace('_', ' ')}
                                                </span>
                                                <Badge variant="outline" className="border-slate-600 text-slate-400">
                                                    {weight}%
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Challenge Progress */}
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle>All Challenges</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {capstoneChallenge.map((challenge, index) => (
                                            <div
                                                key={challenge.id}
                                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                                    index === currentChallenge
                                                        ? 'bg-teal-500/20 border-teal-500/50'
                                                        : completedChallenges.includes(index)
                                                        ? 'bg-green-500/20 border-green-500/50'
                                                        : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                                                }`}
                                                onClick={() => setCurrentChallenge(index)}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium text-white">
                                                        Challenge {index + 1}
                                                    </span>
                                                    {completedChallenges.includes(index) && (
                                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 line-clamp-2">
                                                    {challenge.title}
                                                </p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                                                        {challenge.difficulty}
                                                    </Badge>
                                                    <span className="text-xs text-slate-500">
                                                        {challenge.estimated_time}m
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Certification Status */}
                            <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-purple-300">
                                        <Shield className="w-5 h-5" />
                                        Certification Track
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-white mb-1">Tier 2 SOC Analyst</div>
                                        <div className="text-sm text-slate-400 mb-3">SIEM Rules Specialist</div>
                                        <div className="text-xs text-purple-300">
                                            Complete all challenges with 80%+ score to earn certification
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Completion Message */}
                {completedChallenges.length === capstoneChallenge.length && (
                    <Card className="bg-gradient-to-br from-green-500/20 to-teal-500/20 border-green-500/30 mt-8">
                        <CardContent className="text-center p-8">
                            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                            <h2 className="text-3xl font-bold text-white mb-4">Congratulations!</h2>
                            <p className="text-lg text-green-300 mb-4">
                                You've completed all capstone challenges with a score of {overallScore}%
                            </p>
                            {overallScore >= 80 && (
                                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                                    <Shield className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                                    <p className="text-yellow-300 font-semibold">
                                        🎉 You've earned the Tier 2 SOC Analyst - SIEM Rules Specialist Certification!
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}