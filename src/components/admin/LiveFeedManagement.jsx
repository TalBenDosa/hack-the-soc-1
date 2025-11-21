
import React, { useState, useEffect } from "react";
import { LogTemplate } from "@/entities/LogTemplate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Search, Edit, Plus, Trash2, Loader2, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";
import AdvancedLogEditor from "./AdvancedLogEditor";
import ScenarioEditor from './ScenarioEditor'; // Import the scenario editor
import { Scenario } from '@/entities/Scenario';

const getUniqueValues = (items, key) => {
    if (!items || items.length === 0) return [];
    const values = items.map(item => item[key]).filter(Boolean);
    return [...new Set(values)].sort();
};

// A simple mock for AI log generation
// In a real application, this would be an API call to an AI service
const generateMixedScenarioLogs = async (count, sourceFilter, useCaseFilter) => {
    return new Promise(resolve => {
        setTimeout(() => {
            const logs = [];
            const commonLogProperties = {
                timestamp: new Date().toISOString(),
                severity_level: Math.floor(Math.random() * 10) + 1, // Changed from 'severity' to 'severity_level' to match LogTemplate
                id: Math.random().toString(36).substring(7),
                is_active: true,
                generation_weight: 100,
                variables: {}
            };

            const mockSources = ["Firewall", "Endpoint", "CloudTrail", "Web Server"];
            const mockUseCases = ["Intrusion Detection", "Malware Activity", "Data Exfiltration", "Privilege Escalation"];

            for (let i = 0; i < count; i++) {
                const source = sourceFilter === "all" ? mockSources[Math.floor(Math.random() * mockSources.length)] : sourceFilter;
                const useCase = useCaseFilter === "all" ? mockUseCases[Math.floor(Math.random() * mockUseCases.length)] : useCaseFilter;
                const title = `AI-generated log ${i + 1} from ${source} for ${useCase}`;
                const logData = `Sample log message for ${title}. This log might indicate some activity related to ${useCase}.`;

                logs.push({
                    ...commonLogProperties,
                    title: title,
                    source_type: source,
                    use_case: useCase,
                    log_data_template: logData
                });
            }
            resolve(logs);
        }, 1000); // Simulate API call delay
    });
};

