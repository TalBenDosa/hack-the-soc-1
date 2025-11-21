import React, { useEffect, useState } from 'react';
import { User, Tenant, TenantUser } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, CheckCircle, Loader2 } from 'lucide-react';

export default function UnassignedUserHandler() {
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState(null);

    const handleBulkAssignment = async () => {
        setProcessing(true);
        try {
            console.log('[BULK ASSIGNMENT] Starting bulk assignment process...');

            // Get all users
            const allUsers = await User.list();
            console.log('[BULK ASSIGNMENT] Found', allUsers.length, 'users');

            // Get all tenant users to identify unassigned ones
            const allTenantUsers = await TenantUser.list();
            const assignedUserIds = new Set(allTenantUsers.map(tu => tu.user_id).filter(Boolean));

            // Find unassigned users
            const unassignedUsers = allUsers.filter(user => !assignedUserIds.has(user.id));
            console.log('[BULK ASSIGNMENT] Found', unassignedUsers.length, 'unassigned users');

            if (unassignedUsers.length === 0) {
                setResult({ success: true, message: 'No unassigned users found.', count: 0 });
                setProcessing(false);
                return;
            }

            // Find or create Hack The SOC tenant
            let hackTheSOCTenant = null;
            const tenants = await Tenant.filter({ name: 'Hack The SOC' });
            
            if (tenants.length > 0) {
                hackTheSOCTenant = tenants[0];
            } else {
                // Create tenant if it doesn't exist
                hackTheSOCTenant = await Tenant.create({
                    name: 'Hack The SOC',
                    domain: 'hackthesoc.com',
                    subscription_tier: 'full',
                    max_users: 1000,
                    max_labs: 50,
                    status: 'active',
                    unique_invite_code: 'hackthesoc-public-access',
                    environment_id: 'env_hackthesoc_main',
                    feature_access: {
                        dashboard_logs: true,
                        theoretical_lessons: true,
                        quizzes: true,
                        scenarios: true,
                        progress_tracking: true,
                        certificates: true,
                        custom_scenarios: true
                    },
                    contact_info: {
                        primary_contact_name: 'Hack The SOC Team',
                        primary_contact_email: 'admin@hackthesoc.com',
                        billing_email: 'billing@hackthesoc.com'
                    },
                    contract: {
                        start_date: new Date().toISOString(),
                        end_date: null,
                        auto_renewal: true,
                        contract_value: 0,
                        billing_cycle: 'yearly'
                    }
                });
            }

            // Assign all unassigned users
            let successCount = 0;
            for (const user of unassignedUsers) {
                try {
                    await TenantUser.create({
                        tenant_id: hackTheSOCTenant.id,
                        user_id: user.id,
                        invited_email: user.email,
                        role: 'analyst',
                        status: 'active',
                        permissions: [],
                        invited_by: 'bulk_assignment_system',
                        join_date: new Date().toISOString()
                    });
                    successCount++;
                    console.log('[BULK ASSIGNMENT] Assigned user:', user.email);
                } catch (error) {
                    console.error('[BULK ASSIGNMENT] Failed to assign user:', user.email, error);
                }
            }

            setResult({
                success: true,
                message: `Successfully assigned ${successCount} out of ${unassignedUsers.length} users to Hack The SOC.`,
                count: successCount
            });

        } catch (error) {
            console.error('[BULK ASSIGNMENT] Error:', error);
            setResult({
                success: false,
                message: `Error during bulk assignment: ${error.message}`,
                count: 0
            });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-slate-900 min-h-screen">
            <div className="max-w-2xl mx-auto">
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-2xl text-white flex items-center gap-3">
                            <Users className="w-7 h-7 text-teal-400" />
                            Assign Unassigned Users
                        </CardTitle>
                        <p className="text-slate-400">
                            This tool will find all users not assigned to any tenant and assign them to "Hack The SOC".
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {!result && (
                            <Button 
                                onClick={handleBulkAssignment}
                                disabled={processing}
                                className="bg-teal-600 hover:bg-teal-700 w-full"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-4 h-4 mr-2" />
                                        Assign All Unassigned Users
                                    </>
                                )}
                            </Button>
                        )}

                        {result && (
                            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-900/50 border border-green-500/50' : 'bg-red-900/50 border border-red-500/50'}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {result.success ? (
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <Shield className="w-5 h-5 text-red-400" />
                                    )}
                                    <span className={`font-semibold ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                                        {result.success ? 'Success!' : 'Error'}
                                    </span>
                                </div>
                                <p className={result.success ? 'text-green-200' : 'text-red-200'}>
                                    {result.message}
                                </p>
                                {result.success && result.count > 0 && (
                                    <Button 
                                        onClick={() => window.location.reload()} 
                                        className="mt-4 bg-teal-600 hover:bg-teal-700"
                                    >
                                        Refresh Page
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}