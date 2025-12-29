import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Tenant, TenantUser } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, AlertTriangle, Loader2, UserPlus, Crown } from 'lucide-react';

export default function JoinTenant() {
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [result, setResult] = useState(null);
    const [tenantInfo, setTenantInfo] = useState(null);
    const [userRole, setUserRole] = useState(null); // This state variable is declared but not explicitly used in the provided logic.
    const navigate = useNavigate();

    useEffect(() => {
        const initializeJoin = async () => {
            try {
                // Try to get user first - if not logged in, redirect to login with return URL
                const currentUser = await User.me();
                if (!currentUser) {
                    // Save current URL to return after login
                    const returnUrl = window.location.hash || window.location.pathname + window.location.search;
                    console.log('[JOIN TENANT] User not logged in, redirecting to login with return URL:', returnUrl);
                    window.location.href = `/?return=${encodeURIComponent(returnUrl)}`;
                    return;
                }
                
                // User is logged in, process the invitation
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const isAdmin = urlParams.get('admin') === 'true';
                const tenantName = urlParams.get('tenant_name');
                
                console.log('[JOIN TENANT] URL Params:', { code, isAdmin, tenantName });
                
                if (!code) {
                    setResult({ success: false, message: 'Invalid invitation link - missing code parameter.' });
                    setLoading(false);
                    return;
                }

                handleJoinTenant(code, isAdmin, tenantName);
            } catch (error) {
                console.error('[JOIN TENANT] Initialization error:', error);
                // User not logged in, redirect to login
                const returnUrl = window.location.hash || window.location.pathname + window.location.search;
                window.location.href = `/?return=${encodeURIComponent(returnUrl)}`;
            }
        };
        
        initializeJoin();
    }, []);

    const handleJoinTenant = async (code, isAdmin, expectedTenantName) => {
        try {
            setLoading(true);
            console.log('[JOIN TENANT] Processing invitation with code:', code, 'Admin:', isAdmin, 'Expected tenant:', expectedTenantName);

            // Get current user
            const currentUser = await User.me();
            if (!currentUser) {
                setResult({ success: false, message: 'You must be logged in to join a tenant.' });
                setLoading(false);
                return;
            }

            console.log('[JOIN TENANT] Current user:', currentUser.email, 'Role:', currentUser.role);

            // **CRITICAL FIX**: Find tenant by invite code AND validate it matches expected tenant
            const tenants = await Tenant.filter({ unique_invite_code: code });
            if (tenants.length === 0) {
                setResult({ success: false, message: 'Invalid or expired invitation code.' });
                setLoading(false);
                return;
            }

            const tenant = tenants[0];
            setTenantInfo(tenant);
            
            // **VALIDATION**: If expected tenant name is provided, verify it matches
            if (expectedTenantName && tenant.name !== decodeURIComponent(expectedTenantName)) {
                console.error('[JOIN TENANT] TENANT MISMATCH!', {
                    expected: decodeURIComponent(expectedTenantName),
                    actual: tenant.name,
                    tenant_id: tenant.id
                });
                
                setResult({ 
                    success: false, 
                    message: `CRITICAL ERROR: Tenant mismatch detected!\n\nExpected: ${decodeURIComponent(expectedTenantName)}\nActual: ${tenant.name}\n\nThis link may be compromised or incorrect.` 
                });
                setLoading(false);
                return;
            }

            console.log('[JOIN TENANT] ✅ VERIFIED - Found correct tenant:', {
                id: tenant.id,
                name: tenant.name,
                domain: tenant.domain,
                code: tenant.unique_invite_code
            });

            // Check if user is already in this specific tenant
            const existingTenantUser = await TenantUser.filter({ 
                tenant_id: tenant.id, 
                user_id: currentUser.id 
            });

            // If user is Super Admin (global admin), allow access to any tenant
            if (currentUser.role === 'admin' && currentUser.email === 'Tal14997@gmail.com') {
                console.log('[JOIN TENANT] ✅ Super Admin detected - processing access for tenant:', tenant.name);
                
                if (existingTenantUser.length > 0) {
                    // Update existing record to ensure admin privileges
                    await TenantUser.update(existingTenantUser[0].id, {
                        role: 'tenant_admin',
                        status: 'active',
                        permissions: ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students'],
                        invited_by: 'superadmin_join_link_access',
                        join_date: new Date().toISOString()
                    });
                    
                    console.log('[JOIN TENANT] ✅ Updated Super Admin access for tenant:', tenant.name);
                } else {
                    // Create new tenant user record for this specific tenant
                    await TenantUser.create({
                        tenant_id: tenant.id,
                        user_id: currentUser.id,
                        invited_email: currentUser.email,
                        role: 'tenant_admin',
                        status: 'active',
                        permissions: ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students'],
                        invited_by: 'superadmin_join_link_access',
                        join_date: new Date().toISOString()
                    });
                    
                    console.log('[JOIN TENANT] ✅ Created Super Admin access for tenant:', tenant.name);
                }

                setResult({
                    success: true,
                    message: `✅ Super Admin access granted to "${tenant.name}" environment.\n\nTenant Details:\n• Name: ${tenant.name}\n• Domain: ${tenant.domain}\n• ID: ${tenant.id}\n\nYou now have full admin privileges in this specific tenant.`,
                    redirect: true,
                    role: 'Super Admin',
                    tenantInfo: tenant
                });
                setLoading(false);
                return;
            }

            // For regular users - handle normal tenant assignment
            if (existingTenantUser.length > 0) {
                const existing = existingTenantUser[0];
                
                // If user is already active in this tenant
                if (existing.status === 'active') {
                    setResult({
                        success: true,
                        message: `You are already a member of "${tenant.name}".`,
                        redirect: true,
                        role: existing.role === 'tenant_admin' ? 'Environment Admin' : 'Student/Analyst'
                    });
                    setLoading(false);
                    return;
                }

                // If user was previously inactive/removed, reactivate them
                const newRole = isAdmin ? 'tenant_admin' : 'analyst';
                const permissions = isAdmin ? ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students'] : [];

                await TenantUser.update(existing.id, {
                    role: newRole,
                    status: 'active',
                    permissions: permissions,
                    join_date: new Date().toISOString()
                });

                setResult({
                    success: true,
                    message: `Welcome back to "${tenant.name}"! Your access has been restored.`,
                    redirect: true,
                    role: isAdmin ? 'Environment Admin' : 'Student/Analyst'
                });
                setLoading(false);
                return;
            }

            // For regular users - check if they're in OTHER tenants and this might be a conflict
            const otherTenantUsers = await TenantUser.filter({ user_id: currentUser.id });
            const activeTenantUsers = otherTenantUsers.filter(tu => tu.status === 'active');
            
            // For regular users (non-super admin), warn if they're joining multiple tenants
            if (activeTenantUsers.length > 0 && !isAdmin) {
                const otherTenants = [];
                for (const tu of activeTenantUsers) {
                    const otherTenant = await Tenant.filter({ id: tu.tenant_id });
                    if (otherTenant.length > 0) {
                        otherTenants.push(otherTenant[0].name);
                    }
                }
                
                console.log('[JOIN TENANT] Warning: Regular user joining multiple tenants:', otherTenants);
                // For now, we'll allow it but show a warning
                setResult({
                    success: false,
                    message: `You are already active in: ${otherTenants.join(', ')}. Please contact your administrator if you need access to multiple environments.`,
                    showLogout: true // This is not directly used in the render logic, but will cause success=false to display the logout button.
                });
                setLoading(false);
                return;
            }

            // Create new tenant user record for regular users
            const targetRole = isAdmin ? 'tenant_admin' : 'analyst';
            const targetPermissions = isAdmin ? ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students'] : [];
            
            await TenantUser.create({
                tenant_id: tenant.id,
                user_id: currentUser.id,
                invited_email: currentUser.email,
                role: targetRole,
                status: 'active',
                permissions: targetPermissions,
                invited_by: 'invite_link',
                join_date: new Date().toISOString()
            });

            setResult({
                success: true,
                message: `Successfully joined "${tenant.name}" as ${isAdmin ? 'Environment Admin' : 'Student/Analyst'}.`,
                redirect: true,
                role: isAdmin ? 'Environment Admin' : 'Student/Analyst'
            });

        } catch (error) {
            console.error('[JOIN TENANT] CRITICAL ERROR during tenant join:', error);
            setResult({ 
                success: false, 
                message: `Critical error during tenant join: ${error.message}\n\nExpected Tenant: ${expectedTenantName || 'N/A'}\nInvite Code: ${code}` 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRedirect = () => {
        setJoining(true);
        // Redirect to main dashboard
        window.location.href = '/';
    };

    const handleLogout = async () => {
        try {
            await User.logout();
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-slate-800 border-slate-700">
                    <CardContent className="p-8 text-center">
                        <Loader2 className="w-12 h-12 animate-spin text-teal-400 mx-auto mb-4" />
                        <p className="text-white text-lg">Processing invitation...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-slate-800 border-slate-700">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        {result?.success ? (
                            <div className="bg-green-500/20 p-3 rounded-full">
                                {result.role === 'Super Admin' ? ( // Updated from 'Super Admin (Multi-Tenant)'
                                    <Crown className="w-8 h-8 text-yellow-400" />
                                ) : (
                                    <CheckCircle className="w-8 h-8 text-green-400" />
                                )}
                            </div>
                        ) : (
                            <div className="bg-red-500/20 p-3 rounded-full">
                                <AlertTriangle className="w-8 h-8 text-red-400" />
                            </div>
                        )}
                    </div>
                    <CardTitle className={`text-2xl ${result?.success ? 'text-green-300' : 'text-red-300'}`}>
                        {result?.success ? 'Access Granted!' : 'Access Denied'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center">
                        <p className={`text-lg mb-4 ${result?.success ? 'text-slate-300' : 'text-slate-300'}`}>
                            {result?.message}
                        </p>

                        {tenantInfo && result?.success && (
                            <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <Shield className="w-5 h-5 text-teal-400" />
                                    <span className="font-semibold text-white">{tenantInfo.name}</span>
                                </div>
                                <p className="text-sm text-slate-400">
                                    Role: <span className="text-teal-300 font-medium">{result.role}</span>
                                </p>
                                {/* Updated conditional check for admin role display */}
                                {(result.role === 'Environment Admin' || result.role === 'Super Admin') && (
                                    <p className="text-xs text-yellow-300 mt-2">
                                        You have full administrative access to this environment.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-3">
                        {result?.success && result?.redirect ? (
                            <Button 
                                onClick={handleRedirect}
                                className="w-full bg-teal-600 hover:bg-teal-700"
                                disabled={joining}
                            >
                                {joining ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Entering Environment...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Enter Environment
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button 
                                onClick={handleLogout}
                                className="w-full bg-slate-600 hover:bg-slate-700"
                            >
                                Logout and Return to Login
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}