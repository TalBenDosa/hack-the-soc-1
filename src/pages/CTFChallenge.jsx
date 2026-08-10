import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CTF_CHALLENGES } from '@/components/ctf/ctfChallengesData';
import FlagSubmission from '@/components/ctf/FlagSubmission';
import HintSystem from '@/components/ctf/HintSystem';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    Flag,
    BookOpen,
    CheckCircle2,
    Trophy,
    Clock,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';

const SOURCE_TYPE_COLORS = {
    'EDR': 'bg-purple-600/80 text-white border-purple-500',
    'Active Directory': 'bg-blue-600/80 text-white border-blue-500',
    'Firewall': 'bg-orange-600/80 text-white border-orange-500',
    'DNS': 'bg-lime-600/80 text-white border-lime-500',
    'Windows Security': 'bg-cyan-600/80 text-white border-cyan-500',
    'Office365 / Microsoft 365 Audit': 'bg-sky-600/80 text-white border-sky-500',
    'Azure AD / Entra ID': 'bg-indigo-600/80 text-white border-indigo-500',
    'Email Security / Mail Gateway': 'bg-fuchsia-600/80 text-white border-fuchsia-500',
    'AWS CloudTrail': 'bg-amber-600/80 text-white border-amber-500',
    'DLP': 'bg-rose-600/80 text-white border-rose-500',
};

const SEVERITY_COLORS = {
    Critical: 'text-red-400',
    High: 'text-orange-400',
    Medium: 'text-yellow-400',
    Low: 'text-green-400',
};

const DIFFICULTY_COLORS = {
    Beginner: 'bg-green-500/20 text-green-300 border-green-500/40',
    Intermediate: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    Advanced: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    Expert: 'bg-red-500/20 text-red-300 border-red-500/40',
};

