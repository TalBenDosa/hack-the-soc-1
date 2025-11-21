import React, { useState, useEffect } from "react";
import { Lesson } from "@/entities/Lesson";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BookOpen, Clock, Play, Users, Search } from "lucide-react";
import BookViewer from "../components/learning/BookViewer";

export default function LearningPathPage() {
  const [lessons, setLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showBookViewer, setShowBookViewer] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('[LEARNING PATH] Fetching published lessons...');
        
        // Simple fetch of published lessons without complex creation logic
        const publishedLessons = await Lesson.filter({ is_published: true });
        console.log('[LEARNING PATH] Fetched lessons:', publishedLessons.length);
        
        setLessons(publishedLessons || []);
      } catch (error) {
        console.error("Failed to fetch lessons:", error);
        setError(`Failed to load lessons: ${error.message}`);
        setLessons([]);
      }
      setIsLoading(false);
    };

    fetchLessons();
  }, []);

  const filteredLessons = lessons.filter(lesson => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = lesson.title?.toLowerCase().includes(searchLower) ||
                         lesson.description?.toLowerCase().includes(searchLower) ||
                         lesson.tags?.some(tag => tag.toLowerCase().includes(searchLower));
    const matchesDifficulty = difficultyFilter === "all" || lesson.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Beginner": return "text-green-400 bg-green-400/20 border-green-500/30";
      case "Intermediate": return "text-yellow-400 bg-yellow-400/20 border-yellow-500/30";
      case "Advanced": return "text-red-400 bg-red-400/20 border-red-500/30";
      default: return "text-gray-400 bg-gray-400/20 border-gray-500/30";
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Fundamentals': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Threat Detection': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Incident Response': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Forensics': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Advanced Topics': 'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'Network Security': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'Endpoint Security': 'bg-green-500/20 text-green-400 border-green-500/30'
    };
    return colors[category] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  const handleStartLesson = (lesson) => {
    setSelectedLesson(lesson);
    setShowBookViewer(true);
  };

  const handleCloseBookViewer = () => {
    setShowBookViewer(false);
    setSelectedLesson(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900">
        <div className="text-center">
            <Loader2 className="w-12 h-12 text-teal-400 animate-spin mx-auto" />
            <p className="mt-4 text-white">Loading Learning Path...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900">
        <Card className="bg-slate-800 border-slate-700 max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-400 mb-4">⚠️ Error Loading Lessons</div>
            <p className="text-slate-400 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-teal-600 hover:bg-teal-700"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-teal-400" />
              Learning Path
            </h1>
            <p className="text-slate-400 mt-2">Explore theoretical cybersecurity knowledge through interactive lessons.</p>
          </div>

          <div className="flex flex-col md:flex-row flex-wrap gap-4 items-center mb-8">
            <div className="relative flex-1 min-w-full md:min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search lessons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border-slate-700 text-white placeholder-slate-400 pl-10"
              />
            </div>
            
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-full md:w-48 bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Filter by difficulty" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLessons.length > 0 ? (
              filteredLessons.map(lesson => (
                <Card key={lesson.id} className="bg-slate-800 border-slate-700 flex flex-col hover:border-teal-500/50 transition-colors">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-semibold text-white">{lesson.title}</CardTitle>
                      <Badge className={`${getDifficultyColor(lesson.difficulty)} border`}>{lesson.difficulty}</Badge>
                    </div>
                    <p className="text-sm text-slate-400 pt-2">{lesson.description}</p>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Badge variant="outline" className={`${getCategoryColor(lesson.category)} border`}>
                          {lesson.category}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{lesson.estimated_reading_time || 10} min</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Users className="w-4 h-4" />
                        <span>{lesson.pages?.length || 0} pages</span>
                      </div>

                      {lesson.tags && lesson.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {lesson.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="bg-slate-700 text-slate-300 text-xs">{tag}</Badge>
                          ))}
                          {lesson.tags.length > 3 && (
                            <Badge variant="secondary" className="bg-slate-700 text-slate-300 text-xs">+{lesson.tags.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <div className="p-4 mt-auto">
                    <Button 
                      onClick={() => handleStartLesson(lesson)}
                      className="w-full bg-teal-600 hover:bg-teal-700"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Lesson
                    </Button>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg mb-2">No lessons found</p>
                <p className="text-slate-500 text-sm">
                  {searchTerm || difficultyFilter !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Lessons will appear here once they are published"
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBookViewer && selectedLesson && (
        <BookViewer 
          lesson={selectedLesson}
          onClose={handleCloseBookViewer}
        />
      )}
    </>
  );
}