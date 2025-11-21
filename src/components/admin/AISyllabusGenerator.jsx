
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, BookOpen, CheckCircle, AlertCircle, X } from "lucide-react";
import { InvokeLLM } from "@/integrations/Core";
import { Lesson } from "@/entities/Lesson";

export default function AISyllabusGenerator({ onClose, onGenerate, tenant, isSuperAdminGlobal }) {
  const [syllabus, setSyllabus] = useState('');
  const [courseTitle, setCourseTitle] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [category, setCategory] = useState('Fundamentals');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState([]);
  const [generatedLessons, setGeneratedLessons] = useState([]);

  const lessonPrompt = (lessonTitle) => `
You are a world-class cybersecurity training curriculum developer. Your task is to generate a single, comprehensive, and professionally formatted lesson page based on the title "${lessonTitle}". The overall course is titled "${courseTitle}".

**CRITICAL INSTRUCTIONS:**
1.  **Output Format:** The ENTIRE output MUST be in a single block of well-structured Markdown. DO NOT use JSON or any other format.
2.  **Content Structure:** The lesson should include:
    *   An engaging introduction to the topic.
    *   Detailed explanations of key concepts.
    *   Practical examples or brief case studies where applicable.
    *   A summary of key takeaways.
3.  **Markdown Formatting:** Use the following formatting STRICTLY:
    *   Use \`##\` for main section titles (e.g., \`## Introduction to Insider Threats\`).
    *   Use \`###\` for sub-section titles (e.g., \`### Types of Insider Threats\`).
    *   Use **bold** (\`**text**\`) for key terms and concepts.
    *   Use bullet points (\`* \`) for lists.
    *   Ensure paragraphs are well-written and easy to understand for a professional audience.
    *   DO NOT include a main title for the page itself (e.g., \`# ${lessonTitle}\`). The page content should start directly with the first section (\`## ...\`).

**Example Structure:**

## Section 1: Main Concept
This is the introductory paragraph explaining the main concept of the lesson. It should be clear and concise.

### Subsection 1.1: Deeper Dive
This section elaborates on a specific aspect of the main concept. For example, you can use a list here:
* **Key Term 1:** Definition and importance.
* **Key Term 2:** How it relates to the main topic.

### Subsection 1.2: Practical Example
Provide a real-world or hypothetical example to illustrate the concept. For instance, **Scenario:** A user receives a phishing email...

## Section 2: Another Major Concept
...

## Summary
*   A bulleted list summarizing the most critical points of the lesson.
*   Keep it concise and impactful.

Generate the lesson content for the topic: "${lessonTitle}"
`;

  const handleGenerate = async () => {
    if (!syllabus.trim() || !courseTitle.trim()) {
      alert('Please provide both course title and syllabus content');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress([]);
    setGeneratedLessons([]);

    try {
      // Step 1: Parse syllabus into lesson topics
      setGenerationProgress(prev => [...prev, { step: 'Parsing syllabus...', status: 'in-progress' }]);
      
      const syllabusAnalysis = await InvokeLLM({
        prompt: `
          Analyze the following cybersecurity course syllabus and break it down into individual lesson topics.
          
          Course Title: ${courseTitle}
          Syllabus Content:
          ${syllabus}
          
          Instructions:
          1. Extract 5-12 distinct lesson topics from the syllabus
          2. Each lesson should cover a specific, focused topic
          3. Lessons should build upon each other logically
          4. Each lesson should be substantial enough for 15-30 minutes of reading
          
          Return a JSON array of lesson objects with this structure:
          [
            {
              "lesson_number": 1,
              "title": "Lesson Title",
              "description": "Brief description of what this lesson covers",
              "key_topics": ["topic1", "topic2", "topic3"],
              "estimated_reading_time": 20
            }
          ]
        `,
        response_json_schema: {
          type: "object",
          properties: {
            lessons: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  lesson_number: { type: "number" },
                  title: { type: "string" },
                  description: { type: "string" },
                  key_topics: { type: "array", items: { type: "string" } },
                  estimated_reading_time: { type: "number" }
                }
              }
            }
          }
        }
      });

      setGenerationProgress(prev => [...prev.slice(0, -1), 
        { step: 'Parsing syllabus...', status: 'completed' },
        { step: `Found ${syllabusAnalysis.lessons.length} lessons to generate...`, status: 'completed' }
      ]);

      // Step 2: Generate each lesson individually
      const generatedLessonData = [];

      for (let i = 0; i < syllabusAnalysis.lessons.length; i++) {
        const lessonPlan = syllabusAnalysis.lessons[i];
        
        setGenerationProgress(prev => [...prev, 
          { step: `Generating "${lessonPlan.title}"...`, status: 'in-progress' }
        ]);

        // Invoke LLM to generate content based on the new markdown prompt
        // We expect raw markdown string as output, not JSON
        const lessonMarkdownContent = await InvokeLLM({
          prompt: lessonPrompt(lessonPlan.title),
          // IMPORTANT: Removed response_json_schema as the prompt explicitly states to return markdown, not JSON.
          // InvokeLLM is assumed to return the raw string content when no schema is provided.
        });

        // Prepare lesson data for database
        // Construct the lesson object using data from syllabusAnalysis and the generated markdown
        const lessonData = {
          title: lessonPlan.title,
          description: lessonPlan.description || `A comprehensive lesson covering ${lessonPlan.title}.`, // Fallback description
          content: lessonMarkdownContent, // The full markdown content
          estimated_reading_time: lessonPlan.estimated_reading_time || 20, // Use estimated time from syllabus analysis, default if not provided
          tags: [...(lessonPlan.key_topics || []), category, difficulty], // Combine key topics, category, and difficulty as tags
          category,
          difficulty,
          is_published: false // Start as draft
        };

        // Add tenant/global context
        if (isSuperAdminGlobal) {
          lessonData.tenant_id = null;
          lessonData.is_global = true;
          lessonData.created_by_super_admin = true;
          lessonData.global_content_type = 'lesson';
        } else if (tenant?.id) {
          lessonData.tenant_id = tenant.id;
          lessonData.is_global = false;
          lessonData.created_by_super_admin = false;
        }

        // Save to database
        const savedLesson = await Lesson.create(lessonData);
        generatedLessonData.push(savedLesson);

        setGenerationProgress(prev => [...prev.slice(0, -1),
          { step: `Generated "${lessonPlan.title}"`, status: 'completed' }
        ]);

        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setGeneratedLessons(generatedLessonData);
      setGenerationProgress(prev => [...prev, 
        { step: `✅ Successfully generated ${generatedLessonData.length} lessons!`, status: 'completed' }
      ]);

      // Notify parent component
      if (onGenerate) {
        onGenerate(generatedLessonData);
      }

    } catch (error) {
      console.error('Lesson generation failed:', error);
      setGenerationProgress(prev => [...prev, 
        { step: `❌ Generation failed: ${error.message}`, status: 'error' }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] bg-slate-900 border-slate-700 text-white overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            AI Lesson Generator
            {isSuperAdminGlobal && <Badge className="bg-purple-600">Global Content</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 p-1">
          {!isGenerating ? (
            <>
              {/* Input Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="courseTitle">Course Title</Label>
                  <Input
                    id="courseTitle"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g., Advanced Threat Detection and Response"
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600 text-white">
                        <SelectItem value="Fundamentals">Fundamentals</SelectItem>
                        <SelectItem value="Network Security">Network Security</SelectItem>
                        <SelectItem value="Endpoint Security">Endpoint Security</SelectItem>
                        <SelectItem value="Identity & Access Management">Identity & Access Management</SelectItem>
                        <SelectItem value="Threat Intelligence">Threat Intelligence</SelectItem>
                        <SelectItem value="Incident Response">Incident Response</SelectItem>
                        <SelectItem value="Digital Forensics">Digital Forensics</SelectItem>
                        <SelectItem value="Compliance & Frameworks">Compliance & Frameworks</SelectItem>
                        <SelectItem value="Tooling & Automation">Tooling & Automation</SelectItem>
                        <SelectItem value="Advanced Topics">Advanced Topics</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600 text-white">
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="syllabus">Course Syllabus</Label>
                  <Textarea
                    id="syllabus"
                    value={syllabus}
                    onChange={(e) => setSyllabus(e.target.value)}
                    placeholder="Paste your detailed course syllabus here. Include all topics, learning objectives, and any specific requirements..."
                    className="h-64 bg-slate-800 border-slate-600 text-white resize-none"
                  />
                  <p className="text-sm text-slate-400 mt-2">
                    Provide a detailed syllabus with topics, subtopics, and learning objectives. The AI will break this down into individual lessons.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
                  Cancel
                </Button>
                <Button onClick={handleGenerate} className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Lessons
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Generation Progress */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    Generating Lessons...
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {generationProgress.map((progress, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {progress.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        )}
                        {progress.status === 'in-progress' && (
                          <Loader2 className="w-5 h-5 animate-spin text-purple-400 flex-shrink-0" />
                        )}
                        {progress.status === 'error' && (
                          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${
                          progress.status === 'completed' ? 'text-green-300' :
                          progress.status === 'error' ? 'text-red-300' : 'text-slate-300'
                        }`}>
                          {progress.step}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {generatedLessons.length > 0 && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-teal-400" />
                      Generated Lessons ({generatedLessons.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {generatedLessons.map((lesson, index) => (
                        <div key={lesson.id} className="flex items-center justify-between bg-slate-700 p-3 rounded">
                          <div>
                            <h4 className="text-white font-medium">{lesson.title}</h4>
                            {/* Assuming 'content' field now stores the markdown string directly.
                                'pages' array is no longer expected from LLM output for the lesson itself. */}
                            <p className="text-sm text-slate-400">{lesson.estimated_reading_time || 0} min read</p>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            Created
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!isGenerating && (
                <div className="flex justify-end pt-4 border-t border-slate-700">
                  <Button onClick={onClose} className="bg-teal-600 hover:bg-teal-700">
                    Close
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
