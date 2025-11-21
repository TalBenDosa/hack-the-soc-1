
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useNotification } from '../components/admin/Notification';
// Consolidate entity imports for direct use and to denormalize user data for leaderboard
import { Quiz, Question, User, QuizAttempt, TenantUser, UserProgress, PointsActivity } from '@/entities/all';
import { StudentActivityLog } from '@/entities/StudentActivityLog'; // ✅ הוספת ייבוא
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Trophy, CheckCircle, XCircle, Download, Share2, LayoutDashboard } from 'lucide-react';

const LinkedinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle></svg>
);


export default function TakeQuiz() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quizId, setQuizId] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState({});
    const [user, setUser] = useState(null);
    const [quizAttempt, setQuizAttempt] = useState(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [finalResults, setFinalResults] = useState(null);
    const [showNotification, NotificationComponent] = useNotification();
    const navigate = useNavigate();

    useEffect(() => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const id = urlParams.get('id');
            if (!id) {
                setError('No quiz ID provided in URL'); setLoading(false); return;
            }
            setQuizId(id);
        } catch (err) {
            setError('Failed to initialize quiz page'); setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (quizId) {
            loadQuizData(quizId);
        }
    }, [quizId]);

    const loadQuizData = async (id) => {
        try {
            setLoading(true);

            const currentUser = await User.me();
            setUser(currentUser);

            const quizData = await Quiz.filter({ id: id });
            if (!quizData || quizData.length === 0) {
                setError('Quiz not found'); setLoading(false); return;
            }
            setQuiz(quizData[0]);
            
            const questionsData = await Question.filter({ quiz_id: id }, 'order_index');
            setQuestions(questionsData);

            const attempts = await QuizAttempt.filter({ quiz_id: id, user_id: currentUser.id, status: 'in_progress' });

            if (attempts.length > 0) {
                setQuizAttempt(attempts[0]);
                const answersMap = {};
                if (attempts[0].answers && Array.isArray(attempts[0].answers)) {
                    attempts[0].answers.forEach(ans => {
                        if (ans.question_id && ans.selected_answers?.[0]) {
                            answersMap[ans.question_id] = ans.selected_answers[0];
                        }
                    });
                }
                setUserAnswers(answersMap);
            } else {
                const newAttempt = await QuizAttempt.create({
                    quiz_id: id, user_id: currentUser.id, start_time: new Date().toISOString(), status: 'in_progress',
                    total_questions: questionsData.length, answers: [],
                });
                setQuizAttempt(newAttempt);
            }
        } catch (err) {
            console.error('Error loading quiz data:', err);
            setError(`Failed to load quiz: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleAnswer = async (questionId, selectedOptionId) => {
        if (userAnswers[questionId] || !quizAttempt) return;
        const newAnswers = { ...userAnswers, [questionId]: selectedOptionId };
        setUserAnswers(newAnswers);

        try {
            const answerRecord = { question_id: questionId, selected_answers: [selectedOptionId] };
            const existingAnswers = (quizAttempt.answers || []).filter(a => a.question_id !== questionId);
            const updatedAttempt = await QuizAttempt.update(quizAttempt.id, { answers: [...existingAnswers, answerRecord] });
            setQuizAttempt(updatedAttempt);
        } catch (error) {
            console.error("Failed to save answer progress:", error);
            showNotification("Could not save your progress, please try again.", "error");
        }
    };

    const handleCompleteQuiz = async () => {
        setIsCompleted(true);
        const correctCount = questions.filter(q => 
            userAnswers[q.id] === q.answer_options.find(opt => opt.is_correct)?.id
        ).length;
        
        const score = Math.round((correctCount / questions.length) * 100);
        const passed = score >= (quiz.passing_score || 70);
        setFinalResults({ score, correctCount, passed });

        const endTime = new Date().toISOString();

        const detailedAnswers = Object.entries(userAnswers).map(([questionId, answerId]) => {
            const question = questions.find(q => q.id === questionId);
            const isCorrect = answerId === question?.answer_options.find(opt => opt.is_correct)?.id;
            return {
                question_id: questionId,
                selected_answers: [answerId],
                is_correct: isCorrect
            };
        });

        try {
            await QuizAttempt.update(quizAttempt.id, {
                end_time: endTime,
                score: score,
                total_questions: questions.length,
                correct_answers: correctCount,
                status: 'completed',
                passed: passed,
                answers: detailedAnswers
            });
            
            if (user?.id) {
                // Determine tenant_id for logging and user progress denormalization
                const tenantUsers = await TenantUser.filter({ user_id: user.id, status: 'active' });
                const tenantId = tenantUsers.length > 0 ? tenantUsers[0].tenant_id : null;

                // ✅ תיעוד הפעילות ב-StudentActivityLog
                try {
                    const durationMs = new Date(endTime).getTime() - new Date(quizAttempt.start_time).getTime();
                    const durationMinutes = Math.round(durationMs / (1000 * 60));
                    const answeredQuestionsCount = Object.keys(userAnswers).length;

                    const activityData = {
                        user_id: user.id,
                        tenant_id: tenantId,
                        activity_type: 'quiz_completion',
                        task_id: quiz.id,
                        task_title: quiz.title,
                        session_data: {
                            start_time: quizAttempt.start_time,
                            completion_time: endTime,
                            duration_minutes: durationMinutes,
                            attempts_count: 1 // Assuming each attempt is logged individually
                        },
                        performance_metrics: {
                            score: score,
                            errors_detected: detailedAnswers
                                .filter(ans => !ans.is_correct)
                                .map(ans => {
                                    const question = questions.find(q => q.id === ans.question_id);
                                    return `Question: '${question?.question_text || ans.question_id}' - Incorrect answer selected.`;
                                }),
                            strengths: passed ? [`Strong performance in '${quiz.title}' (Score: ${score}%)`] : [],
                            weaknesses: !passed ? [`Needs improvement in '${quiz.title}' (Score: ${score}%)`] : [],
                            next_steps: !passed ? 
                                [`Review topics covered in '${quiz.title}'`, `Reattempt similar quizzes to reinforce understanding.`] :
                                [`Continue to advanced topics related to '${quiz.title}'.`]
                        },
                        ai_feedback: {
                            detailed_feedback: `Quiz '${quiz.title}' completed with a score of ${score}%. ${
                                passed ? 'Excellent work! You\'ve demonstrated a solid understanding of the material.' :
                                'Consider reviewing the topics where errors occurred to improve your knowledge.'
                            }`,
                            difficulty_assessment: score >= 85 ? 'appropriate' : score >= 60 ? 'challenging' : 'too_hard',
                            engagement_level: answeredQuestionsCount === questions.length ? 'high' : 'medium'
                        },
                        learning_analytics: {
                            concepts_mastered: passed ? [quiz.category || 'General'] : [],
                            concepts_struggling: !passed ? [quiz.category || 'General'] : [],
                            learning_path_status: passed ? 'on_track' : 'needs_support',
                            predicted_success_rate: Math.max(20, score - 10) // Basic heuristic
                        }
                    };

                    console.log('[TakeQuiz] Recording StudentActivityLog:', activityData);
                    await StudentActivityLog.create(activityData);
                    console.log('[TakeQuiz] StudentActivityLog recorded successfully.');

                } catch (activityError) {
                    console.error('[TakeQuiz] Failed to record StudentActivityLog:', activityError);
                    // Do not block quiz completion if activity logging fails
                }

                // Points and UserProgress update
                if (passed) {
                    const pointsAwarded = Math.max(10, Math.floor(score / 10) * 5); // Minimum 10 points, more for higher scores
                    
                    // Try to find existing progress
                    let userProgressList = await UserProgress.filter({ user_id: user.id });
                    
                    if (userProgressList.length === 0) {
                        // Create new progress record
                        await UserProgress.create({
                            user_id: user.id,
                            tenant_id: tenantId,
                            user_full_name: user.full_name,
                            total_scenarios_completed: 0,
                            total_scenarios_attempted: 0,
                            average_score: score,
                            total_time_spent: 0,
                            points: pointsAwarded,
                            level: 1,
                            points_to_next_level: 100, // First level requires 100 points
                            current_streak: 1,
                            longest_streak: 1,
                            quiz_attempts: 1,
                            quiz_completions: 1,
                            total_quiz_points: pointsAwarded
                        });
                    } else {
                        // Update existing progress
                        const userProgress = userProgressList[0];
                        
                        const newTotalPoints = (userProgress.points || 0) + pointsAwarded;
                        const newQuizCompletions = (userProgress.quiz_completions || 0) + 1;
                        const newLevel = Math.floor(newTotalPoints / 100) + 1;
                        
                        await UserProgress.update(userProgress.id, {
                            tenant_id: userProgress.tenant_id || tenantId, // Backfill tenant_id if missing
                            user_full_name: user.full_name, // Update name in case it changed
                            points: newTotalPoints,
                            level: newLevel,
                            points_to_next_level: 100 - (newTotalPoints % 100),
                            quiz_attempts: (userProgress.quiz_attempts || 0) + 1,
                            quiz_completions: newQuizCompletions,
                            total_quiz_points: (userProgress.total_quiz_points || 0) + pointsAwarded,
                            average_score: Math.round(((userProgress.average_score || 0) * (userProgress.quiz_completions || 0) + score) / newQuizCompletions),
                            current_streak: (userProgress.current_streak || 0) + 1,
                            longest_streak: Math.max((userProgress.longest_streak || 0), (userProgress.current_streak || 0) + 1),
                            last_activity: new Date().toISOString()
                        });
                    }
                    
                    // Also create a points activity record
                    try {
                        await PointsActivity.create({
                            user_id: user.id,
                            activity_type: 'quiz_completed',
                            points_earned: pointsAwarded,
                            reference_id: quiz.id,
                            metadata: {
                                quiz_title: quiz.title,
                                score: score,
                                passed: passed
                            },
                            timestamp: new Date().toISOString()
                        });
                    } catch (activityError) {
                        console.error('[QUIZ] Failed to create points activity:', activityError);
                        // Do not block completion for activity logging failure
                    }
                    showNotification('success', `${pointsAwarded} points awarded! Your progress has been updated.`);
                }
            }
        } catch (error) {
            console.error("Error saving quiz attempt and progress:", error);
            showNotification('error', 'Failed to save your progress.');
        } finally {
            setShowResultsModal(true);
            setIsCompleted(false); // Reset for next interaction if user closes modal
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
    };
    
    const handleDownloadCertificate = () => {
        const studentName = user?.full_name || "Valued Student";
        const courseName = quiz?.title || "Cybersecurity Training";
        navigate(createPageUrl(`Certificate?studentName=${encodeURIComponent(studentName)}&courseName=${encodeURIComponent(courseName)}`));
    };

    const handleShareToLinkedIn = () => {
        const studentName = user?.full_name || "Valued Student";
        const courseName = quiz?.title || "Cybersecurity Training";
        const organizationName = "Hack The SOC"; // Replace with actual org name if available
        const certificateUrl = window.location.href; // Placeholder, ideally a permanent URL

        const linkedInShareUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(courseName)}&organizationName=${encodeURIComponent(organizationName)}&issueYear=${new Date().getFullYear()}&issueMonth=${new Date().getMonth() + 1}&certUrl=${encodeURIComponent(certificateUrl)}`;
        
        window.open(linkedInShareUrl, '_blank');
    };

    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const currentQuestion = questions[currentQuestionIndex];
    const isCurrentQuestionAnswered = currentQuestion && !!userAnswers[currentQuestion.id];

    const handleNextClick = () => {
        if (isLastQuestion) {
            handleCompleteQuiz();
        } else {
            handleNext();
        }
    };
    
    if (error) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-white">
                 <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-400 mb-4">Error Loading Quiz</h1>
                    <p className="text-white mb-4">{error}</p>
                    <Button onClick={() => navigate(createPageUrl('QuizPage'))} className="bg-teal-600 hover:bg-teal-700">
                        Back to Quizzes
                    </Button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
             <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-900 p-4" dir="ltr">
            <NotificationComponent />
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <Button variant="link" onClick={() => navigate(createPageUrl('QuizPage'))} className="text-teal-400 hover:text-teal-300 p-0">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Quizzes
                    </Button>
                    <div className="text-slate-400 text-sm">
                        Question {currentQuestionIndex + 1} of {questions.length}
                    </div>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">{quiz?.title}</h1>
                    {quiz?.description && <p className="text-slate-400">{quiz.description}</p>}
                </div>

                {currentQuestion ? (
                    <div className="bg-slate-800 rounded-lg p-6 mb-8">
                        <h2 className="text-xl font-semibold text-white mb-6">{currentQuestion.question_text}</h2>
                        <div className="space-y-3">
                            {currentQuestion.answer_options?.map((option, index) => {
                                const isSelected = userAnswers[currentQuestion.id] === option.id;
                                const showFeedback = !!userAnswers[currentQuestion.id];
                                const isCorrect = option.is_correct;
                                
                                let buttonClass = "w-full text-left p-4 rounded-lg border transition-all flex items-center";
                                if (showFeedback) {
                                    if (isCorrect) buttonClass += " bg-green-500/20 border-green-500 text-white";
                                    else if (isSelected) buttonClass += " bg-red-500/20 border-red-500 text-white";
                                    else buttonClass += " bg-slate-700 border-slate-600 text-slate-400";
                                } else {
                                    buttonClass += isSelected ? " bg-teal-500/20 border-teal-500 text-white" : " bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600";
                                }

                                return (
                                    <button key={option.id} onClick={() => !showFeedback && handleAnswer(currentQuestion.id, option.id)} className={buttonClass} disabled={showFeedback}>
                                        <span className="w-6 h-6 rounded-full border-2 border-current mr-4 flex-shrink-0 flex items-center justify-center text-xs font-bold">{String.fromCharCode(65 + index)}</span>
                                        {option.text}
                                    </button>
                                );
                            })}
                        </div>
                        
                        {isCurrentQuestionAnswered && currentQuestion.explanation && (
                            <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
                                <h3 className="font-semibold text-teal-400 mb-2">Explanation:</h3>
                                <p className="text-slate-300">{currentQuestion.explanation}</p>
                            </div>
                        )}
                    </div>
                ) : <div className="text-center text-slate-400 p-8">No questions found for this quiz.</div>}

                {questions.length > 0 && (
                    <div className="flex justify-between items-center">
                        <Button onClick={handlePrev} disabled={currentQuestionIndex === 0} variant="outline" className="text-white">Previous</Button>
                        <div className="flex space-x-2">
                            {questions.map((q, index) => (
                                <div key={q.id} className={`w-2.5 h-2.5 rounded-full ${index === currentQuestionIndex ? 'bg-teal-400' : userAnswers[q.id] ? 'bg-green-500' : 'bg-slate-600'}`} />
                            ))}
                        </div>
                        <Button onClick={isLastQuestion ? handleCompleteQuiz : handleNextClick} disabled={!isCurrentQuestionAnswered || (isLastQuestion && isCompleted)} className="bg-teal-600 hover:bg-teal-700">
                            {isLastQuestion ? (isCompleted ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Complete') : 'Next'}
                        </Button>
                    </div>
                )}
            </div>

            <Dialog open={showResultsModal} onOpenChange={() => setShowResultsModal(false)}>
                <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-lg">
                    <div className="text-center p-6">
                        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
                        <p className="text-slate-400 mb-6">Here are your results for "{quiz?.title}".</p>
                        
                        <div className={`text-6xl font-bold mb-4 ${finalResults?.passed ? 'text-green-400' : 'text-red-400'}`}>
                            {finalResults?.score}%
                        </div>
                        
                        <div className="flex justify-center items-center gap-6 mb-8 text-slate-300">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-white">{finalResults?.correctCount} / {questions.length}</p>
                                <p className="text-xs text-slate-500">Correct Answers</p>
                            </div>
                            <div className="text-center">
                                {finalResults?.passed ? (
                                    <CheckCircle className="w-10 h-10 text-green-500" />
                                ) : (
                                    <XCircle className="w-10 h-10 text-red-500" />
                                )}
                                <p className="text-xs text-slate-500 mt-1">Result</p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-3">
                            {finalResults?.passed && (
                                <>
                                    <Button onClick={handleDownloadCertificate} className="w-full bg-teal-600 hover:bg-teal-700">
                                        <Download className="w-4 h-4 mr-2" />
                                        Download Certificate
                                    </Button>
                                    <Button onClick={handleShareToLinkedIn} className="w-full bg-blue-600 hover:bg-blue-700">
                                        <LinkedinIcon />
                                        Share on LinkedIn
                                    </Button>
                                </>
                            )}
                             <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="w-full bg-slate-700 hover:bg-slate-600">
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
