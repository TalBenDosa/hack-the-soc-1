import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Flag, Loader2 } from 'lucide-react';

export default function FlagSubmission({
    challenge,
    attempt,
    onSuccess,
    onAttemptUpdate,
}) {
    const [flagInput, setFlagInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastResult, setLastResult] = useState(null); // 'correct' | 'wrong' | null
    const [attemptCount, setAttemptCount] = useState(attempt?.submitted_flags?.length ?? 0);

    const isSolved = attempt?.status === 'solved';

    const normalizeFlag = (val) => val.trim().toUpperCase();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!flagInput.trim() || isSubmitting || isSolved) return;

        setIsSubmitting(true);
        setLastResult(null);

        try {
            const submitted = normalizeFlag(flagInput);
            const correct = normalizeFlag(challenge.flag);
            const isCorrect = submitted === correct;

            setAttemptCount(prev => prev + 1);

            if (isCorrect) {
                setLastResult('correct');
                onSuccess?.({
                    pointsAwarded: challenge.points - (attempt?.points_spent_on_hints ?? 0),
                    timeToSolve: attempt?.start_time
                        ? Math.floor((Date.now() - new Date(attempt.start_time).getTime()) / 1000)
                        : null,
                });
            } else {
                setLastResult('wrong');
                onAttemptUpdate?.({ submitted_flag: flagInput.trim() });
            }
        } finally {
            setIsSubmitting(false);
            if (lastResult !== 'correct') setFlagInput('');
        }
    };

    if (isSolved) {
        return (
            <div className="flex items-center gap-3 p-4 bg-green-900/30 border border-green-500/40 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-green-300">Challenge Solved!</p>
                    <p className="text-xs text-green-400/70 font-mono mt-0.5">{challenge.flag}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-300">
                <Flag className="w-4 h-4 text-teal-400" />
                <span className="font-medium">Submit Flag</span>
                <span className="text-slate-500 text-xs ml-auto">
                    Format: <span className="font-mono text-teal-400">SOC&#123;...&#125;</span>
                </span>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    placeholder="SOC{your_answer_here}"
                    className="font-mono text-sm bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 focus:border-teal-500"
                    disabled={isSubmitting}
                    autoComplete="off"
                    spellCheck={false}
                />
                <Button
                    type="submit"
                    disabled={!flagInput.trim() || isSubmitting}
                    className="bg-teal-600 hover:bg-teal-500 text-white shrink-0"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        'Submit'
                    )}
                </Button>
            </form>

            {lastResult === 'correct' && (
                <Alert className="border-green-500/50 bg-green-900/20">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <AlertDescription className="text-green-300 text-sm">
                        Correct flag! Well done — challenge complete.
                    </AlertDescription>
                </Alert>
            )}

            {lastResult === 'wrong' && (
                <Alert className="border-red-500/50 bg-red-900/20">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <AlertDescription className="text-red-300 text-sm">
                        Incorrect flag. Check your analysis and try again.
                        {attemptCount > 0 && (
                            <span className="block text-xs text-red-400/70 mt-1">
                                {attemptCount} attempt{attemptCount !== 1 ? 's' : ''} so far
                            </span>
                        )}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
