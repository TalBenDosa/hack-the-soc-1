
import React, { useState, useEffect } from "react";
import StableModal from "@/components/ui/StableModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, Copy, RefreshCw, AlertCircle, CheckCircle, XCircle, ShieldAlert } from "lucide-react";

const SEVERITIES = ["Low", "Medium", "High", "Critical"];
const SOURCE_TYPES = [
  "EDR", "Firewall", "Active Directory", "DNS", "Office 365", "IDS",
  "Windows Security", "DLP", "DC", "Azure", "AWS", "IPS", "Mail Relay", "NAC", "AV"
];

const VERDICTS = [
  { value: "True Positive", label: "True Positive", icon: CheckCircle, color: "text-green-400", description: "Correct identification of a real event" },
  { value: "False Positive", label: "False Positive", icon: XCircle, color: "text-orange-400", description: "Incorrect identification of an event (false alarm)" },
  { value: "Escalate to TIER 2", label: "Escalate to TIER 2", icon: ShieldAlert, color: "text-red-400", description: "Escalate to Tier 2 for further investigation" }
];

const DEFAULT_LOG_SAMPLES = {
  "EDR": {
    "process_name": "powershell.exe",
    "process_id": 1234,
    "parent_process": "cmd.exe",
    "command_line": "powershell.exe -enc <base64_encoded_command>",
    "user": "domain\\sarah.martinez",
    "host": "WORKSTATION-01",
    "hash_sha256": "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f",
    "file_path": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    "timestamp": new Date().toISOString(),
    "action": "ProcessCreate",
    "severity": "High"
  },
  "Firewall": {
    "src_ip": "192.168.1.100",
    "dst_ip": "185.220.101.42",
    "src_port": 49152,
    "dst_port": 443,
    "protocol": "TCP",
    "action": "BLOCK",
    "rule_name": "Block_Suspicious_IPs",
    "bytes_sent": 1024,
    "bytes_received": 512,
    "timestamp": new Date().toISOString(),
    "interface": "eth0"
  },
  "Active Directory": {
    "event_id": 4625,
    "username": "sarah.martinez",
    "domain": "CORP",
    "workstation": "HR-LAPTOP-07",
    "source_ip": "192.168.1.50",
    "logon_type": 3,
    "failure_reason": "Unknown user name or bad password",
    "timestamp": new Date().toISOString(),
    "dc_name": "DC01.corp.local"
  },
  "DNS": {
    "query_name": "secureupdates-microsoft.com",
    "query_type": "A",
    "response_code": "NOERROR",
    "client_ip": "192.168.1.100",
    "dns_server": "8.8.8.8",
    "resolved_ip": "185.220.101.42",
    "timestamp": new Date().toISOString(),
    "query_time": 45
  },
  "Office 365": {
    "user_id": "emma.johnson@company.com",
    "operation": "FileDownloaded",
    "workload": "SharePoint",
    "object_id": "sensitive_data.xlsx",
    "client_ip": "203.0.113.45",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "timestamp": new Date().toISOString(),
    "result_status": "Success"
  },
  "IDS": {
    "alert_id": "IDS-2024-001",
    "signature": "ET MALWARE Suspicious PowerShell Execution",
    "src_ip": "192.168.1.100",
    "dst_ip": "185.220.101.42",
    "src_port": 49152,
    "dst_port": 443,
    "protocol": "TCP",
    "classification": "Trojan Activity",
    "priority": 1,
    "timestamp": new Date().toISOString()
  },
  "Windows Security": {
    "event_id": 4688,
    "process_name": "powershell.exe",
    "process_id": 1234,
    "creator_process_name": "cmd.exe",
    "creator_process_id": 5678,
    "user": "CORP\\sarah.martinez",
    "logon_id": "0x12345",
    "command_line": "powershell.exe -enc <base64_encoded_command>",
    "timestamp": new Date().toISOString()
  },
  "DLP": {
    "policy_name": "Financial Data Protection",
    "violation_type": "Sensitive Data Transfer",
    "user": "david.chen@company.com",
    "file_name": "financial_report_Q4.xlsx",
    "file_size": 2048000,
    "destination": "external_email",
    "action_taken": "BLOCK",
    "timestamp": new Date().toISOString()
  },
  "DC": {
    "event_id": 4769,
    "service_name": "krbtgt",
    "client_name": "WORKSTATION-01$",
    "client_ip": "192.168.1.100",
    "service_ticket_encryption": "AES256",
    "ticket_options": "0x40810000",
    "result_code": "0x0",
    "timestamp": new Date().toISOString()
  },
  "Azure": {
    "operation_name": "Sign-in activity",
    "result": "Failure",
    "user_principal_name": "priya.patel@company.com",
    "app_display_name": "Office 365",
    "ip_address": "203.0.113.45",
    "location": "New York, US",
    "device_detail": "Windows 10",
    "timestamp": new Date().toISOString()
  },
  "AWS": {
    "event_name": "ConsoleLogin",
    "user_name": "ahmed.hassan",
    "source_ip": "203.0.113.45",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "response_elements": "Success",
    "aws_region": "us-east-1",
    "timestamp": new Date().toISOString()
  },
  "IPS": {
    "signature": "ET TROJAN Suspicious Outbound Connection",
    "src_ip": "192.168.1.100",
    "dst_ip": "185.220.101.42",
    "src_port": 49152,
    "dst_port": 8080,
    "protocol": "TCP",
    "action": "DROP",
    "severity": "High",
    "timestamp": new Date().toISOString()
  },
  "Mail Relay": {
    "message_id": "MSG-2024-001",
    "sender": "attacker@malicious-domain.com",
    "recipient": "emma.johnson@company.com",
    "subject": "Urgent: Account Verification Required",
    "attachment_count": 1,
    "attachment_hash": "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f",
    "spam_score": 8.5,
    "action": "QUARANTINE",
    "timestamp": new Date().toISOString()
  },
  "NAC": {
    "device_mac": "00:11:22:33:44:55",
    "device_name": "BYOD-LAPTOP-01",
    "user": "luis.garcia",
    "compliance_status": "NON_COMPLIANT",
    "violation": "Missing antivirus software",
    "network_access": "DENIED",
    "vlan": "QUARANTINE",
    "timestamp": new Date().toISOString()
  },
  "AV": {
    "detection_name": "Trojan.Win32.Malware",
    "file_path": "C:\\Users\\sarah.martinez\\Downloads\\suspicious_file.exe",
    "file_hash": "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f",
    "scan_type": "Real-time",
    "action_taken": "QUARANTINE",
    "threat_level": "High",
    "timestamp": new Date().toISOString()
  }
};

