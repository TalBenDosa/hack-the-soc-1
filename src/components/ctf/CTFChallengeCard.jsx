import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Lock, Flag, Star, Users } from 'lucide-react';

const DIFFICULTY_STYLES = {
    Beginner:     'bg-green-500/20 text-green-300 border-green-500/40',
    Intermediate: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    Advanced:     'bg-orange-500/20 text-orange-300 border-orange-500/40',
    Expert:       'bg-red-500/20 text-red-300 border-red-500/40',
};

const CATEGORY_STYLES = {
    DNS:               'bg-lime-500/20 text-lime-300',
    Email:             'bg-fuchsia-500/20 text-fuchsia-300',
    'Lateral Movement':'bg-purple-500/20 text-purple-300',
    Ransomware:        'bg-red-500/20 text-red-300',
    Cloud:             'bg-sky-500/20 text-sky-300',
    'Supply Chain':    'bg-amber-500/20 text-amber-300',
    'Credential Access':'bg-rose-500/20 text-rose-300',
    'Active Directory':'bg-blue-500/20 text-blue-300',
    Firewall:          'bg-cyan-500/20 text-cyan-300',
    EDR:               'bg-indigo-500/20 text-indigo-300',
};

export default function CTFChallengeCard({ challenge, attempt, onClick }) {
    const isSolved = attempt?.status === 'solved';
    const isInProgress = attempt?.status === 'in_progress';
    const diffStyle = DIFFICULTY_STYLES[challenge.difficulty] || DIFFICULTY_STYLES.Intermediate;
    const catStyle = CATEGORY_STYLES[challenge.category] || 'bg-slate-500/20 text-slate-300';

    return (
        <Card
            className={`bg-slate-900 border cursor-pointer transition-all duration-200 hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-900/20 ${
                isSolved ? 'border-green-500/40' : 'border-slate-700'
            }`}
            onClick={onClick}
        >
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs font-semibold ${diffStyle}`}>
                            {challenge.difficulty}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${catStyle}`}>
                            {challenge.category}
                        </Badge>
                    </div>
                    {isSolved && (
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    )}
                    {isInProgress && !isSolved && (
                        <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0 mt-1" title="In Progress" />
                    )}
                </div>
                <h3 className="text-sm font-bold text-white mt-2 leading-tight">{challenge.title}</h3>
            </CardHeader>

            <CardContent className="px-4 pb-4">
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">{challenge.description}</p>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <Flag className="w-3.5 h-3.5 text-teal-400" />
                            <span className="text-teal-300 font-semibold">{challenge.points} pts</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {challenge.solve_count ?? 0} solves
                        </span>
                        {challenge.hints?.length > 0 && (
                            <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5" />
                                {challenge.hints.length} hints
                            </span>
                        )}
                    </div>

                    <Button
                        size="sm"
                        variant={isSolved ? 'ghost' : 'default'}
                        className={`text-xs h-7 px-3 ${
                            isSolved
                                ? 'text-green-400 hover:text-green-300'
                                : 'bg-teal-600 hover:bg-teal-500 text-white'
                        }`}
                        onClick={(e) => { e.stopPropagation(); onClick(); }}
                    >
                        {isSolved ? 'View' : isInProgress ? 'Continue' : 'Start'}
                    </Button>
                </div>

                {challenge.mitre_techniques?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {challenge.mitre_techniques.slice(0, 3).map(t => (
                            <span key={t} className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                                {t}
                            </span>
                        ))}
                        {challenge.mitre_techniques.length > 3 && (
                            <span className="text-xs text-slate-500">+{challenge.mitre_techniques.length - 3}</span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
