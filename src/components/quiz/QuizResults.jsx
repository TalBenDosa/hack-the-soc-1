import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Award, Repeat, XCircle, BarChart2, CheckCircle } from 'lucide-react';
import CertificateGenerator from '../investigation/CertificateGenerator';
import { User } from '@/entities/all';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { awardPoints } from '../utils/gamificationService';

export default function QuizResults({ 
    score, 
    totalQuestions, 
    correctAnswers, 
    quiz, 
    onRetake, 
    onClose 
}) {
    const [showCertificate, setShowCertificate] = useState(false);
    const [activityLogged, setActivityLogged] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        User.me().then(setUser).catch(() => setUser(null));
    }, []);

    useEffect(() => {
        if (activityLogged || !quiz?.id || !user?.id) return;

        const logActivity = async () => {
            try {
                // The score from the quiz is used as bonus points
                const pointsEarned = await awardPoints(user.id, 'quiz_completed', quiz.id, score);
                console.log(`[QuizResults] Logged activity and awarded ${pointsEarned} points.`);
                setActivityLogged(true);
            } catch (error) {
                console.error("Failed to log quiz completion activity:", error);
            }
        };

        logActivity();
    }, [quiz, score, user, activityLogged]);

    const isPassed = score >= (quiz?.passing_score || 70);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
            <Card className="w-full max-w-lg bg-slate-800 border-slate-700 text-white">
                <CardContent className="p-6 text-center">
                    {isPassed ? (
                        <>
                            <Award className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-yellow-400">Congratulations!</h2>
                            <p className="text-slate-300 mt-2">You passed the quiz!</p>
                        </>
                    ) : (
                        <>
                            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-red-400">Needs Improvement</h2>
                            <p className="text-slate-300 mt-2">Don't worry, you can always try again.</p>
                        </>
                    )}

                    <div className="my-6 space-y-2">
                        <p className="text-4xl font-bold">{score}%</p>
                        <p className="text-slate-400">
                            You answered {correctAnswers} out of {totalQuestions} questions correctly.
                        </p>
                    </div>

                    <div className="flex justify-center gap-4">
                        <Button onClick={onRetake} variant="outline" className="border-slate-600 hover:bg-slate-700">
                            <Repeat className="w-4 h-4 mr-2" />
                            Retake Quiz
                        </Button>
                        <Button onClick={() => navigate(createPageUrl('QuizPage'))} className="bg-teal-600 hover:bg-teal-700">
                            <BarChart2 className="w-4 h-4 mr-2" />
                            View Other Quizzes
                        </Button>
                        {isPassed && (
                            <Button onClick={() => setShowCertificate(true)} className="bg-blue-600 hover:bg-blue-700">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Get Certificate
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {showCertificate && isPassed && user && (
                <CertificateGenerator
                    userName={user.full_name}
                    courseName={quiz.title}
                    completionDate={new Date().toLocaleDateString()}
                    onClose={() => setShowCertificate(false)}
                />
            )}
        </div>
    );
}