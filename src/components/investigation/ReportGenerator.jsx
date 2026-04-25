import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, PlusCircle, Trash2 } from 'lucide-react';
import IOCTracker from './IOCTracker';
import TimelineComponent from './TimelineComponent';

const isEnglish = (text) => {
    if (!text) return true;
    // This regex allows English letters, numbers, and a wide range of common punctuation and symbols.
    // It disallows characters from most other scripts (e.g., Hebrew, Arabic, Cyrillic).
    const englishRegex = /^[a-zA-Z0-9\s.,!?'"()[\]{}@#$%^&*\-_+=:;<>|\\/`~]*$/;
    return englishRegex.test(text);
};

const ValidationError = ({ message }) => {
    if (!message) return null;
    return (
        <div className="flex items-center gap-2 p-2 mt-2 text-sm text-red-400 bg-red-900/50 rounded-md">
            <AlertCircle className="w-4 h-4" />
            <span>{message}</span>
        </div>
    );
};

export default function ReportGenerator({ log, logInvestigationData, onLogInvestigationUpdate }) {
    const [currentInvestigation, setCurrentInvestigation] = useState(logInvestigationData);
    const [validationErrors, setValidationErrors] = useState({});

    useEffect(() => {
        setCurrentInvestigation(logInvestigationData);
    }, [logInvestigationData]);
    
    const debouncedUpdate = useCallback(
        (updatedData) => {
            const debounceTimer = setTimeout(() => {
                // Only save if there are no validation errors
                const hasErrors = Object.values(validationErrors).some(error => error !== null);
                if (!hasErrors) {
                    onLogInvestigationUpdate(log.id, updatedData);
                }
            }, 800); // Debounce time for saving
            return () => clearTimeout(debounceTimer);
        },
        [log.id, onLogInvestigationUpdate, validationErrors]
    );

    const handleFieldChange = (field, value) => {
        const error = !isEnglish(value) ? '❗ "Only English input is supported. Please switch to English."' : null;

        setValidationErrors(prev => ({...prev, [field]: error }));
        
        const updatedData = {
            ...currentInvestigation,
            [field]: value
        };
        setCurrentInvestigation(updatedData);
        debouncedUpdate(updatedData);
    };
    
    const handleComplexFieldChange = (field, value) => {
        const updatedData = {
            ...currentInvestigation,
            [field]: value
        };
        setCurrentInvestigation(updatedData);
        debouncedUpdate(updatedData);
    };

    return (
        <div className="p-4 bg-slate-800/50 rounded-lg">
            <Tabs defaultValue="findings" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-slate-900/70">
                    <TabsTrigger value="findings">Findings</TabsTrigger>
                    <TabsTrigger value="iocs">IOCs</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="verdict">Verdict</TabsTrigger>
                </TabsList>

                <TabsContent value="findings" className="mt-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Analysis & Findings</h3>
                    <p className="text-sm text-slate-400 mb-3">
                        Based on the log data, describe what happened. What is the threat, who is involved, and what is the potential impact?
                    </p>
                    <Textarea
                        placeholder="Type your analysis here..."
                        className="bg-slate-700 border-slate-600 text-white min-h-[150px] text-base"
                        value={currentInvestigation.findings || ''}
                        onChange={(e) => handleFieldChange('findings', e.target.value)}
                    />
                    <ValidationError message={validationErrors.findings} />
                </TabsContent>

                <TabsContent value="iocs" className="mt-4">
                    <IOCTracker 
                        iocs={currentInvestigation.iocs || []}
                        onUpdate={(newIocs) => handleComplexFieldChange('iocs', newIocs)}
                    />
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                    <TimelineComponent 
                        events={currentInvestigation.timeline_events || []}
                        onUpdate={(newEvents) => handleComplexFieldChange('timeline_events', newEvents)}
                    />
                </TabsContent>
                
                <TabsContent value="verdict" className="mt-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Final Verdict</h3>
                    <p className="text-sm text-slate-400 mb-3">
                        Based on your analysis, classify this event. This is a critical step in the incident response process.
                    </p>
                    <div className="flex gap-4">
                        {['True Positive', 'False Positive', 'Escalate to TIER 2'].map(v => (
                            <Button 
                                key={v}
                                variant={currentInvestigation.verdict === v ? 'default' : 'outline'}
                                onClick={() => handleFieldChange('verdict', v)}
                                className={`flex-1 ${currentInvestigation.verdict === v ? 'bg-teal-600 hover:bg-teal-700' : 'border-slate-600 hover:bg-slate-700'}`}
                            >
                                {v}
                            </Button>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}