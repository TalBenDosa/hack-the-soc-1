import React, { useState, useEffect } from "react";
import { Question } from "@/entities/Question";
import StableModal from "@/components/ui/StableModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Clock,
  RotateCcw,
  Eye
} from "lucide-react";

export default function QuizPreview({ quiz, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, [quiz]);

  const loadQuestions = async () => {
    if (!quiz?.id) return;
    
    try {
      const quizQuestions = await Question.filter({ quiz_id: quiz.id });
      const sortedQuestions = quizQuestions.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setQuestions(sortedQuestions);
    } catch (error) {
      console.error("Failed to load questions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, optionId) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
  };

  const calculateResults = () => {
    let correctCount = 0;
    let totalCount = questions.length;

    questions.forEach(question => {
      const selectedAnswer = selectedAnswers[question.id];
      if (selectedAnswer) {
        const correctOption = question.answer_options?.find(opt => opt.is_correct);
        if (correctOption && selectedAnswer === correctOption.id) {
          correctCount++;
        }
      }
    });

    return {
      correct: correctCount,
      total: totalCount,
      percentage: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
    };
  };

  if (isLoading) {
    return (
      <StableModal isOpen={true} onClose={onClose} title="Loading Quiz Preview...">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
        </div>
      </StableModal>
    );
  }

  if (questions.length === 0) {
    return (
      <StableModal isOpen={true} onClose={onClose} title="Quiz Preview">
        <div className="text-center py-12">
          <p className="text-slate-400 mb-4">This quiz has no questions yet.</p>
          <Button onClick={onClose}>Close Preview</Button>
        </div>
      </StableModal>
    );
  }

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const results = showResults ? calculateResults() : null;

  return (
    <StableModal
      isOpen={true}
      onClose={onClose}
      title={`Quiz Preview: ${quiz.title}`}
      maxWidth="4xl"
      footer={
        showResults ? (
          <div className="flex justify-between w-full">
            <Button variant="outline" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart Preview
            </Button>
            <Button onClick={onClose} className="bg-teal-600 hover:bg-teal-700">
              Close Preview
            </Button>
          </div>
        ) : (
          <div className="flex justify-between w-full">
            <Button 
              variant="outline" 
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">
                Question {currentQuestion + 1} of {questions.length}
              </span>
            </div>
            
            <Button 
              onClick={handleNext}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )
      }
    >
      {/* Quiz Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Badge className="bg-teal-600/20 text-teal-400 border-teal-500/30">
            <Eye className="w-3 h-3 mr-1" />
            Preview Mode
          </Badge>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Clock className="w-4 h-4" />
            Estimated: {quiz.estimated_time} min
          </div>
        </div>
        
        {!showResults && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-300">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </div>

      {showResults ? (
        /* Results View */
        <div className="space-y-6">
          <Card className="bg-slate-700/50 border-slate-600">
            <CardHeader>
              <CardTitle className="text-center text-white flex items-center justify-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                Quiz Results
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-white">{results.correct}</div>
                  <div className="text-sm text-slate-400">Correct</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{results.total}</div>
                  <div className="text-sm text-slate-400">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-teal-400">{results.percentage}%</div>
                  <div className="text-sm text-slate-400">Score</div>
                </div>
              </div>
              
              <div className={`text-lg font-semibold ${
                results.percentage >= quiz.passing_score ? 'text-green-400' : 'text-orange-400'
              }`}>
                {results.percentage >= quiz.passing_score ? 'PASSED' : 'NEEDS IMPROVEMENT'}
              </div>
            </CardContent>
          </Card>

          {/* Question Review */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Question Review</h3>
            {questions.map((question, index) => {
              const selectedAnswer = selectedAnswers[question.id];
              const correctOption = question.answer_options?.find(opt => opt.is_correct);
              const selectedOption = question.answer_options?.find(opt => opt.id === selectedAnswer);
              const isCorrect = selectedAnswer === correctOption?.id;

              return (
                <Card key={question.id} className="bg-slate-700/50 border-slate-600">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-600 text-slate-200">Q{index + 1}</Badge>
                        {isCorrect ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <X className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <Badge className={isCorrect ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}>
                        {isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                    </div>
                    <p className="text-white text-sm">{question.question_text}</p>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2 text-sm">
                    {selectedOption && (
                      <div>
                        <span className="text-slate-400">Your answer: </span>
                        <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
                          {selectedOption.text}
                        </span>
                      </div>
                    )}
                    {!isCorrect && correctOption && (
                      <div>
                        <span className="text-slate-400">Correct answer: </span>
                        <span className="text-green-400">{correctOption.text}</span>
                      </div>
                    )}
                    {question.explanation && (
                      <div className="bg-slate-800/50 p-3 rounded text-slate-300">
                        <strong>Explanation:</strong> {question.explanation}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        /* Question View */
        <Card className="bg-slate-700/50 border-slate-600">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge className="bg-slate-600 text-slate-200">
                Question {currentQuestion + 1}
              </Badge>
              {currentQ.difficulty && (
                <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">
                  {currentQ.difficulty}
                </Badge>
              )}
            </div>
            <CardTitle className="text-white text-lg">
              {currentQ.question_text}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentQ.answer_options?.map((option, index) => {
              const isSelected = selectedAnswers[currentQ.id] === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => handleAnswerSelect(currentQ.id, option.id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-500/10'
                      : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-slate-600 text-slate-200">
                      {String.fromCharCode(65 + index)}
                    </Badge>
                    <span className="text-white">{option.text}</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </StableModal>
  );
}