export default function LiveFeedManagement() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [useCaseFilter, setUseCaseFilter] = useState("all");
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // State for Scenario Editor
  const [isScenarioEditorOpen, setIsScenarioEditorOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState(null); // New state to hold generated scenario data
  const [isGenerating, setIsGenerating] = useState(false);


  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const templatesData = await LogTemplate.list('-created_date');
      setTemplates(templatesData);
    } catch (error) {
      console.error("Failed to load log templates:", error);
      setTemplates([]);
    }
    setLoading(false);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === "all" || template.source_type === sourceFilter;
    const matchesUseCase = useCaseFilter === "all" || template.use_case === useCaseFilter;
    return matchesSearch && matchesSource && matchesUseCase;
  });

  const handleCreate = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDelete = async (templateId, templateTitle) => {
    if (window.confirm(`Are you sure you want to delete the template "${templateTitle}"?`)) {
      try {
        await LogTemplate.delete(templateId);
        loadTemplates();
      } catch (error) {
        console.error("Failed to delete log template:", error);
        alert("Failed to delete template.");
      }
    }
  };

  const handleSave = async (templateData) => {
    try {
      if (editingTemplate) {
        await LogTemplate.update(editingTemplate.id, templateData);
      } else {
        await LogTemplate.create(templateData);
      }
      setShowEditor(false);
      loadTemplates();
    } catch (error) {
      console.error("Failed to save log template:", error);
      alert("Failed to save template.");
    }
  };

  const handleToggleStatus = async (template) => {
    try {
      await LogTemplate.update(template.id, { is_active: !template.is_active });
      loadTemplates();
    } catch (error) {
      console.error("Failed to toggle status:", error);
      alert("Failed to update status.");
    }
  };

  const getSeverityColor = (level) => {
    if (level >= 9) return "bg-red-500/40 text-red-300 border-red-500/50";
    if (level >= 7) return "bg-red-500/30 text-red-300 border-red-500/40";
    if (level >= 5) return "bg-orange-500/30 text-orange-300 border-orange-500/40";
    if (level >= 3) return "bg-yellow-500/30 text-yellow-300 border-yellow-500/40";
    return "bg-green-500/30 text-green-300 border-green-500/40";
  };
  
  const uniqueSources = getUniqueValues(templates, 'source_type');
  const uniqueUseCases = getUniqueValues(templates, 'use_case');

  // New functions for scenario generation
  const handleGenerateScenario = async () => {
      setIsGenerating(true);
      try {
          // Use the context from current filters to generate relevant logs
          const contextualLogs = await generateMixedScenarioLogs(15, sourceFilter, useCaseFilter);
          
          // Convert logs to scenario format
          const scenarioData = {
              title: `Auto-Generated Scenario - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
              description: `Scenario generated from Live Feed context with filters: Source(${sourceFilter}), Use Case(${useCaseFilter}). This scenario features automatically generated log templates for simulated events.`,
              difficulty: 'Medium',
              category: 'Mixed Attack',
              learning_objectives: ['Log Analysis', 'Incident Triage', 'Multi-Source Investigation'],
              initial_events: contextualLogs, // Use the generated logs here
              is_active: true
          };
          
          setEditingScenario(scenarioData); // Set the generated scenario data
          setIsScenarioEditorOpen(true); // Open the scenario editor
          
      } catch (error) {
          console.error("AI Scenario Generation failed:", error);
          alert("Failed to generate scenario with AI.");
      } finally {
          setIsGenerating(false);
      }
  };
  
  const handleSaveScenario = async (scenarioData) => {
    try {
      // In a real application, you might want to save the individual log templates first
      // and then save the scenario referencing those templates.
      // For this simplified example, we'll assume the scenario can directly contain the log data for initial events.
      await Scenario.create(scenarioData);
      alert("Scenario saved successfully!");
      setIsScenarioEditorOpen(false);
      setEditingScenario(null); // Clear the editing scenario after saving
    } catch (error) {
      console.error("Failed to save scenario:", error);
      alert("Failed to save scenario.");
    }
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
                <Activity className="w-5 h-5 text-teal-400" />
                Live Event Feed Management
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleGenerateScenario} 
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={isGenerating}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Scenario with AI
                </Button>
                <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Template
                </Button>
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col md:flex-row flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-full md:min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-10"
                />
              </div>
              
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-full md:w-40 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Sources</SelectItem>
                  {uniqueSources.map(source => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={useCaseFilter} onValueChange={setUseCaseFilter}>
                <SelectTrigger className="w-full md:w-40 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="All Use Cases" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Use Cases</SelectItem>
                  {uniqueUseCases.map(useCase => (
                    <SelectItem key={useCase} value={useCase}>{useCase}</SelectItem>
                  ))}
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
                  <TableHead className="text-slate-300">Source</TableHead>
                  <TableHead className="text-slate-300">Use Case</TableHead>
                  <TableHead className="text-slate-300 text-center">Severity</TableHead>
                  <TableHead className="text-slate-300 text-center">Weight</TableHead>
                  <TableHead className="text-slate-300 text-center">Status</TableHead>
                  <TableHead className="text-slate-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      No log templates found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template) => (
                    <TableRow key={template.id} className="border-b-slate-800 hover:bg-slate-700/30">
                      <TableCell className="font-medium text-white max-w-64 truncate">
                        {template.title}
                      </TableCell>
                      <TableCell className="text-slate-300">{template.source_type}</TableCell>
                      <TableCell className="text-slate-300">{template.use_case}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${getSeverityColor(template.severity_level)} border text-xs font-bold`}>
                          {template.severity_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-slate-300">{template.generation_weight}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleToggleStatus(template)}
                          className="w-8 h-8 rounded-full"
                        >
                          {template.is_active ? 
                            <ToggleRight className="w-5 h-5 text-green-400" /> : 
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          }
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(template)}
                            className="hover:bg-slate-600"
                          >
                            <Edit className="w-4 h-4 text-blue-400" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(template.id, template.title)}
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
          {filteredTemplates.length > 0 && (
            <div className="mt-4 text-sm text-slate-400">
              Showing {filteredTemplates.length} of {templates.length} templates.
            </div>
          )}
        </CardContent>
      </Card>
      
      {showEditor && (
        <AdvancedLogEditor
          isOpen={showEditor}
          onClose={() => setShowEditor(false)}
          onSave={handleSave}
          template={editingTemplate}
        />
      )}

      {isScenarioEditorOpen && (
        <ScenarioEditor 
            isOpen={isScenarioEditorOpen}
            onClose={() => {setIsScenarioEditorOpen(false); setEditingScenario(null);}}
            onSave={handleSaveScenario}
            scenario={editingScenario} // Pass the generated scenario data to the editor
        />
      )}
    </>
  );
}
