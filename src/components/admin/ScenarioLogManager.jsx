import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogEventEditor } from "./LogEventEditor";
import { CheckCircle, AlertTriangle, ChevronsRight, Trash2, Bot } from 'lucide-react';
import { classifyEvent } from '../utils/eventClassifier'; // ייבוא הפונקציה החדשה

const VerdictBadge = ({ verdict }) => {
    const config = {
        'True Positive': { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400 bg-green-900/50 border-green-700' },
        'False Positive': { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-yellow-400 bg-yellow-900/50 border-yellow-700' },
        'Escalate to TIER 2': { icon: <ChevronsRight className="w-4 h-4" />, color: 'text-red-400 bg-red-900/50 border-red-700' },
        'Benign': { icon: <CheckCircle className="w-4 h-4" />, color: 'text-slate-400 bg-slate-700/50 border-slate-600' }
    };
    const { icon, color } = config[verdict] || { icon: null, color: 'text-gray-400' };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md border ${color}`}>
            {icon}
            {verdict}
        </span>
    );
};

export default function ScenarioLogManager({ logs, setLogs }) {
    const [editingLog, setEditingLog] = useState(null);
    const [editingIndex, setEditingIndex] = useState(null);

    const handleEditLog = (log, index) => {
        setEditingLog(log);
        setEditingIndex(index);
    };

    const handleSaveLog = (updatedLog) => {
        const newLogs = [...logs];
        if (editingIndex !== null) {
            newLogs[editingIndex] = updatedLog;
        } else {
            newLogs.push(updatedLog);
        }
        setLogs(newLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        setEditingLog(null);
        setEditingIndex(null);
    };

    const handleRemoveLog = (index) => {
        const newLogs = logs.filter((_, i) => i !== index);
        setLogs(newLogs);
    };

    const handleAddLog = () => {
        setEditingLog({ id: `log-${Date.now()}` }); // New empty log for creation
        setEditingIndex(null);
    };

    // הפונקציה החדשה לסיווג אוטומטי
    const handleAutoClassify = (log, index) => {
        // מספק את הלוגים הקודמים לצורך קורלציה
        const historicalLogs = logs.slice(0, index);
        const classifiedLogResult = classifyEvent(log, historicalLogs);

        const newLogs = [...logs];
        // מעדכן את הלוג עם התוצאות מהפונקציה
        newLogs[index] = {
            ...log,
            default_classification: classifiedLogResult.event_classification,
            admin_notes: classifiedLogResult.classification_reason
        };
        setLogs(newLogs);
    };

    return (
        <>
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white text-lg">Scenario Event Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {logs.map((log, index) => (
                            <div key={log.id || index} className="p-3 rounded-lg border border-slate-700 bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-xs text-slate-400">{new Date(log.timestamp).toLocaleTimeString('he-IL')}</span>
                                            <span className="font-bold text-teal-400">{log.source_type}</span>
                                        </div>
                                        <p className="text-sm text-white">{log.rule_description}</p>
                                        {log.admin_notes && <p className="text-xs text-slate-400 italic mt-1">Notes: {log.admin_notes}</p>}
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <VerdictBadge verdict={log.default_classification} />
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300" onClick={() => handleAutoClassify(log, index)}>
                                                <Bot className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300" onClick={() => handleEditLog(log, index)}>Edit</Button>
                                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300" onClick={() => handleRemoveLog(index)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4">
                        <Button variant="outline" className="w-full border-dashed border-slate-600 text-slate-300" onClick={handleAddLog}>
                            Add Event
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {editingLog && (
                <LogEventEditor
                    logData={editingLog}
                    onSave={handleSaveLog}
                    onClose={() => setEditingLog(null)}
                />
            )}
        </>
    );
}