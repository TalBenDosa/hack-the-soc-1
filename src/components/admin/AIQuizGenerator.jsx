import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, X } from "lucide-react";
import { InvokeLLM } from "@/integrations/Core";
import { Quiz } from "@/entities/Quiz";
import { Question } from "@/entities/Question";

const AIQuizGenerator = ({ onClose, onGenerate }) => {
  const [formData, setFormData] = useState({
    topic: "",
    description: "",
    difficulty: "Intermediate",
    category: "Cybersecurity",
    questionCount: 10,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  const handleGenerate = async () => {
    if (!formData.topic.trim()) {
      alert("Please enter a topic for the quiz");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setCurrentStep("Generating quiz structure...");

    try {
      // Step 1: Generate quiz metadata and questions
      setProgress(20);
      const quizSchema = {
        type: "object",
        properties: {
          title: { type: "string", description: "Clear, engaging quiz title" },
          description: { type: "string", description: "Brief description of what the quiz covers" },
          estimated_time: { type: "number", description: "Estimated completion time in minutes" },
          questions: {
            type: "array",
            minItems: parseInt(formData.questionCount),
            maxItems: parseInt(formData.questionCount),
            items: {
              type: "object",
              properties: {
                question_text: { type: "string", description: "Clear, well-formed question" },
                options: {
                  type: "array",
                  items: {
                    type: "object", 
                    properties: {
                      id: { type: "string" },
                      text: { type: "string" },
                      is_correct: { type: "boolean" }
                    },
                    required: ["id", "text", "is_correct"]
                  },
                  minItems: 4,
                  maxItems: 4,
                  description: "Exactly 4 answer options with one correct answer"
                },
                explanation: { type: "string", description: "Detailed explanation for the correct answer" },
                difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
                tags: { type: "array", items: { type: "string" }, description: "Relevant tags for the question" }
              },
              required: ["question_text", "options", "explanation", "difficulty"]
            }
          }
        },
        required: ["title", "description", "estimated_time", "questions"]
      };

      setCurrentStep("AI is creating quiz content...");
      setProgress(40);

      const generatedQuiz = await InvokeLLM({
        prompt: `Create a comprehensive ${formData.difficulty.toLowerCase()} level quiz about "${formData.topic}" in the ${formData.category} category.

Requirements:
- Generate exactly ${formData.questionCount} multiple-choice questions
- Each question must have exactly 4 options (A, B, C, D) with only ONE correct answer
- Questions should be practical, relevant, and educational
- Include detailed explanations for correct answers
- Vary question difficulty appropriately
- Cover different aspects of the topic
- Use clear, professional language
- Make distractors (wrong answers) plausible but clearly incorrect

Topic Focus: ${formData.topic}
${formData.description ? `Additional Context: ${formData.description}` : ''}

Ensure the quiz is engaging, educational, and suitable for cybersecurity professionals or students.`,
        response_json_schema: quizSchema
      });

      setProgress(60);
      setCurrentStep("Creating quiz in database...");

      // Step 2: Create the quiz entity
      const quizData = {
        title: generatedQuiz.title,
        description: generatedQuiz.description || formData.description,
        category: formData.category,
        difficulty: formData.difficulty,
        is_published: false, // Create as draft
        estimated_time: generatedQuiz.estimated_time || Math.ceil(formData.questionCount * 1.5),
        tags: [formData.topic],
        passing_score: 70,
        total_questions: generatedQuiz.questions.length,
        ai_generated_metadata: {
          topic: formData.topic,
          generation_date: new Date().toISOString(),
          model_used: "AI"
        }
      };

      const createdQuiz = await Quiz.create(quizData);
      setProgress(80);
      setCurrentStep("Adding questions to quiz...");

      // Step 3: Create individual questions
      for (let i = 0; i < generatedQuiz.questions.length; i++) {
        const q = generatedQuiz.questions[i];
        
        // Ensure options have proper IDs
        const formattedOptions = q.options.map((opt, idx) => ({
          id: opt.id || String.fromCharCode(65 + idx), // A, B, C, D
          text: opt.text,
          is_correct: opt.is_correct || false
        }));

        // Ensure exactly one correct answer
        const correctCount = formattedOptions.filter(opt => opt.is_correct).length;
        if (correctCount !== 1) {
          // Fix by making first option correct if none are, or only first if multiple
          formattedOptions.forEach((opt, idx) => {
            opt.is_correct = idx === 0;
          });
        }

        const questionData = {
          quiz_id: createdQuiz.id,
          question_text: q.question_text,
          question_type: "multiple_choice",
          answer_options: formattedOptions,
          explanation: q.explanation,
          difficulty: q.difficulty || formData.difficulty,
          tags: q.tags || [formData.topic],
          points: 1,
          order_index: i + 1,
          source_type: "ai_generated",
          ai_metadata: {
            generation_date: new Date().toISOString(),
            topic: formData.topic,
            model_used: "AI"
          }
        };

        await Question.create(questionData);
      }

      setProgress(100);
      setCurrentStep("Quiz generated successfully!");
      
      setTimeout(() => {
        onGenerate();
      }, 1000);

    } catch (error) {
      console.error("Error generating quiz:", error);
      alert("Failed to generate quiz. Please try again.");
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-purple-400" />
            Generate Quiz with AI
          </DialogTitle>
        </DialogHeader>

        {!isGenerating ? (
          <div className="space-y-6 py-4">
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Quiz Topic *</label>
              <Input
                placeholder="e.g., AWS Security, SIEM Analysis, Incident Response"
                value={formData.topic}
                onChange={(e) => setFormData({...formData, topic: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Description (Optional)</label>
              <Textarea
                placeholder="Additional context or specific areas to focus on..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-slate-700 border-slate-600 text-white h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 mb-2 block">Difficulty</label>
                <Select value={formData.difficulty} onValueChange={(v) => setFormData({...formData, difficulty: v})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-2 block">Category</label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="Cybersecurity">Cybersecurity</SelectItem>
                    <SelectItem value="AWS">AWS</SelectItem>
                    <SelectItem value="Azure">Azure</SelectItem>
                    <SelectItem value="Active Directory">Active Directory</SelectItem>
                    <SelectItem value="Microsoft 365">Microsoft 365</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Number of Questions</label>
              <Select value={formData.questionCount.toString()} onValueChange={(v) => setFormData({...formData, questionCount: parseInt(v)})}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                  <SelectItem value="15">15 Questions</SelectItem>
                  <SelectItem value="20">20 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleGenerate} className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Quiz
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Generating Quiz...</h3>
              <p className="text-slate-400 mb-4">{currentStep}</p>
              <Progress value={progress} className="w-full max-w-md mx-auto" />
              <p className="text-sm text-slate-500 mt-2">{progress}% Complete</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AIQuizGenerator;