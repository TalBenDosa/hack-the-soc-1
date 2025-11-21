import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Tenant, TenantUser } from '@/entities/all';
import { Loader2, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';

export default function AdminEnvironmentAccess() {
    const [loading, setLoading] = useState(true);
    const [accessResult, setAccessResult] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [tenantInfo, setTenantInfo] = useState(null);
    const location = useLocation();

    useEffect(() => {
        processEnvironmentAccess();
    }, []);

    const processEnvironmentAccess = async () => {
        try {
            console.log('[ADMIN ACCESS] Starting environment access process...');
            
            // Parse URL parameters
            const urlParams = new URLSearchParams(location.search);
            const envCode = urlParams.get('env');
            const tenantId = urlParams.get('tenant_id');
            const tenantName = urlParams.get('tenant_name');

            console.log('[ADMIN ACCESS] URL Parameters:', { envCode, tenantId, tenantName });

            if (!envCode || !tenantId) {
                setAccessResult({
                    success: false,
                    message: 'Invalid access link - missing required parameters',
                    details: 'This link appears to be malformed. Please contact your administrator.'
                });
                setLoading(false);
                return;
            }

            // Get current user
            let currentUser;
            try {
                currentUser = await User.me();
                console.log('[ADMIN ACCESS] Current user:', { id: currentUser.id, email: currentUser.email, role: currentUser.role });
                setUserInfo(currentUser);
            } catch (error) {
                console.log('[ADMIN ACCESS] User not authenticated, redirecting to login...');
                // Store the return URL for after login
                sessionStorage.setItem('admin_access_return_url', window.location.href);
                await User.loginWithRedirect(window.location.href);
                return;
            }

            // Verify tenant exists and is valid
            const tenant = await Tenant.filter({ id: tenantId, unique_invite_code: envCode });
            if (tenant.length === 0) {
                setAccessResult({
                    success: false,
                    message: 'Environment not found or access code invalid',
                    details: 'The environment you are trying to access does not exist or the access code is invalid.'
                });
                setLoading(false);
                return;
            }

            const targetTenant = tenant[0];
            setTenantInfo(targetTenant);
            console.log('[ADMIN ACCESS] Target tenant:', { id: targetTenant.id, name: targetTenant.name, status: targetTenant.status });

            // Check if tenant is active
            if (targetTenant.status !== 'active') {
                setAccessResult({
                    success: false,
                    message: `Environment "${targetTenant.name}" is currently ${targetTenant.status}`,
                    details: 'This environment is not currently active. Please contact support.'
                });
                setLoading(false);
                return;
            }

            // **ROLE DETECTION AND PERMISSION ASSIGNMENT**
            await assignUserPermissions(currentUser, targetTenant);

        } catch (error) {
            console.error('[ADMIN ACCESS] Error during access process:', error);
            setAccessResult({
                success: false,
                message: 'System error during access verification',
                details: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const assignUserPermissions = async (currentUser, targetTenant) => {
        console.log('[ADMIN ACCESS] Starting role detection and permission assignment...');

        // **LEVEL 1: SUPER ADMIN CHECK**
        if (currentUser.role === 'admin') {
            console.log('[ADMIN ACCESS] Super Admin detected - granting full system access');
            
            // Ensure Super Admin has a TenantUser record for this environment
            const existingSuperAdminRecord = await TenantUser.filter({
                tenant_id: targetTenant.id,
                user_id: currentUser.id
            });

            if (existingSuperAdminRecord.length === 0) {
                console.log('[ADMIN ACCESS] Creating TenantUser record for Super Admin');
                await TenantUser.create({
                    tenant_id: targetTenant.id,
                    user_id: currentUser.id,
                    invited_email: currentUser.email,
                    role: 'tenant_admin', // Give Super Admin full tenant admin rights
                    status: 'active',
                    permissions: ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students'],
                    invited_by: 'super_admin_access',
                    join_date: new Date().toISOString()
                });
            } else {
                console.log('[ADMIN ACCESS] Updating existing TenantUser record for Super Admin');
                await TenantUser.update(existingSuperAdminRecord[0].id, {
                    status: 'active',
                    role: 'tenant_admin',
                    permissions: ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students']
                });
            }

            setAccessResult({
                success: true,
                userRole: 'Super Admin',
                accessLevel: 'Full System Access',
                message: `Super Admin access granted to "${targetTenant.name}" environment`,
                details: 'You have full administrative privileges including Admin Panel access.',
                redirectTo: 'Dashboard', // Will redirect to main dashboard with full permissions
                tenantContext: targetTenant
            });
            return;
        }

        // **LEVEL 2: ENVIRONMENT ADMIN CHECK**
        if (currentUser.email.toLowerCase() === targetTenant.admin_email?.toLowerCase()) {
            console.log('[ADMIN ACCESS] Environment Admin detected by email match');
            
            // Check if admin already has a TenantUser record
            let existingAdminRecord = await TenantUser.filter({
                tenant_id: targetTenant.id,
                user_id: currentUser.id
            });

            // Also check by email in case user_id is not set yet
            if (existingAdminRecord.length === 0) {
                existingAdminRecord = await TenantUser.filter({
                    tenant_id: targetTenant.id,
                    invited_email: currentUser.email
                });
            }

            if (existingAdminRecord.length === 0) {
                console.log('[ADMIN ACCESS] Creating TenantUser record for Environment Admin');
                await TenantUser.create({
                    tenant_id: targetTenant.id,
                    user_id: currentUser.id,
                    invited_email: currentUser.email,
                    role: 'tenant_admin',
                    status: 'active',
                    permissions: ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students'],
                    invited_by: 'admin_access_link',
                    join_date: new Date().toISOString()
                });
            } else {
                console.log('[ADMIN ACCESS] Activating existing TenantUser record for Environment Admin');
                await TenantUser.update(existingAdminRecord[0].id, {
                    user_id: currentUser.id, // Link to current user if not already linked
                    status: 'active',
                    role: 'tenant_admin',
                    permissions: ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students']
                });
            }

            setAccessResult({
                success: true,
                userRole: 'Environment Admin',
                accessLevel: 'Administrative Access',
                message: `Environment Admin access granted to "${targetTenant.name}"`,
                details: 'You can create content, manage users, and configure your environment.',
                redirectTo: 'Admin', // Will redirect to Admin panel
                tenantContext: targetTenant
            });
            return;
        }

        // **LEVEL 3: EXISTING STUDENT/ANALYST CHECK**
        const existingTenantUser = await TenantUser.filter({
            tenant_id: targetTenant.id,
            user_id: currentUser.id,
            status: 'active'
        });

        if (existingTenantUser.length > 0) {
            console.log('[ADMIN ACCESS] Existing active user found');
            const tenantUser = existingTenantUser[0];
            
            setAccessResult({
                success: true,
                userRole: tenantUser.role === 'tenant_admin' ? 'Environment Admin' : 'Student/Analyst',
                accessLevel: tenantUser.role === 'tenant_admin' ? 'Administrative Access' : 'Learning Access',
                message: `Welcome back to "${targetTenant.name}"`,
                details: 'Redirecting you to your dashboard...',
                redirectTo: tenantUser.role === 'tenant_admin' ? 'Admin' : 'Dashboard',
                tenantContext: targetTenant
            });
            return;
        }

        // **LEVEL 4: NEW STUDENT/ANALYST (Default)**
        console.log('[ADMIN ACCESS] Creating new student/analyst access');
        await TenantUser.create({
            tenant_id: targetTenant.id,
            user_id: currentUser.id,
            invited_email: currentUser.email,
            role: 'analyst', // Default role for new users
            status: 'active',
            permissions: [], // Basic permissions based on tenant's feature access
            invited_by: 'admin_access_link',
            join_date: new Date().toISOString()
        });

        setAccessResult({
            success: true,
            userRole: 'Student/Analyst',
            accessLevel: 'Learning Access',
            message: `Welcome to "${targetTenant.name}"!`,
            details: 'You have been granted learning access to this environment.',
            redirectTo: 'Dashboard',
            tenantContext: targetTenant
        });
    };

    const handleRedirect = () => {
        if (accessResult?.redirectTo && accessResult?.tenantContext) {
            // Store tenant context for the session
            sessionStorage.setItem('current_tenant_context', JSON.stringify(accessResult.tenantContext));
            
            // Clear any existing admin access return URL
            sessionStorage.removeItem('admin_access_return_url');
            
            // Redirect to appropriate dashboard
            window.location.href = createPageUrl(accessResult.redirectTo);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-slate-800 border-slate-700">
                    <CardContent className="flex flex-col items-center justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-teal-400 mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">Verifying Access</h2>
                        <p className="text-slate-400 text-center">Checking your permissions and setting up your environment...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-white">
                        {accessResult?.success ? (
                            <CheckCircle2 className="h-6 w-6 text-green-400" />
                        ) : (
                            <AlertCircle className="h-6 w-6 text-red-400" />
                        )}
                        Environment Access
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {accessResult?.success ? (
                        <>
                            <div className="space-y-4">
                                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                                    <h3 className="text-green-400 font-semibold mb-2">Access Granted!</h3>
                                    <p className="text-white">{accessResult.message}</p>
                                </div>

                                {userInfo && (
                                    <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                                        <h4 className="text-white font-medium flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-teal-400" />
                                            Your Access Details
                                        </h4>
                                        <div className="text-sm space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">User:</span>
                                                <span className="text-white">{userInfo.full_name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Email:</span>
                                                <span className="text-white">{userInfo.email}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Role:</span>
                                                <span className="text-teal-400 font-medium">{accessResult.userRole}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">Access Level:</span>
                                                <span className="text-teal-400 font-medium">{accessResult.accessLevel}</span>
                                            </div>
                                            {tenantInfo && (
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Environment:</span>
                                                    <span className="text-white">{tenantInfo.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <p className="text-slate-300 text-sm">{accessResult.details}</p>
                            </div>

                            <Button 
                                onClick={handleRedirect} 
                                className="w-full bg-teal-600 hover:bg-teal-700"
                            >
                                Continue to Dashboard
                            </Button>
                        </>
                    ) : (
                        <>
                            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                                <h3 className="text-red-400 font-semibold mb-2">Access Denied</h3>
                                <p className="text-white mb-2">{accessResult?.message}</p>
                                <p className="text-slate-300 text-sm">{accessResult?.details}</p>
                            </div>

                            <div className="flex gap-3">
                                <Button 
                                    onClick={() => window.location.href = createPageUrl('Dashboard')} 
                                    variant="outline"
                                    className="flex-1 border-slate-600 text-slate-300"
                                >
                                    Go to Dashboard
                                </Button>
                                <Button 
                                    onClick={() => window.location.reload()} 
                                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                                >
                                    Try Again
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}