import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Zap, Database, Eye, Download } from 'lucide-react';
import { generateEDRLogs, generateEDRLogBatch } from '../utils/edrLogGenerator';
import { enhancedLogService } from '../utils/enhancedLogGenerators';

export default function EnhancedLogGeneratorInterface() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedLogs, setGeneratedLogs] = useState([]);
    const [selectedScenario, setSelectedScenario] = useState('mixed');
    const [logCount, setLogCount] = useState(20);
    const [previewLog, setPreviewLog] = useState(null);

    const scenarios = [
        { id: 'mixed', name: 'Mixed Activity', description: 'Combination of benign and suspicious activities' },
        { id: 'advanced_persistent_threat', name: 'APT Campaign', description: 'Advanced persistent threat simulation' },
        { id: 'ransomware_attack', name: 'Ransomware Attack', description: 'Complete ransomware attack chain' },
        { id: 'insider_threat', name: 'Insider Threat', description: 'Malicious insider activities' },
        { id: 'lateral_movement', name: 'Lateral Movement', description: 'Network propagation attempts' },
        { id: 'credential_stuffing', name: 'Credential Stuffing', description: 'Automated login attempts' },
        { id: 'malware_execution', name: 'Malware Execution', description: 'Malicious software execution' },
        { id: 'living_off_the_land', name: 'Living off the Land', description: 'Legitimate tools for malicious purposes' }
    ];

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            let logs;
            if (selectedScenario === 'mixed') {
                logs = await generateEDRLogBatch(logCount, ['mixed', 'malware_execution', 'lateral_movement']);
            } else {
                logs = await enhancedLogService.generateScenarioBasedLogs(selectedScenario, logCount);
            }
            setGeneratedLogs(logs);
            if (logs.length > 0) {
                setPreviewLog(logs[0]);
            }
        } catch (error) {
            console.error('Error generating logs:', error);
            alert('Failed to generate logs. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const exportLogs = () => {
        if (generatedLogs.length === 0) return;
        
        const dataStr = JSON.stringify(generatedLogs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `edr_logs_${selectedScenario}_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getFieldCount = (log) => {
        if (!log) return 0;
        return Object.keys(log).filter(key => log[key] !== null && log[key] !== undefined && log[key] !== '').length;
    };

    return (
        <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                        <Database className="w-6 h-6 text-purple-400" />
                        Enhanced EDR Log Generator
                    </CardTitle>
                    <p className="text-slate-400">
                        Generate realistic EDR logs with comprehensive field coverage for advanced training scenarios.
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Scenario Type</label>
                            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                    {scenarios.map(scenario => (
                                        <SelectItem key={scenario.id} value={scenario.id}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{scenario.name}</span>
                                                <span className="text-xs text-slate-400">{scenario.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Number of Logs</label>
                            <Input
                                type="number"
                                min="1"
                                max="200"
                                value={logCount}
                                onChange={(e) => setLogCount(parseInt(e.target.value) || 20)}
                                className="bg-slate-700 border-slate-600 text-white"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button 
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {isGenerating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Zap className="w-4 h-4 mr-2" />
                            )}
                            {isGenerating ? 'Generating...' : 'Generate EDR Logs'}
                        </Button>

                        {generatedLogs.length > 0 && (
                            <Button 
                                onClick={exportLogs}
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export JSON ({generatedLogs.length} logs)
                            </Button>
                        )}
                    </div>

                    {generatedLogs.length > 0 && (
                        <div className="bg-slate-700/50 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-white">Generation Summary</h3>
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                    {generatedLogs.length} logs generated
                                </Badge>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-400">Malicious Events:</span>
                                    <span className="ml-2 text-red-400 font-medium">
                                        {generatedLogs.filter(log => log.data?.is_malicious).length}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Suspicious Events:</span>
                                    <span className="ml-2 text-yellow-400 font-medium">
                                        {generatedLogs.filter(log => log.data?.is_suspicious && !log.data?.is_malicious).length}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Benign Events:</span>
                                    <span className="ml-2 text-green-400 font-medium">
                                        {generatedLogs.filter(log => !log.data?.is_suspicious && !log.data?.is_malicious).length}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {previewLog && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <Eye className="w-5 h-5 text-teal-400" />
                            Sample Log Preview ({getFieldCount(previewLog)} fields)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                            <pre className="text-green-400 text-xs whitespace-pre-wrap">
                                {JSON.stringify(previewLog, null, 2)}
                            </pre>
                        </div>
                        
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <Badge className={`${previewLog.data?.is_malicious ? 'bg-red-500/20 text-red-400' : previewLog.data?.is_suspicious ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {previewLog.data?.is_malicious ? 'Malicious' : previewLog.data?.is_suspicious ? 'Suspicious' : 'Benign'}
                                </Badge>
                                {previewLog.data?.tactic && (
                                    <Badge variant="outline" className="border-purple-500 text-purple-400">
                                        MITRE: {previewLog.data.tactic}
                                    </Badge>
                                )}
                                {previewLog.data?.technique_id && (
                                    <Badge variant="outline" className="border-blue-500 text-blue-400">
                                        {previewLog.data.technique_id}
                                    </Badge>
                                )}
                            </div>
                            
                            <div className="text-sm text-slate-400">
                                <strong className="text-white">Process:</strong> {previewLog.data?.process_name} 
                                {previewLog.data?.process_id && ` (PID: ${previewLog.data.process_id})`}
                            </div>
                            
                            {previewLog.data?.command_line && (
                                <div className="text-sm text-slate-400">
                                    <strong className="text-white">Command:</strong> 
                                    <span className="font-mono text-xs ml-2 text-slate-300">
                                        {previewLog.data.command_line}
                                    </span>
                                </div>
                            )}
                            
                            <div className="text-sm text-slate-400">
                                <strong className="text-white">Host:</strong> {previewLog.data?.hostname} | 
                                <strong className="text-white ml-2">User:</strong> {previewLog.data?.user_name}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}