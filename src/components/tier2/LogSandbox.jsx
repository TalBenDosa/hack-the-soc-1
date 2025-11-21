
import React, { useState, useEffect, useCallback } from 'react';
import { LogDataset, RuleTestSession } from '@/entities/all';
import { InvokeLLM } from '@/integrations/Core';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Database, 
    Play, 
    RefreshCw, 
    Filter, 
    Download, 
    Zap, 
    AlertTriangle,
    CheckCircle,
    Clock,
    Search,
    Loader2
} from 'lucide-react';
import { generateMultiSourceSecurityLogs } from '../utils/realisticLogGenerator';

// Helper function to generate realistic raw log messages (moved outside component)
const generateRawLogMessage = (log) => {
    switch (log.source_type) {
        case 'EDR':
            return `${log.timestamp || new Date().toISOString()} ${log.host || 'UNKNOWN_HOST'} ${log.process || 'unknown_process'}[${log.pid || 'N/A'}]: ${log.action || 'UNKNOWN'} - User: ${log.user || 'N/A'}, File: ${log.file_path || 'N/A'}, Hash: ${log.hash || 'N/A'}`;
        case 'Firewall':
            return `${log.timestamp || new Date().toISOString()} FIREWALL: ${log.action || 'UNKNOWN'} ${log.protocol || 'TCP'} ${log.source_ip || '0.0.0.0'}:${log.source_port || 'N/A'} -> ${log.destination_ip || '0.0.0.0'}:${log.destination_port || 'N/A'} (${log.bytes || 'N/A'} bytes, ${log.packets || 'N/A'} packets) Rule: ${log.rule_name || 'N/A'}`;
        case 'Active Directory':
            return `${log.timestamp || new Date().toISOString()} SECURITY: EventID ${log.event_id || 'N/A'} - ${log.result || 'UNKNOWN'} logon for ${log.domain || 'N/A'}\\${log.username || 'N/A'} from ${log.source_ip || '0.0.0.0'} on ${log.workstation || 'N/A'}, LogonType: ${log.logon_type || 'N/A'}`;
        case 'Windows Security':
            return `${log.timestamp || new Date().toISOString()} WINDOWS_SECURITY: EventID ${log.event_id || 'N/A'} - Account: ${log.account_name || 'N/A'}, Type: ${log.event_type || 'N/A'}, Computer: ${log.computer_name || 'N/A'}`;
        case 'Network':
            return `${log.timestamp || new Date().toISOString()} NETWORK: ${log.protocol || 'TCP'} connection from ${log.source_ip || '0.0.0.0'}:${log.source_port || 'N/A'} to ${log.destination_ip || '0.0.0.0'}:${log.destination_port || 'N/A'} with status ${log.status || 'ESTABLISHED'}`;
        default:
            // Fallback for any other source type, trying to be robust
            try {
                return `${log.timestamp || new Date().toISOString()} ${log.source_type || 'UNKNOWN'}: ${JSON.stringify(log)}`;
            } catch (e) {
                return `${log.timestamp || new Date().toISOString()} ${log.source_type || 'UNKNOWN'}: Failed to stringify log data due to error.`;
            }
    }
};

// Helper function to determine attack stage (moved outside component)
const determineAttackStage = (log) => {
    if (log.source_type === 'EDR' && log.process?.toLowerCase().includes('mimikatz')) return 'Credential Access';
    if (log.source_type === 'EDR' && log.process?.toLowerCase().includes('powershell') && log.command_line?.toLowerCase().includes('download')) return 'Execution';
    if (log.source_type === 'Firewall' && log.action === 'Deny' && log.destination_port === 4444) return 'Command & Control';
    if (log.source_type === 'Active Directory' && log.result === 'Failure' && log.logon_type === 10) return 'Initial Access'; // RDP brute-force
    if (log.source_type === 'Network' && log.protocol === 'SMB' && log.destination_port === 445 && log.bytes > 1000000) return 'Exfiltration'; // Large SMB transfer
    return 'Discovery';
};

