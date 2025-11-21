
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, CheckCircle, XCircle, ShieldAlert } from "lucide-react";

const SOURCE_TYPES = [
  "EDR", "Firewall", "Active Directory", "DNS", "Office 365", 
  "IDS", "Windows Security", "DLP", "DC", "Azure", "AWS", 
  "IPS", "Mail Relay", "NAC", "AV"
];

const SEVERITIES = ["Low", "Medium", "High", "Critical"];

const VERDICTS = [
  { value: "True Positive", label: "True Positive", icon: CheckCircle, color: "text-green-400", description: "Confirmed malicious or suspicious activity" },
  { value: "False Positive", label: "False Positive", icon: XCircle, color: "text-orange-400", description: "Legitimate activity incorrectly flagged" },
  { value: "Escalate to TIER 2", label: "Escalate to TIER 2", icon: ShieldAlert, color: "text-red-400", description: "Requires advanced analysis" }
];

export default function SimpleLogEditor({ log, onSave, onCancel }) {
  const [logData, setLogData] = useState({
    rule_description: log?.rule_description || "",
    source_type: log?.source_type || "",
    severity: log?.severity || "Medium",
    verdict: log?.admin_notes?.includes("True Positive") ? "True Positive" : 
             log?.admin_notes?.includes("False Positive") ? "False Positive" :
             log?.admin_notes?.includes("Escalate to TIER 2") ? "Escalate to TIER 2" : "",
    timestamp: log?.timestamp ? new Date(log.timestamp).toISOString().slice(0, 19) : new Date().toISOString().slice(0, 19),
    username: log?.username || "",
    hostname: log?.hostname || "",
    ip_address: log?.ip_address || "",
    admin_notes: log?.admin_notes || "",
    raw_log_data: log?.raw_log_data ? JSON.stringify(log.raw_log_data, null, 2) : "{\n  \n}"
  });

  const [jsonError, setJsonError] = useState("");

  const handleChange = (field, value) => {
    setLogData(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate admin notes based on verdict selection
    if (field === 'verdict' && value) {
      const verdictNotes = generateAdminNotes(value, logData.rule_description);
      setLogData(prev => ({ ...prev, admin_notes: verdictNotes }));
    }
    
    if (field === 'raw_log_data') {
      try {
        JSON.parse(value);
        setJsonError("");
      } catch (e) {
        setJsonError("Invalid JSON format");
      }
    }
  };

  const generateAdminNotes = (verdict, ruleDescription) => {
    const baseDescription = ruleDescription || "Security event";
    
    switch (verdict) {
      case "True Positive":
        return `True Positive - ${baseDescription} indicates confirmed malicious or suspicious activity requiring immediate attention.`;
      case "False Positive":
        return `False Positive - ${baseDescription} is legitimate activity incorrectly flagged by security tools.`;
      case "Escalate to TIER 2":
        return `Escalate to TIER 2 - ${baseDescription} requires advanced analysis and specialist expertise for proper investigation.`;
      default:
        return "";
    }
  };

  const handleSave = () => {
    if (!logData.rule_description.trim()) {
      alert("Please enter a rule description");
      return;
    }

    if (!logData.source_type) {
      alert("Please select a source type");
      return;
    }

    if (!logData.verdict) {
      alert("Please select a verdict classification");
      return;
    }

    let parsedRawData = {};
    try {
      parsedRawData = JSON.parse(logData.raw_log_data);
    } catch (e) {
      alert("Invalid JSON in raw log data");
      return;
    }

    const finalLogData = {
      ...logData,
      raw_log_data: parsedRawData,
      id: log?.id || `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    onSave(finalLogData);
  };

  const getVerdictIcon = (verdictValue) => {
    const verdict = VERDICTS.find(v => v.value === verdictValue);
    if (!verdict) return null;
    
    const Icon = verdict.icon;
    return <Icon className={`w-4 h-4 ${verdict.color}`} />;
  };

  return (
    <Card className="bg-slate-700 border-slate-600">
      <CardHeader>
        <CardTitle className="text-white text-lg">
          {log ? 'Edit Log Entry' : 'Create New Log Entry'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rule Description */}
        <div>
          <label className="text-sm text-slate-300 mb-2 block">Rule Description *</label>
          <Input
            value={logData.rule_description}
            onChange={(e) => handleChange('rule_description', e.target.value)}
            placeholder="e.g., Multiple failed login attempts detected"
            className="bg-slate-600 border-slate-500 text-white"
          />
        </div>

        {/* Source Type and Severity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-300 mb-2 block">Source Type *</label>
            <Select value={logData.source_type} onValueChange={(value) => handleChange('source_type', value)}>
              <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent className="bg-slate-600 border-slate-500">
                {SOURCE_TYPES.map(source => (
                  <SelectItem key={source} value={source} className="text-white hover:bg-slate-500">
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-2 block">Severity *</label>
            <Select value={logData.severity} onValueChange={(value) => handleChange('severity', value)}>
              <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent className="bg-slate-600 border-slate-500">
                {SEVERITIES.map(severity => (
                  <SelectItem key={severity} value={severity} className="text-white hover:bg-slate-500">
                    {severity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Verdict Classification */}
        <div>
          <label className="text-sm text-slate-300 mb-2 block">Event Classification *</label>
          <Select value={logData.verdict} onValueChange={(value) => handleChange('verdict', value)}>
            <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
              <SelectValue placeholder="Select event classification">
                {logData.verdict && (
                  <div className="flex items-center gap-2">
                    {getVerdictIcon(logData.verdict)}
                    {logData.verdict}
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-slate-600 border-slate-500">
              {VERDICTS.map(verdict => {
                const Icon = verdict.icon;
                return (
                  <SelectItem key={verdict.value} value={verdict.value} className="text-white hover:bg-slate-500">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${verdict.color}`} />
                      <div>
                        <div className="font-medium">{verdict.label}</div>
                        <div className="text-xs text-slate-400">{verdict.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Timestamp */}
        <div>
          <label className="text-sm text-slate-300 mb-2 block">Timestamp</label>
          <Input
            type="datetime-local"
            value={logData.timestamp}
            onChange={(e) => handleChange('timestamp', e.target.value)}
            className="bg-slate-600 border-slate-500 text-white"
          />
        </div>

        {/* User Details */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-slate-300 mb-2 block">Username</label>
            <Input
              value={logData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="e.g., john.doe"
              className="bg-slate-600 border-slate-500 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-2 block">Hostname</label>
            <Input
              value={logData.hostname}
              onChange={(e) => handleChange('hostname', e.target.value)}
              placeholder="e.g., WORKSTATION-01"
              className="bg-slate-600 border-slate-500 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-2 block">IP Address</label>
            <Input
              value={logData.ip_address}
              onChange={(e) => handleChange('ip_address', e.target.value)}
              placeholder="e.g., 192.168.1.100"
              className="bg-slate-600 border-slate-500 text-white"
            />
          </div>
        </div>

        {/* Admin Notes */}
        <div>
          <label className="text-sm text-slate-300 mb-2 block">Admin Notes</label>
          <Textarea
            value={logData.admin_notes}
            onChange={(e) => handleChange('admin_notes', e.target.value)}
            placeholder="Internal notes for training purposes..."
            className="bg-slate-600 border-slate-500 text-white h-20"
          />
          <p className="text-xs text-slate-400 mt-1">
            Auto-generated based on classification selection. You can modify as needed.
          </p>
        </div>

        {/* Raw Log Data */}
        <div>
          <label className="text-sm text-slate-300 mb-2 block">Raw Log Data (JSON)</label>
          <Textarea
            value={logData.raw_log_data}
            onChange={(e) => handleChange('raw_log_data', e.target.value)}
            className="bg-slate-900 border-slate-500 text-white font-mono text-sm h-32"
          />
          {jsonError && (
            <p className="text-red-400 text-xs mt-1">{jsonError}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} className="border-slate-500 text-slate-300">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="bg-teal-600 hover:bg-teal-700"
            disabled={!!jsonError}
          >
            Save Log Entry
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
