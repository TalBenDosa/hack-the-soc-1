import React, { useState, useEffect } from 'react';
import { LogDataset } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
    Target, 
    Play, 
    Lock, 
    Trophy, 
    Clock, 
    Users,
    TrendingUp,
    Zap,
    Shield,
    Eye,
    Brain
} from 'lucide-react';

const predefinedChallenges = [
    {
        id: 'ransomware-101',
        name: 'Ransomware Detection 101',
        description: 'Learn to detect file encryption patterns and ransom note drops. Perfect for beginners.',
        scenario_type: 'Ransomware Attack',
        difficulty: 'Beginner',
        estimated_time: 45,
        learning_objectives: [
            'Identify file encryption patterns',
            'Detect rapid file modifications',
            'Recognize ransom note creation',
            'Build effective time-based rules'
        ],
        attack_techniques: ['T1486 - Data Encrypted for Impact', 'T1083 - File and Directory Discovery'],
        data_sources: ['EDR', 'Windows Security', 'File System'],
        completion_rate: 78,
        average_score: 85,
        unlocked: true,
        prerequisites: [],
        rewards: {
            points: 500,
            badge: 'Ransomware Hunter',
            skill_boost: 'Malware Detection +15'
        }
    },
    {
        id: 'apt-lateral-movement',
        name: 'APT Lateral Movement',
        description: 'Detect sophisticated adversary movement across the network using multiple data sources.',
        scenario_type: 'APT Campaign',
        difficulty: 'Advanced',
        estimated_time: 90,
        learning_objectives: [
            'Correlate events across multiple hosts',
            'Identify credential dumping activities',
            'Detect pass-the-hash attacks',
            'Build complex correlation rules'
        ],
        attack_techniques: ['T1021 - Remote Services', 'T1003 - OS Credential Dumping', 'T1550 - Use Alternate Authentication Material'],
        data_sources: ['Active Directory', 'EDR', 'Network IDS', 'Windows Security'],
        completion_rate: 34,
        average_score: 72,
        unlocked: false,
        prerequisites: ['ransomware-101', 'brute-force-detection'],
        rewards: {
            points: 1200,
            badge: 'APT Hunter',
            skill_boost: 'Threat Hunting +25'
        }
    },
    {
        id: 'insider-threat',
        name: 'Insider Threat Detection',
        description: 'Identify malicious insider activities using behavioral analysis and data access patterns.',
        scenario_type: 'Insider Threat',
        difficulty: 'Intermediate',
        estimated_time: 60,
        learning_objectives: [
            'Analyze user behavior patterns',
            'Detect abnormal data access',
            'Identify privilege abuse',
            'Build user-centric rules'
        ],
        attack_techniques: ['T1078 - Valid Accounts', 'T1020 - Automated Exfiltration', 'T1530 - Data from Cloud Storage Object'],
        data_sources: ['DLP', 'Office 365', 'Active Directory', 'Database Logs'],
        completion_rate: 56,
        average_score: 79,
        unlocked: true,
        prerequisites: ['ransomware-101'],
        rewards: {
            points: 800,
            badge: 'Insider Hunter',
            skill_boost: 'Behavioral Analysis +20'
        }
    },
    {
        id: 'supply-chain-attack',
        name: 'Supply Chain Compromise',
        description: 'Detect sophisticated supply chain attacks through software and update mechanisms.',
        scenario_type: 'Supply Chain Attack',
        difficulty: 'Expert',
        estimated_time: 120,
        learning_objectives: [
            'Identify software tampering',
            'Detect malicious updates',
            'Analyze trust relationships',
            'Build multi-layer detection'
        ],
        attack_techniques: ['T1195 - Supply Chain Compromise', 'T1554 - Compromise Client Software Binary', 'T1574 - Hijack Execution Flow'],
        data_sources: ['EDR', 'Network IDS', 'Code Signing Logs', 'Software Inventory'],
        completion_rate: 12,
        average_score: 68,
        unlocked: false,
        prerequisites: ['apt-lateral-movement', 'insider-threat', 'advanced-evasion'],
        rewards: {
            points: 2000,
            badge: 'Supply Chain Guardian',
            skill_boost: 'Advanced Threat Detection +30'
        }
    },
    {
        id: 'brute-force-detection',
        name: 'Brute Force Attack Detection',
        description: 'Build rules to detect various brute force attack patterns across different services.',
        scenario_type: 'Brute Force',
        difficulty: 'Beginner',
        estimated_time: 30,
        learning_objectives: [
            'Identify failed login patterns',
            'Set appropriate thresholds',
            'Reduce false positives',
            'Handle distributed attacks'
        ],
        attack_techniques: ['T1110 - Brute Force', 'T1021 - Remote Services'],
        data_sources: ['Active Directory', 'Windows Security', 'Web Server Logs'],
        completion_rate: 82,
        average_score: 88,
        unlocked: true,
        prerequisites: [],
        rewards: {
            points: 400,
            badge: 'Access Guardian',
            skill_boost: 'Authentication Analysis +10'
        }
    },
    {
        id: 'data-exfiltration',
        name: 'Data Exfiltration Detection',
        description: 'Detect various data exfiltration techniques including DNS tunneling and large transfers.',
        scenario_type: 'Data Exfiltration',
        difficulty: 'Intermediate',
        estimated_time: 75,
        learning_objectives: [
            'Identify abnormal data volumes',
            'Detect covert channels',
            'Analyze network patterns',
            'Build bandwidth-based rules'
        ],
        attack_techniques: ['T1041 - Exfiltration Over C2 Channel', 'T1048 - Exfiltration Over Alternative Protocol'],
        data_sources: ['Firewall', 'DLP', 'DNS', 'Network IDS'],
        completion_rate: 45,
        average_score: 76,
        unlocked: true,
        prerequisites: ['brute-force-detection'],
        rewards: {
            points: 900,
            badge: 'Data Guardian',
            skill_boost: 'Network Analysis +20'
        }
    }
];

export default function ChallengeSelector({ onChallengeSelect }) {
    const [challenges, setChallenges] = useState(predefinedChallenges);
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Beginner': return 'text-green-400 bg-green-400/20 border-green-500/30';
            case 'Intermediate': return 'text-yellow-400 bg-yellow-400/20 border-yellow-500/30';
            case 'Advanced': return 'text-orange-400 bg-orange-400/20 border-orange-500/30';
            case 'Expert': return 'text-red-400 bg-red-400/20 border-red-500/30';
            default: return 'text-gray-400 bg-gray-400/20 border-gray-500/30';
        }
    };

    const getScenarioIcon = (type) => {
        switch (type) {
            case 'Ransomware Attack': return <Shield className="w-6 h-6 text-red-400" />;
            case 'APT Campaign': return <Eye className="w-6 h-6 text-purple-400" />;
            case 'Insider Threat': return <Users className="w-6 h-6 text-orange-400" />;
            case 'Supply Chain Attack': return <Zap className="w-6 h-6 text-blue-400" />;
            case 'Brute Force': return <Target className="w-6 h-6 text-yellow-400" />;
            case 'Data Exfiltration': return <TrendingUp className="w-6 h-6 text-teal-400" />;
            default: return <Brain className="w-6 h-6 text-slate-400" />;
        }
    };

    const filteredChallenges = challenges.filter(challenge => {
        if (selectedDifficulty !== 'all' && challenge.difficulty !== selectedDifficulty) return false;
        if (selectedCategory !== 'all' && challenge.scenario_type !== selectedCategory) return false;
        return true;
    });

    const handleStartChallenge = (challenge) => {
        if (!challenge.unlocked) return;
        
        onChallengeSelect({
            ...challenge,
            type: challenge.scenario_type
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Training Challenges</h2>
                    <p className="text-slate-400">Master SIEM rule creation through hands-on scenarios</p>
                </div>
                
                {/* Filters */}
                <div className="flex gap-4">
                    <select 
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                    >
                        <option value="all">All Difficulties</option>
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        <option value="Expert">Expert</option>
                    </select>
                    
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
                    >
                        <option value="all">All Categories</option>
                        <option value="Ransomware Attack">Ransomware</option>
                        <option value="APT Campaign">APT</option>
                        <option value="Insider Threat">Insider Threat</option>
                        <option value="Brute Force">Brute Force</option>
                        <option value="Data Exfiltration">Data Exfiltration</option>
                        <option value="Supply Chain Attack">Supply Chain</option>
                    </select>
                </div>
            </div>

            {/* Challenge Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                {filteredChallenges.map((challenge) => (
                    <Card 
                        key={challenge.id} 
                        className={`bg-slate-800 border-slate-700 ${
                            challenge.unlocked ? 'hover:border-teal-500/50 transition-colors' : 'opacity-60'
                        }`}
                    >
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    {getScenarioIcon(challenge.scenario_type)}
                                    <div>
                                        <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                                            {challenge.name}
                                            {!challenge.unlocked && (
                                                <Lock className="w-4 h-4 text-slate-500" />
                                            )}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge className={`${getDifficultyColor(challenge.difficulty)} border text-xs`}>
                                                {challenge.difficulty}
                                            </Badge>
                                            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                                                {challenge.scenario_type}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-sm text-slate-400">
                                        <Clock className="w-4 h-4" />
                                        {challenge.estimated_time}m
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-slate-300 mt-2">{challenge.description}</p>
                        </CardHeader>
                        
                        <CardContent>
                            {/* Learning Objectives */}
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-white mb-2">Learning Objectives</h4>
                                <div className="space-y-1">
                                    {challenge.learning_objectives.slice(0, 3).map((objective, index) => (
                                        <div key={index} className="flex items-center gap-2 text-sm text-slate-300">
                                            <div className="w-1.5 h-1.5 bg-teal-400 rounded-full"></div>
                                            {objective}
                                        </div>
                                    ))}
                                    {challenge.learning_objectives.length > 3 && (
                                        <div className="text-xs text-slate-500">
                                            +{challenge.learning_objectives.length - 3} more objectives
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Data Sources */}
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-white mb-2">Data Sources</h4>
                                <div className="flex flex-wrap gap-1">
                                    {challenge.data_sources.map((source) => (
                                        <Badge key={source} variant="outline" className="border-slate-600 text-slate-400 text-xs">
                                            {source}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Progress Stats */}
                            <div className="mb-4">
                                <div className="flex justify-between text-sm text-slate-400 mb-2">
                                    <span>Completion Rate</span>
                                    <span>{challenge.completion_rate}%</span>
                                </div>
                                <Progress value={challenge.completion_rate} className="h-2" />
                                
                                <div className="flex justify-between items-center mt-2 text-sm">
                                    <span className="text-slate-400">Avg Score: {challenge.average_score}%</span>
                                    <div className="flex items-center gap-1 text-yellow-400">
                                        <Trophy className="w-3 h-3" />
                                        {challenge.rewards.points} pts
                                    </div>
                                </div>
                            </div>

                            {/* Prerequisites */}
                            {challenge.prerequisites.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-sm font-medium text-white mb-2">Prerequisites</h4>
                                    <div className="text-sm text-slate-400">
                                        Complete: {challenge.prerequisites.join(', ')}
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            <Button
                                onClick={() => handleStartChallenge(challenge)}
                                disabled={!challenge.unlocked}
                                className={`w-full ${
                                    challenge.unlocked 
                                        ? 'bg-teal-600 hover:bg-teal-700' 
                                        : 'bg-slate-600 cursor-not-allowed'
                                }`}
                            >
                                {challenge.unlocked ? (
                                    <>
                                        <Play className="w-4 h-4 mr-2" />
                                        Start Challenge
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-4 h-4 mr-2" />
                                        Locked
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Progress Overview */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle>Your Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white">
                                {challenges.filter(c => c.unlocked).length}
                            </div>
                            <div className="text-sm text-slate-400">Unlocked</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-teal-400">
                                {Math.round(challenges.filter(c => c.unlocked).reduce((acc, c) => acc + c.completion_rate, 0) / challenges.filter(c => c.unlocked).length) || 0}%
                            </div>
                            <div className="text-sm text-slate-400">Avg Completion</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-400">
                                {challenges.filter(c => c.unlocked).reduce((acc, c) => acc + c.rewards.points, 0)}
                            </div>
                            <div className="text-sm text-slate-400">Total Points</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-400">
                                {challenges.filter(c => c.difficulty === 'Expert' && c.unlocked).length}
                            </div>
                            <div className="text-sm text-slate-400">Expert Unlocked</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}