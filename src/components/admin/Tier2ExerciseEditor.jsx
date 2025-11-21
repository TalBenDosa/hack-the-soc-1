import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Save, X, Plus, Trash2 } from 'lucide-react';
import { InvokeLLM } from "@/integrations/Core";

export default function Tier2ExerciseEditor({ isOpen, onClose, onSave, exercise }) {
    const [formData, setFormData] = useState({
        title: '',
        exercise_task: '',
        category: 'Brute Force Detection',
        difficulty_level: 'Medium',
        points: 100,
        status: 'draft',
        base_rules: {
            wazuh: '',
            splunk: '',
            sentinel: '',
            qradar: ''
        },
        scenario: {
            background: '',
            objectives: ['']
        },
        hints: {
            wazuh: [''],
            splunk: [''],
            sentinel: [''],
            qradar: ['']
        },
        solutions: {
            wazuh: '',
            splunk: '',
            sentinel: '',
            qradar: ''
        }
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (exercise && isOpen) {
            setFormData({
                title: exercise.title || '',
                exercise_task: exercise.exercise_task || '',
                category: exercise.category || 'Brute Force Detection',
                difficulty_level: exercise.difficulty_level || 'Medium',
                points: exercise.points || 100,
                status: exercise.status || 'draft',
                base_rules: exercise.base_rules || {
                    wazuh: '',
                    splunk: '',
                    sentinel: '',
                    qradar: ''
                },
                scenario: exercise.scenario || {
                    background: '',
                    objectives: ['']
                },
                hints: exercise.hints || {
                    wazuh: [''],
                    splunk: [''],
                    sentinel: [''],
                    qradar: ['']
                },
                solutions: exercise.solutions || {
                    wazuh: '',
                    splunk: '',
                    sentinel: '',
                    qradar: ''
                }
            });
        }
    }, [exercise, isOpen]);

    const handleGenerateWithAI = async () => {
        setIsGenerating(true);
        try {
            console.log('[TIER2 EDITOR] Starting AI-powered exercise generation...');
            
            // Generate exercise using InvokeLLM instead of backend functions
            const prompt = `
Create a comprehensive multi-SIEM cybersecurity exercise for analyst training.

Generate a realistic scenario for "${formData.category}" category at "${formData.difficulty_level}" difficulty level.

The exercise should include:
1. A clear, specific task for the student
2. Background scenario explaining the security context
3. Base detection rules for each SIEM platform (Wazuh XML, Splunk SPL, Sentinel KQL, QRadar AQL)
4. Learning objectives
5. Platform-specific hints
6. Complete solutions for each SIEM

Focus on practical, hands-on detection rules that would be used in real SOC environments.
Make sure the rules are syntactically correct for each platform.

Return the response as a JSON object with this exact structure:
{
    "title": "Exercise Title",
    "exercise_task": "Specific task for the student",
    "scenario": {
        "background": "Detailed background scenario",
        "objectives": ["objective1", "objective2", "objective3"]
    },
    "base_rules": {
        "wazuh": "Complete Wazuh rule in XML format",
        "splunk": "Complete Splunk search query in SPL",
        "sentinel": "Complete Microsoft Sentinel query in KQL",
        "qradar": "Complete QRadar rule in AQL"
    },
    "hints": {
        "wazuh": ["hint1", "hint2"],
        "splunk": ["hint1", "hint2"],
        "sentinel": ["hint1", "hint2"],
        "qradar": ["hint1", "hint2"]
    },
    "solutions": {
        "wazuh": "Optimized Wazuh rule with explanations",
        "splunk": "Optimized Splunk query with explanations",
        "sentinel": "Optimized Sentinel query with explanations",
        "qradar": "Optimized QRadar rule with explanations"
    }
}
            `;

            const response = await InvokeLLM({
                prompt: prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        exercise_task: { type: "string" },
                        scenario: {
                            type: "object",
                            properties: {
                                background: { type: "string" },
                                objectives: { type: "array", items: { type: "string" } }
                            }
                        },
                        base_rules: {
                            type: "object",
                            properties: {
                                wazuh: { type: "string" },
                                splunk: { type: "string" },
                                sentinel: { type: "string" },
                                qradar: { type: "string" }
                            }
                        },
                        hints: {
                            type: "object",
                            properties: {
                                wazuh: { type: "array", items: { type: "string" } },
                                splunk: { type: "array", items: { type: "string" } },
                                sentinel: { type: "array", items: { type: "string" } },
                                qradar: { type: "array", items: { type: "string" } }
                            }
                        },
                        solutions: {
                            type: "object",
                            properties: {
                                wazuh: { type: "string" },
                                splunk: { type: "string" },
                                sentinel: { type: "string" },
                                qradar: { type: "string" }
                            }
                        }
                    }
                }
            });

            if (response && typeof response === 'object') {
                setFormData({
                    ...formData,
                    title: response.title || `${formData.category} Detection Exercise`,
                    exercise_task: response.exercise_task || 'Analyze and detect security threats',
                    scenario: response.scenario || formData.scenario,
                    base_rules: response.base_rules || formData.base_rules,
                    hints: response.hints || formData.hints,
                    solutions: response.solutions || formData.solutions
                });

                console.log('[TIER2 EDITOR] Successfully generated AI exercise');
            } else {
                throw new Error('Invalid response format from AI');
            }

        } catch (error) {
            console.error("[TIER2 EDITOR] AI Generation failed:", error);
            alert(`Failed to generate exercise: ${error.message}. Please try again.`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error('Failed to save exercise:', error);
            alert('Failed to save exercise. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const updateFormField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const updateNestedField = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: { ...prev[section], [field]: value }
        }));
    };

    const updateArrayField = (section, platform, index, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [platform]: prev[section][platform].map((item, i) => i === index ? value : item)
            }
        }));
    };

    const addArrayItem = (section, platform) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [platform]: [...prev[section][platform], '']
            }
        }));
    };

    const removeArrayItem = (section, platform, index) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [platform]: prev[section][platform].filter((_, i) => i !== index)
            }
        }));
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-teal-400" />
                        {exercise ? 'Edit Multi-SIEM Exercise' : 'Create Multi-SIEM Exercise'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <Card className="bg-slate-700 border-slate-600">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center justify-between">
                                Basic Information
                                <Button 
                                    onClick={handleGenerateWithAI} 
                                    disabled={isGenerating}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-4 h-4 mr-2" />
                                    )}
                                    {isGenerating ? 'Generating...' : 'Generate Complete Exercise with AI'}
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-slate-300">Exercise Title</Label>
                                    <Input
                                        value={formData.title}
                                        onChange={(e) => updateFormField('title', e.target.value)}
                                        className="bg-slate-600 border-slate-500 text-white"
                                        placeholder="Enter exercise title..."
                                    />
                                </div>
                                <div>
                                    <Label className="text-slate-300">Category</Label>
                                    <Select value={formData.category} onValueChange={(value) => updateFormField('category', value)}>
                                        <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-700 border-slate-600">
                                            {['Brute Force Detection', 'Privilege Escalation', 'Data Exfiltration', 'Lateral Movement', 'Malware Detection', 'Insider Threat', 'Network Intrusion', 'Email Security', 'Endpoint Security', 'Authentication Anomalies'].map(cat => (
                                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-slate-300">Difficulty Level</Label>
                                    <Select value={formData.difficulty_level} onValueChange={(value) => updateFormField('difficulty_level', value)}>
                                        <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-700 border-slate-600">
                                            {['Easy', 'Medium', 'Hard', 'Advanced'].map(level => (
                                                <SelectItem key={level} value={level}>{level}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-slate-300">Points</Label>
                                    <Input
                                        type="number"
                                        value={formData.points}
                                        onChange={(e) => updateFormField('points', parseInt(e.target.value))}
                                        className="bg-slate-600 border-slate-500 text-white"
                                    />
                                </div>
                                <div>
                                    <Label className="text-slate-300">Status</Label>
                                    <Select value={formData.status} onValueChange={(value) => updateFormField('status', value)}>
                                        <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-700 border-slate-600">
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="published">Published</SelectItem>
                                            <SelectItem value="archived">Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label className="text-slate-300">Exercise Task</Label>
                                <Textarea
                                    value={formData.exercise_task}
                                    onChange={(e) => updateFormField('exercise_task', e.target.value)}
                                    className="bg-slate-600 border-slate-500 text-white h-20"
                                    placeholder="Describe the specific task students need to complete..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Scenario */}
                    <Card className="bg-slate-700 border-slate-600">
                        <CardHeader>
                            <CardTitle className="text-white">Scenario</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-slate-300">Background</Label>
                                <Textarea
                                    value={formData.scenario.background}
                                    onChange={(e) => updateNestedField('scenario', 'background', e.target.value)}
                                    className="bg-slate-600 border-slate-500 text-white h-24"
                                    placeholder="Provide context and background for the exercise..."
                                />
                            </div>
                            <div>
                                <Label className="text-slate-300">Learning Objectives</Label>
                                {formData.scenario.objectives.map((objective, index) => (
                                    <div key={index} className="flex gap-2 mt-2">
                                        <Input
                                            value={objective}
                                            onChange={(e) => {
                                                const newObjectives = [...formData.scenario.objectives];
                                                newObjectives[index] = e.target.value;
                                                updateNestedField('scenario', 'objectives', newObjectives);
                                            }}
                                            className="bg-slate-600 border-slate-500 text-white flex-1"
                                            placeholder={`Learning objective ${index + 1}...`}
                                        />
                                        {formData.scenario.objectives.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const newObjectives = formData.scenario.objectives.filter((_, i) => i !== index);
                                                    updateNestedField('scenario', 'objectives', newObjectives);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateNestedField('scenario', 'objectives', [...formData.scenario.objectives, ''])}
                                    className="mt-2"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Objective
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* SIEM Platform Rules */}
                    <Card className="bg-slate-700 border-slate-600">
                        <CardHeader>
                            <CardTitle className="text-white">SIEM Platform Rules</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="wazuh" className="w-full">
                                <TabsList className="grid w-full grid-cols-4 bg-slate-600">
                                    <TabsTrigger value="wazuh" className="data-[state=active]:bg-slate-500">Wazuh</TabsTrigger>
                                    <TabsTrigger value="splunk" className="data-[state=active]:bg-slate-500">Splunk</TabsTrigger>
                                    <TabsTrigger value="sentinel" className="data-[state=active]:bg-slate-500">Sentinel</TabsTrigger>
                                    <TabsTrigger value="qradar" className="data-[state=active]:bg-slate-500">QRadar</TabsTrigger>
                                </TabsList>
                                {['wazuh', 'splunk', 'sentinel', 'qradar'].map(platform => (
                                    <TabsContent key={platform} value={platform} className="space-y-4">
                                        <div>
                                            <Label className="text-slate-300 capitalize">Base {platform} Rule</Label>
                                            <Textarea
                                                value={formData.base_rules[platform]}
                                                onChange={(e) => updateNestedField('base_rules', platform, e.target.value)}
                                                className="bg-slate-600 border-slate-500 text-white font-mono h-32"
                                                placeholder={`Enter ${platform} detection rule...`}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300 capitalize">{platform} Hints</Label>
                                            {formData.hints[platform].map((hint, index) => (
                                                <div key={index} className="flex gap-2 mt-2">
                                                    <Input
                                                        value={hint}
                                                        onChange={(e) => updateArrayField('hints', platform, index, e.target.value)}
                                                        className="bg-slate-600 border-slate-500 text-white flex-1"
                                                        placeholder={`Hint ${index + 1} for ${platform}...`}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeArrayItem('hints', platform, index)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => addArrayItem('hints', platform)}
                                                className="mt-2"
                                            >
                                                <Plus className="w-4 h-4 mr-1" />
                                                Add Hint
                                            </Button>
                                        </div>
                                        <div>
                                            <Label className="text-slate-300 capitalize">{platform} Solution</Label>
                                            <Textarea
                                                value={formData.solutions[platform]}
                                                onChange={(e) => updateNestedField('solutions', platform, e.target.value)}
                                                className="bg-slate-600 border-slate-500 text-white font-mono h-32"
                                                placeholder={`Complete solution for ${platform}...`}
                                            />
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-6">
                    <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-teal-600 hover:bg-teal-700">
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Exercise'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}