function LogEntry({ log, index }) {
    const [expanded, setExpanded] = useState(false);
    const sourceColor = SOURCE_TYPE_COLORS[log.source_type] || 'bg-slate-600/80 text-white border-slate-500';
    const severityColor = SEVERITY_COLORS[log.severity] || 'text-slate-400';

    return (
        <div className="border border-slate-700 rounded-lg overflow-hidden mb-2">
            <button
                className="w-full flex items-start gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="text-xs text-slate-500 font-mono w-5 shrink-0 mt-0.5">#{index + 1}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-xs px-1.5 py-0 font-medium ${sourceColor}`}>
                            {log.source_type}
                        </Badge>
                        <span className={`text-xs font-semibold ${severityColor}`}>{log.severity}</span>
                        <span className="text-xs text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-1">{log.rule_description}</p>
                    <p className="text-xs text-slate-500 font-mono truncate">
                        {log.hostname && `${log.hostname} `}
                        {log.username && `| ${log.username} `}
                        {log.ip_address && `| ${log.ip_address}`}
                    </p>
                </div>
                {expanded
                    ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                }
            </button>

            {expanded && log.raw_log_data && (
                <div className="border-t border-slate-700 p-3 bg-slate-900/80">
                    <p className="text-xs text-slate-500 font-mono mb-2">raw_log_data:</p>
                    <pre className="text-xs text-teal-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
                        {JSON.stringify(log.raw_log_data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

export default function CTFChallenge() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const challengeId = searchParams.get('id');

    const challenge = useMemo(
        () => CTF_CHALLENGES.find(c => c.id === challengeId),
        [challengeId]
    );

    const [hintsUsed, setHintsUsed] = useState([]);
    const [isSolved, setIsSolved] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [pointsAwarded, setPointsAwarded] = useState(0);
    const [startTime] = useState(new Date());
    const [attempt, setAttempt] = useState(null);
    const [showObjectives, setShowObjectives] = useState(false);

    useEffect(() => {
        if (!challenge) return;
        // Check session for previous solve
        try {
            const solved = JSON.parse(sessionStorage.getItem('ctf_solved') || '[]');
            if (solved.includes(challenge.id)) {
                setIsSolved(true);
                setAttempt({ status: 'solved', submitted_flags: [], hints_used: [], points_spent_on_hints: 0 });
            }
        } catch {}
    }, [challenge]);

    if (!challenge) {
        return (
            <div className="text-center py-20 text-slate-400">
                <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Challenge not found.</p>
                <Button
                    variant="ghost"
                    className="mt-4 text-teal-400"
                    onClick={() => navigate(createPageUrl('CTFChallenges'))}
                >
                    Back to CTF Arena
                </Button>
            </div>
        );
    }

    const pointsSpentOnHints = hintsUsed.reduce((sum, idx) => sum + (challenge.hints[idx]?.point_cost ?? 0), 0);
    const netPoints = Math.max(0, challenge.points - pointsSpentOnHints);

    const handleRevealHint = (index) => {
        setHintsUsed(prev => [...new Set([...prev, index])]);
    };

    const handleFlagSuccess = ({ pointsAwarded: pts }) => {
        setIsSolved(true);
        setPointsAwarded(pts ?? netPoints);
        setShowSuccessModal(true);
        setAttempt({ status: 'solved', submitted_flags: [], hints_used: hintsUsed, points_spent_on_hints: pointsSpentOnHints });

        // Persist solve to session
        try {
            const solved = JSON.parse(sessionStorage.getItem('ctf_solved') || '[]');
            if (!solved.includes(challenge.id)) {
                solved.push(challenge.id);
                sessionStorage.setItem('ctf_solved', JSON.stringify(solved));
            }
        } catch {}
    };

    return (
        <div className="h-full flex flex-col gap-4 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                    onClick={() => navigate(createPageUrl('CTFChallenges'))}
                >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    CTF Arena
                </Button>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${DIFFICULTY_COLORS[challenge.difficulty] || ''}`}>
                        {challenge.difficulty}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-teal-500/10 text-teal-300 border-teal-500/30">
                        {challenge.points} pts
                    </Badge>
                    {isSolved && (
                        <Badge className="text-xs bg-green-600/20 text-green-300 border-green-500/40">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Solved
                        </Badge>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 flex-1 min-h-0">
                {/* Left — Logs */}
                <div className="lg:col-span-3 flex flex-col">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg flex flex-col h-full">
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-white">Security Events</h2>
                                <p className="text-xs text-slate-400">{challenge.logs.length} log entries — click to expand</p>
                            </div>
                            <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                                {challenge.category}
                            </Badge>
                        </div>
                        <ScrollArea className="flex-1 p-4">
                            {challenge.logs.map((log, idx) => (
                                <LogEntry key={log.id} log={log} index={idx} />
                            ))}
                        </ScrollArea>
                    </div>
                </div>

                {/* Right — Challenge info + submission */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    {/* Challenge details */}
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
                        <div className="flex items-start gap-2">
                            <Flag className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                            <div>
                                <h1 className="text-base font-bold text-white leading-tight">{challenge.title}</h1>
                                <p className="text-xs text-slate-400 mt-1">{challenge.description}</p>
                            </div>
                        </div>

                        {/* MITRE */}
                        {challenge.mitre_techniques?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {challenge.mitre_techniques.map(t => (
                                    <span key={t} className="text-xs bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono border border-slate-700">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Learning objectives toggle */}
                        <button
                            className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                            onClick={() => setShowObjectives(!showObjectives)}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Learning Objectives
                            {showObjectives ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                        {showObjectives && (
                            <ul className="space-y-1.5 pl-2">
                                {challenge.learning_objectives.map((obj, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                        <span className="text-teal-400 mt-0.5">•</span>
                                        {obj}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Flag submission */}
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                        <FlagSubmission
                            challenge={challenge}
                            attempt={attempt}
                            onSuccess={handleFlagSuccess}
                            onAttemptUpdate={() => {}}
                        />
                        {!isSolved && hintsUsed.length > 0 && (
                            <p className="text-xs text-slate-500 mt-2">
                                Net points after hints: <span className="text-yellow-400 font-semibold">{netPoints}</span>
                            </p>
                        )}
                    </div>

                    {/* Hints */}
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
                        <HintSystem
                            hints={challenge.hints}
                            hintsUsed={hintsUsed}
                            onRevealHint={handleRevealHint}
                            currentPoints={challenge.points}
                        />
                    </div>
                </div>
            </div>

            {/* Success modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="bg-slate-900 border-green-500/40 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-400">
                            <Trophy className="w-5 h-5" />
                            Challenge Complete!
                        </DialogTitle>
                        <DialogDescription className="text-slate-300">
                            You successfully captured the flag for <strong className="text-white">{challenge.title}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 font-mono text-sm text-green-300 text-center">
                            {challenge.flag}
                        </div>
                        <div className="flex justify-between text-sm text-slate-300">
                            <span className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-slate-400" />
                                {Math.floor((Date.now() - startTime.getTime()) / 60000)} min
                            </span>
                            <span className="text-teal-300 font-semibold">+{pointsAwarded} points</span>
                        </div>
                        {hintsUsed.length > 0 && (
                            <p className="text-xs text-slate-400 text-center">
                                {hintsUsed.length} hint{hintsUsed.length !== 1 ? 's' : ''} used (−{pointsSpentOnHints} pts)
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button
                            className="flex-1 bg-teal-600 hover:bg-teal-500 text-white"
                            onClick={() => {
                                setShowSuccessModal(false);
                                navigate(createPageUrl('CTFChallenges'));
                            }}
                        >
                            Back to Arena
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 border-slate-600 text-slate-300 hover:text-white"
                            onClick={() => setShowSuccessModal(false)}
                        >
                            Stay Here
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