// Helper function to extract key indicators (moved outside component)
const extractKeyIndicators = (logs) => {
    const indicators = new Set();
    logs.forEach(log => {
        if (log.is_suspicious) {
            if (log.source_type === 'EDR' && log.process) indicators.add(`Suspicious process: ${log.process}`);
            if (log.source_type === 'Firewall' && log.action === 'Deny' && log.destination_ip) indicators.add(`Blocked connection to: ${log.destination_ip}`);
            if (log.source_type === 'Active Directory' && log.result === 'Failure' && log.username) indicators.add(`Failed login attempt for: ${log.username}`);
            if (log.mitre_technique) indicators.add(`MITRE Technique: ${log.mitre_technique}`);
            if (log.event_id) indicators.add(`Suspicious Event ID: ${log.event_id} from ${log.source_type}`);
            if (log.file_path && (log.file_path.toLowerCase().includes('temp') || log.file_path.toLowerCase().includes('c:\\windows\\system32')) && log.action === 'File Write') indicators.add(`Suspicious file write: ${log.file_path}`);
        }
    });
    return Array.from(indicators);
};

export default function LogSandbox({ activeSession }) {
    const [logDataset, setLogDataset] = useState(null);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [isGeneratingLogs, setIsGeneratingLogs] = useState(false);
    const [filters, setFilters] = useState({
        source_type: 'all',
        log_level: 'all',
        is_malicious: 'all',
        search_term: ''
    });
    const [testResults, setTestResults] = useState(null);
    const [isTestingRule, setIsTestingRule] = useState(false);

    const generateLogsForScenario = useCallback(async () => {
        if (!activeSession?.scenario) return;

        setIsGeneratingLogs(true);
        try {
            // First try the new realistic log generator
            // Aim for around 100 logs with 70% benign, 20% suspicious, 10% malicious breakdown
            const numBenign = 70;
            const numSuspicious = 20; // These might be false positives or low-confidence threats
            const numMalicious = 10;  // Clearly malicious
            const realisticLogs = await generateMultiSourceSecurityLogs(numBenign, numSuspicious, numMalicious);
            
            if (realisticLogs && realisticLogs.logs && realisticLogs.logs.length > 0) {
                const mappedLogs = realisticLogs.logs.map(log => ({
                    timestamp: log.timestamp || new Date().toISOString(),
                    source_type: log.source_type || 'UNKNOWN',
                    log_level: log.log_level || (log.is_malicious_true ? 'CRITICAL' : (log.is_suspicious ? 'WARNING' : 'INFO')),
                    event_id: log.event_id || 'N/A',
                    raw_log: generateRawLogMessage(log),
                    parsed_fields: { ...log },
                    is_malicious: log.is_malicious_true || false, // Use a definitive malicious flag if generator provides one
                    attack_stage: log.is_malicious_true ? determineAttackStage(log) : null,
                    mitre_technique: log.mitre_technique || (log.is_malicious_true ? "T1078" : null),
                    expected_detection: log.is_malicious_true || log.is_suspicious || false
                }));

                // Calculate ground truth based on the mapped is_malicious flag
                const totalMalicious = mappedLogs.filter(l => l.is_malicious).length;
                const totalBenign = mappedLogs.filter(l => !l.is_malicious).length;
                const dataSources = Array.from(new Set(mappedLogs.map(log => log.source_type)));

                const dataset = {
                    name: `${activeSession.scenario.name} - Realistic Security Dataset`,
                    description: `Multi-source security logs for ${activeSession.scenario.name} scenario`,
                    scenario_type: activeSession.scenario.type,
                    data_sources: dataSources,
                    log_entries: mappedLogs,
                    ground_truth: {
                        total_malicious_events: totalMalicious,
                        total_benign_events: totalBenign,
                        key_indicators: extractKeyIndicators(realisticLogs.logs),
                        false_positive_traps: []
                    },
                    difficulty: activeSession.scenario.difficulty,
                    generation_metadata: {
                        generated_by: 'realistic_ai_generator',
                        ai_model_used: 'Base44-LLM-Advanced',
                        generation_date: new Date().toISOString(),
                        quality_score: 95
                    }
                };
                
                setLogDataset(dataset);
            } else {
                // Fallback to original AI generator if new one fails or returns no logs
                const prompt = `Generate realistic log dataset for a ${activeSession.scenario.type} scenario.

Scenario: ${activeSession.scenario.name}
Difficulty: ${activeSession.scenario.difficulty}

Generate 50-100 log entries including:
- 70% benign/normal activity logs 
- 20% suspicious but not necessarily malicious logs (potential false positives)
- 10% clearly malicious logs related to the attack

Include these data sources:
- Windows Security Logs
- EDR/Endpoint logs  
- Firewall logs
- Active Directory logs
- Network traffic logs

For each log entry provide:
- Realistic timestamp (spread over 24 hours)
- Source type
- Log level (INFO, WARNING, ERROR, CRITICAL)
- Event ID
- Raw log message
- Parsed fields (JSON)
- Attack stage (if malicious)
- MITRE technique (if applicable)
- Whether it should be detected by a good rule

Make the logs realistic with proper formatting, IP addresses, usernames, etc.
Include subtle indicators that require careful rule crafting to detect without false positives.

Return as a structured dataset with metadata.`;

                const response = await InvokeLLM({
                    prompt: prompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            description: { type: "string" },
                            scenario_type: { type: "string" },
                            data_sources: { type: "array", items: { type: "string" } },
                            log_entries: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        timestamp: { type: "string" },
                                        source_type: { type: "string" },
                                        log_level: { type: "string" },
                                        event_id: { type: "string" },
                                        raw_log: { type: "string" },
                                        parsed_fields: { type: "object" },
                                        is_malicious: { type: "boolean" },
                                        attack_stage: { type: "string" },
                                        mitre_technique: { type: "string" },
                                        expected_detection: { type: "boolean" }
                                    }
                                }
                            },
                            ground_truth: {
                                type: "object",
                                properties: {
                                    total_malicious_events: { type: "number" },
                                    total_benign_events: { type: "number" },
                                    key_indicators: { type: "array", items: { type: "string" } },
                                    false_positive_traps: { type: "array", items: { type: "object" } }
                                }
                            }
                        }
                    }
                });

                if (response) {
                    const dataset = {
                        ...response,
                        difficulty: activeSession.scenario.difficulty,
                        generation_metadata: {
                            generated_by: 'ai',
                            ai_model_used: 'Base44-LLM',
                            generation_date: new Date().toISOString(),
                            quality_score: 95
                        }
                    };
                    setLogDataset(dataset);
                }
            }
        } catch (error) {
            console.error('Failed to generate logs:', error);
        } finally {
            setIsGeneratingLogs(false);
        }
    }, [activeSession, setLogDataset, setIsGeneratingLogs]); // Include state setters in dependencies

    const applyFilters = useCallback(() => {
        if (!logDataset?.log_entries) {
            setFilteredLogs([]);
            return;
        }

        let logs = logDataset.log_entries;

        if (filters.source_type !== 'all') {
            logs = logs.filter(log => log.source_type === filters.source_type);
        }

        if (filters.log_level !== 'all') {
            logs = logs.filter(log => log.log_level === filters.log_level);
        }

        if (filters.is_malicious !== 'all') {
            const isMalicious = filters.is_malicious === 'true';
            logs = logs.filter(log => log.is_malicious === isMalicious);
        }

        if (filters.search_term) {
            const searchTerm = filters.search_term.toLowerCase();
            logs = logs.filter(log => 
                log.raw_log.toLowerCase().includes(searchTerm) ||
                log.source_type.toLowerCase().includes(searchTerm) ||
                log.event_id.toLowerCase().includes(searchTerm)
            );
        }

        setFilteredLogs(logs);
    }, [logDataset, filters, setFilteredLogs]); // Include state setters in dependencies

    useEffect(() => {
        if (activeSession?.scenario) {
            generateLogsForScenario();
        }
    }, [activeSession, generateLogsForScenario]); // `generateLogsForScenario` is now memoized

    useEffect(() => {
        applyFilters();
    }, [logDataset, filters, applyFilters]); // `applyFilters` is now memoized

    const testRuleAgainstLogs = async (rule) => {
        if (!logDataset) return;

        setIsTestingRule(true);
        try {
            const prompt = `Test this SIEM rule against the provided log dataset and analyze its performance.

Rule Details:
${JSON.stringify(rule, null, 2)}

Dataset Ground Truth:
- Total Malicious Events: ${logDataset.ground_truth?.total_malicious_events || 0}
- Total Benign Events: ${logDataset.ground_truth?.total_benign_events || 0}
- Key Indicators: ${logDataset.ground_truth?.key_indicators?.join(', ') || 'None'}

Analyze the rule against each log entry and determine:
1. Which logs would trigger an alert (based on rule logic)
2. Calculate True Positives, False Positives, False Negatives
3. Identify specific issues with the rule
4. Suggest improvements

Log Entries to Test:
${JSON.stringify(filteredLogs.slice(0, 50), null, 2)}

Return detailed test results with metrics and analysis.`;

            const results = await InvokeLLM({
                prompt: prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        alerts_generated: { type: "number" },
                        true_positives: { type: "number" },
                        false_positives: { type: "number" },
                        false_negatives: { type: "number" },
                        precision: { type: "number" },
                        recall: { type: "number" },
                        f1_score: { type: "number" },
                        accuracy: { type: "number" },
                        detected_logs: { type: "array", items: { type: "object" } },
                        missed_threats: { type: "array", items: { type: "object" } },
                        false_positive_logs: { type: "array", items: { type: "object" } },
                        performance_issues: { type: "array", items: { type: "string" } },
                        improvement_suggestions: { type: "array", items: { type: "string" } },
                        overall_assessment: { type: "string" }
                    }
                }
            });

            setTestResults(results);
        } catch (error) {
            console.error('Failed to test rule:', error);
        } finally {
            setIsTestingRule(false);
        }
    };

    const exportLogs = () => {
        if (!filteredLogs.length) return;

        const exportData = {
            dataset_info: {
                name: logDataset?.name,
                scenario_type: logDataset?.scenario_type,
                total_logs: filteredLogs.length,
                export_timestamp: new Date().toISOString()
            },
            logs: filteredLogs
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `log_dataset_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getLogLevelColor = (level) => {
        switch (level) {
            case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'ERROR': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            case 'WARNING': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'INFO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    return (
        <div className="space-y-6">
            {/* Dataset Header */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-teal-400" />
                            Log Sandbox
                            {activeSession && (
                                <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                                    {activeSession.scenario.name}
                                </Badge>
                            )}
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={generateLogsForScenario}
                                disabled={isGeneratingLogs}
                                className="border-slate-600 text-slate-300"
                            >
                                {isGeneratingLogs ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                )}
                                Regenerate
                            </Button>
                            <Button
                                onClick={() => testRuleAgainstLogs({})} // Will implement rule passing
                                disabled={!logDataset || isTestingRule}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isTestingRule ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 mr-2" />
                                )}
                                Test Rule
                            </Button>
                            <Button
                                variant="outline"
                                onClick={exportLogs}
                                disabled={!filteredLogs.length}
                                className="border-slate-600 text-slate-300"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                
                {logDataset && (
                    <CardContent>
                        <div className="grid md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">{logDataset.log_entries?.length || 0}</div>
                                <div className="text-sm text-slate-400">Total Logs</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-400">{logDataset.ground_truth?.total_malicious_events || 0}</div>
                                <div className="text-sm text-slate-400">Malicious</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-400">{logDataset.ground_truth?.total_benign_events || 0}</div>
                                <div className="text-sm text-slate-400">Benign</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-400">{logDataset.data_sources?.length || 0}</div>
                                <div className="text-sm text-slate-400">Data Sources</div>
                            </div>
                        </div>

                        {logDataset.ground_truth?.key_indicators && (
                            <div>
                                <Label className="text-sm font-medium text-white mb-2 block">Key Attack Indicators</Label>
                                <div className="flex flex-wrap gap-2">
                                    {logDataset.ground_truth.key_indicators.map((indicator, index) => (
                                        <Badge key={index} className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                            {indicator}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            {/* Filters */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-purple-400" />
                        Log Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-5 gap-4">
                        <div>
                            <Label>Source Type</Label>
                            <Select 
                                value={filters.source_type} 
                                onValueChange={(value) => setFilters(prev => ({ ...prev, source_type: value }))}
                            >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue />
                                Suppress the next 1 warnings in this file: react-hooks/exhaustive-deps
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                    <SelectItem value="all">All Sources</SelectItem>
                                    <SelectItem value="Windows Security">Windows Security</SelectItem>
                                    <SelectItem value="EDR">EDR</SelectItem>
                                    <SelectItem value="Firewall">Firewall</SelectItem>
                                    <SelectItem value="Active Directory">Active Directory</SelectItem>
                                    <SelectItem value="Network">Network</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Log Level</Label>
                            <Select 
                                value={filters.log_level} 
                                onValueChange={(value) => setFilters(prev => ({ ...prev, log_level: value }))}
                            >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                    <SelectItem value="all">All Levels</SelectItem>
                                    <SelectItem value="INFO">Info</SelectItem>
                                    <SelectItem value="WARNING">Warning</SelectItem>
                                    <SelectItem value="ERROR">Error</SelectItem>
                                    <SelectItem value="CRITICAL">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Threat Status</Label>
                            <Select 
                                value={filters.is_malicious} 
                                onValueChange={(value) => setFilters(prev => ({ ...prev, is_malicious: value }))}
                            >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                    <SelectItem value="all">All Events</SelectItem>
                                    <SelectItem value="true">Malicious Only</SelectItem>
                                    <SelectItem value="false">Benign Only</SelectItem>
                                Suppress the next 1 warnings in this file: react-hooks/exhaustive-deps
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="md:col-span-2">
                            <Label>Search Logs</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search log content, source, event ID..."
                                    value={filters.search_term}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search_term: e.target.value }))}
                                    className="bg-slate-700 border-slate-600 text-white pl-10"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Test Results */}
            {testResults && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            Rule Test Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-4 gap-4 mb-6">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">{testResults.accuracy}%</div>
                                <div className="text-sm text-slate-400">Accuracy</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-400">{testResults.precision}%</div>
                                <div className="text-sm text-slate-400">Precision</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-400">{testResults.recall}%</div>
                                <div className="text-sm text-slate-400">Recall</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-purple-400">{testResults.f1_score}%</div>
                                <div className="text-sm text-slate-400">F1 Score</div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 mb-6">
                            <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                                <div className="text-xl font-bold text-green-400">{testResults.true_positives}</div>
                                <div className="text-sm text-slate-400">True Positives</div>
                            </div>
                            <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                                <div className="text-xl font-bold text-red-400">{testResults.false_positives}</div>
                                <div className="text-sm text-slate-400">False Positives</div>
                            </div>
                            <div className="text-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/30">
                                <div className="text-xl font-bold text-orange-400">{testResults.false_negatives}</div>
                                <div className="text-sm text-slate-400">False Negatives</div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-white mb-2">Overall Assessment</h4>
                                <p className="text-slate-300 text-sm bg-slate-700/50 p-3 rounded">
                                    {testResults.overall_assessment}
                                </p>
                            </div>

                            {testResults.improvement_suggestions?.length > 0 && (
                                <div>
                                    <h4 className="font-medium text-white mb-2">Improvement Suggestions</h4>
                                    <div className="space-y-2">
                                        {testResults.improvement_suggestions.map((suggestion, index) => (
                                            <div key={index} className="text-sm text-green-300 bg-green-500/10 p-2 rounded">
                                                {suggestion}
                                            </div>
                                        ))}
                                    </div>
                                
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Logs Table */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Log Entries ({filteredLogs.length})</CardTitle>
                        <Badge className="bg-slate-700 text-slate-300">
                            Showing {Math.min(filteredLogs.length, 100)} of {filteredLogs.length}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-slate-700">
                                    <TableHead className="text-slate-300">Timestamp</TableHead>
                                    <TableHead className="text-slate-300">Source</TableHead>
                                    <TableHead className="text-slate-300">Level</TableHead>
                                    <TableHead className="text-slate-300">Event ID</TableHead>
                                    <TableHead className="text-slate-300">Status</TableHead>
                                    <TableHead className="text-slate-300">Log Message</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredLogs.slice(0, 100).map((log, index) => (
                                    <TableRow key={index} className="border-b-slate-800 hover:bg-slate-700/30">
                                        <TableCell className="text-slate-300 font-mono text-xs">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                                                {log.source_type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${getLogLevelColor(log.log_level)} border text-xs`}>
                                                {log.log_level}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-300 font-mono text-xs">
                                            {log.event_id}
                                        </TableCell>
                                        <TableCell>
                                            {log.is_malicious ? (
                                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                                    Malicious
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Benign
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-slate-300 text-sm max-w-md truncate">
                                            {log.raw_log}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
