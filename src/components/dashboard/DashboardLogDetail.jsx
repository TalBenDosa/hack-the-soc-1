
import React, { useState, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Info, Activity, CheckCircle, XCircle, Shield, Sparkles, Loader2 } from "lucide-react";
import { LogVerdict } from "@/entities/LogVerdict";
import { User } from "@/entities/User";
import { InvokeLLM } from "@/integrations/Core";
import { toast } from "sonner";

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
    const [currentVerdict, setCurrentVerdict] = useState(null);
    const [isLoadingVerdict, setIsLoadingVerdict] = useState(true);
    const [isSavingVerdict, setIsSavingVerdict] = useState(false);
    const [notes, setNotes] = useState("");
    const [showNotesInput, setShowNotesInput] = useState(false);
    const [aiFeedback, setAiFeedback] = useState(null);
    const [isAnalyzingNotes, setIsAnalyzingNotes] = useState(false);
    
    const notesDebounceTimeout = useRef(null);

    useEffect(() => {
        loadExistingVerdict();
    }, [log?.id]); // Depend on log.id to reload when a new log is displayed

    const loadExistingVerdict = async () => {
        if (!log?.id) {
            setCurrentVerdict(null); // Clear verdict if no log ID
            setNotes("");
            setAiFeedback(null); // Clear AI feedback as well
            setShowNotesInput(false);
            setIsLoadingVerdict(false);
            return;
        }
        
        setIsLoadingVerdict(true);
        try {
            const user = await User.me();
            if (!user) {
                console.warn("User not authenticated. Cannot load verdict.");
                setCurrentVerdict(null);
                setNotes("");
                setAiFeedback(null);
                setShowNotesInput(false);
                return;
            }

            const existingVerdicts = await LogVerdict.filter({ 
                log_id: log.id,
                user_id: user.id 
            });
            
            if (existingVerdicts.length > 0) {
                setCurrentVerdict(existingVerdicts[0]);
                setNotes(existingVerdicts[0].notes || "");
                setAiFeedback(existingVerdicts[0].ai_feedback || null);
                // setShowNotesInput(!!existingVerdicts[0].notes); // Keep notes input open if there are existing notes (removed per outline implied change)
            } else {
                setCurrentVerdict(null);
                setNotes("");
                setAiFeedback(null);
                setShowNotesInput(false);
            }
        } catch (error) {
            console.error("Error loading verdict:", error);
            toast.error("Failed to load verdict status.");
            setCurrentVerdict(null);
            setNotes("");
            setAiFeedback(null);
            setShowNotesInput(false);
        } finally {
            setIsLoadingVerdict(false);
        }
    };

    const analyzeNotes = async (notesText) => {
        if (!notesText || notesText.trim().length < 10) { // Require at least 10 characters for AI analysis
            setAiFeedback(null);
            setIsAnalyzingNotes(false);
            return;
        }

        setIsAnalyzingNotes(true);
        try {
            const logContext = {
                description: log.story_context || log.rule?.description || log.description || "N/A",
                source_type: log.source_type || log.log_source || "N/A",
                severity: log.level || log.severity || "INFO",
                rule_id: log.rule?.id || log.rule_id || "N/A",
                timestamp: log.timestamp || "N/A",
                agent_name: log.agent?.name || "N/A",
                agent_ip: log.agent?.ip || "N/A"
            };

            const feedback = await InvokeLLM({
                prompt: `You are a cybersecurity expert SOC analyst trainer. A student is analyzing a security log event and has written notes about it.

**LOG EVENT CONTEXT:**
${JSON.stringify(logContext, null, 2)}

**STUDENT'S NOTES:**
"${notesText}"

Analyze the student's notes and provide constructive feedback. Consider:
1. Does the analysis show understanding of the security event?
2. Are key indicators or IOCs mentioned?
3. Is the reasoning logical and well-structured?
4. What important details might be missing?
5. Are there any misconceptions?

Provide encouraging, educational feedback in 2-3 sentences. Be supportive but also point out areas for improvement.

Respond in JSON format.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        quality: {
                            type: "string",
                            enum: ["excellent", "good", "needs_improvement"],
                            description: "Overall quality of the analysis"
                        },
                        feedback: {
                            type: "string",
                            description: "Constructive feedback in 2-3 sentences"
                        },
                        strengths: {
                            type: "array",
                            items: { type: "string" },
                            description: "What the student did well"
                        },
                        suggestions: {
                            type: "array",
                            items: { type: "string" },
                            description: "Areas for improvement"
                        }
                    },
                    required: ["quality", "feedback"]
                }
            });

            setAiFeedback(feedback);
        } catch (error) {
            console.error("Error analyzing notes:", error);
            setAiFeedback(null);
            toast.error("Failed to get AI feedback.");
        } finally {
            setIsAnalyzingNotes(false);
        }
    };

    const handleNotesChange = (value) => {
        setNotes(value);
        
        // Clear existing timeout
        if (notesDebounceTimeout.current) {
            clearTimeout(notesDebounceTimeout.current);
        }

        // Set new timeout to analyze after 1 second of no typing
        notesDebounceTimeout.current = setTimeout(() => {
            analyzeNotes(value);
        }, 1000); // 1 second debounce
    };

    const handleVerdictSelect = async (verdict) => {
        if (isSavingVerdict) return;
        
        setIsSavingVerdict(true);
        try {
            const user = await User.me();
            if (!user) {
                toast.error("User not authenticated. Cannot save verdict.");
                return;
            }
            
            const verdictData = {
                verdict: verdict,
                notes: notes,
                ai_feedback: aiFeedback // Include AI feedback
            };

            if (currentVerdict) {
                // Update existing verdict
                await LogVerdict.update(currentVerdict.id, verdictData);
                toast.success(`Verdict updated to ${verdict}`);
            } else {
                // Create new verdict
                await LogVerdict.create({
                    log_id: log.id,
                    user_id: user.id,
                    user_email: user.email,
                    ...verdictData
                });
                toast.success(`Verdict marked as ${verdict}`);
            }
            
            await loadExistingVerdict(); // Reload to get the latest state
            setShowNotesInput(false); // Close notes input after saving
        } catch (error) {
            console.error("Error saving verdict:", error);
            toast.error("Failed to save verdict");
        } finally {
            setIsSavingVerdict(false);
        }
    };

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

    const getFeedbackColor = (quality) => {
        switch(quality) {
            case 'excellent': return 'border-green-500/50 bg-green-500/10';
            case 'good': return 'border-blue-500/50 bg-blue-500/10';
            case 'needs_improvement': return 'border-yellow-500/50 bg-yellow-500/10';
            default: return 'border-slate-600 bg-slate-700/30';
        }
    };

    return (
        <div className="p-4 md:p-6 bg-slate-900/70 space-y-6">
            {/* Log Analysis Card */}
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

            {/* Verdict Selection Card - NOW AT BOTTOM */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-teal-400" />
                        Mark Event Verdict
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoadingVerdict ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
                        </div>
                    ) : (
                        <>
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => handleVerdictSelect("True Positive")}
                                    disabled={isSavingVerdict}
                                    className={`flex-1 ${
                                        currentVerdict?.verdict === "True Positive"
                                            ? "bg-green-600 hover:bg-green-700 ring-2 ring-green-400"
                                            : "bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30"
                                    }`}
                                >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    True Positive
                                </Button>
                                <Button
                                    onClick={() => handleVerdictSelect("False Positive")}
                                    disabled={isSavingVerdict}
                                    className={`flex-1 ${
                                        currentVerdict?.verdict === "False Positive"
                                            ? "bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-400"
                                            : "bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/30"
                                    }`}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    False Positive
                                </Button>
                            </div>

                            {currentVerdict && !showNotesInput && (
                                <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Info className="w-4 h-4 text-blue-400" />
                                        <span className="text-sm font-medium text-slate-300">Current Status</span>
                                    </div>
                                    <div className="text-sm text-white">
                                        Marked as <span className={`font-bold ${
                                            currentVerdict.verdict === "True Positive" ? "text-green-400" : "text-orange-400"
                                        }`}>{currentVerdict.verdict}</span>
                                    </div>
                                    {currentVerdict.notes && (
                                        <div className="mt-2 text-sm text-slate-300">
                                            <span className="text-slate-400">Notes:</span> {currentVerdict.notes}
                                        </div>
                                    )}
                                    {currentVerdict.ai_feedback && currentVerdict.ai_feedback.feedback && (
                                        <div className={`mt-2 p-2 rounded-lg border ${getFeedbackColor(currentVerdict.ai_feedback.quality)}`}>
                                            <div className="flex items-start gap-2">
                                                <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="text-xs font-semibold text-white mb-0.5">AI Feedback:</div>
                                                    <p className="text-xs text-slate-300">
                                                        {currentVerdict.ai_feedback.feedback}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowNotesInput(!showNotesInput)}
                                    className="text-slate-300 border-slate-600"
                                >
                                    {showNotesInput ? "Hide Notes" : "Add Notes"}
                                </Button>
                                
                                {showNotesInput && (
                                    <div className="mt-3 space-y-3">
                                        <div>
                                            <label className="text-sm text-slate-300 mb-2 block">
                                                Your Analysis Notes
                                            </label>
                                            <Textarea
                                                value={notes}
                                                onChange={(e) => handleNotesChange(e.target.value)}
                                                placeholder="Explain your reasoning... What makes this a true/false positive? What evidence supports your conclusion?"
                                                className="bg-slate-700 border-slate-600 text-white min-h-24"
                                            />
                                        </div>

                                        {isAnalyzingNotes && (
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>AI is analyzing your notes...</span>
                                            </div>
                                        )}

                                        {aiFeedback && !isAnalyzingNotes && (
                                            <div className={`p-4 rounded-lg border-2 ${getFeedbackColor(aiFeedback.quality)}`}>
                                                <div className="flex items-start gap-3">
                                                    <Sparkles className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1 space-y-3">
                                                        <div>
                                                            <div className="text-sm font-semibold text-white mb-1">
                                                                AI Feedback
                                                            </div>
                                                            <p className="text-sm text-slate-300">
                                                                {aiFeedback.feedback}
                                                            </p>
                                                        </div>

                                                        {aiFeedback.strengths && aiFeedback.strengths.length > 0 && (
                                                            <div>
                                                                <div className="text-xs font-semibold text-green-400 mb-1">
                                                                    ✓ Strengths:
                                                                </div>
                                                                <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
                                                                    {aiFeedback.strengths.map((strength, idx) => (
                                                                        <li key={idx}>{strength}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {aiFeedback.suggestions && aiFeedback.suggestions.length > 0 && (
                                                            <div>
                                                                <div className="text-xs font-semibold text-yellow-400 mb-1">
                                                                    💡 Suggestions:
                                                                </div>
                                                                <ul className="text-xs text-slate-300 space-y-1 pl-4 list-disc">
                                                                    {aiFeedback.suggestions.map((suggestion, idx) => (
                                                                        <li key={idx}>{suggestion}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
