import React, { useState, useEffect, useCallback } from "react";
import { Scenario } from "@/entities/Scenario";
import { User } from "@/entities/User"; // Import the User entity
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow }
  from "@/components/ui/table";
import { BookOpen, Search, Edit, Plus, Trash2, Download, Sparkles, Loader2, ChevronDown, CheckCircle, Archive } from "lucide-react"; // Updated icons
import ScenarioEditor from './ScenarioEditor'; // Import the new editor
import { CorrelationEngine } from '../utils/correlationEngine'; // ייבוא המנוע החדש
import { generateAdvancedAIScenario, listAttackChains } from '../utils/advancedAIScenarioGenerator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


export default function ScenarioManagement({ tenant }) { // Accept tenant as a prop
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // State for the editor
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingScenario, setEditingScenario] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // New state for super admin global content management
  const [isSuperAdminGlobal, setIsSuperAdminGlobal] = useState(null); // Initialize to null
  const [saving, setSaving] = useState(false); // New state for saving status

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      try {
        const currentUser = await User.me();
        const isImpersonating = sessionStorage.getItem('superadmin_impersonation') !== null;

        if (currentUser.role === 'admin' && !isImpersonating) {
          setIsSuperAdminGlobal(true);
          console.log('[SCENARIO MANAGEMENT] Super Admin in GLOBAL mode');
        } else {
          setIsSuperAdminGlobal(false);
          console.log('[SCENARIO MANAGEMENT] Tenant-specific mode for:', tenant?.name || 'Unknown');
        }
      } catch (error) {
        console.error('Error checking super admin status:', error);
        setIsSuperAdminGlobal(false);
      }
    };

    checkSuperAdminStatus();
  }, [tenant]); // Re-check if tenant changes

  // Renamed loadScenarios to fetchScenarios for clarity
  const fetchScenarios = useCallback(async () => {
    setLoading(true);
    try {
      let scenariosData;

      // SUPER ADMIN GLOBAL MODE: Should see ALL scenarios, tenant-specific and global.
      // The most reliable way is to list all scenarios without filters.
      if (isSuperAdminGlobal) {
        scenariosData = await Scenario.list('-created_date');
        console.log('[SCENARIO MANAGEMENT] Super Admin GLOBAL: Loaded ALL scenarios system-wide.');
      }
      // REGULAR ADMIN / IMPERSONATION MODE: Load tenant-specific + global scenarios
      else if (tenant?.id) {
        const tenantScenarios = await Scenario.filter({ tenant_id: tenant.id });
        const globalScenarios = await Scenario.filter({ tenant_id: null, is_global: true });
        scenariosData = [...(tenantScenarios || []), ...(globalScenarios || [])];
        console.log(`[SCENARIO MANAGEMENT] Loaded ${tenantScenarios?.length || 0} tenant + ${globalScenarios?.length || 0} global scenarios for tenant ${tenant.name}`);
      }
      // Fallback for no context
      else {
        scenariosData = [];
        console.log('[SCENARIO MANAGEMENT] No tenant context, loading no scenarios.');
      }

      setScenarios(scenariosData || []);
    } catch (error) {
      console.error("Failed to fetch scenarios:", error);
      setScenarios([]);
    }
    setLoading(false);
  }, [isSuperAdminGlobal, tenant?.id, tenant?.name]);

  useEffect(() => {
    // Only fetch scenarios once super admin status has been determined.
    if (isSuperAdminGlobal !== null) {
      fetchScenarios();
    }
  }, [isSuperAdminGlobal, fetchScenarios]); // This now waits for isSuperAdminGlobal to be set.

  const handleSave = async (scenarioData) => {
    setSaving(true);
    try {
      let finalScenarioData = { ...scenarioData };

      if (isSuperAdminGlobal) {
        // Global scenario for all tenants
        finalScenarioData = {
          ...scenarioData,
          tenant_id: null, // Null tenant_id for global scenarios
          is_global: true,
          created_by_super_admin: true
        };
        console.log('[SCENARIO MANAGEMENT] Creating GLOBAL scenario:', finalScenarioData.title);
      } else if (tenant?.id) {
        // Tenant-specific scenario
        finalScenarioData = {
          ...scenarioData,
          tenant_id: tenant.id,
          is_global: false,
          created_by_super_admin: false
        };
        console.log('[SCENARIO MANAGEMENT] Creating tenant-specific scenario for:', tenant.name, finalScenarioData.title);
      } else {
        throw new Error('No valid tenant context or super admin mode to save scenario.');
      }

      if (editingScenario && editingScenario.id) {
        await Scenario.update(editingScenario.id, finalScenarioData);
      } else {
        await Scenario.create(finalScenarioData);
      }

      setIsEditorOpen(false); // Close the editor after saving
      setEditingScenario(null); // Clear editing scenario
      fetchScenarios(); // Refresh the list

      if (isSuperAdminGlobal) {
        alert(`✅ Global scenario "${scenarioData.title}" is now available to ALL clients!`);
      } else {
        alert(`✅ Scenario "${scenarioData.title}" created for ${tenant.name}!`);
      }

    } catch (error) {
      console.error("Failed to save scenario:", error);
      alert(`❌ Failed to save scenario: ${error.message}`);
    }
    setSaving(false);
  };

  const filteredScenarios = scenarios.filter(s => {
    const matchesSearch = s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || s.difficulty === difficultyFilter;
    const matchesCategory = categoryFilter === "all" || s.category === categoryFilter;
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && s.is_active) ||
      (statusFilter === "inactive" && !s.is_active);

    return matchesSearch && matchesDifficulty && matchesCategory && matchesStatus;
  });

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Easy": return "text-green-400 bg-green-400/20 border-green-500/30";
      case "Medium": return "text-yellow-400 bg-yellow-400/20 border-yellow-500/30";
      case "Hard": return "text-red-400 bg-red-400/20 border-red-500/30";
      case "Advanced": return "text-purple-400 bg-purple-400/20 border-purple-500/30";
      default: return "text-gray-400 bg-gray-400/20 border-gray-500/30";
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Malware": return "🦠";
      case "Brute Force": return "🔨";
      case "Privilege Escalation": return "⬆️";
      case "Data Exfiltration": return "📤";
      case "Network Intrusion": return "🌐";
      case "Insider Threat": return "👤";
      case "Phishing / Social Engineering": return "🎣";
      case "Web Application Attack": return "💻";
      case "Denial of Service (DoS/DDoS)": return "🚫";
      case "Supply Chain Attack": return "🔗";
      case "Cloud Misconfiguration": return "☁️";
      case "Vulnerability Exploitation": return "💥";
      default: return "📊";
    }
  };

  const handleAddNew = () => {
    setEditingScenario(null); // No initial data for manual creation
    setIsEditorOpen(true);
  };

  const handleEdit = (scenario) => {
    setEditingScenario(scenario);
    setIsEditorOpen(true);
  };

  const handleDelete = async (scenarioId) => {
    if (window.confirm("Are you sure you want to delete this scenario? This action cannot be undone.")) {
      try {
        await Scenario.delete(scenarioId);
        fetchScenarios(); // Refresh scenarios after deletion
      } catch (error) {
        console.error('Failed to delete scenario:', error);
        alert('Failed to delete scenario. Please try again.');
      }
    }
  };

  const handleToggleStatus = async (scenario, newStatus) => {
    try {
      await Scenario.update(scenario.id, { is_active: newStatus });
      fetchScenarios(); // Refresh scenarios list
      
      const statusText = newStatus ? 'published and is now available to students' : 'moved to drafts and hidden from students';
      alert(`✅ Scenario "${scenario.title}" has been ${statusText}.`);
    } catch (error) {
      console.error('Failed to toggle scenario status:', error);
      alert('❌ Failed to update scenario status. Please try again.');
    }
  };

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    try {
      console.log('[SCENARIO MANAGEMENT] Starting MITRE ATT&CK AI scenario generation...');
      
      // Use advanced AI generator with MITRE ATT&CK
      const investigationScenario = await generateAdvancedAIScenario({
        attackChain: null, // Random selection
        difficulty: null, // Auto-determine
        numLogs: null // Auto-determine (8-15)
      });
      
      // --- FIX: Add robust defensive checks for the generated scenario ---
      if (!investigationScenario || !investigationScenario.logs || !Array.isArray(investigationScenario.logs) || investigationScenario.logs.length === 0) {
          // Use JSON.stringify for better logging of the invalid object
          console.error("[SCENARIO MANAGEMENT] The generated scenario from the engine is invalid or missing logs:", JSON.stringify(investigationScenario, null, 2));
          throw new Error("The AI-generated scenario was incomplete or invalid. Please try again.");
      }

      console.log(`[SCENARIO MANAGEMENT] Generated scenario: ${investigationScenario.scenario_name}`);
      console.log(`[SCENARIO MANAGEMENT] Total logs: ${investigationScenario.total_logs}`);
      console.log(`[SCENARIO MANAGEMENT] Attack chain: ${investigationScenario.attack_chain}`);
      console.log(`[SCENARIO MANAGEMENT] MITRE techniques: ${investigationScenario.mitre_techniques_used.join(', ')}`);
      
      const scenarioLogs = investigationScenario.logs.map((log, index) => {
        // Remove verdict-related fields from raw log data
        const { verdict, justification, mitre_technique, ...cleanRawLog } = log;
        
        // Get best description
        const description = log.story_context || log.event_type || 'Security Event Detected';
        const sourceType = log.log_source || 'EDR';

        // Map verdict to classification
        const classification = verdict === 'TP' ? 'True Positive' : 
                              verdict === 'FP' ? 'False Positive' : 
                              'Escalate to TIER 2';

        return {
          id: `log-${Date.now()}-${index}`,
          rule_description: description,
          source_type: sourceType,
          timestamp: log.timestamp,
          username: log.user_name || log.username || 'N/A',
          hostname: log.device_name || log.hostname || 'Unknown',
          ip_address: log.source_ip || log.source_ip_address || 'N/A',
          severity: log.severity || 'Medium',
          admin_notes: `MITRE: ${mitre_technique || 'N/A'}\nVerdict: ${verdict}\nJustification: ${justification || ''}`,
          raw_log_data: {
            ...cleanRawLog,
            mitre_technique: mitre_technique // Keep for admin reference
          },
          default_classification: classification,
        };
      });

      // ✅ בחירת קטגוריה רנדומלית, אך הגיונית לתרחיש
      const categories = ["Network Intrusion", "Malware", "Data Exfiltration", "Privilege Escalation", "Insider Threat", "Phishing / Social Engineering"];

      const generatedScenario = {
        title: investigationScenario.scenario_name,
        description: investigationScenario.scenario_description,
        difficulty: difficulty,
        category: categories[Math.floor(Math.random() * categories.length)],
        estimated_duration: 60,
        initial_events: scenarioLogs,
        is_active: false, // ✅ תמיד מתחיל כטיוטה
        learning_objectives: [
          "Perform correlation analysis across multiple data sources",
          "Distinguish between legitimate activity and security threats",
          "Build a comprehensive incident timeline",
          "Identify false positives in a complex event stream"
        ],
        tags: [
          "Correlation", 
          "Multi-Source", 
          difficulty,
          ...investigationScenario.data_sources_used,
          investigationScenario.final_verdict.verdict
        ],
        scenario_metadata: {
          correlation_id: investigationScenario.correlation_id,
          final_verdict: investigationScenario.final_verdict,
          investigation_summary: investigationScenario.investigation_summary,
          data_sources_used: investigationScenario.data_sources_used
        }
      };

      console.log(`[SCENARIO MANAGEMENT] Created correlated scenario with ${scenarioLogs.length} events.`);
      setEditingScenario(generatedScenario);
      setIsEditorOpen(true);

    } catch (error) {
      console.error("[SCENARIO MANAGEMENT] Correlation-based AI Generation failed:", error);
      alert(`Failed to generate correlated scenario: ${error.message}. Check console for detailed logs.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportScenarios = () => {
    const exportData = {
      scenarios: filteredScenarios,
      export_timestamp: new Date().toISOString(),
      export_count: filteredScenarios.length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scenarios_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading || isSuperAdminGlobal === null) { // Show loader until super admin status is determined
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
                Scenario Management {isSuperAdminGlobal && <Badge variant="secondary" className="bg-purple-800 text-purple-200 border-purple-700">GLOBAL</Badge>}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={exportScenarios} size="sm" className="border-slate-600 text-slate-300">
                  <Download className="w-4 h-4 mr-2" />
                  Export ({filteredScenarios.length})
                </Button>
                <Button
                  onClick={handleGenerateWithAI}
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={isGenerating} // Disable while any AI generation is active
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {isGenerating ? 'Generating Narrative Scenario...' : 'Generate with AI'}
                </Button>
                <Button onClick={handleAddNew} className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manually
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-full md:min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search scenarios..."
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
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-40 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Malware">Malware</SelectItem>
                  <SelectItem value="Brute Force">Brute Force</SelectItem>
                  <SelectItem value="Privilege Escalation">Privilege Escalation</SelectItem>
                  <SelectItem value="Data Exfiltration">Data Exfiltration</SelectItem>
                  <SelectItem value="Network Intrusion">Network Intrusion</SelectItem>
                  <SelectItem value="Insider Threat">Insider Threat</SelectItem>
                  <SelectItem value="Phishing / Social Engineering">Phishing / Social Engineering</SelectItem>
                  <SelectItem value="Web Application Attack">Web Application Attack</SelectItem>
                  <SelectItem value="Denial of Service (DoS/DDoS)">Denial of Service (DoS/DDoS)</SelectItem>
                  <SelectItem value="Supply Chain Attack">Supply Chain Attack</SelectItem>
                  <SelectItem value="Cloud Misconfiguration">Cloud Misconfiguration</SelectItem>
                  <SelectItem value="Vulnerability Exploitation">Vulnerability Exploitation</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-32 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Published</SelectItem>
                  <SelectItem value="inactive">Draft</SelectItem>
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
                  <TableHead className="text-slate-300">Logs</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  {isSuperAdminGlobal && <TableHead className="text-slate-300">Tenant ID / Global</TableHead>}
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScenarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSuperAdminGlobal ? 7 : 6} className="text-center py-8 text-slate-400">
                      No scenarios found matching your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredScenarios.map((scenario) => (
                    <TableRow key={scenario.id} className="border-b-slate-800 hover:bg-slate-700/30">
                      <TableCell className="font-medium text-white max-w-64">
                        <div className="font-medium truncate">{scenario.title}</div>
                        <div className="text-sm text-slate-400 truncate">{scenario.description}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getCategoryIcon(scenario.category)}</span>
                          <Badge variant="outline" className="border-slate-600 text-slate-300">
                            {scenario.category}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getDifficultyColor(scenario.difficulty)} border`}>
                          {scenario.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300 font-medium">
                        {scenario.initial_events?.length || 0}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className={`h-8 px-3 w-32 justify-between ${
                                scenario.is_active 
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30' 
                                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30'
                              } border`}
                            >
                              {scenario.is_active ? 'Published' : 'Draft'}
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white w-48">
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-600" />
                            
                            <DropdownMenuItem 
                              onClick={() => handleToggleStatus(scenario, true)}
                              disabled={scenario.is_active}
                              className="cursor-pointer hover:bg-slate-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-2 !text-green-400" />
                              <span>Publish Scenario</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={() => handleToggleStatus(scenario, false)}
                              disabled={!scenario.is_active}
                              className="cursor-pointer hover:bg-slate-700"
                            >
                              <Archive className="w-4 h-4 mr-2 !text-yellow-400" />
                              <span>Move to Drafts</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      {isSuperAdminGlobal && (
                        <TableCell className="text-slate-400 text-xs">
                          {scenario.is_global ? (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Global</Badge>
                          ) : (
                            scenario.tenant_id || 'N/A'
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(scenario)}
                            className="hover:bg-slate-600"
                            title="Edit Scenario"
                          >
                            <Edit className="w-4 h-4 text-blue-400" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(scenario.id)}
                            className="hover:bg-slate-600"
                            title="Delete Scenario"
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

          {filteredScenarios.length > 0 && (
            <div className="mt-4 text-sm text-slate-400 flex justify-between items-center">
              <span>
                Showing {filteredScenarios.length} of {scenarios.length} scenarios
              </span>
              <div className="flex gap-4">
                <span>Published: {scenarios.filter(s => s.is_active).length}</span>
                <span>Draft: {scenarios.filter(s => !s.is_active).length}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isEditorOpen && (
        <ScenarioEditor
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingScenario(null); // Clear editing scenario when closing editor
          }}
          onSave={handleSave} // Use the new handleSave function
          scenario={editingScenario}
          saving={saving} // Pass saving state to editor if needed for button disable
          isSuperAdminGlobal={isSuperAdminGlobal} // Pass super admin status to editor
        />
      )}
    </>
  );
}