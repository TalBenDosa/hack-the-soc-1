import React, { useState, useEffect } from 'react';
import { Quiz } from '@/entities/Quiz';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Play, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuizListPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuizzes = async () => {
      setIsLoading(true);
      try {
        const publishedQuizzes = await Quiz.filter({ is_published: true });
        setQuizzes(publishedQuizzes);
      } catch (error) {
        console.error("Failed to fetch quizzes:", error);
      }
      setIsLoading(false);
    };
    fetchQuizzes();
  }, []);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Beginner": return "text-green-400 bg-green-400/20 border-green-500/30";
      case "Intermediate": return "text-yellow-400 bg-yellow-400/20 border-yellow-500/30";
      case "Advanced": return "text-red-400 bg-red-400/20 border-red-500/30";
      default: return "text-gray-400 bg-gray-400/20 border-gray-500/30";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900">
        <div className="text-center">
            <Loader2 className="w-12 h-12 text-teal-400 animate-spin mx-auto" />
            <p className="mt-4 text-white">Loading Quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Trophy className="w-8 h-8 text-teal-400" />
              Knowledge Quizzes
            </h1>
            <p className="text-slate-400 mt-2">Select a quiz to test your skills.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.length > 0 ? (
              quizzes.map(quiz => (
                <Card key={quiz.id} className="bg-slate-800 border-slate-700 flex flex-col hover:border-teal-500/50 transition-colors">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-semibold text-white">{quiz.title}</CardTitle>
                      <Badge className={`${getDifficultyColor(quiz.difficulty)} border`}>{quiz.difficulty}</Badge>
                    </div>
                    <p className="text-sm text-teal-400 pt-1">{quiz.category}</p>
                    <p className="text-sm text-slate-400 pt-2">{quiz.description}</p>
                  </CardHeader>
                  <CardContent className="flex-grow">
                     <div className="flex items-center gap-2 text-sm text-slate-400">
                          <BookOpen className="w-4 h-4" />
                          <span>{quiz.total_questions || 0} Questions</span>
                      </div>
                  </CardContent>
                  <div className="p-4 mt-auto">
                     <Link to={createPageUrl(`TakeQuiz?id=${quiz.id}`)}>
                          <Button className="w-full bg-teal-600 hover:bg-teal-700">
                              <Play className="w-4 h-4 mr-2" />
                              Start Quiz
                          </Button>
                     </Link>
                  </div>
                </Card>
              ))
            ) : (
              <p className="col-span-full text-center text-slate-400">No published quizzes available at the moment.</p>
            )}
          </div>
        </div>
      </div>
  );
}