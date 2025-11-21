
import React, { useState, useEffect, useCallback } from "react"; // Added useCallback
import { Quiz } from "@/entities/Quiz";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Search, Edit, Plus, Trash2, Download, Eye, Play, Loader2 } from "lucide-react";
import QuizEditor from "./QuizEditor";
import QuizPreview from "./QuizPreview";
import AIQuizGenerator from "./AIQuizGenerator";

export default function QuizManagement({ tenant }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showEditor, setShowEditor] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [previewQuiz, setPreviewQuiz] = useState(null);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const [isSuperAdminGlobal, setIsSuperAdminGlobal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Effect to check super admin status
  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      try {
        const currentUser = await User.me();
        const isImpersonating = sessionStorage.getItem('superadmin_impersonation') !== null;
        
        if (currentUser.role === 'admin' && !isImpersonating) {
          setIsSuperAdminGlobal(true);
          console.log('[QUIZ MANAGEMENT] Super Admin in GLOBAL mode');
        } else {
          setIsSuperAdminGlobal(false);
        }
      } catch (error) {
        console.error("Failed to check super admin status:", error);
        setIsSuperAdminGlobal(false);
      }
    };
    checkSuperAdminStatus();
  }, [tenant]);

  // Wrap fetchQuizzes in useCallback
  const fetchQuizzes = useCallback(async () => {
    setLoading(true);
    try {
      let quizzesData;
      
      if (isSuperAdminGlobal) {
        quizzesData = await Quiz.list('-created_date');
      } else if (tenant?.id) {
        const tenantQuizzes = await Quiz.filter({ tenant_id: tenant.id });
        const globalQuizzes = await Quiz.filter({ tenant_id: null, is_global: true });
        quizzesData = [...(tenantQuizzes || []), ...(globalQuizzes || [])];
      } else {
        quizzesData = [];
      }

      console.log('Loaded quizzes:', quizzesData);
      setQuizzes(quizzesData);
    } catch (error) {
      console.error("Failed to fetch quizzes:", error);
      setQuizzes([]);
    }
    setLoading(false);
  }, [isSuperAdminGlobal, tenant?.id]); // Correct dependencies for useCallback

  // Effect to load quizzes based on super admin status or tenant
  useEffect(() => {
    fetchQuizzes();
  }, [isSuperAdminGlobal, tenant?.id, fetchQuizzes]); // Updated dependencies for useEffect

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quiz.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || quiz.difficulty === difficultyFilter;
    const matchesCategory = categoryFilter === "all" || quiz.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "published" && quiz.is_published) ||
                         (statusFilter === "draft" && !quiz.is_published);

    return matchesSearch && matchesDifficulty && matchesCategory && matchesStatus;
  });

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Beginner": return "text-green-400 bg-green-400/20 border-green-500/30";
      case "Intermediate": return "text-yellow-400 bg-yellow-400/20 border-yellow-500/30";
      case "Advanced": return "text-red-400 bg-red-400/20 border-red-500/30";
      default: return "text-gray-400 bg-gray-400/20 border-gray-500/30";
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      "Fundamentals": "📚",
      "Threat Detection": "🔍",
      "Incident Response": "🚨",
      "Forensics": "🔬",
      "Advanced Topics": "🎓",
      "Network Security": "🌐",
      "Malware Analysis": "🦠",
      "Compliance": "📋"
    };
    return icons[category] || "❓";
  };

  const handleCreate = () => {
    setEditingQuiz(null);
    setShowEditor(true);
  };

  const handleCreateWithAI = () => {
    setShowAIGenerator(true);
  };

  const handleEdit = (quiz) => {
    setEditingQuiz(quiz);
    setShowEditor(true);
  };

  const handleSave = async (quizData) => {
    setSaving(true);
    try {
        let finalQuizData = { ...quizData };

        if (isSuperAdminGlobal) {
            finalQuizData = {
                ...quizData,
                tenant_id: null,
                is_global: true,
                created_by_super_admin: true
            };
        } else if (tenant?.id) {
            finalQuizData = {
                ...quizData,
                tenant_id: tenant.id,
                is_global: false,
                created_by_super_admin: false
            };
        } else {
            console.warn("Attempting to save quiz without tenant context or super admin global mode.");
            alert("Error: Cannot save quiz without proper tenant context or global mode.");
            setSaving(false);
            return;
        }

        if (editingQuiz) {
            await Quiz.update(editingQuiz.id, finalQuizData);
        } else {
            await Quiz.create(finalQuizData);
        }

        setShowEditor(false);
        setEditingQuiz(null);
        fetchQuizzes();

        if (isSuperAdminGlobal) {
            alert(`✅ Global quiz "${quizData.title}" is now available to ALL clients!`);
        } else {
            alert(`✅ Quiz "${quizData.title}" created for ${tenant?.name || 'your tenant'}!`);
        }

    } catch (error) {
        console.error("Failed to save quiz:", error);
        alert(`❌ Failed to save quiz: ${error.message}`);
    }
    setSaving(false);
  };

  const handlePreview = (quiz) => {
    setPreviewQuiz(quiz);
  };

  const handleDelete = async (quizId, quizTitle) => {
    if (window.confirm(`Are you sure you want to delete "${quizTitle}"? This action cannot be undone.`)) {
      try {
        await Quiz.delete(quizId);
        fetchQuizzes();
      } catch (error) {
        console.error('Failed to delete quiz:', error);
        alert('Failed to delete quiz. Please try again.');
      }
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingQuiz(null);
    fetchQuizzes();
  };

  const handleAIGeneratorClose = () => {
    setShowAIGenerator(false);
    fetchQuizzes();
  };

  const exportQuizzes = () => {
    const exportData = {
      quizzes: filteredQuizzes,
      export_timestamp: new Date().toISOString(),
      export_count: filteredQuizzes.length
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quizzes_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row flex-wrap justify-between items-start md:items-center gap-4">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-400" />
                Quiz Management
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={exportQuizzes} size="sm" className="border-slate-600 text-slate-300">
                  <Download className="w-4 h-4 mr-2" />
                  Export ({filteredQuizzes.length})
                </Button>
                <Button onClick={handleCreateWithAI} className="bg-purple-600 hover:bg-purple-700">
                  <Play className="w-4 h-4 mr-2" />
                  Generate with AI
                </Button>
                <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Quiz
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-full md:min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search quizzes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-10"
                />
              </div>
              
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-full md:w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-40 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Fundamentals">Fundamentals</SelectItem>
                  <SelectItem value="Threat Detection">Threat Detection</SelectItem>
                  <SelectItem value="Incident Response">Incident Response</SelectItem>
                  <SelectItem value="Forensics">Forensics</SelectItem>
                  <SelectItem value="Advanced Topics">Advanced Topics</SelectItem>
                  <SelectItem value="Network Security">Network Security</SelectItem>
                  <SelectItem value="Malware Analysis">Malware Analysis</SelectItem>
                  <SelectItem value="Compliance">Compliance</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto border border-slate-700 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
                  <TableHead className="text-slate-300">Title</TableHead>
                  <TableHead className="text-slate-300">Category</TableHead>
                  <TableHead className="text-slate-300">Difficulty</TableHead>
                  <TableHead className="text-slate-300">Questions</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuizzes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      {quizzes.length === 0 ? 
                        'No quizzes created yet. Create your first quiz!' :
                        'No quizzes found matching your filters'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuizzes.map((quiz) => (
                    <TableRow key={quiz.id} className="border-b-slate-800 hover:bg-slate-700/30">
                      <TableCell className="font-medium text-white max-w-64">
                        <div className="font-medium truncate">{quiz.title}</div>
                        <div className="text-sm text-slate-400 truncate">{quiz.description}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryIcon(quiz.category)}</span>
                          <Badge variant="outline" className="border-slate-600 text-slate-300">
                            {quiz.category}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getDifficultyColor(quiz.difficulty)} border`}>
                          {quiz.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 font-medium">
                        {quiz.total_questions || 0}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${quiz.is_published ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                          {quiz.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handlePreview(quiz)}
                            className="hover:bg-slate-600"
                          >
                            <Eye className="w-4 h-4 text-purple-400" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(quiz)}
                            className="hover:bg-slate-600"
                          >
                            <Edit className="w-4 h-4 text-blue-400" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(quiz.id, quiz.title)}
                            className="hover:bg-slate-600"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredQuizzes.length > 0 && (
            <div className="mt-4 text-sm text-slate-400 flex justify-between items-center">
              <span>
                Showing {filteredQuizzes.length} of {quizzes.length} quizzes
              </span>
              <div className="flex gap-4">
                <span>Published: {quizzes.filter(q => q.is_published).length}</span>
                <span>Draft: {quizzes.filter(q => !q.is_published).length}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showEditor && (
        <QuizEditor
          quiz={editingQuiz}
          onClose={handleEditorClose}
          onSave={handleSave}
          isSaving={saving}
        />
      )}

      {showAIGenerator && (
        <AIQuizGenerator
          onClose={handleAIGeneratorClose}
          onGenerate={handleAIGeneratorClose}
        />
      )}

      {previewQuiz && (
        <QuizPreview
          quiz={previewQuiz}
          onClose={() => setPreviewQuiz(null)}
        />
      )}
    </>
  );
}
