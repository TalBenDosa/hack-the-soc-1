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
import { BookOpen, Search, Edit, Plus, Trash2, Download, Sparkles, Loader2, ChevronDown, CheckCircle, Archive } from "lucide-react";
import ScenarioEditor from './ScenarioEditor'; // Import the new editor
import { CorrelationEngine } from '../utils/correlationEngine';
import { base44 } from '@/api/base44Client';
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
      console.log('[SCENARIO MANAGEMENT] Fetching real malware from Malware Bazaar...');

      // Direct LLM call with internet access to get real malware
      const scenarioData = await base44.integrations.Core.InvokeLLM({
        prompt: `Access Malware Bazaar API (https://bazaar.abuse.ch/api/) and get ONE recent malware sample.

  Then create a realistic SOC training scenario with 10 security logs showing the attack progression.
  Include the real malware hash, family name, and IOCs in relevant logs.
  Mix True Positive (TP) and False Positive (FP) events.

  Return ONLY this exact JSON structure:
  {
  "scenario_name": "Attack name",
  "description": "Detailed scenario description",
  "difficulty": "Easy|Medium|Hard",
  "malware_family": "malware family name",
  "malware_hash": "SHA256 hash",
  "logs": [
  {
  "timestamp": "ISO datetime",
  "source_type": "EDR|Firewall|Active Directory|Office 365|etc",
  "description": "What happened",
  "username": "user",
  "hostname": "computer name",
  "ip_address": "IP",
  "severity": "Low|Medium|High|Critical",
  "verdict": "TP|FP",
  "justification": "why TP or FP",
  "raw_log_data": {}
  }
  ]
  }`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            scenario_name: { type: "string" },
            description: { type: "string" },
            difficulty: { type: "string" },
            malware_family: { type: "string" },
            malware_hash: { type: "string" },
            logs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  timestamp: { type: "string" },
                  source_type: { type: "string" },
                  description: { type: "string" },
                  username: { type: "string" },
                  hostname: { type: "string" },
                  ip_address: { type: "string" },
                  severity: { type: "string" },
                  verdict: { type: "string" },
                  justification: { type: "string" },
                  raw_log_data: { type: "object" }
                }
              }
            }
          }
        }
      });

      if (!scenarioData?.logs?.length) {
        throw new Error('No logs generated');
      }

      console.log('[SCENARIO MANAGEMENT] Converting to scenario format...');

      const scenarioLogs = scenarioData.logs.map((log, i) => ({
        id: `mb-${Date.now()}-${i}`,
        rule_description: log.description || 'Security Alert',
        source_type: log.source_type || 'EDR',
        timestamp: log.timestamp || new Date().toISOString(),
        username: log.username || 'user',
        hostname: log.hostname || 'PC-01',
        ip_address: log.ip_address || '10.0.0.1',
        severity: log.severity || 'High',
        admin_notes: `${log.verdict}: ${log.justification}`,
        raw_log_data: { ...log.raw_log_data, malware_hash: scenarioData.malware_hash },
        default_classification: log.verdict === 'FP' ? 'False Positive' : 'True Positive'
      }));

      setEditingScenario({
        title: `${scenarioData.malware_family} - Real Malware Attack`,
        description: `${scenarioData.description}\n\n🦠 Based on real malware:\nFamily: ${scenarioData.malware_family}\nSHA256: ${scenarioData.malware_hash}`,
        difficulty: scenarioData.difficulty || 'Medium',
        category: 'Malware',
        estimated_duration: 60,
        initial_events: scenarioLogs,
        is_active: false,
        learning_objectives: [
          `Analyze ${scenarioData.malware_family} malware`,
          'Track attack progression',
          'Identify real IOCs',
          'Correlate multiple log sources'
        ],
        tags: ['Real Malware', 'Malware Bazaar', scenarioData.malware_family, scenarioData.difficulty],
        scenario_metadata: {
          source: 'Malware Bazaar',
          malware_hash: scenarioData.malware_hash,
          malware_family: scenarioData.malware_family,
          generated_at: new Date().toISOString()
        }
      });

      setIsEditorOpen(true);
      console.log(`[SCENARIO MANAGEMENT] ✅ Generated ${scenarioLogs.length} logs`);

    } catch (error) {
      console.error('[SCENARIO MANAGEMENT] ❌', error);
      alert(`Generation failed: ${error.message}`);
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
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {isGenerating ? 'Generating...' : 'Generate with AI'}
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