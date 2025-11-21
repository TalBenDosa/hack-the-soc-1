import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Building, Mail, Globe, CreditCard, Settings, Shield, AlertCircle } from 'lucide-react';

export default function TenantEditor({ isOpen, tenant, onClose, onSave, loading }) {
    const [formData, setFormData] = useState({
        // Basic Information
        name: tenant?.name || '',
        domain: tenant?.domain || '',
        
        // Contact Information
        contact_info: {
            primary_contact_name: tenant?.contact_info?.primary_contact_name || '',
            primary_contact_email: tenant?.contact_info?.primary_contact_email || '',
            billing_email: tenant?.contact_info?.billing_email || '',
            phone: tenant?.contact_info?.phone || ''
        },
        
        // Admin Setup
        admin_email: tenant?.admin_email || '',
        
        // Subscription & Features
        subscription_tier: tenant?.subscription_tier || 'basic',
        max_users: tenant?.max_users || 50,
        max_labs: tenant?.max_labs || 10,
        
        // Contract Information
        contract: {
            start_date: tenant?.contract?.start_date || new Date().toISOString().split('T')[0],
            end_date: tenant?.contract?.end_date || '',
            auto_renewal: tenant?.contract?.auto_renewal || false,
            contract_value: tenant?.contract?.contract_value || 0,
            billing_cycle: tenant?.contract?.billing_cycle || 'monthly'
        },
        
        // Settings
        settings: {
            mfa_required: tenant?.settings?.mfa_required !== false, // Default to true
            audit_retention_days: tenant?.settings?.audit_retention_days || 90,
            dedicated_database: tenant?.settings?.dedicated_database || false
        },
        
        // Status
        status: tenant?.status || 'active'
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate required fields
        if (!formData.name?.trim()) {
            alert('Company name is required');
            return;
        }
        
        if (!formData.domain?.trim()) {
            alert('Domain is required');
            return;
        }
        
        if (!formData.admin_email?.trim()) {
            alert('Environment Admin email is required');
            return;
        }
        
        if (!formData.contact_info?.primary_contact_email?.trim()) {
            alert('Primary contact email is required');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.admin_email)) {
            alert('Please enter a valid Environment Admin email address');
            return;
        }
        
        if (!emailRegex.test(formData.contact_info.primary_contact_email)) {
            alert('Please enter a valid primary contact email address');
            return;
        }

        onSave(formData);
    };

    const getTierFeatures = (tier) => {
        const features = {
            basic: ['Dashboard Logs', 'Theoretical Lessons', 'Progress Tracking', 'Basic Support'],
            intermediate: ['All Basic Features', 'Quizzes', 'Certificates', 'Priority Support'],
            full: ['All Intermediate Features', 'Scenarios', 'Custom Scenarios', 'API Access', 'SIEM Integration']
        };
        return features[tier] || [];
    };

    const updateFormData = (path, value) => {
        const keys = path.split('.');
        setFormData(prev => {
            const updated = { ...prev };
            let current = updated;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
            return updated;
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                        <Building className="w-6 h-6 text-teal-400" />
                        {tenant ? `Edit ${tenant.name}` : 'Create New Environment'}
                    </DialogTitle>
                    <p className="text-slate-400">
                        {tenant ? 'Modify environment settings and configuration' : 'Set up a new customer environment with admin access'}
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <Card className="bg-slate-900 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Building className="w-5 h-5 text-teal-400" />
                                Basic Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-slate-300">Company Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="bg-slate-800 border-slate-600 text-white"
                                    placeholder="e.g., Microsoft Corporation"
                                    required
                                />
                            </div>
                            <div>
                                <Label className="text-slate-300">Domain *</Label>
                                <Input
                                    value={formData.domain}
                                    onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                                    className="bg-slate-800 border-slate-600 text-white"
                                    placeholder="e.g., microsoft.com"
                                    required
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Environment Admin Setup */}
                    <Card className="bg-slate-900 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-teal-400" />
                                Environment Admin Setup
                            </CardTitle>
                            <p className="text-sm text-slate-400">
                                This person will receive full administrative privileges for this environment
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div>
                                <Label className="text-slate-300">Environment Admin Email *</Label>
                                <Input
                                    type="email"
                                    value={formData.admin_email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, admin_email: e.target.value }))}
                                    className="bg-slate-800 border-slate-600 text-white"
                                    placeholder="admin@company.com"
                                    required
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    💡 After creating the environment, you can generate a secure admin invitation link for this email
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact Information */}
                    <Card className="bg-slate-900 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Mail className="w-5 h-5 text-teal-400" />
                                Contact Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-slate-300">Primary Contact Name</Label>
                                <Input
                                    value={formData.contact_info.primary_contact_name}
                                    onChange={(e) => updateFormData('contact_info.primary_contact_name', e.target.value)}
                                    className="bg-slate-800 border-slate-600 text-white"
                                    placeholder="John Smith"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-300">Primary Contact Email *</Label>
                                <Input
                                    type="email"
                                    value={formData.contact_info.primary_contact_email}
                                    onChange={(e) => updateFormData('contact_info.primary_contact_email', e.target.value)}
                                    className="bg-slate-800 border-slate-600 text-white"
                                    placeholder="contact@company.com"
                                    required
                                />
                            </div>
                            <div>
                                <Label className="text-slate-300">Billing Email</Label>
                                <Input
                                    type="email"
                                    value={formData.contact_info.billing_email}
                                    onChange={(e) => updateFormData('contact_info.billing_email', e.target.value)}
                                    className="bg-slate-800 border-slate-600 text-white"
                                    placeholder="billing@company.com"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-300">Phone</Label>
                                <Input
                                    value={formData.contact_info.phone}
                                    onChange={(e) => updateFormData('contact_info.phone', e.target.value)}
                                    className="bg-slate-800 border-slate-600 text-white"
                                    placeholder="+1-555-123-4567"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Subscription & Features */}
                    <Card className="bg-slate-900 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-teal-400" />
                                Subscription & Features
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label className="text-slate-300">Subscription Tier</Label>
                                    <Select
                                        value={formData.subscription_tier}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, subscription_tier: value }))}
                                    >
                                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600">
                                            <SelectItem value="basic">Basic</SelectItem>
                                            <SelectItem value="intermediate">Intermediate</SelectItem>
                                            <SelectItem value="full">Full</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-slate-300">Max Users</Label>
                                    <Input
                                        type="number"
                                        value={formData.max_users}
                                        onChange={(e) => setFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) || 50 }))}
                                        className="bg-slate-800 border-slate-600 text-white"
                                        min="1"
                                        max="1000"
                                    />
                                </div>
                                <div>
                                    <Label className="text-slate-300">Max Labs</Label>
                                    <Input
                                        type="number"
                                        value={formData.max_labs}
                                        onChange={(e) => setFormData(prev => ({ ...prev, max_labs: parseInt(e.target.value) || 10 }))}
                                        className="bg-slate-800 border-slate-600 text-white"
                                        min="1"
                                        max="100"
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-slate-800 p-4 rounded-lg">
                                <h4 className="text-white font-medium mb-2">Features for {formData.subscription_tier} tier:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {getTierFeatures(formData.subscription_tier).map((feature, index) => (
                                        <Badge key={index} className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                                            {feature}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contract Information */}
                    <Card className="bg-slate-900 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-teal-400" />
                                Contract Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <Label className="text-slate-300">Contract Start Date</Label>
                                <Input
                                    type="date"
                                    value={formData.contract.start_date}
                                    onChange={(e) => updateFormData('contract.start_date', e.target.value)}
                                    className="bg-slate-800 border-slate-600 text-white"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-300">Contract End Date</Label>
                                <Input
                                    type="date"
                                    value={formData.contract.end_date}
                                    onChange={(e) => updateFormData('contract.end_date', e.target.value)}
                                    className="bg-slate-800 border-slate-600 text-white"
                                />
                            </div>
                            <div>
                                <Label className="text-slate-300">Billing Cycle</Label>
                                <Select
                                    value={formData.contract.billing_cycle}
                                    onValueChange={(value) => updateFormData('contract.billing_cycle', value)}
                                >
                                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-600">
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-slate-300">Contract Value ($)</Label>
                                <Input
                                    type="number"
                                    value={formData.contract.contract_value}
                                    onChange={(e) => updateFormData('contract.contract_value', parseFloat(e.target.value) || 0)}
                                    className="bg-slate-800 border-slate-600 text-white"
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    checked={formData.contract.auto_renewal}
                                    onCheckedChange={(checked) => updateFormData('contract.auto_renewal', checked)}
                                />
                                <Label className="text-slate-300">Auto Renewal</Label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Settings */}
                    <Card className="bg-slate-900 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                                <Settings className="w-5 h-5 text-teal-400" />
                                Security Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={formData.settings.mfa_required}
                                        onCheckedChange={(checked) => updateFormData('settings.mfa_required', checked)}
                                    />
                                    <Label className="text-slate-300">MFA Required</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={formData.settings.dedicated_database}
                                        onCheckedChange={(checked) => updateFormData('settings.dedicated_database', checked)}
                                    />
                                    <Label className="text-slate-300">Dedicated Database</Label>
                                </div>
                            </div>
                            <div>
                                <Label className="text-slate-300">Audit Retention (Days)</Label>
                                <Input
                                    type="number"
                                    value={formData.settings.audit_retention_days}
                                    onChange={(e) => updateFormData('settings.audit_retention_days', parseInt(e.target.value) || 90)}
                                    className="bg-slate-800 border-slate-600 text-white w-32"
                                    min="30"
                                    max="365"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Environment Status */}
                    {tenant && (
                        <Card className="bg-slate-900 border-slate-700">
                            <CardHeader>
                                <CardTitle className="text-lg text-white flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-teal-400" />
                                    Environment Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div>
                                    <Label className="text-slate-300">Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                                    >
                                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white w-48">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-600">
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="trial">Trial</SelectItem>
                                            <SelectItem value="suspended">Suspended</SelectItem>
                                            <SelectItem value="expired">Expired</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </form>

                <DialogFooter className="flex gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                {tenant ? 'Updating...' : 'Creating...'}
                            </>
                        ) : (
                            <>
                                {tenant ? 'Update Environment' : 'Create Environment'}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}