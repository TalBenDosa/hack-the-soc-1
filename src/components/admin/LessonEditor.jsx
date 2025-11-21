
import React, { useState, useEffect } from "react";
import StableModal from "../ui/StableModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown
} from "lucide-react";

const CATEGORIES = [
    "Fundamentals", 
    "Network Security", 
    "Endpoint Security", 
    "Identity & Access Management",
    "Threat Intelligence", 
    "Incident Response", 
    "Digital Forensics", 
    "Compliance & Frameworks", 
    "Tooling & Automation", 
    "Advanced Topics"
];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

const DEFAULT_LESSON = {
  title: "",
  description: "",
  difficulty: "Beginner",
  category: "Fundamentals",
  pages: [{ id: `new_${Date.now()}`, title: "Page 1", content: "", page_number: 1 }],
  is_published: false,
  estimated_reading_time: 0,
  tags: []
};

export default function LessonEditor({ lesson, onClose, onSave }) {
  const [formData, setFormData] = useState(DEFAULT_LESSON);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (lesson) {
      setFormData({
        ...DEFAULT_LESSON,
        ...lesson,
        tags: lesson.tags || [],
        pages: lesson.pages && lesson.pages.length > 0 ? lesson.pages.map((p, i) => ({...p, id: p.id || `p_${i}`})) : [{ id: `new_${Date.now()}`, title: "Page 1", content: "", page_number: 1 }],
      });
    } else {
      setFormData(DEFAULT_LESSON);
    }
  }, [lesson]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePageChange = (index, field, value) => {
    const newPages = [...formData.pages];
    newPages[index][field] = value;
    setFormData(prev => ({ ...prev, pages: newPages }));
  };
  
  const addPage = () => {
    const newPageNumber = formData.pages.length + 1;
    const newPages = [
      ...formData.pages, 
      { id: `new_${Date.now()}`, title: `Page ${newPageNumber}`, content: "", page_number: newPageNumber }
    ];
    setFormData(prev => ({ ...prev, pages: newPages }));
  };

  const removePage = (index) => {
    if (formData.pages.length > 1) {
      const newPages = formData.pages.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, pages: newPages }));
    }
  };

  const movePage = (index, direction) => {
    const newPages = [...formData.pages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newPages.length) {
      [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];
      setFormData(prev => ({ ...prev, pages: newPages }));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        tags: [...prev.tags, newTag.trim()] 
      }));
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSave = () => {
    if (!formData.title?.trim()) {
      alert("Please enter a lesson title");
      return;
    }
    if (formData.pages.length === 0 || !formData.pages.some(p => p.content?.trim())) {
      alert("Please add at least one page with content");
      return;
    }

    const processedPages = formData.pages.map((page, index) => ({
      ...page,
      page_number: index + 1
    }));

    if (onSave) {
      onSave({
        ...formData,
        pages: processedPages,
        estimated_reading_time: Math.max(1, Math.round(
          processedPages.reduce((acc, p) => acc + (p.content?.split(' ').length || 0), 0) / 200
        ))
      });
    }
  };

  return (
    <StableModal
      isOpen={true}
      onClose={onClose}
      title={lesson ? "Edit Lesson" : "Create New Lesson"}
      maxWidth="6xl"
    >
      <div className="space-y-6">
        <div>
          <label className="text-sm text-slate-300 mb-2 block">Lesson Title *</label>
          <Input
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white"
            placeholder="Enter lesson title"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300 mb-2 block">Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="bg-slate-700 border-slate-600 text-white h-24"
            placeholder="Brief description of the lesson content"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-300 mb-2 block">Difficulty *</label>
            <Select
              value={formData.difficulty}
              onValueChange={(value) => handleInputChange('difficulty', value)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 z-[9999]">
                {DIFFICULTIES.map(difficulty => (
                  <SelectItem 
                    key={difficulty} 
                    value={difficulty} 
                    className="text-white hover:bg-slate-600 focus:bg-slate-600 cursor-pointer"
                  >
                    {difficulty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-2 block">Category *</label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 z-[9999]">
                {CATEGORIES.map(category => (
                  <SelectItem 
                    key={category} 
                    value={category} 
                    className="text-white hover:bg-slate-600 focus:bg-slate-600 cursor-pointer"
                  >
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-300 mb-2 block">Estimated Reading Time (minutes)</label>
          <Input
            type="number"
            min="1"
            value={formData.estimated_reading_time}
            onChange={(e) => handleInputChange('estimated_reading_time', parseInt(e.target.value) || 0)}
            className="bg-slate-700 border-slate-600 text-white w-32"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300 mb-2 block">Tags</label>
          <div className="flex gap-2 mb-3">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag"
              className="bg-slate-700 border-slate-600 text-white flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button onClick={addTag} size="sm" className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map(tag => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-slate-600 text-slate-200 hover:bg-slate-500 cursor-pointer"
                onClick={() => removeTag(tag)}
              >
                {tag} <X className="w-3 h-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Lesson Pages</h3>
            <Button onClick={addPage} size="sm" className="bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Page
            </Button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {formData.pages.map((page, index) => (
              <div key={page.id} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <div className="flex items-center justify-between mb-3">
                  <Input
                    value={page.title}
                    onChange={(e) => handlePageChange(index, 'title', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white font-semibold"
                    placeholder={`Page ${index + 1} title`}
                  />
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => movePage(index, 'up')}
                      disabled={index === 0}
                      size="sm"
                      variant="ghost"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => movePage(index, 'down')}
                      disabled={index === formData.pages.length - 1}
                      size="sm"
                      variant="ghost"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => removePage(index)}
                      disabled={formData.pages.length === 1}
                      size="sm"
                      variant="ghost"
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={page.content}
                  onChange={(e) => handlePageChange(index, 'content', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white h-40"
                  placeholder="Page content (supports Markdown formatting)"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <Switch
              checked={formData.is_published}
              onCheckedChange={(checked) => handleInputChange('is_published', checked)}
            />
            <span className="text-slate-300">
              {formData.is_published ? "Published" : "Draft"}
            </span>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
              <Save className="w-4 h-4 mr-2" />
              {lesson ? "Update Lesson" : "Create Lesson"}
            </Button>
          </div>
        </div>
      </div>
    </StableModal>
  );
}
