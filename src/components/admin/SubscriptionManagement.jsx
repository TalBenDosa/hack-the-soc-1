import React, { useState, useEffect, useCallback } from 'react';
import { Tenant, User, TenantAuditLog } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { useNotification } from './Notification';

// Single source of truth for feature access based on tier
const TIER_FEATURES = {
    basic: { dashboard_logs: true, theoretical_lessons: true, quizzes: false, scenarios: false, progress_tracking: true, certificates: false, custom_scenarios: false },
    intermediate: { dashboard_logs: true, theoretical_lessons: true, quizzes: true, scenarios: false, progress_tracking: true, certificates: true, custom_scenarios: false },
    full: { dashboard_logs: true, theoretical_lessons: true, quizzes: true, scenarios: true, progress_tracking: true, certificates: true, custom_scenarios: true }
};

export default function SubscriptionManagement() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingTenantId, setUpdatingTenantId] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [showNotification, NotificationComponent] = useNotification();

    const fetchTenants = useCallback(async () => {
        setLoading(true);
        try {
            const tenantsList = await Tenant.list('-created_date');
            setTenants(tenantsList);
        } catch (error) {
            console.error("Failed to fetch tenants:", error);
            showNotification('Failed to load tenants.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchTenants();
        User.me().then(setCurrentUser).catch(() => console.error("Could not get current user"));
    }, [fetchTenants]);

    const handleTierChange = async (tenantId, oldTier, newTier) => {
        if (oldTier === newTier) return;

        setUpdatingTenantId(tenantId);
        try {
            const newFeatureAccess = TIER_FEATURES[newTier] || TIER_FEATURES.basic;

            // 1. Update the Tenant entity with the new tier and feature access
            await Tenant.update(tenantId, {
                subscription_tier: newTier,
                feature_access: newFeatureAccess
            });

            // 2. Create an audit log for the change
            if (currentUser) {
                await TenantAuditLog.create({
                    tenant_id: tenantId,
                    user_id: currentUser.id,
                    action: 'subscription_tier_changed',
                    resource_type: 'tenant',
                    resource_id: tenantId,
                    details: { from: oldTier, to: newTier },
                    ip_address: 'N/A', 
                    timestamp: new Date().toISOString()
                });
            }

            showNotification('Subscription updated successfully!', 'success');
            // Refresh the tenant list to show the change
            fetchTenants();

        } catch (error) {
            console.error("Failed to update subscription:", error);
            showNotification('Failed to update subscription.', 'error');
        } finally {
            setUpdatingTenantId(null);
        }
    };

    return (
        <>
            <NotificationComponent />
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="text-xl font-bold text-white">Client Subscription Management</CardTitle>
                    <Button onClick={fetchTenants} variant="outline" size="sm" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto border border-slate-700 rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
                                    <TableHead className="text-slate-300">Client Name</TableHead>
                                    <TableHead className="text-slate-300">Domain</TableHead>
                                    <TableHead className="text-slate-300 w-[250px]">Current Subscription Tier</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan="3" className="text-center py-8"><Loader2 className="mx-auto w-8 h-8 animate-spin" /></TableCell></TableRow>
                                ) : tenants.length === 0 ? (
                                    <TableRow><TableCell colSpan="3" className="text-center py-8">No clients found.</TableCell></TableRow>
                                ) : (
                                    tenants.map(tenant => (
                                        <TableRow key={tenant.id} className="border-b-slate-800">
                                            <TableCell className="font-medium text-white">{tenant.name}</TableCell>
                                            <TableCell className="text-slate-400">{tenant.domain}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={tenant.subscription_tier}
                                                    onValueChange={(newTier) => handleTierChange(tenant.id, tenant.subscription_tier, newTier)}
                                                    disabled={updatingTenantId === tenant.id}
                                                >
                                                    <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                                                        {updatingTenantId === tenant.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                        <SelectValue placeholder="Select a tier" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                                                        <SelectItem value="basic">Basic</SelectItem>
                                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                                        <SelectItem value="full">Full</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}