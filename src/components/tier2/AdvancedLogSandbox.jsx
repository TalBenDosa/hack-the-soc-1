import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Database, 
    Zap, 
    Settings, 
    Download,
    RefreshCw,
    Loader2,
    Shield,
    Network,
    Server,
    Cloud,
    Lock
} from 'lucide-react';
import { generateMultiSourceLogs, generateSourceSpecificLogs } from '../utils/advancedLogGenerator';

export default function AdvancedLogSandbox({ onLogsGenerated }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedLogs, setGeneratedLogs] = useState(null);
    const [generationSettings, setGenerationSettings] = useState({
        logCount: 50,
        sourceType: 'mixed',
        focusArea: 'general',
        includeAttackChain: false,
        difficultyLevel: 'medium'
    });

    const sourceTypes = [
        { value: 'mixed', label: 'Multi-Source Mix', icon: Database },
        { value: 'EDR', label: 'Endpoint Detection & Response', icon: Shield },
        { value: 'Firewall', label: 'Network Firewall', icon: Network },
        { value: 'Active Directory', label: 'Active Directory', icon: Lock },
        { value: 'Office365', label: 'Microsoft Office 365', icon: Cloud },
        { value: 'IPS', label: 'Intrusion Prevention System', icon: Shield },
        { value: 'AV', label: 'Antivirus', icon: Server }
    ];

    const focusAreas = [
        { value: 'general', label: 'General Security Monitoring' },
        { value: 'brute_force', label: 'Brute Force Attacks' },
        { value: 'malware', label: 'Malware Detection' },
        { value: 'data_exfiltration', label: 'Data Exfiltration' },
        { value: 'lateral_movement', label: 'Lateral Movement' },
        { value: 'privilege_escalation', label: 'Privilege Escalation' },
        { value: 'insider_threat', label: 'Insider Threat' }
    ];

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const scenario = {
                name: focusAreas.find(f => f.value === generationSettings.focusArea)?.label,
                type: generationSettings.focusArea,
                difficulty: generationSettings.difficultyLevel
            };

            let result;
            if (generationSettings.sourceType === 'mixed') {
                result = await generateMultiSourceLogs(scenario, generationSettings.logCount);
            } else {
                result = await generateSourceSpecificLogs(
                    generationSettings.sourceType, 
                    scenario, 
                    generationSettings.logCount
                );
            }

            if (result.success) {
                setGeneratedLogs(result.data);
                if (onLogsGenerated) {
                    onLogsGenerated(result.data);
                }
            } else {
                console.error('Log generation failed:', result.error);
            }
        } catch (error) {
            console.error('Failed to generate advanced logs:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const exportLogs = () => {
        if (!generatedLogs) return;

        const exportData = {
            generation_info: {
                timestamp: new Date().toISOString(),
                settings: generationSettings,
                total_logs: generatedLogs.logs?.length || 0
            },
            logs: generatedLogs.logs,
            metadata: generatedLogs.metadata
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `advanced_logs_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getSourceIcon = (sourceType) => {
        const source = sourceTypes.find(s => s.value === sourceType);
        const IconComponent = source?.icon || Database;
        return <IconComponent className="w-4 h-4" />;
    };

    return (
        <div className="space-y-6">
            {/* Generation Settings */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                        <Settings className="w-5 h-5 text-teal-400" />
                        Advanced Log Generation Settings
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <Label className="text-white mb-2 block">Log Count</Label>
                            <Input
                                type="number"
                                min="10"
                                max="200"
                                value={generationSettings.logCount}
                                onChange={(e) => setGenerationSettings(prev => ({ 
                                    ...prev, 
                                    logCount: parseInt(e.target.value) 
                                }))}
                                className="bg-slate-700 border-slate-600 text-white"
                            />
                        </div>

                        <div>
                            <Label className="text-white mb-2 block">Data Source</Label>
                            <Select 
                                value={generationSettings.sourceType}
                                onValueChange={(value) => setGenerationSettings(prev => ({ 
                                    ...prev, 
                                    sourceType: value 
                                }))}
                            >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                    {sourceTypes.map((source) => (
                                        <SelectItem key={source.value} value={source.value}>
                                            <div className="flex items-center gap-2">
                                                {getSourceIcon(source.value)}
                                                {source.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-white mb-2 block">Focus Area</Label>
                            <Select
                                value={generationSettings.focusArea}
                                onValueChange={(value) => setGenerationSettings(prev => ({ 
                                    ...prev, 
                                    focusArea: value 
                                }))}
                            >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                    {focusAreas.map((area) => (
                                        <SelectItem key={area.value} value={area.value}>
                                            {area.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-white mb-2 block">Difficulty</Label>
                            <Select
                                value={generationSettings.difficultyLevel}
                                onValueChange={(value) => setGenerationSettings(prev => ({ 
                                    ...prev, 
                                    difficultyLevel: value 
                                }))}
                            >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                    <SelectItem value="expert">Expert</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="bg-teal-600 hover:bg-teal-700"
                        >
                            {isGenerating ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Zap className="w-4 h-4 mr-2" />
                            )}
                            {isGenerating ? 'Generating...' : 'Generate Advanced Logs'}
                        </Button>

                        {generatedLogs && (
                            <Button
                                onClick={exportLogs}
                                variant="outline"
                                className="border-slate-600 text-slate-300"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export Logs
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Generated Logs Summary */}
            {generatedLogs && (
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">Generation Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-white">
                                    {generatedLogs.metadata?.total_logs || generatedLogs.logs?.length || 0}
                                </div>
                                <div className="text-sm text-slate-400">Total Logs</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-400">
                                    {generatedLogs.metadata?.malicious_events || 0}
                                </div>
                                <div className="text-sm text-slate-400">Malicious</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-400">
                                    {generatedLogs.metadata?.benign_events || 0}
                                </div>
                                <div className="text-sm text-slate-400">Benign</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-400">
                                    {Object.keys(generatedLogs.metadata?.source_distribution || {}).length}
                                </div>
                                <div className="text-sm text-slate-400">Sources</div>
                            </div>
                        </div>

                        {generatedLogs.metadata?.source_distribution && (
                            <div>
                                <Label className="text-sm font-medium text-white mb-2 block">
                                    Source Distribution
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(generatedLogs.metadata.source_distribution).map(([source, count]) => (
                                        <Badge 
                                            key={source} 
                                            className="bg-blue-500/20 text-blue-400 border-blue-500/30"
                                        >
                                            {source}: {count}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}