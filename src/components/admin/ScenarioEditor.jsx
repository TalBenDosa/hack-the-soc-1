import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Save, Trash2, AlertTriangle, Edit } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import LogEventEditor from './LogEventEditor';

const ALL_LEARNING_OBJECTIVES = [
    "Phishing Detection", "Malware Analysis", "Log Analysis",
    "Network Traffic Analysis", "Credential Access Techniques", "Lateral Movement Detection",
    "Data Exfiltration Analysis", "Incident Triage", "Endpoint Forensics",
    "Cloud Security Monitoring", "Web Application Attacks", "Vulnerability Assessment"
];

export default function ScenarioEditor({ isOpen, onClose, onSave, scenario, tenantContext }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: 'Medium',
        category: 'Malware',
        expected_verdict: 'True Positive',
        learning_objectives: [],
        initial_events: [],
        is_active: true
    });
    
    const [isEventEditorOpen, setIsEventEditorOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [editingEventIndex, setEditingEventIndex] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (scenario) {
            setFormData({
                title: scenario.title || '',
                description: scenario.description || '',
                difficulty: scenario.difficulty || 'Medium',
                category: scenario.category || 'Malware',
                expected_verdict: scenario.expected_verdict || 'True Positive',
                learning_objectives: Array.isArray(scenario.learning_objectives) ? scenario.learning_objectives : [],
                initial_events: Array.isArray(scenario.initial_events) ? scenario.initial_events : [],
                is_active: scenario.is_active !== undefined ? scenario.is_active : true
            });
        } else {
            // Reset to default for new scenario
            setFormData({
                title: '',
                description: '',
                difficulty: 'Medium',
                category: 'Malware',
                expected_verdict: 'True Positive',
                learning_objectives: [],
                initial_events: [],
                is_active: true
            });
        }
    }, [scenario, isOpen]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleObjectiveChange = (objective, checked) => {
        setFormData(prev => {
            const objectives = checked
                ? [...prev.learning_objectives, objective]
                : prev.learning_objectives.filter(obj => obj !== objective);
            return { ...prev, learning_objectives: objectives };
        });
    };

    const handleSave = () => {
        if (!formData.title.trim()) {
            alert('Please enter a scenario title');
            return;
        }
        if (!formData.description.trim()) {
            alert('Please enter a scenario description');
            return;
        }
        onSave({ ...formData, tenant_id: tenantContext?.tenant.id || null });
    };

    // Event management
    const handleAddEvent = () => {
        setEditingEvent(null);
        setEditingEventIndex(null);
        setIsEventEditorOpen(true);
    };

    const handleEditEvent = (event, index) => {
        setEditingEvent(event);
        setEditingEventIndex(index);
        setIsEventEditorOpen(true);
    };

    const handleRemoveEvent = (index) => {
        setFormData(prev => ({
            ...prev,
            initial_events: prev.initial_events.filter((_, i) => i !== index)
        }));
    };

    const handleSaveEvent = (eventData) => {
        setFormData(prev => {
            const newEvents = [...prev.initial_events];
            if (editingEventIndex !== null) {
                newEvents[editingEventIndex] = eventData;
            } else {
                newEvents.push(eventData);
            }
            return { ...prev, initial_events: newEvents };
        });
        setIsEventEditorOpen(false);
    };

    // This function is now removed from the UI but kept for potential future use
    const handleGenerateWithAI = async () => {
        setIsGenerating(true);
        try {
            const generatedEvents = [];
            setFormData(prev => ({
                ...prev,
                initial_events: generatedEvents // Changed to replace existing events
            }));
        } catch (error) {
            console.error("AI Generation failed:", error);
            alert("Failed to generate events with AI."); // Updated alert message
        }
        setIsGenerating(false);
    };

    const categories = [
        "Malware", "Brute Force", "Privilege Escalation", "Data Exfiltration",
        "Network Intrusion", "Insider Threat", "Phishing / Social Engineering",
        "Web Application Attack", "Denial of Service (DoS/DDoS)", "Supply Chain Attack",
        "Cloud Misconfiguration", "Vulnerability Exploitation"
    ];

    const difficulties = ["Easy", "Medium", "Hard", "Advanced"];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[90vh] bg-slate-900 border-slate-700 text-white flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {scenario ? 'Edit Scenario' : 'Create New Scenario'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-4">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label htmlFor="title" className="text-slate-300">Title</Label>
                            <Input id="title" value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)}
                                   placeholder="e.g., Emotet Malware Infection via Phishing"
                                   className="bg-slate-800 border-slate-600 text-white" />
                        </div>
                        <div>
                            <Label htmlFor="difficulty" className="text-slate-300">Difficulty</Label>
                            <Select value={formData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                    {difficulties.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="expected_verdict" className="text-slate-300">Expected Scenario Verdict</Label>
                            <Select value={formData.expected_verdict} onValueChange={(value) => handleInputChange('expected_verdict', value)}>
                                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                                    <SelectItem value="True Positive">True Positive</SelectItem>
                                    <SelectItem value="False Positive">False Positive</SelectItem>
                                    <SelectItem value="Escalate to TIER 2">Escalate to TIER 2</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="description" className="text-slate-300">Description</Label>
                            <Textarea id="description" value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)}
                                      placeholder="Describe the attack narrative and context for the student."
                                      className="bg-slate-800 border-slate-600 text-white min-h-[80px]" />
                        </div>
                    </div>

                    {/* Learning Objectives */}
                    <div>
                        <Label className="text-slate-300 mb-2 block">Learning Objectives</Label>
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-4 max-h-40 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                    {ALL_LEARNING_OBJECTIVES.map(obj => (
                                        <div key={obj} className="flex items-center space-x-2">
                                            <Checkbox id={`cb-${obj}`}
                                                      checked={formData.learning_objectives.includes(obj)}
                                                      onCheckedChange={(checked) => handleObjectiveChange(obj, checked)}
                                                      className="border-slate-500 data-[state=checked]:bg-teal-500" />
                                            <label htmlFor={`cb-${obj}`} className="text-sm text-slate-200 font-medium leading-none cursor-pointer">
                                                {obj}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Log Events */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-white">Log Events</h3>
                            <div className="flex gap-2">
                                <Button onClick={handleAddEvent} className="bg-teal-600 hover:bg-teal-700 text-white">
                                    <Plus className="w-4 h-4 mr-2" /> Add Manually
                                </Button>
                                {/* The "Generate with AI" button is removed from here as requested */}
                            </div>
                        </div>
                        <Card className="bg-slate-800 border-slate-700 min-h-[200px]">
                            <CardContent className="p-4 space-y-2">
                                {formData.initial_events.length === 0 ? (
                                    <div className="text-center text-slate-400 py-16">
                                        <AlertTriangle className="mx-auto w-8 h-8 mb-2" />
                                        <p>No events added yet</p>
                                        <p className="text-sm">Use "Add Manually" to add log events</p>
                                    </div>
                                ) : (
                                    formData.initial_events.map((event, index) => (
                                        <div key={event.id || index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-md">
                                            <div className="flex-1 truncate">
                                                <p className="text-white font-medium truncate">{event.rule_description || 'Untitled Event'}</p>
                                                <p className="text-xs text-slate-400">{event.source_type || 'N/A'} - {event.timestamp ? new Date(event.timestamp).toLocaleString() : 'N/A'}</p>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-slate-600" onClick={() => handleEditEvent(event, index)}>
                                                    <Edit className="w-4 h-4 text-blue-400" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="w-8 h-8 hover:bg-slate-600" onClick={() => handleRemoveEvent(index)}>
                                                    <Trash2 className="w-4 h-4 text-red-400" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</Button>
                    <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
                        <Save className="w-4 h-4 mr-2" />
                        Save Scenario
                    </Button>
                </DialogFooter>
            </DialogContent>

            {isEventEditorOpen && (
                <LogEventEditor 
                    isOpen={isEventEditorOpen} 
                    onClose={() => setIsEventEditorOpen(false)} 
                    onSave={handleSaveEvent} 
                    eventData={editingEvent}
                />
            )}
        </Dialog>
    );
}