export default function AdvancedLogEditor({ isOpen, log, onSave, onClose }) {
  const [formData, setFormData] = useState({
    rule_description: "",
    source_type: "EDR",
    severity: "Medium",
    verdict: "", // Added verdict
    timestamp: new Date().toISOString(),
    notes: "",
    raw_log_data: "{}"
  });
  const [jsonError, setJsonError] = useState("");
  const [isJsonValid, setIsJsonValid] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (log) {
        // Editing existing log
        setFormData({
          ...log,
          timestamp: log.timestamp ? new Date(log.timestamp).toISOString().slice(0, -1) : new Date().toISOString().slice(0, -1),
          raw_log_data: JSON.stringify(log.raw_log_data || {}, null, 2),
          verdict: log.verdict || "", // Load existing verdict
          notes: log.notes || "" // Ensure notes are loaded
        });
      } else {
        // Creating new log
        const sampleData = DEFAULT_LOG_SAMPLES["EDR"];
        setFormData({
          rule_description: "Suspicious PowerShell execution detected",
          source_type: "EDR",
          severity: "Medium",
          verdict: "", // Default empty verdict for new logs
          timestamp: new Date().toISOString().slice(0, -1),
          notes: "",
          raw_log_data: JSON.stringify(sampleData, null, 2)
        });
      }
      setJsonError("");
      setIsJsonValid(true);
    }
  }, [isOpen, log]);

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

  const handleInputChange = (field, value) => {
    if (field === 'verdict') {
      const currentRuleDescription = formData.rule_description;
      const verdictNotes = generateAdminNotes(value, currentRuleDescription);
      setFormData(prev => ({
        ...prev,
        [field]: value,
        notes: verdictNotes
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSourceTypeChange = (newSourceType) => {
    const sampleData = DEFAULT_LOG_SAMPLES[newSourceType] || {};
    setFormData(prev => ({
      ...prev,
      source_type: newSourceType,
      raw_log_data: JSON.stringify(sampleData, null, 2)
    }));
    setJsonError("");
    setIsJsonValid(true);
  };

  const handleJsonChange = (jsonString) => {
    setFormData(prev => ({ ...prev, raw_log_data: jsonString }));

    try {
      JSON.parse(jsonString);
      setJsonError("");
      setIsJsonValid(true);
    } catch (error) {
      setJsonError(`Invalid JSON: ${error.message}`);
      setIsJsonValid(false);
    }
  };

  const handleSave = async () => {
    if (!isJsonValid) {
      setJsonError("Raw JSON data is invalid.");
      return;
    }

    if (!formData.rule_description.trim()) {
      setJsonError("Rule description is required.");
      return;
    }

    if (!formData.verdict) {
      setJsonError("Event classification (verdict) is required.");
      return;
    }

    setIsLoading(true);

    try {
      const parsedData = JSON.parse(formData.raw_log_data);
      const logData = {
        rule_description: formData.rule_description.trim(),
        source_type: formData.source_type,
        severity: formData.severity,
        verdict: formData.verdict, // Include verdict
        notes: formData.notes?.trim() || "",
        timestamp: new Date(formData.timestamp || new Date()),
        raw_log_data: parsedData,
        id: formData.id,
      };

      await onSave(logData);
      setJsonError(""); // Clear error on successful save
    } catch (error) {
      console.error("Error saving log:", error);
      setJsonError(`Error saving: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(formData.raw_log_data);
      const formatted = JSON.stringify(parsed, null, 2);
      setFormData(prev => ({ ...prev, raw_log_data: formatted }));
      setJsonError("");
      setIsJsonValid(true);
    } catch (error) {
      setJsonError(`Cannot format invalid JSON: ${error.message}`);
    }
  };

  const loadTemplate = (sourceType) => {
    const sampleData = DEFAULT_LOG_SAMPLES[sourceType] || {};
    setFormData(prev => ({
      ...prev,
      raw_log_data: JSON.stringify(sampleData, null, 2)
    }));
    setJsonError("");
    setIsJsonValid(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(formData.raw_log_data);
  };

  const getVerdictIcon = (verdictValue) => {
    const verdict = VERDICTS.find(v => v.value === verdictValue);
    if (!verdict) return null;

    const Icon = verdict.icon;
    return <Icon className={`w-4 h-4 ${verdict.color}`} />;
  };

  if (!isOpen) return null;

  return (
    <StableModal
      isOpen={isOpen}
      onClose={onClose}
      title={log ? "Edit Log Entry" : "Add New Log Entry"}
      maxWidth="4xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            {jsonError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{jsonError}</span>
              </div>
            )}
            {isJsonValid && !jsonError && formData.raw_log_data !== "{}" && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>JSON Valid</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isJsonValid || isLoading || !formData.rule_description.trim() || !formData.verdict}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? "Saving..." : "Save Log"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Basic Information Section */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Log Entry Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rule Description *
                </label>
                <Input
                  value={formData.rule_description}
                  onChange={(e) => handleInputChange('rule_description', e.target.value)}
                  placeholder="e.g., Multiple failed login attempts detected"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Source Type *
                </label>
                <Select
                  value={formData.source_type}
                  onValueChange={handleSourceTypeChange}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select a source..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 z-[9999]">
                    {SOURCE_TYPES.map(type => (
                      <SelectItem key={type} value={type} className="text-white hover:bg-slate-600">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Severity *
                </label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => handleInputChange('severity', value)}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select severity..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 z-[9999]">
                    {SEVERITIES.map(sev => (
                      <SelectItem key={sev} value={sev} className="text-white hover:bg-slate-600">
                        {sev}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Timestamp *
                </label>
                <Input
                  type="datetime-local"
                  value={formData.timestamp}
                  onChange={(e) => handleInputChange('timestamp', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Verdict/Event Classification */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Event Classification *
              </label>
              <Select value={formData.verdict} onValueChange={(value) => handleInputChange('verdict', value)}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select event classification">
                    {formData.verdict && (
                      <div className="flex items-center gap-2">
                        {getVerdictIcon(formData.verdict)}
                        {VERDICTS.find(v => v.value === formData.verdict)?.label}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 z-[9999]">
                  {VERDICTS.map(verdict => {
                    const Icon = verdict.icon;
                    return (
                      <SelectItem key={verdict.value} value={verdict.value} className="text-white hover:bg-slate-600">
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Admin Notes
              </label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Internal notes about this log entry (e.g., 'True positive - part of phishing attack scenario')"
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 h-20"
              />
              <p className="text-xs text-slate-400 mt-1">
                Notes can be auto-generated based on classification. You can modify as needed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Raw JSON Data Section */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-white text-lg">Raw JSON Data</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadTemplate(formData.source_type)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Load Template
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={formatJson}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Format JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.raw_log_data}
              onChange={(e) => handleJsonChange(e.target.value)}
              placeholder="Enter raw log data as JSON..."
              className={`bg-slate-900 border-slate-600 text-white font-mono text-sm h-64 ${
                !isJsonValid ? 'border-red-500' : 'border-slate-600'
              }`}
            />
            <div className="mt-2 text-xs text-slate-400">
              Available templates: {SOURCE_TYPES.join(', ')}
            </div>
          </CardContent>
        </Card>
      </div>
    </StableModal>
  );
}
