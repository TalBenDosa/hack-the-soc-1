import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Activity } from "lucide-react";

// Helper component to render nested JSON as a key-value list
const JsonKeyValueDisplay = ({ data, prefix = "" }) => {
    if (!data || typeof data !== 'object') return null;

    return Object.entries(data).map(([key, value]) => {
        const displayKey = prefix ? `${prefix}.${key}` : key;
        
        // Don't display system/internal fields
        if (['id', 'created_date', 'updated_date', 'created_by', 'verdict', 'justification', 'default_classification', 'verdict_confidence', 'admin_notes'].includes(key)) {
            return null;
        }
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return <JsonKeyValueDisplay key={displayKey} data={value} prefix={displayKey} />;
        }

        return (
            <div key={displayKey} className="flex items-start text-sm py-2.5 border-b border-slate-800 last:border-0">
                <span className="font-mono text-slate-400 w-1/3 shrink-0 break-words pr-4">{displayKey}</span>
                <span className="text-white flex-1 break-words font-mono">{String(value)}</span>
            </div>
        );
    });
};

export default function DashboardLogDetail({ log }) {
    const [showRawJson, setShowRawJson] = useState(false);

    if (!log) return null;
    
    // Extract basic information for the top section
    const basicInfo = {
        "Rule Description": log.story_context || log.rule?.description || log.description || "N/A",
        "Source Type": log.source_type || log.log_source || "N/A",
        "Timestamp": new Date(log.timestamp).toISOString(),
        "Severity": log.level || log.log_level || "INFO",
        "Username": log.agent?.user || "N/A",
        "Hostname": log.agent?.name || "N/A",
        "Ip Address": log.agent?.ip || "N/A",
    };
    
    const displayData = log?.raw_log_data || log || {};

    return (
        <div className="p-4 md:p-6 bg-slate-900/70">
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                        <Info className="w-5 h-5 text-teal-400" />
                        Log Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Basic Information Section */}
                    <div>
                        <h3 className="text-sm font-medium mb-3 text-slate-300 flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-400" />
                            Basic Information
                        </h3>
                        <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                            {Object.entries(basicInfo).map(([key, value]) => (
                                <div key={key} className="flex items-start text-sm">
                                    <span className="font-medium text-slate-400 w-1/3">
                                        {key}:
                                    </span>
                                    <span className="text-white flex-1 break-words font-mono">
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
                                <pre className="text-sm text-white overflow-x-auto whitespace-pre-wrap font-mono">
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
        </div>
    );
}