import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Lock, Lightbulb, ChevronDown, ChevronRight, Coins } from 'lucide-react';

export default function HintSystem({ hints = [], hintsUsed = [], onRevealHint, currentPoints }) {
    const [confirmingIndex, setConfirmingIndex] = useState(null);
    const [openHints, setOpenHints] = useState(new Set(hintsUsed));

    const handleRevealRequest = (index) => {
        if (hintsUsed.includes(index)) {
            setOpenHints(prev => {
                const next = new Set(prev);
                next.has(index) ? next.delete(index) : next.add(index);
                return next;
            });
            return;
        }
        setConfirmingIndex(index);
    };

    const handleConfirmReveal = (index) => {
        onRevealHint?.(index);
        setOpenHints(prev => new Set([...prev, index]));
        setConfirmingIndex(null);
    };

    if (!hints || hints.length === 0) return null;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-300 mb-3">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                <span className="font-medium">Hints</span>
                <span className="text-xs text-slate-500 ml-auto">
                    {hintsUsed.length}/{hints.length} revealed
                </span>
            </div>

            {hints.map((hint, index) => {
                const isUsed = hintsUsed.includes(index);
                const isOpen = openHints.has(index);
                const isConfirming = confirmingIndex === index;
                const canAfford = (currentPoints ?? Infinity) >= hint.point_cost;

                return (
                    <div key={index} className="border border-slate-700 rounded-lg overflow-hidden">
                        {isUsed ? (
                            <Collapsible open={isOpen}>
                                <CollapsibleTrigger asChild>
                                    <button
                                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
                                        onClick={() => handleRevealRequest(index)}
                                    >
                                        <Lightbulb className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                                        <span className="text-xs font-medium text-slate-200">
                                            Hint {index + 1}
                                        </span>
                                        <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
                                            <Coins className="w-3 h-3 text-yellow-500" />
                                            {hint.point_cost} pts spent
                                        </span>
                                        {isOpen
                                            ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                            : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                        }
                                    </button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <div className="px-4 py-3 bg-yellow-900/10 border-t border-slate-700">
                                        <p className="text-sm text-yellow-200">{hint.text}</p>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        ) : isConfirming ? (
                            <div className="px-3 py-2.5 bg-slate-800/50">
                                <p className="text-xs text-slate-300 mb-2">
                                    Reveal hint {index + 1}? This costs{' '}
                                    <span className="text-yellow-400 font-semibold">{hint.point_cost} points</span>.
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        className="h-6 px-3 text-xs bg-yellow-600 hover:bg-yellow-500 text-white"
                                        disabled={!canAfford}
                                        onClick={() => handleConfirmReveal(index)}
                                    >
                                        {canAfford ? 'Yes, reveal' : 'Not enough points'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-3 text-xs text-slate-400"
                                        onClick={() => setConfirmingIndex(null)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <button
                                className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-800/30 hover:bg-slate-800/60 transition-colors text-left"
                                onClick={() => handleRevealRequest(index)}
                            >
                                <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                                <span className="text-xs text-slate-400">Hint {index + 1}</span>
                                <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
                                    <Coins className="w-3 h-3 text-yellow-600" />
                                    {hint.point_cost} pts
                                </span>
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
