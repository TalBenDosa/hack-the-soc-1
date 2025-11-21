import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Lightbulb } from 'lucide-react';

const QuestionCard = ({ question, userAnswer, onAnswerChange, onCheckAnswer, isRevealed, mode }) => {

  const getDifficultyColor = (difficulty) => {
    const colors = {
      Easy: "bg-green-500/20 text-green-400 border-green-500/40",
      Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
      Hard: "bg-red-500/20 text-red-400 border-red-500/40",
    };
    return colors[difficulty] || "bg-slate-600";
  };

  const selectedOption = question.options.find(opt => opt.id === userAnswer);
  const isCorrect = selectedOption?.is_correct;

  const getOptionStyling = (option) => {
    if (!isRevealed) {
      return userAnswer === option.id ? "bg-slate-700/80 border-teal-500" : "border-slate-700";
    }
    if (option.is_correct) {
      return "bg-green-500/20 border-green-500/80";
    }
    if (userAnswer === option.id && !option.is_correct) {
      return "bg-red-500/20 border-red-500/80";
    }
    return "border-slate-700";
  };

  return (
    <Card className="bg-slate-800/80 border border-slate-700 text-white backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-lg font-semibold leading-snug">{question.question_text}</CardTitle>
          <Badge className={`border text-xs shrink-0 ${getDifficultyColor(question.difficulty)}`}>
            {question.difficulty}
          </Badge>
        </div>
        <p className="text-sm text-teal-400 pt-1">{question.category}</p>
      </CardHeader>
      <CardContent>
        <RadioGroup value={userAnswer} onValueChange={(value) => onAnswerChange(question.id, value)} disabled={isRevealed}>
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <Label
                key={option.id}
                htmlFor={`${question.id}-${option.id}`}
                className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer hover:bg-slate-700/50 ${getOptionStyling(option)}`}
              >
                <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                <span className="font-mono text-teal-400">{String.fromCharCode(65 + index)}.</span>
                <span className="flex-1">{option.text}</span>
                {isRevealed && userAnswer === option.id && (
                  isCorrect ? <CheckCircle className="text-green-400" /> : <XCircle className="text-red-400" />
                )}
              </Label>
            ))}
          </div>
        </RadioGroup>

        {mode === 'Study' && !isRevealed && (
          <Button onClick={() => onCheckAnswer(question.id)} disabled={!userAnswer} className="mt-6 w-full bg-teal-600 hover:bg-teal-700">
            Check Answer
          </Button>
        )}

        {isRevealed && (
          <div className="mt-6 p-4 bg-slate-900/70 border-l-4 border-teal-500 rounded-r-lg">
            <h4 className="font-bold text-md mb-2 flex items-center gap-2 text-teal-400"><Lightbulb /> Explanation</h4>
            <p className="text-slate-300">{question.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuestionCard;