
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock,
  User, 
  Shield,
  Database,
  Activity,
  Hash,
  Plus,
  Trash2,
  Info,
  AlertTriangle
} from "lucide-react";

// IOC Types for dropdown
const IOC_TYPES = [
  "IP Address", "Domain", "Email Address", "File Hash (MD5 / SHA256)", "URL", 
  "File Path", "Registry Key", "Process Name", "Command Line", "User Agent", 
  "JWT / Token", "Mutex", "Named Pipe", "Custom (Other)"
];

// Language validation function
const isEnglish = (text) => {
    if (!text || text.trim() === '') return true; // Empty text is allowed
    // Check for non-English characters (Hebrew, Arabic, Russian, Chinese, Japanese, etc.)
    const nonEnglishRegex = /[\u0590-\u05FF\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/;
    return !nonEnglishRegex.test(text);
};

// Component to display language error message
const LanguageError = () => (
    <div className="flex items-center gap-2 mt-2 p-2 bg-red-900/50 border border-red-500/50 rounded text-red-300 text-sm">
        <AlertTriangle className="w-4 h-4" />
        <span>❗ Only English input is supported. Please switch to English.</span>
    </div>
);

// Enhanced recursive component to display nested JSON as Key:Value pairs
const JsonKeyValueDisplay = ({ data, prefix = "" }) => {
  if (!data || typeof data !== 'object') return null;

  // Separate MITRE/CVE fields from other fields
  const regularFields = {};
  const mitreFields = {};
  
  // Sort keys alphabetically for consistent ordering within each category
  const sortedKeys = Object.keys(data).sort();

  sortedKeys.forEach((key) => {
    const value = data[key];
    const lowerKey = key.toLowerCase();
    
    // Check for MITRE/CVE related keywords or exact matches
    if (lowerKey.includes('mitre') || lowerKey.includes('tactic') || 
        lowerKey.includes('technique') || lowerKey.includes('cve') ||
        key === 'technique_id' || key === 'tactic' || key === 'technique' || key === 'cve') {
      mitreFields[key] = value;
    } else {
      regularFields[key] = value;
    }
  });

  const renderFields = (fields, currentPrefix = "") => {
    return Object.entries(fields).map(([key, value]) => {
      const displayKey = currentPrefix ? `${currentPrefix}.${key}` : key;

      // Handle nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return <JsonKeyValueDisplay key={displayKey} data={value} prefix={displayKey} />;
      }

      // Don't display system-generated fields in the structured view
      if (['id', 'created_date', 'updated_date', 'created_by'].includes(key)) {
        return null;
      }

      // Handle primitive values (including arrays, which will be stringified)
      return (
        <div key={displayKey} className="flex items-start text-sm py-2 border-b border-slate-800 last:border-0">
          <span className="font-medium text-slate-400 w-1/3 shrink-0 break-words">{displayKey.replace(/_/g, ' ')}:</span>
          <span className="text-white flex-1 break-words">{String(value)}</span>
        </div>
      );
    });
  };

  return (
    <>
      {/* Render regular fields first */}
      {renderFields(regularFields, prefix)}
      {/* Render MITRE/CVE fields last */}
      {renderFields(mitreFields, prefix)}
    </>
  );
};

export default function LogAnalysisViewer({ 
  log, 
  logId, 
  logInvestigation,
  onLogInvestigationUpdate
}) {
  // State management
  const [showRawJson, setShowRawJson] = useState(false);
  const [analysisText, setAnalysisText] = useState(logInvestigation?.findings || "");
  const [manualIOCs, setManualIOCs] = useState(logInvestigation?.manual_iocs || []);
  const [timelineEvents, setTimelineEvents] = useState(logInvestigation?.timeline_events || []);
  const [verdict, setVerdict] = useState(logInvestigation?.verdict || "");
  const [newIoc, setNewIoc] = useState({ type: "IP Address", value: "" });

  // State for language validation errors
  const [languageErrors, setLanguageErrors] = useState({});

  useEffect(() => {
    setAnalysisText(logInvestigation?.findings || "");
    setManualIOCs(logInvestigation?.manual_iocs || []);
    setTimelineEvents(logInvestigation?.timeline_events || []);
    setVerdict(logInvestigation?.verdict || "");
    // Clear language errors on logInvestigation change, assuming new data is valid or needs fresh validation
    setLanguageErrors({}); 
  }, [logInvestigation]);

  const updateInvestigation = (updates) => {
    if (onLogInvestigationUpdate) {
      onLogInvestigationUpdate(logId, { ...logInvestigation, ...updates });
    }
  };

  const handleAnalysisChange = (text) => {
    const isValidLanguage = isEnglish(text);
    setLanguageErrors(prev => ({
        ...prev,
        findings: !isValidLanguage // Set findings error based on validation
    }));

    // Update local state immediately for user input
    setAnalysisText(text); 
    
    // Only propagate to parent (save) if language is valid
    if (isValidLanguage) {
      updateInvestigation({ findings: text });
    }
  };
  
  const handleVerdictChange = (newVerdict) => {
    setVerdict(newVerdict);
    updateInvestigation({ verdict: newVerdict });
  };

  // IOC Management
  const addIOC = () => {
    const isValidLanguage = isEnglish(newIoc.value);
    setLanguageErrors(prev => ({ ...prev, newIocValue: !isValidLanguage }));
    
    if (!newIoc.value.trim() || !isValidLanguage) return;

    const iocToAdd = {
      id: `ioc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...newIoc
    };
    const updatedIOCs = [...manualIOCs, iocToAdd];
    setManualIOCs(updatedIOCs);
    updateInvestigation({ manual_iocs: updatedIOCs });
    setNewIoc({ type: "IP Address", value: "" }); // Reset form
    setLanguageErrors(prev => ({ ...prev, newIocValue: false })); // Clear error after successful add
  };

  const deleteIOC = (iocId) => {
    const updatedIOCs = manualIOCs.filter(ioc => ioc.id !== iocId);
    setManualIOCs(updatedIOCs);
    updateInvestigation({ manual_iocs: updatedIOCs });
  };

  // Timeline Management
  const addTimelineEvent = () => {
    const newEvent = {
      id: `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      time: new Date().toISOString().substring(0, 16),
      description: ""
    };
    const updatedEvents = [...timelineEvents, newEvent];
    setTimelineEvents(updatedEvents);
    updateInvestigation({ timeline_events: updatedEvents });
  };

  const updateTimelineEvent = (eventId, field, value) => {
    const updatedEvents = timelineEvents.map(event => 
      event.id === eventId ? { ...event, [field]: value } : event
    );
    setTimelineEvents(updatedEvents);

    if (field === 'description') {
        const isValid = isEnglish(value);
        const errorKey = `timeline_desc_${eventId}`;
        setLanguageErrors(prev => ({ ...prev, [errorKey]: !isValid }));
        
        if (isValid) {
            updateInvestigation({ timeline_events: updatedEvents });
        }
    } else {
        updateInvestigation({ timeline_events: updatedEvents });
    }
  };

  const deleteTimelineEvent = (eventId) => {
    const updatedEvents = timelineEvents.filter(event => event.id !== eventId);
    setTimelineEvents(updatedEvents);
    updateInvestigation({ timeline_events: updatedEvents });
    
    const errorKey = `timeline_desc_${eventId}`;
    setLanguageErrors(prev => {
        const { [errorKey]: _, ...rest } = prev;
        return rest;
    });
  };

  // Get the actual log data to display
  const displayData = log?.raw_log_data || log || {};
  const basicInfo = {
    rule_description: log?.rule_description || "N/A",
    source_type: log?.source_type || "N/A", 
    timestamp: log?.timestamp || "N/A",
    severity: log?.severity || "N/A",
    username: log?.username || "N/A",
    hostname: log?.hostname || "N/A",
    ip_address: log?.ip_address || "N/A"
  };

  return (
    <div className="space-y-6">
      {/* Log Analysis Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-teal-400" />
            Log Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Information Section */}
          <div>
            <h3 className="text-sm font-medium mb-3 text-slate-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              Basic Information
            </h3>
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
              {Object.entries(basicInfo).map(([key, value]) => (
                <div key={key} className="flex items-start text-sm">
                  <span className="font-medium text-slate-400 w-1/3 capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-white flex-1 break-words">
                    {value || "N/A"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Log Data Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Detailed Log Data
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Raw JSON</span>
                <Switch 
                  checked={showRawJson} 
                  onCheckedChange={setShowRawJson}
                />
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4">
              {showRawJson ? (
                <pre className="text-sm text-white overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(displayData, null, 2)}
                </pre>
              ) : (
                <div className="space-y-1">
                  {Object.keys(displayData).length > 0 ? (
                    <JsonKeyValueDisplay data={displayData} />
                  ) : (
                    <p className="text-slate-400 text-sm">No additional log data available</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investigation Findings */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-400" />
            Investigation Findings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div> {/* Added div for label and textarea */}
            <label htmlFor="findings-textarea" className="block text-sm font-medium text-slate-300 mb-2">
                Investigation Findings
            </label>
            <Textarea
              id="findings-textarea"
              value={analysisText}
              onChange={(e) => handleAnalysisChange(e.target.value)}
              placeholder="Describe what you found in this log entry. What happened? What are the indicators? What should be investigated further?"
              className="bg-slate-700 border-slate-600 text-white min-h-32"
            />
            {languageErrors.findings && <LanguageError />}
          </div>
        </CardContent>
      </Card>

      {/* IOC Tracker */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Hash className="w-5 h-5 text-red-400" />
            Indicators of Compromise (IOCs)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <Select value={newIoc.type} onValueChange={(value) => setNewIoc({...newIoc, type: value})}>
                  <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {IOC_TYPES.map(type => (
                      <SelectItem key={type} value={type} className="text-white">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={newIoc.value}
                  onChange={(e) => {
                    setNewIoc({...newIoc, value: e.target.value});
                    const isValid = isEnglish(e.target.value);
                    setLanguageErrors(prev => ({...prev, newIocValue: !isValid}));
                  }}
                  placeholder="Enter IOC value..."
                  className="flex-1 bg-slate-700 border-slate-600 text-white"
                />
                <Button onClick={addIOC} className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-4 h-4" />
                </Button>
            </div>
            {languageErrors.newIocValue && <LanguageError />}
          </div>

          {manualIOCs.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Type</TableHead>
                  <TableHead className="text-slate-300">Value</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {manualIOCs.map((ioc) => (
                  <TableRow key={ioc.id} className="border-slate-700">
                    <TableCell className="text-white">{ioc.type}</TableCell>
                    <TableCell className="text-white font-mono">{ioc.value}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteIOC(ioc.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Timeline Events */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Timeline Events
            </CardTitle>
            <Button onClick={addTimelineEvent} variant="outline" size="sm" className="border-slate-600 text-slate-300">
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {timelineEvents.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No timeline events added yet</p>
          ) : (
            <div className="space-y-3">
              {timelineEvents.map((event) => (
                <div key={event.id} className="flex flex-col gap-2 p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex gap-3">
                      <Input
                        type="datetime-local"
                        value={event.time}
                        onChange={(e) => updateTimelineEvent(event.id, 'time', e.target.value)}
                        className="w-48 bg-slate-700 border-slate-600 text-white"
                      />
                      <Input
                        value={event.description}
                        onChange={(e) => updateTimelineEvent(event.id, 'description', e.target.value)}
                        placeholder="Event description..."
                        className="flex-1 bg-slate-700 border-slate-600 text-white"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteTimelineEvent(event.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                  </div>
                  {languageErrors[`timeline_desc_${event.id}`] && <LanguageError />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investigation Verdict */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-400" />
            Investigation Verdict
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              onClick={() => handleVerdictChange("True Positive")}
              className={`flex-1 ${
                verdict === "True Positive" 
                  ? "bg-green-600 hover:bg-green-700 ring-2 ring-green-400" 
                  : "bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30"
              }`}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              True Positive
            </Button>
            <Button
              onClick={() => handleVerdictChange("False Positive")}
              className={`flex-1 ${
                verdict === "False Positive" 
                  ? "bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-400" 
                  : "bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/30"
              }`}
            >
              <XCircle className="w-4 h-4 mr-2" />
              False Positive
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
