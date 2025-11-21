import React, { useState, useEffect } from "react";
import { Quiz, Question } from "@/entities/all";
import { InvokeLLM } from "@/integrations/Core";
import StableModal from "@/components/ui/StableModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Edit, 
  Sparkles, 
  Loader2,
  GripVertical,
  AlertTriangle
} from "lucide-react";
import { useNotification } from "./Notification";
import QuestionEditor from "./QuestionEditor";

const CATEGORIES = ["Fundamentals", "Threat Detection", "Incident Response", "Forensics", "Advanced Topics", "Network Security", "Malware Analysis", "Compliance"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

export default function QuizEditor({ quiz, onClose, onSave }) {
  const [quizData, setQuizData] = useState({
    title: "",
    description: "",
    category: "Fundamentals",
    difficulty: "Beginner",
    is_published: false,
    estimated_time: 10,
    passing_score: 70,
    tags: []
  });
  
  const [questions, setQuestions] = useState([]);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [showNotification, NotificationComponent] = useNotification();

  useEffect(() => {
    if (quiz) {
      setQuizData({
        title: quiz.title || "",
        description: quiz.description || "",
        category: quiz.category || "Fundamentals",
        difficulty: quiz.difficulty || "Beginner",
        is_published: quiz.is_published || false,
        estimated_time: quiz.estimated_time || 10,
        passing_score: quiz.passing_score || 70,
        tags: quiz.tags || []
      });
      loadQuestions();
    }
  }, [quiz]);

  const loadQuestions = async () => {
    if (!quiz?.id) return;
    try {
      const quizQuestions = await Question.filter({ quiz_id: quiz.id });
      setQuestions(quizQuestions.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)));
    } catch (error) {
      console.error("Failed to load questions:", error);
    }
  };

  const handleSave = async () => {
    if (!quizData.title.trim()) {
      showNotification("Please enter a quiz title", "error");
      return;
    }

    try {
      const saveData = {
        ...quizData,
        total_questions: questions.length
      };

      let savedQuiz;
      if (quiz?.id) {
        await Quiz.update(quiz.id, saveData);
        savedQuiz = { ...quiz, ...saveData };
      } else {
        savedQuiz = await Quiz.create(saveData);
      }

      // Update question order indices
      for (let i = 0; i < questions.length; i++) {
        if (questions[i].order_index !== i) {
          await Question.update(questions[i].id, { order_index: i });
        }
      }

      showNotification("Quiz saved successfully!", "success");
      if (onSave) onSave(savedQuiz);
    } catch (error) {
      console.error("Failed to save quiz:", error);
      showNotification("Failed to save quiz. Please try again.", "error");
    }
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setShowQuestionEditor(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setShowQuestionEditor(true);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        await Question.delete(questionId);
        setQuestions(prev => prev.filter(q => q.id !== questionId));
        showNotification("Question deleted successfully", "success");
      } catch (error) {
        console.error("Failed to delete question:", error);
        showNotification("Failed to delete question", "error");
      }
    }
  };

  const handleQuestionSaved = (savedQuestion) => {
    if (editingQuestion) {
      setQuestions(prev => prev.map(q => q.id === savedQuestion.id ? savedQuestion : q));
    } else {
      setQuestions(prev => [...prev, { ...savedQuestion, order_index: prev.length }]);
    }
    setShowQuestionEditor(false);
    setEditingQuestion(null);
  };

  const generateAIQuestions = async () => {
    if (!aiTopic.trim()) {
      showNotification("Please enter a topic for AI generation", "error");
      return;
    }

    if (!quiz?.id) {
      showNotification("Please save the quiz first before generating AI questions", "error");
      return;
    }

    setIsGeneratingAI(true);
    showNotification("Generating 10 AI questions... This may take up to 30 seconds.", "info", 10000);

    const questionSchema = {
      type: "object",
      properties: {
        questions: {
          type: "array",
          minItems: 10,
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              question_text: {
                type: "string",
                description: "Clear, concise question text"
              },
              answer_options: {
                type: "array",
                minItems: 4,
                maxItems: 4,
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    is_correct: { type: "boolean" }
                  },
                  required: ["text", "is_correct"]
                },
                description: "Exactly 4 answer options with only one marked as correct"
              },
              explanation: {
                type: "string",
                description: "Brief explanation of why the correct answer is right"
              },
              difficulty: {
                type: "string",
                enum: ["Easy", "Medium", "Hard"]
              }
            },
            required: ["question_text", "answer_options", "explanation"]
          }
        }
      },
      required: ["questions"]
    };

    try {
      const generatedData = await InvokeLLM({
        prompt: `Create exactly 10 high-quality multiple-choice questions about: "${aiTopic}"

CRITICAL REQUIREMENTS:
1. Generate EXACTLY 10 questions - no more, no less
2. Each question must have EXACTLY 4 answer options
3. Only ONE answer option should be marked as correct (is_correct: true)
4. Questions should be clear, professional, and educational
5. Include brief explanations for correct answers
6. Mix difficulty levels appropriately
7. Ensure questions test understanding, not just memorization
8. Make incorrect options plausible but clearly wrong to an expert
9. Use professional, clear language throughout

Topic Context: This is for SOC analyst training, so questions should be practical and relevant to real-world cybersecurity scenarios.

Return valid JSON matching the exact schema provided.`,
        response_json_schema: questionSchema
      });

      if (!generatedData.questions || generatedData.questions.length !== 10) {
        throw new Error(`Expected exactly 10 questions, got ${generatedData.questions?.length || 0}`);
      }

      // Convert AI questions to our format and save
      const aiQuestions = [];
      for (let i = 0; i < generatedData.questions.length; i++) {
        const aiQ = generatedData.questions[i];
        
        // Validate that exactly one answer is correct
        const correctCount = aiQ.answer_options.filter(opt => opt.is_correct).length;
        if (correctCount !== 1) {
          throw new Error(`Question ${i + 1} has ${correctCount} correct answers, should have exactly 1`);
        }

        const questionData = {
          quiz_id: quiz.id,
          question_text: aiQ.question_text,
          answer_options: aiQ.answer_options.map((opt, idx) => ({
            id: `ai_${Date.now()}_${i}_${idx}`,
            text: opt.text,
            is_correct: opt.is_correct
          })),
          explanation: aiQ.explanation,
          difficulty: aiQ.difficulty || "Medium",
          order_index: questions.length + i,
          source_type: "ai_generated",
          ai_metadata: {
            generation_date: new Date().toISOString(),
            topic: aiTopic,
            model_used: "InvokeLLM"
          }
        };

        const savedQuestion = await Question.create(questionData);
        aiQuestions.push(savedQuestion);
      }

      setQuestions(prev => [...prev, ...aiQuestions]);
      setAiTopic("");
      showNotification(`Successfully generated and saved ${aiQuestions.length} AI questions!`, "success");
      
    } catch (error) {
      console.error("AI question generation failed:", error);
      showNotification(`AI generation failed: ${error.message}`, "error");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <>
      <NotificationComponent />
      <StableModal
        isOpen={true}
        onClose={onClose}
        title={quiz ? "Edit Quiz" : "Create New Quiz"}
        maxWidth="6xl"
        footer={
          <div className="flex justify-between w-full items-center">
            <label className="flex items-center gap-2 text-sm">
              <Switch 
                checked={quizData.is_published} 
                onCheckedChange={(checked) => setQuizData(prev => ({...prev, is_published: checked}))} 
              />
              <span className="text-slate-300">
                {quizData.is_published ? "Published" : "Draft"}
              </span>
            </label>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
                <Save className="w-4 h-4 mr-2" />
                Save Quiz
              </Button>
            </div>
          </div>
        }
      >
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="bg-slate-700 border-slate-600">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="questions">Questions ({questions.length})</TabsTrigger>
            <TabsTrigger value="ai-generator">AI Generator</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Quiz Title *</label>
                  <Input 
                    value={quizData.title} 
                    onChange={(e) => setQuizData(prev => ({...prev, title: e.target.value}))} 
                    className="bg-slate-700 border-slate-600 text-white" 
                    placeholder="Enter quiz title"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Description</label>
                  <Textarea 
                    value={quizData.description} 
                    onChange={(e) => setQuizData(prev => ({...prev, description: e.target.value}))} 
                    className="bg-slate-700 border-slate-600 text-white h-24" 
                    placeholder="Describe what this quiz covers"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Category</label>
                    <Select 
                      value={quizData.category} 
                      onValueChange={(value) => setQuizData(prev => ({...prev, category: value}))}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 z-[9999]">
                        {CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Difficulty</label>
                    <Select 
                      value={quizData.difficulty} 
                      onValueChange={(value) => setQuizData(prev => ({...prev, difficulty: value}))}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 z-[9999]">
                        {DIFFICULTIES.map(d => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Estimated Time (min)</label>
                    <Input 
                      type="number" 
                      value={quizData.estimated_time} 
                      onChange={(e) => setQuizData(prev => ({...prev, estimated_time: parseInt(e.target.value) || 10}))} 
                      className="bg-slate-700 border-slate-600 text-white" 
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Passing Score (%)</label>
                    <Input 
                      type="number" 
                      value={quizData.passing_score} 
                      onChange={(e) => setQuizData(prev => ({...prev, passing_score: parseInt(e.target.value) || 70}))} 
                      className="bg-slate-700 border-slate-600 text-white" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Questions</h3>
              <Button onClick={handleAddQuestion} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>

            <div className="space-y-3">
              {questions.length === 0 ? (
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-400 mb-4">No questions added yet</p>
                      <Button onClick={handleAddQuestion} variant="outline" className="border-slate-600 text-slate-300">
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Question
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                questions.map((question, index) => (
                  <Card key={question.id} className="bg-slate-700/50 border-slate-600">
                    <CardHeader className="flex flex-row items-center space-y-0 pb-3">
                      <GripVertical className="w-4 h-4 text-slate-400 mr-2" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-slate-600 text-slate-200">Q{index + 1}</Badge>
                          {question.source_type === 'ai_generated' && (
                            <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI Generated
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-white mt-1 font-medium truncate">
                          {question.question_text}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditQuestion(question)}
                        >
                          <Edit className="w-4 h-4 text-blue-400" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteQuestion(question.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-slate-400">
                        {question.answer_options?.length || 0} answer options • 
                        {question.answer_options?.filter(opt => opt.is_correct).length || 0} correct
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="ai-generator" className="space-y-4">
            <Card className="bg-slate-700/50 border-slate-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  AI Question Generator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-slate-300 mb-2 block">Topic for AI Generation</label>
                  <Input 
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g., Network Security Fundamentals, Malware Analysis Techniques..."
                    className="bg-slate-700 border-slate-600 text-white" 
                    disabled={isGeneratingAI}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    The AI will generate exactly 10 multiple-choice questions based on this topic.
                  </p>
                </div>

                <Button 
                  onClick={generateAIQuestions} 
                  disabled={!aiTopic.trim() || isGeneratingAI}
                  className="bg-purple-600 hover:bg-purple-700 w-full"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate 10 AI Questions
                    </>
                  )}
                </Button>

                {!quiz?.id && (
                  <div className="bg-yellow-900/50 border border-yellow-500/50 text-yellow-300 p-3 rounded-lg text-sm">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Please save the quiz first before generating AI questions.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </StableModal>

      {showQuestionEditor && (
        <QuestionEditor
          question={editingQuestion}
          quizId={quiz?.id}
          onClose={() => {
            setShowQuestionEditor(false);
            setEditingQuestion(null);
          }}
          onSave={handleQuestionSaved}
        />
      )}
    </>
  );
}