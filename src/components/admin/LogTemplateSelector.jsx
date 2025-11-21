import React, { useState, useEffect } from "react";
import { LogTemplate } from "@/entities/LogTemplate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search, PlusCircle, Activity, FilePlus } from "lucide-react";

export default function LogTemplateSelector({ onSelect, onCancel, onManualCreate }) {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const activeTemplates = await LogTemplate.filter({ is_active: true });
        setTemplates(activeTemplates);
        setFilteredTemplates(activeTemplates);
      } catch (error) {
        console.error("Failed to fetch log templates:", error);
      }
      setIsLoading(false);
    };

    fetchTemplates();
  }, []);

  useEffect(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();
    const filtered = templates.filter(t => 
      t.title.toLowerCase().includes(lowerCaseSearch) ||
      t.use_case.toLowerCase().includes(lowerCaseSearch) ||
      t.source_type.toLowerCase().includes(lowerCaseSearch)
    );
    setFilteredTemplates(filtered);
  }, [searchTerm, templates]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-3xl max-h-[80vh] flex flex-col">
        <header className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-6 h-6 text-teal-400" />
            Add Log to Scenario
          </h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5 text-slate-400" />
          </Button>
        </header>

        <div className="p-4 border-b border-slate-700">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search templates by name, use case, or source..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-700 border-slate-600 text-white pl-10"
              />
            </div>
            <Button onClick={onManualCreate} variant="outline" className="border-slate-600 text-slate-300">
                <FilePlus className="w-4 h-4 mr-2" />
                Create Manually
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Activity className="w-8 h-8 text-teal-400 animate-spin" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center text-slate-400 py-10">
              <p>No templates found matching "{searchTerm}".</p>
              <p className="text-sm mt-2">You can create a new log manually or add log templates in the Live Feed Management tab.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map(template => (
                <div key={template.id} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white">{template.title}</h3>
                    <p className="text-sm text-slate-300 mt-1 line-clamp-2">{template.description_template}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline" className="text-purple-300 border-purple-500/50">{template.use_case}</Badge>
                      <Badge variant="outline" className="text-blue-300 border-blue-500/50">{template.source_type}</Badge>
                    </div>
                  </div>
                  <Button 
                    onClick={() => onSelect(template)} 
                    className="w-full mt-4 bg-teal-600 hover:bg-teal-700"
                    size="sm"
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}