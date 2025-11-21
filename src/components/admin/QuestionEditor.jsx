import React, { useState, useEffect } from "react";
import { Question } from "@/entities/Question";
import StableModal from "@/components/ui/StableModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, Plus, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { useNotification } from "./Notification";

export default function QuestionEditor({ question, quizId, onClose, onSave }) {
  const [questionData, setQuestionData] = useState({
    question_text: "",
    explanation: "",
    difficulty: "Medium",
    points: 1,
    answer_options: [
      { id: "opt1", text: "", is_correct: false },
      { id: "opt2", text: "", is_correct: false },
      { id: "opt3", text: "", is_correct: false },
      { id: "opt4", text: "", is_correct: false }
    ]
  });

  const [showNotification, NotificationComponent] = useNotification();

  useEffect(() => {
    if (question) {
      setQuestionData({
        question_text: question.question_text || "",
        explanation: question.explanation || "",
        difficulty: question.difficulty || "Medium",
        points: question.points || 1,
        answer_options: question.answer_options?.length >= 2 ? question.answer_options : [
          { id: "opt1", text: "", is_correct: false },
          { id: "opt2", text: "", is_correct: false },
          { id: "opt3", text: "", is_correct: false },
          { id: "opt4", text: "", is_correct: false }
        ]
      });
    }
  }, [question]);

  const updateAnswerOption = (index, field, value) => {
    setQuestionData(prev => ({
      ...prev,
      answer_options: prev.answer_options.map((opt, i) => 
        i === index ? { ...opt, [field]: value } : opt
      )
    }));
  };

  const addAnswerOption = () => {
    if (questionData.answer_options.length >= 6) return;
    
    setQuestionData(prev => ({
      ...prev,
      answer_options: [
        ...prev.answer_options,
        { id: `opt${prev.answer_options.length + 1}`, text: "", is_correct: false }
      ]
    }));
  };

  const removeAnswerOption = (index) => {
    if (questionData.answer_options.length <= 2) return;
    
    setQuestionData(prev => ({
      ...prev,
      answer_options: prev.answer_options.filter((_, i) => i !== index)
    }));
  };

  const toggleCorrectAnswer = (index) => {
    setQuestionData(prev => ({
      ...prev,
      answer_options: prev.answer_options.map((opt, i) => ({
        ...opt,
        is_correct: i === index ? !opt.is_correct : opt.is_correct
      }))
    }));
  };

  const validateQuestion = () => {
    if (!questionData.question_text.trim()) {
      showNotification("Please enter a question", "error");
      return false;
    }

    const filledOptions = questionData.answer_options.filter(opt => opt.text.trim());
    if (filledOptions.length < 2) {
      showNotification("Please provide at least 2 answer options", "error");
      return false;
    }

    const correctAnswers = questionData.answer_options.filter(opt => opt.is_correct && opt.text.trim());
    if (correctAnswers.length === 0) {
      showNotification("Please mark at least one correct answer", "error");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateQuestion()) return;

    try {
      const saveData = {
        ...questionData,
        quiz_id: quizId,
        source_type: question?.source_type || "manual",
        order_index: question?.order_index ?? 0
      };

      let savedQuestion;
      if (question?.id) {
        await Question.update(question.id, saveData);
        savedQuestion = { ...question, ...saveData };
      } else {
        savedQuestion = await Question.create(saveData);
      }

      showNotification("Question saved successfully!", "success");
      if (onSave) onSave(savedQuestion);
    } catch (error) {
      console.error("Failed to save question:", error);
      showNotification("Failed to save question. Please try again.", "error");
    }
  };

  const correctAnswersCount = questionData.answer_options.filter(opt => opt.is_correct && opt.text.trim()).length;
  const filledOptionsCount = questionData.answer_options.filter(opt => opt.text.trim()).length;

  return (
    <>
      <NotificationComponent />
      <StableModal
        isOpen={true}
        onClose={onClose}
        title={question ? "Edit Question" : "Create New Question"}
        maxWidth="4xl"
        footer={
          <div className="flex justify-between w-full items-center">
            <div className="text-sm text-slate-400">
              {filledOptionsCount} options • {correctAnswersCount} correct answers
            </div>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
                <Save className="w-4 h-4 mr-2" />
                Save Question
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Question Text */}
          <div>
            <label className="text-sm text-slate-300 mb-2 block">Question Text *</label>
            <Textarea
              value={questionData.question_text}
              onChange={(e) => setQuestionData(prev => ({...prev, question_text: e.target.value}))}
              className="bg-slate-700 border-slate-600 text-white h-24"
              placeholder="Enter your question here..."
            />
          </div>

          {/* Question Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Difficulty</label>
              <Select 
                value={questionData.difficulty} 
                onValueChange={(value) => setQuestionData(prev => ({...prev, difficulty: value}))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 z-[9999]">
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Points</label>
              <Input
                type="number"
                min="1"
                value={questionData.points}
                onChange={(e) => setQuestionData(prev => ({...prev, points: parseInt(e.target.value) || 1}))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Answer Options */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm text-slate-300">Answer Options *</label>
              <div className="flex items-center gap-2">
                {questionData.answer_options.length < 6 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={addAnswerOption}
                    className="border-slate-600 text-slate-300"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Option
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {questionData.answer_options.map((option, index) => (
                <Card key={option.id} className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge className="bg-slate-600 text-slate-200 shrink-0">
                          {String.fromCharCode(65 + index)}
                        </Badge>
                        <Input
                          value={option.text}
                          onChange={(e) => updateAnswerOption(index, 'text', e.target.value)}
                          className="bg-slate-600 border-slate-500 text-white flex-1"
                          placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        <div 
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                            option.is_correct 
                              ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                              : 'bg-slate-600/50 text-slate-400 border border-slate-500/30 hover:bg-slate-600'
                          }`}
                          onClick={() => toggleCorrectAnswer(index)}
                        >
                          <CheckCircle className="w-3 h-3" />
                          {option.is_correct ? 'Correct' : 'Incorrect'}
                        </div>

                        {questionData.answer_options.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAnswerOption(index)}
                            className="text-red-400 hover:bg-red-500/20 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Validation Messages */}
            {correctAnswersCount === 0 && filledOptionsCount >= 2 && (
              <div className="flex items-center gap-2 text-orange-400 text-sm mt-2">
                <AlertTriangle className="w-4 h-4" />
                Please mark at least one correct answer
              </div>
            )}
          </div>

          {/* Explanation */}
          <div>
            <label className="text-sm text-slate-300 mb-2 block">Explanation (Optional)</label>
            <Textarea
              value={questionData.explanation}
              onChange={(e) => setQuestionData(prev => ({...prev, explanation: e.target.value}))}
              className="bg-slate-700 border-slate-600 text-white h-20"
              placeholder="Explain why the correct answer is right..."
            />
          </div>
        </div>
      </StableModal>
    </>
  );
}