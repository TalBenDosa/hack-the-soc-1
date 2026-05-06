import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CTF_CHALLENGES } from '@/components/ctf/ctfChallengesData';
import CTFChallengeCard from '@/components/ctf/CTFChallengeCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Flag,
    Search,
    Trophy,
    Target,
    Zap,
    Filter,
} from 'lucide-react';

const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];
const CATEGORIES = ['All', 'DNS', 'Email', 'Active Directory', 'EDR', 'Firewall', 'Cloud', 'Supply Chain'];

const DIFFICULTY_POINTS = {
    Beginner: 100,
    Intermediate: 250,
    Advanced: 500,
    Expert: 1000,
};

export default function CTFChallenges() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');

    // In a full implementation, attempts would be loaded from Base44 entities.
    // For now, solved state is stored in sessionStorage for demonstration.
    const [solvedIds] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem('ctf_solved') || '[]');
        } catch { return []; }
    });

    const getAttempt = (challengeId) => {
        if (solvedIds.includes(challengeId)) {
            return { status: 'solved' };
        }
        return null;
    };

    const filteredChallenges = useMemo(() => {
        return CTF_CHALLENGES.filter((c) => {
            const matchesSearch = !searchQuery ||
                c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesDiff = selectedDifficulty === 'All' || c.difficulty === selectedDifficulty;
            const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
            return matchesSearch && matchesDiff && matchesCat;
        });
    }, [searchQuery, selectedDifficulty, selectedCategory]);

    const totalPoints = CTF_CHALLENGES.reduce((sum, c) => sum + c.points, 0);
    const solvedCount = solvedIds.length;
    const earnedPoints = CTF_CHALLENGES
        .filter(c => solvedIds.includes(c.id))
        .reduce((sum, c) => sum + c.points, 0);

    const handleChallengeClick = (challenge) => {
        navigate(`${createPageUrl('CTFChallenge')}?id=${challenge.id}`);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Flag className="w-6 h-6 text-teal-400" />
                        <h1 className="text-2xl font-bold text-white">CTF Arena</h1>
                        <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-xs">
                            Beta
                        </Badge>
                    </div>
                    <p className="text-sm text-slate-400">
                        Capture The Flag challenges for SOC analysts. Find hidden flags in realistic security logs.
                    </p>
                </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-slate-400">Solved</span>
                    </div>
                    <p className="text-xl font-bold text-white">
                        {solvedCount}
                        <span className="text-sm font-normal text-slate-500 ml-1">/ {CTF_CHALLENGES.length}</span>
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-teal-400" />
                        <span className="text-xs text-slate-400">Points Earned</span>
                    </div>
                    <p className="text-xl font-bold text-white">
                        {earnedPoints.toLocaleString()}
                        <span className="text-sm font-normal text-slate-500 ml-1">/ {totalPoints.toLocaleString()}</span>
                    </p>
                </div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-slate-400">Remaining</span>
                    </div>
                    <p className="text-xl font-bold text-white">
                        {(CTF_CHALLENGES.length - solvedCount)}
                        <span className="text-sm font-normal text-slate-500 ml-1">challenges</span>
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search challenges..."
                        className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                    />
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-400">Difficulty:</span>
                        <div className="flex flex-wrap gap-1">
                            {DIFFICULTIES.map(d => (
                                <button
                                    key={d}
                                    onClick={() => setSelectedDifficulty(d)}
                                    className={`text-xs px-2 py-1 rounded transition-colors ${
                                        selectedDifficulty === d
                                            ? 'bg-teal-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">Category:</span>
                        <div className="flex flex-wrap gap-1">
                            {CATEGORIES.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setSelectedCategory(c)}
                                    className={`text-xs px-2 py-1 rounded transition-colors ${
                                        selectedCategory === c
                                            ? 'bg-teal-600 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Challenge grid */}
            {filteredChallenges.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                    <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No challenges match your filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredChallenges.map(challenge => (
                        <CTFChallengeCard
                            key={challenge.id}
                            challenge={challenge}
                            attempt={getAttempt(challenge.id)}
                            onClick={() => handleChallengeClick(challenge)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
