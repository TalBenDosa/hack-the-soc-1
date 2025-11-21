
import React, { useState, useEffect, useCallback } from "react";
import { Lesson } from "@/entities/Lesson";
import { User } from "@/entities/User"; // Import User entity for role checking
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Search, Edit, Plus, Trash2, Download, Eye, Loader2, Sparkles } from "lucide-react"; // Added Sparkles
import LessonEditor from "./LessonEditor";
import BookViewer from "../learning/BookViewer";
import AISyllabusGenerator from "./AISyllabusGenerator"; // New import

export default function LessonManagement({ tenant }) {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showEditor, setShowEditor] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [previewLesson, setPreviewLesson] = useState(null);
  const [isSuperAdminGlobal, setIsSuperAdminGlobal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSyllabusGenerator, setShowSyllabusGenerator] = useState(false); // Added back

  // **CRITICAL**: Determine if user is Super Admin in global mode (not impersonating)
  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      try {
        const currentUser = await User.me();
        const isImpersonating = sessionStorage.getItem('superadmin_impersonation') !== null;

        // Super Admin in global mode (NOT impersonating a client)
        if (currentUser.role === 'admin' && !isImpersonating) {
          setIsSuperAdminGlobal(true);
          console.log('[LESSON MANAGEMENT] Super Admin in GLOBAL mode - content will be available to all tenants');
        } else {
          setIsSuperAdminGlobal(false);
          console.log('[LESSON MANAGEMENT] Operating in tenant-specific mode for tenant:', tenant?.name || 'Unknown');
        }
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdminGlobal(false);
      }
    };

    checkSuperAdminStatus();
  }, [tenant]); // Dependency on tenant to re-check status if tenant context changes

  // Renamed from loadLessons to fetchLessons as per outline
  // Wrap fetchLessons in useCallback to fix dependency warning
  const fetchLessons = useCallback(async () => {
    setLoading(true);
    try {
      let lessonsData;

      if (isSuperAdminGlobal) {
        // **SUPER ADMIN GLOBAL MODE**: Show all lessons (global + all tenant-specific)
        console.log('[LESSON MANAGEMENT] Loading ALL lessons for Super Admin global view');
        lessonsData = await Lesson.list('-created_date');
      } else if (tenant?.id) {
        // **TENANT-SPECIFIC MODE**: Only show lessons for this tenant
        console.log('[LESSON MANAGEMENT] Loading lessons for tenant:', tenant.name);

        // Get tenant-specific lessons
        const tenantLessons = await Lesson.filter({ tenant_id: tenant.id });

        // Get global lessons (created by Super Admin for all tenants)
        const globalLessons = await Lesson.filter({ tenant_id: null, is_global: true });

        // Combine both sets
        lessonsData = [...(tenantLessons || []), ...(globalLessons || [])];

        console.log(`[LESSON MANAGEMENT] Loaded ${tenantLessons?.length || 0} tenant-specific + ${globalLessons?.length || 0} global lessons`);
      } else {
        console.warn('[LESSON MANAGEMENT] No valid tenant context for fetching lessons');
        lessonsData = [];
      }

      setLessons(lessonsData || []);
    } catch (error) {
      console.error("Failed to fetch lessons:", error);
      setLessons([]);
    }
    setLoading(false);
  }, [isSuperAdminGlobal, tenant?.id, tenant?.name]);

  // useEffect for fetching lessons, depends on `isSuperAdminGlobal` and `tenant` context
  useEffect(() => {
    // Only fetch lessons once `isSuperAdminGlobal` has been determined and a valid context exists
    if (isSuperAdminGlobal !== null && (isSuperAdminGlobal || tenant?.id)) {
      fetchLessons();
    }
  }, [isSuperAdminGlobal, tenant?.id, fetchLessons]); // Added fetchLessons to dependencies

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = lesson.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lesson.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || lesson.difficulty === difficultyFilter;
    
    // Fix the category filter syntax
    const matchesCategory = categoryFilter === "all" || lesson.category === categoryFilter;
    
    const matchesStatus = statusFilter === "all" ||
                         (statusFilter === "published" && lesson.is_published) ||
                         (statusFilter === "draft" && !lesson.is_published);

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
      "Network Security": "🌐",
      "Endpoint Security": "💻",
      "Identity & Access Management": "🔑",
      "Threat Intelligence": "🧠",
      "Incident Response": "🚨",
      "Digital Forensics": "🔎",
      "Compliance & Frameworks": "⚖️",
      "Tooling & Automation": "🛠️",
      "Advanced Topics": "🎓"
    };
    return icons[category] || "📖";
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingLesson(null);
    setShowEditor(true);
  };

  const handleGenerateWithAI = () => {
    setShowSyllabusGenerator(true);
  };

  const handleDelete = async (lessonId, lessonTitle) => {
    if (window.confirm(`Are you sure you want to delete "${lessonTitle}"? This action cannot be undone.`)) {
      try {
        await Lesson.delete(lessonId);
        fetchLessons(); // Changed from loadLessons
      } catch (error) {
        console.error('Failed to delete lesson:', error);
        alert(`Failed to delete lesson "${lessonTitle}". Please try refreshing the page and try again.`);
      }
    }
  };

  const handlePreview = (lesson) => {
    setPreviewLesson(lesson);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingLesson(null);
  };

  // Renamed from handleSaveLesson to handleSave as per outline
  const handleSave = async (lessonData) => {
    setSaving(true);
    try {
      let finalLessonData = { ...lessonData };

      if (isSuperAdminGlobal) {
        // **SUPER ADMIN GLOBAL MODE**: Create global content for all tenants
        console.log('[LESSON MANAGEMENT] Creating GLOBAL lesson available to all tenants');
        finalLessonData = {
          ...lessonData,
          tenant_id: null, // Global content has no specific tenant
          is_global: true,  // Mark as global content
          created_by_super_admin: true,
          global_content_type: 'lesson'
        };
      } else if (tenant?.id) {
        // **TENANT-SPECIFIC MODE**: Create content only for current tenant
        console.log('[LESSON MANAGEMENT] Creating tenant-specific lesson for:', tenant.name);
        finalLessonData = {
          ...lessonData,
          tenant_id: tenant.id, // Tie to specific tenant
          is_global: false,
          created_by_super_admin: false
        };
      } else {
        throw new Error('No valid tenant context for creating lesson');
      }

      if (editingLesson) {
        await Lesson.update(editingLesson.id, finalLessonData);
        console.log('[LESSON MANAGEMENT] Updated lesson:', editingLesson.id);
      } else {
        await Lesson.create(finalLessonData);
        console.log('[LESSON MANAGEMENT] Created new lesson');
      }

      handleCloseEditor(); // Close editor after save
      fetchLessons(); // Refresh the list - Changed from loadLessons

      // Show appropriate success message
      if (isSuperAdminGlobal) {
        alert(`✅ Global lesson "${lessonData.title}" created successfully!\n\nThis lesson is now available to ALL client environments.`);
      } else {
        alert(`✅ Lesson "${lessonData.title}" created successfully for ${tenant.name}!`);
      }

    } catch (error) {
      console.error("Failed to save lesson:", error);
      alert(`❌ Failed to save lesson: ${error.message}`);
    }
    setSaving(false);
  };

  const exportLessons = () => {
    const exportData = {
      lessons: filteredLessons,
      export_timestamp: new Date().toISOString(),
      export_count: filteredLessons.length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lessons_export_${new Date().toISOString().split('T')[0]}.json`;
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
                Lesson Management
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={exportLessons} size="sm" className="border-slate-600 text-slate-300">
                  <Download className="w-4 h-4 mr-2" />
                  Export ({filteredLessons.length})
                </Button>
                <Button 
                  onClick={handleGenerateWithAI} 
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Lessons with AI
                </Button>
                <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create Lesson
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-full md:min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search lessons..."
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
                <SelectTrigger className="w-full md:w-48 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Categories</SelectItem>
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
                  <TableHead className="text-slate-300">Pages</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLessons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                      No lessons found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLessons.map((lesson) => (
                    <TableRow key={lesson.id} className="border-b-slate-800 hover:bg-slate-700/30">
                      <TableCell className="font-medium text-white max-w-64">
                        <div className="font-medium truncate">{lesson.title}</div>
                        <div className="text-sm text-slate-400 truncate">{lesson.description}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryIcon(lesson.category)}</span>
                          <Badge variant="outline" className="border-slate-600 text-slate-300">
                            {lesson.category}
                          </Badge>
                          {lesson.is_global && <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">Global</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getDifficultyColor(lesson.difficulty)} border`}>
                          {lesson.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 font-medium">
                        {lesson.pages?.length || 0}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${lesson.is_published ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                          {lesson.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreview(lesson)}
                            className="hover:bg-slate-600"
                          >
                            <Eye className="w-4 h-4 text-purple-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(lesson)}
                            className="hover:bg-slate-600"
                          >
                            <Edit className="w-4 h-4 text-blue-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(lesson.id, lesson.title)}
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

          {filteredLessons.length > 0 && (
            <div className="mt-4 text-sm text-slate-400 flex justify-between items-center">
              <span>
                Showing {filteredLessons.length} of {lessons.length} lessons
              </span>
              <div className="flex gap-4">
                <span>Published: {lessons.filter(l => l.is_published).length}</span>
                <span>Draft: {lessons.filter(l => !l.is_published).length}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showEditor && (
        <LessonEditor
          lesson={editingLesson}
          onClose={handleCloseEditor}
          onSave={handleSave}
          isSaving={saving}
        />
      )}

      {showSyllabusGenerator && (
        <AISyllabusGenerator
          onClose={() => setShowSyllabusGenerator(false)}
          onGenerate={(generatedLessons) => {
            setShowSyllabusGenerator(false);
            fetchLessons(); // Refresh the lessons list
          }}
          tenant={tenant}
          isSuperAdminGlobal={isSuperAdminGlobal}
        />
      )}

      {previewLesson && (
        <BookViewer
          lesson={previewLesson}
          onClose={() => setPreviewLesson(null)}
        />
      )}
    </>
  );
}
