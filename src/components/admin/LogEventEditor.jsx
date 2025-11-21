
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, AlertCircle, ArrowUp, AlertTriangle } from 'lucide-react';

const simpleUUID = () => `id-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

const VERDICT_EXPLANATIONS = {
    'True Positive': 'This event represents a confirmed security incident or malicious activity that requires immediate attention and response.',
    'False Positive': 'This event is a benign activity that triggered the security rule but does not represent an actual threat or malicious behavior.',
    'Escalate to TIER 2': 'This event requires deeper analysis by senior analysts due to its complexity or potential severity and cannot be conclusively classified at this tier.'
};

const CLASSIFICATION_OPTIONS = [
    {
        value: 'True Positive',
        label: 'True Positive',
        icon: CheckCircle,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10 border-green-500/30'
    },
    {
        value: 'False Positive',
        label: 'False Positive',
        icon: AlertCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10 border-red-500/30'
    },
    {
        value: 'Escalate to TIER 2',
        label: 'Escalate to TIER 2',
        icon: ArrowUp,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10 border-yellow-500/30'
    }
];

const LogEventEditor = ({ isOpen, onClose, onSave, eventData }) => {
    const [localEvent, setLocalEvent] = useState({
        id: simpleUUID(),
        rule_description: '',
        source_type: 'Windows Security',
        timestamp: new Date().toISOString(),
        severity: 'Medium',
        admin_notes: '',
        raw_log_data: {},
        default_classification: 'True Positive'
    });
    const [rawJson, setRawJson] = useState('');
    const [jsonError, setJsonError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            const initialEvent = eventData ?
                { ...eventData } :
                {
                    id: simpleUUID(),
                    rule_description: '',
                    source_type: 'Windows Security',
                    timestamp: new Date().toISOString(),
                    severity: 'Medium',
                    notes: '', // Keep notes for existing events, but it's not a primary input for new ones via this editor
                    admin_notes: '',
                    raw_log_data: {},
                    default_classification: 'True Positive'
                };

            setLocalEvent(initialEvent);
            setRawJson(JSON.stringify(initialEvent.raw_log_data || {}, null, 2));
            setJsonError(null);
        }
    }, [eventData, isOpen]);

    const handleInputChange = (field, value) => {
        setLocalEvent(prev => ({ ...prev, [field]: value }));
    };

    const handleVerdictChange = (value) => {
        const explanation = VERDICT_EXPLANATIONS[value] || '';
        setLocalEvent(prev => ({
            ...prev,
            default_classification: value,
            admin_notes: explanation
        }));
    };

    const handleJsonChange = (e) => {
        const jsonString = e.target.value;
        setRawJson(jsonString);
        try {
            const parsed = JSON.parse(jsonString);
            setLocalEvent(prev => ({ ...prev, raw_log_data: parsed }));
            setJsonError(null);
        } catch (error) {
            setJsonError('Invalid JSON format');
        }
    };

    const handleSaveClick = () => {
        if (jsonError) {
            alert('Cannot save, please fix the invalid JSON.');
            return;
        }
        if (!localEvent.rule_description.trim()) {
            alert('Please provide a rule description.');
            return;
        }
        onSave(localEvent);
        onClose();
    };

    if (!isOpen || !localEvent) return null;

    const severities = ["Low", "Medium", "High", "Critical"];
    const sourceTypes = [
        "Windows Security", "EDR", "Office 365", "Azure", "AWS",
        "Mail Relay", "IPS/IDS", "Antivirus", "Firewall", 'Active Directory', 'DNS'
    ];

    // Get the selected classification option for styling
    const selectedClassification = CLASSIFICATION_OPTIONS.find(opt => opt.value === localEvent.default_classification);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                    <DialogTitle>{eventData ? 'Edit Log Event' : 'Create New Log Event'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                    <div>
                        <Label htmlFor="rule_description" className="text-slate-300">Rule Description</Label>
                        <Input
                            id="rule_description"
                            value={localEvent.rule_description}
                            onChange={(e) => handleInputChange('rule_description', e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="source_type" className="text-slate-300">Source Type</Label>
                            <Select value={localEvent.source_type} onValueChange={(value) => handleInputChange('source_type', value)}>
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                    {sourceTypes.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="severity" className="text-slate-300">Severity</Label>
                            <Select value={localEvent.severity} onValueChange={(value) => handleInputChange('severity', value)}>
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                    {severities.map(severity => (
                                        <SelectItem key={severity} value={severity}>{severity}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="event_classification" className="text-slate-300">
                            Event Classification <span className="text-red-400">*</span>
                        </Label>
                        <Select value={localEvent.default_classification} onValueChange={handleVerdictChange}>
                            <SelectTrigger className={`bg-slate-800 border-slate-600 text-white ${selectedClassification?.bgColor || ''} border-2`}>
                                <div className="flex items-center gap-2">
                                    {selectedClassification && (
                                        <selectedClassification.icon className={`w-4 h-4 ${selectedClassification.color}`} />
                                    )}
                                    <SelectValue />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                {CLASSIFICATION_OPTIONS.map(option => {
                                    const IconComponent = option.icon;
                                    return (
                                        <SelectItem key={option.value} value={option.value}>
                                            <div className="flex items-center gap-2">
                                                <IconComponent className={`w-4 h-4 ${option.color}`} />
                                                <span>{option.label}</span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="admin_notes" className="text-slate-300">Admin Notes (Reasoning for Verdict)</Label>
                        <Textarea
                            id="admin_notes"
                            value={localEvent.admin_notes}
                            onChange={(e) => handleInputChange('admin_notes', e.target.value)}
                            className="bg-slate-800 border-slate-600 text-white min-h-[100px]"
                        />
                    </div>

                    <div>
                        <Label htmlFor="raw_log_data" className="text-slate-300 flex items-center justify-between">
                            Raw Log Data (JSON)
                            {jsonError ? (
                                <span className="text-red-400 flex items-center gap-1 text-xs">
                                    <AlertTriangle className="w-4 h-4" /> {jsonError}
                                </span>
                            ) : (
                                <span className="text-green-400 flex items-center gap-1 text-xs">
                                    <CheckCircle className="w-4 h-4" /> Valid JSON
                                </span>
                            )}
                        </Label>
                        <Textarea
                            id="raw_log_data"
                            value={rawJson}
                            onChange={handleJsonChange}
                            className={`bg-slate-800 border-slate-600 text-white font-mono min-h-[150px] ${
                                jsonError ? 'border-red-500' : 'border-green-500/50'
                            }`}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSaveClick} className="bg-teal-600 hover:bg-teal-700">Save Event</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default LogEventEditor;
