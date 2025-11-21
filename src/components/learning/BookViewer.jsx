import React, { useState } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";
import { StudentActivityLog, TenantUser, User } from '@/entities/all';

export default function BookViewer({ lesson, onClose }) {
  const [currentPage, setCurrentPage] = useState(0);

  if (!lesson || !lesson.pages || lesson.pages.length === 0) {
    return null;
  }

  const totalPages = lesson.pages.length;
  const progress = ((currentPage + 1) / totalPages) * 100;
  const estimatedReadTime = lesson.estimated_reading_time || Math.ceil(totalPages * 1.5);

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const goToPreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const handleLessonComplete = async () => {
    try {
      const currentUser = await User.me();
      if (currentUser) {
        const tenantUsers = await TenantUser.filter({ user_id: currentUser.id, status: 'active' });
        let tenantId = null;
        if (tenantUsers.length > 0) {
          tenantId = tenantUsers[0].tenant_id;
        }

        const readingTimeSeconds = estimatedReadTime * 60;

        const activityData = {
          user_id: currentUser.id,
          tenant_id: tenantId,
          activity_type: 'lesson_completion',
          task_id: lesson.id,
          task_title: lesson.title,
          session_data: {
            start_time: new Date(Date.now() - readingTimeSeconds * 1000).toISOString(),
            completion_time: new Date().toISOString(),
            duration_minutes: Math.round(readingTimeSeconds / 60),
            attempts_count: 1
          },
          performance_metrics: {
            score: 100,
            strengths: [`Completed ${lesson.title} successfully`],
            weaknesses: [],
            next_steps: [`Continue to next lesson in ${lesson.category}`]
          },
          ai_feedback: {
            detailed_feedback: `Successfully completed theoretical lesson: ${lesson.title}. Good foundation knowledge acquired.`,
            difficulty_assessment: 'appropriate',
            engagement_level: readingTimeSeconds > 300 ? 'high' : 'medium'
          },
          learning_analytics: {
            concepts_mastered: [lesson.category],
            concepts_struggling: [],
            learning_path_status: 'on_track',
            predicted_success_rate: 85
          }
        };

        console.log('[LESSON] Recording completion:', activityData);
        await StudentActivityLog.create(activityData);
        console.log('[LESSON] Completion recorded successfully');
      }

    } catch (error) {
      console.error("Error completing lesson:", error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] bg-slate-900 border-slate-700 text-white p-0 flex flex-col">
        {/* Custom styles for enhanced markdown rendering */}
        <style>{`
          .lesson-content h2 {
            color: #14b8a6;
            font-size: 1.75rem;
            font-weight: 700;
            margin-top: 2.5rem;
            margin-bottom: 1.25rem;
            padding: 1rem 1.25rem;
            background: linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(20, 184, 166, 0.05) 100%);
            border-left: 4px solid #14b8a6;
            border-radius: 0.5rem;
            box-shadow: 0 2px 8px rgba(20, 184, 166, 0.1);
          }
          
          .lesson-content h3 {
            color: #5eead4;
            font-size: 1.35rem;
            font-weight: 600;
            margin-top: 1.75rem;
            margin-bottom: 1rem;
            padding-left: 0.75rem;
            border-left: 3px solid #5eead4;
          }
          
          .lesson-content h4 {
            color: #99f6e4;
            font-size: 1.1rem;
            font-weight: 600;
            margin-top: 1.25rem;
            margin-bottom: 0.75rem;
          }
          
          .lesson-content strong {
            color: #ffffff;
            font-weight: 600;
          }
          
          .lesson-content p {
            color: #cbd5e1;
            line-height: 1.8;
            margin-bottom: 1.25rem;
          }
          
          .lesson-content ul, .lesson-content ol {
            margin: 1.25rem 0;
            padding-left: 1.75rem;
          }
          
          .lesson-content li {
            color: #cbd5e1;
            line-height: 1.7;
            margin-bottom: 0.75rem;
          }
          
          .lesson-content li strong {
            color: #14b8a6;
          }
          
          .lesson-content code {
            background-color: rgba(20, 184, 166, 0.1);
            color: #5eead4;
            padding: 0.2rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.9em;
            font-family: 'Courier New', monospace;
          }
          
          .lesson-content pre {
            background-color: #1e293b;
            border: 1px solid #334155;
            border-radius: 0.5rem;
            padding: 1rem;
            overflow-x: auto;
            margin: 1.25rem 0;
          }
          
          .lesson-content pre code {
            background: none;
            padding: 0;
            color: #e2e8f0;
          }
          
          .lesson-content blockquote {
            border-left: 4px solid #14b8a6;
            padding-left: 1.25rem;
            margin: 1.5rem 0;
            color: #94a3b8;
            font-style: italic;
            background: rgba(20, 184, 166, 0.05);
            padding: 1rem 1.25rem;
            border-radius: 0.5rem;
          }
          
          .lesson-content hr {
            border: none;
            height: 2px;
            background: linear-gradient(90deg, transparent, #14b8a6, transparent);
            margin: 2.5rem 0;
          }
          
          .lesson-content a {
            color: #5eead4;
            text-decoration: underline;
            transition: color 0.2s;
          }
          
          .lesson-content a:hover {
            color: #14b8a6;
          }

          /* First paragraph special styling */
          .lesson-content > p:first-of-type {
            font-size: 1.05rem;
            color: #e2e8f0;
            line-height: 1.9;
          }
        `}</style>

        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-start">
          <div className="flex items-start gap-4">
            <div className="bg-teal-900/50 p-3 rounded-lg">
                <BookOpen className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{lesson.title}</h2>
              <p className="text-slate-400 text-sm mt-1">
                Page {currentPage + 1} of {totalPages} &middot; {estimatedReadTime} min read
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content with enhanced styling */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="lesson-content prose prose-invert prose-slate max-w-none">
            <ReactMarkdown>
              {lesson.pages[currentPage].content}
            </ReactMarkdown>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            {/* Pagination Dots */}
            <div className="flex justify-center items-center mb-4 gap-2">
                {Array.from({ length: totalPages }).map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentPage(index)}
                        className={cn(
                            "h-2 w-2 rounded-full transition-all",
                            currentPage === index ? "bg-teal-400 w-4" : "bg-slate-600 hover:bg-slate-500"
                        )}
                        aria-label={`Go to page ${index + 1}`}
                    />
                ))}
            </div>
          <div className="flex items-center justify-between gap-4">
            <Button 
              onClick={goToPreviousPage} 
              disabled={currentPage === 0}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <Progress value={progress} className="w-1/2 bg-slate-700" />

            <Button 
              onClick={goToNextPage} 
              disabled={currentPage === totalPages - 1}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}