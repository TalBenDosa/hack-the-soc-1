
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Tenant, TenantUser, User, TenantSnapshot, Scenario, Lesson, Quiz, Investigation, UserProgress } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building, Plus, Edit, Users, Settings, RefreshCw, Loader2, MoreVertical, Link as LinkIcon, ShieldCheck, Trash2, Camera, Copy } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TenantEditor from '../components/admin/TenantEditor';
import TenantUserManagement from '../components/admin/TenantUserManagement';
import { RoleGuard } from '../components/auth/RoleBasedAccess';

// Lazy load new components for SuperAdmin
const SubscriptionManagement = lazy(() => import('../components/admin/SubscriptionManagement'));
const LegalDocumentManager = lazy(() => import('../components/admin/LegalDocumentManager'));
const DataRequestInbox = lazy(() => import('../components/admin/DataRequestInbox'));

const LoadingSpinner = () => (
    <div className="flex justify-center items-center p-10">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
    </div>
);

export default function SuperAdminDashboard() {
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingTenant, setEditingTenant] = useState(null);
    const [managingTenant, setManagingTenant] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingTenantId, setDeletingTenantId] = useState(null);
    const [creatingSnapshot, setCreatingSnapshot] = useState(null);
    const [cloningTenant, setCloningTenant] = useState(null);

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const tenantList = await Tenant.list('-created_date');
            
            const enrichedTenants = await Promise.all(tenantList.map(async (tenant) => {
                try {
                    // **FIX**: Count all users that are not 'removed' AND not duplicates to match user management view
                    const allTenantUsers = await TenantUser.filter({ tenant_id: tenant.id });
                    
                    // **CRITICAL FIX**: Filter out removed users and deduplicate by email
                    const activeTenantUsers = allTenantUsers.filter(tu => tu.status !== 'removed');
                    
                    // **NEW**: Deduplicate by email to get accurate count
                    const seenEmails = new Set();
                    let uniqueUserCount = 0;
                    
                    for (const tenantUser of activeTenantUsers) {
                        let userEmail = null;
                        
                        if (tenantUser.status === 'pending' && tenantUser.invited_email) {
                            userEmail = tenantUser.invited_email;
                        } else if (tenantUser.user_id) {
                            try {
                                const userDetails = await User.filter({ id: tenantUser.user_id });
                                if (userDetails && userDetails.length > 0) {
                                    userEmail = userDetails[0].email;
                                }
                            } catch (error) {
                                console.warn(`Could not fetch user details for ${tenantUser.user_id}:`, error);
                                // Use invited_email as fallback if user details cannot be fetched,
                                // assuming it might be a temporary issue or a record not fully linked yet.
                                userEmail = tenantUser.invited_email;
                            }
                        }
                        
                        // Only count if we haven't seen this email before
                        if (userEmail && !seenEmails.has(userEmail)) {
                            seenEmails.add(userEmail);
                            uniqueUserCount++;
                        }
                    }
                    
                    console.log(`[SUPER ADMIN] Tenant ${tenant.name}: ${allTenantUsers.length} total records, ${activeTenantUsers.length} non-removed, ${uniqueUserCount} unique users`);
                    
                    let contractStatus = 'active';
                    if (tenant.contract?.end_date) {
                        const endDate = new Date(tenant.contract.end_date);
                        const now = new Date();
                        if (endDate < now) {
                            contractStatus = 'expired';
                        } else if ((endDate - now) / (1000 * 60 * 60 * 24) <= 30) {
                            contractStatus = 'expiring_soon';
                        }
                    }
                    
                    return { 
                        ...tenant, 
                        user_count: uniqueUserCount, // **FIXED**: Now using accurate deduplicated count
                        contract_status: contractStatus 
                    };
                } catch (error) {
                    console.error(`Failed to enrich tenant ${tenant.id}:`, error);
                    return { ...tenant, user_count: 0, contract_status: 'unknown' };
                }
            }));
            
            setTenants(enrichedTenants); 
        } catch (error) {
            console.error("Failed to fetch tenants:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGetAdminInviteLink = async (tenant, prefilledEmail = null) => {
        console.log('[SUPER ADMIN] Creating admin link for tenant:', tenant.name, tenant.id);
        
        if (!tenant || !tenant.unique_invite_code) {
            alert(`Error: The client "${tenant?.name || 'Unknown'}" does not have a valid invite code.`);
            return;
        }

        // **NEW SIMPLE APPROACH**: Create a direct link to the environment
        const baseUrl = window.location.origin;
        const adminLink = `${baseUrl}/AdminEnvironmentAccess?env=${tenant.unique_invite_code}&tenant_id=${tenant.id}&tenant_name=${encodeURIComponent(tenant.name)}`;

        console.log('[SUPER ADMIN] Generated simple admin link:', {
            tenant_id: tenant.id,
            tenant_name: tenant.name,
            invite_code: tenant.unique_invite_code,
            generated_link: adminLink
        });

        const copyToClipboard = async (text) => {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (err) {
                console.error('Failed to copy to clipboard:', err);
                return false;
            }
        };

        // Show dialog with the link and copy option
        const dialogContent = `🔗 Environment Admin Access Link for "${tenant.name}":

${adminLink}

📋 INSTRUCTIONS:
• Send this link to the Environment Admin
• When they click it, the system will automatically:
  - Detect their role and permissions
  - Grant appropriate access level
  - Redirect them to the correct dashboard

🎯 AUTOMATIC ROLE DETECTION:
• Students → Student Dashboard
• Environment Admin → Admin Panel 
• Super Admin → Full System Access

Click OK to copy to clipboard.`;

        if (window.confirm(dialogContent)) {
            const success = await copyToClipboard(adminLink);
            if (success) {
                alert(`✅ Admin access link for "${tenant.name}" copied to clipboard!

📧 Send this link to: ${tenant.admin_email || 'the Environment Admin'}

🔄 When they access the link:
1. System detects their user role automatically
2. Assigns appropriate permissions
3. Redirects to correct dashboard`);
            } else {
                // Fallback - show in a text selection dialog
                window.prompt(`Copy this Admin Access Link for "${tenant.name}":`, adminLink);
            }
        }
    };

    const handleLoginAsClient = async (tenant) => {
        console.log('[SUPER ADMIN] *** STARTING LOGIN AS CLIENT ***');
        console.log('[SUPER ADMIN] Target tenant:', {
            id: tenant.id,
            name: tenant.name,
            domain: tenant.domain,
            unique_invite_code: tenant.unique_invite_code
        });
        
        const confirmMessage = `⚠️  CRITICAL CONFIRMATION ⚠️

Do you want to log in as SuperAdmin to the "${tenant.name}" environment?

TARGET TENANT DETAILS:
• Name: ${tenant.name}
• Domain: ${tenant.domain}  
• Tenant ID: ${tenant.id}
• Environment: ${tenant.environment_id || 'N/A'}

This will give you full access to THEIR tenant as if you were their admin.

Are you sure you want to proceed with "${tenant.name}"?`;
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            // CRITICAL FIX: Clear any existing impersonation session
            console.log('[SUPER ADMIN] Clearing existing sessions...');
            sessionStorage.removeItem('superadmin_impersonation');
            localStorage.removeItem('tenant_context'); // Clear tenant context from localStorage too
            
            // Store current context with SPECIFIC tenant details
            const impersonationData = {
                original_role: 'admin',
                target_tenant_id: tenant.id,
                target_tenant_name: tenant.name,
                target_tenant_domain: tenant.domain,
                impersonation_start: new Date().toISOString(),
                super_admin_email: 'Tal14997@gmail.com'
            };
            
            sessionStorage.setItem('superadmin_impersonation', JSON.stringify(impersonationData));
            console.log('[SUPER ADMIN] Stored impersonation data:', impersonationData);

            // Get current Super Admin user
            const currentUser = await User.me();
            
            console.log('[SUPER ADMIN] Current Super Admin user:', {
                id: currentUser.id,
                email: currentUser.email,
                role: currentUser.role
            });
            
            // CRITICAL: Check if SuperAdmin already has a record in THIS SPECIFIC tenant
            const existingSuperAdminRecord = await TenantUser.filter({
                tenant_id: tenant.id,
                user_id: currentUser.id
            });

            console.log('[SUPER ADMIN] Existing records for this tenant:', existingSuperAdminRecord);

            if (existingSuperAdminRecord.length === 0) {
                console.log('[SUPER ADMIN] Creating NEW TenantUser record for tenant:', tenant.id);
                const newTenantUser = await TenantUser.create({
                    tenant_id: tenant.id,
                    user_id: currentUser.id,
                    invited_email: currentUser.email,
                    role: 'tenant_admin', // Give SuperAdmin full tenant admin rights
                    status: 'active',
                    permissions: ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students'],
                    invited_by: 'superadmin_impersonation',
                    join_date: new Date().toISOString()
                });
                console.log('[SUPER ADMIN] Created TenantUser record:', newTenantUser);
            } else {
                console.log('[SUPER ADMIN] Updating existing TenantUser record for tenant:', tenant.id);
                // Update existing record to be active with full admin rights
                const updatedRecord = await TenantUser.update(existingSuperAdminRecord[0].id, {
                    status: 'active',
                    role: 'tenant_admin',
                    permissions: ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students'],
                    invited_by: 'superadmin_impersonation_update',
                    join_date: new Date().toISOString()
                });
                console.log('[SUPER ADMIN] Updated TenantUser record:', updatedRecord);
            }

            // Show success message with specific tenant details
            const successMessage = `✅ Successfully logged in as SuperAdmin to "${tenant.name}" environment.

TARGET ENVIRONMENT CONFIRMED:
• Client: ${tenant.name}
• Domain: ${tenant.domain}  
• Tenant ID: ${tenant.id}

🔄 You can return to the SuperAdmin dashboard anytime through the user menu.

Redirecting to ${tenant.name} environment now...`;

            alert(successMessage);
            
            // CRITICAL: Add a small delay to ensure the database operations complete
            setTimeout(() => {
                console.log('[SUPER ADMIN] Redirecting to main dashboard with tenant context...');
                // Redirect to the main dashboard which will now show the tenant context
                window.location.href = '/';
            }, 2000);
            
        } catch (error) {
            console.error('[SUPER ADMIN] CRITICAL ERROR during login as client:', error);
            alert(`❌ CRITICAL ERROR: Failed to login to client environment: ${error.message}\n\nPlease check the console for more details and try again.`);
            
            // Clean up on error
            sessionStorage.removeItem('superadmin_impersonation');
            localStorage.removeItem('tenant_context');
        }
    };

    const handleAddNew = () => {
        setEditingTenant(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (tenant) => {
        setEditingTenant(tenant);
        setIsEditorOpen(true);
    };

    const handleManage = (tenant) => {
        setManagingTenant(tenant);
    };

    const handleDeleteTenant = async (tenant) => {
        const confirmMessage = `Are you sure you want to permanently delete the client "${tenant.name}"?

This action is IRREVERSIBLE and will delete all associated users, content, and data.`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        setDeletingTenantId(tenant.id);
        try {
            // Step 1: Delete all TenantUser records
            console.log('Deleting tenant users...');
            const tenantUsers = await TenantUser.filter({ tenant_id: tenant.id });
            for (const tenantUser of tenantUsers) {
                await TenantUser.delete(tenantUser.id);
            }

            // Step 2: Delete related data (scenarios, lessons, etc.)
            // Note: We'll let the database cascade handle most relationships
            console.log('Deleting related content...');
            
            // Step 3: Finally delete the tenant itself
            console.log('Deleting tenant...');
            await Tenant.delete(tenant.id);

            alert(`✅ Client "${tenant.name}" has been permanently deleted along with all associated data.`);
            
            // Refresh the tenants list
            fetchTenants();

        } catch (error) {
            console.error("Failed to delete tenant:", error);
            alert(`❌ Failed to delete client: ${error.message}\n\nPlease contact technical support if this issue persists.`);
        } finally {
            setDeletingTenantId(null);
        }
    };

    const handleCreateSnapshot = async (tenant) => {
        const snapshotName = window.prompt(
            `Create snapshot for "${tenant.name}":\n\nEnter snapshot name:`,
            `${tenant.name}_snapshot_${new Date().toISOString().split('T')[0]}`
        );
        
        if (!snapshotName || !snapshotName.trim()) {
            return;
        }

        setCreatingSnapshot(tenant.id);
        
        try {
            console.log('[BACKUP] Creating snapshot for tenant:', tenant.name);
            
            // Get all tenant-related data
            const tenantUsers = await TenantUser.filter({ tenant_id: tenant.id });
            const scenarios = await Scenario.filter({ tenant_id: tenant.id });
            const lessons = await Lesson.list(); // Assuming lessons might be global
            const quizzes = await Quiz.list(); // Assuming quizzes might be global
            const investigations = await Investigation.filter({ tenant_id: tenant.id });
            const userProgressRecords = await UserProgress.filter({ tenant_id: tenant.id });
            
            // Create the snapshot record
            const snapshotData = {
                tenant_id: tenant.id,
                snapshot_name: snapshotName.trim(),
                snapshot_type: 'manual',
                tenant_data: tenant,
                users_data: tenantUsers,
                content_data: {
                    scenarios: scenarios || [],
                    lessons: lessons || [],
                    quizzes: quizzes || [],
                    log_templates: [], // Will be implemented later
                    investigations: investigations || [],
                    user_progress: userProgressRecords || []
                },
                file_size_mb: Math.round((JSON.stringify({ tenant, tenantUsers, scenarios, lessons, quizzes, investigations, userProgressRecords }).length) / 1024 / 1024 * 100) / 100,
                status: 'completed',
                created_by_email: 'Tal14997@gmail.14997@gmail.com',
                creation_duration_seconds: 3, // Simulated
                notes: `Manual snapshot created via SuperAdmin Dashboard`
            };

            await TenantSnapshot.create(snapshotData);
            
            alert(`✅ Snapshot "${snapshotName}" created successfully for "${tenant.name}"!\n\nSnapshot size: ${snapshotData.file_size_mb} MB\nIncludes: ${tenantUsers.length} users, ${scenarios.length} scenarios, ${investigations.length} investigations`);
            
        } catch (error) {
            console.error('[BACKUP] Failed to create snapshot:', error);
            alert(`❌ Failed to create snapshot: ${error.message}`);
        } finally {
            setCreatingSnapshot(null);
        }
    };

    const handleCloneTenant = async (sourceTenant) => {
        const cloneName = window.prompt(
            `Clone "${sourceTenant.name}" to new environment:\n\nEnter new client name:`,
            `${sourceTenant.name} (Clone)`
        );
        
        if (!cloneName || !cloneName.trim()) {
            return;
        }

        const cloneDomain = window.prompt(
            `Enter domain for cloned client:`,
            `${sourceTenant.domain.replace(/\./g, '-clone.')}`
        );
        
        if (!cloneDomain || !cloneDomain.trim()) {
            return;
        }

        setCloningTenant(sourceTenant.id);
        
        try {
            console.log('[CLONE] Cloning tenant:', sourceTenant.name, 'to:', cloneName);
            
            // Get all source tenant data (only what will be cloned/referenced)
            const tenantUsers = await TenantUser.filter({ tenant_id: sourceTenant.id }); // For statistics in alert
            const scenarios = await Scenario.filter({ tenant_id: sourceTenant.id });
            const investigations = await Investigation.filter({ tenant_id: sourceTenant.id }); // For statistics in alert
            
            // Create new tenant with cloned data
            const uniqueCode = `${cloneName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
            const environmentId = `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const clonedTenantData = {
                ...sourceTenant,
                name: cloneName.trim(),
                domain: cloneDomain.trim(),
                unique_invite_code: uniqueCode,
                environment_id: environmentId,
                admin_email: '', // Clear admin email - will need to be set
                // Keep same subscription tier and feature access
                subscription_tier: sourceTenant.subscription_tier,
                feature_access: sourceTenant.feature_access,
                status: 'draft' // Start as draft until configured
            };
            
            // Remove the ID so it creates a new record
            delete clonedTenantData.id;
            delete clonedTenantData.created_date;
            delete clonedTenantData.updated_date;
            delete clonedTenantData.created_by;
            
            // Ensure no existing contract/subscription IDs are carried over if they are unique
            if (clonedTenantData.contract && clonedTenantData.contract.id) {
                delete clonedTenantData.contract.id;
            }
            if (clonedTenantData.subscription && clonedTenantData.subscription.id) {
                delete clonedTenantData.subscription.id;
            }

            const newTenant = await Tenant.create(clonedTenantData);
            console.log('[CLONE] Created new tenant:', newTenant.id);

            // Clone scenarios
            let clonedScenariosCount = 0;
            for (const scenario of scenarios) {
                const clonedScenario = {
                    ...scenario,
                    tenant_id: newTenant.id,
                    title: `${scenario.title} (Cloned)`
                };
                delete clonedScenario.id;
                delete clonedScenario.created_date;
                delete clonedScenario.updated_date;
                delete clonedScenario.created_by;
                
                await Scenario.create(clonedScenario);
                clonedScenariosCount++;
            }

            alert(`✅ Successfully cloned "${sourceTenant.name}" to "${cloneName}"!\n\n📊 Cloning Summary:\n• New Tenant ID: ${newTenant.id}\n• Cloned Scenarios: ${clonedScenariosCount}\n• Original Users: ${tenantUsers.length} (not cloned)\n\n⚠️ Important:\n• Status: Draft (activate when ready)\n• Admin Email: Not set (please configure)\n• Users: Need to be invited separately\n• Investigations: Not cloned (tenant-specific data)`);
            
            // Refresh the tenant list
            fetchTenants();
            
        } catch (error) {
            console.error('[CLONE] Failed to clone tenant:', error);
            alert(`❌ Failed to clone tenant: ${error.message}`);
        } finally {
            setCloningTenant(null);
        }
    };

    const generateFeatureAccess = (tier) => {
        const tierFeatures = {
            basic: {
                dashboard_logs: true,
                theoretical_lessons: true,
                quizzes: false,
                scenarios: false,
                progress_tracking: true,
                certificates: false
            },
            intermediate: {
                dashboard_logs: true,
                theoretical_lessons: true,
                quizzes: true,
                scenarios: false,
                progress_tracking: true,
                certificates: true
            },
            full: {
                dashboard_logs: true,
                theoretical_lessons: true,
                quizzes: true,
                scenarios: true,
                progress_tracking: true,
                certificates: true,
                custom_scenarios: true
            }
        };
        return tierFeatures[tier] || tierFeatures.basic;
    };
    
    const handleSave = async (tenantData) => {
        setIsSaving(true);
        try {
            if (editingTenant) {
                // Update existing tenant
                await Tenant.update(editingTenant.id, tenantData);
                alert(`✅ Environment "${tenantData.name}" updated successfully!`);
            } else {
                // Create new tenant with complete workflow
                const uniqueCode = `${tenantData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
                const environmentId = `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Generate feature access based on subscription tier
                const featureAccess = generateFeatureAccess(tenantData.subscription_tier);

                const newTenantData = {
                    ...tenantData,
                    unique_invite_code: uniqueCode,
                    environment_id: environmentId,
                    feature_access: featureAccess,
                    status: 'active' // New environments start as active
                };
                
                const newTenant = await Tenant.create(newTenantData);
                console.log('[SUPER ADMIN] Created new tenant:', newTenant.id);

                // **NEW**: Streamlined Admin Setup Process
                if (tenantData.admin_email) {
                    console.log('[SUPER ADMIN] Setting up Environment Admin for:', tenantData.admin_email);
                    
                    // Create TenantUser record in "pending" state
                    await TenantUser.create({
                        tenant_id: newTenant.id,
                        invited_email: tenantData.admin_email,
                        role: 'tenant_admin',
                        status: 'pending', // Will be activated when they accept the secure invitation
                        invited_by: 'superadmin_setup',
                        permissions: ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students']
                    });

                    // **NEW**: Automatically prompt for secure invitation creation
                    const createInvitationNow = window.confirm(`✅ Environment "${newTenantData.name}" created successfully!

📧 Environment Admin: ${tenantData.admin_email}
🔧 Features: ${tenantData.subscription_tier} subscription
🌐 Domain: ${tenantData.domain}
🆔 Environment ID: ${environmentId}

Would you like to create a secure admin invitation link now?
This will generate a secure, time-limited link for ${tenantData.admin_email} to set up their admin access.`);

                    if (createInvitationNow) {
                        // Automatically trigger the secure invitation process
                        await handleGetAdminInviteLink(newTenant, tenantData.admin_email);
                    } else {
                        alert(`🎉 Environment "${newTenantData.name}" is ready!

You can create the admin invitation link later from the tenant management panel.`);
                    }
                } else {
                    alert(`✅ Environment "${newTenantData.name}" created successfully!\n\n⚠️  No Environment Admin email was provided. You can add an admin later.`);
                }
            }

            fetchTenants(); // Refresh the list
            setIsEditorOpen(false);
            setEditingTenant(null);
        } catch (error) {
            console.error("Failed to save tenant:", error);
            alert(`❌ Failed to save environment: ${error.message}\n\nPlease check the data and try again.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (tenant, newStatus) => {
        try {
            await Tenant.update(tenant.id, { status: newStatus });
            fetchTenants();
        } catch (error) {
            console.error("Failed to update tenant status:", error);
        }
    };

    const getSubscriptionBadge = (tier) => {
        let className = "bg-gray-500/20 text-gray-400";
        switch (tier) {
            case 'basic':
                className = "bg-blue-500/20 text-blue-400";
                break;
            case 'intermediate':
                className = "bg-purple-500/20 text-purple-400";
                break;
            case 'full':
                className = "bg-green-500/20 text-green-400";
                break;
            case 'trial':
                className = "bg-yellow-500/20 text-yellow-400";
                break;
            default:
                className = "bg-gray-500/20 text-gray-400";
        }
        return <Badge className={className}>{tier}</Badge>;
    };

    const getContractStatusBadge = (status) => {
        let className = "bg-gray-500/20 text-gray-400";
        let text = status;
        switch (status) {
            case 'active':
                className = "bg-green-500/20 text-green-400";
                break;
            case 'expired':
                className = "bg-red-500/20 text-red-400";
                text = "Expired";
                break;
            case 'expiring_soon':
                className = "bg-yellow-500/20 text-yellow-400";
                text = "Expiring Soon";
                break;
            case 'unknown':
                className = "bg-gray-500/20 text-gray-400";
                text = "Unknown";
                break;
            default:
                break;
        }
        return <Badge className={className}>{text}</Badge>;
    };
    
    if (managingTenant) {
        return (
            <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white">
                <Button onClick={() => setManagingTenant(null)} className="mb-4">
                    &larr; Back to All Tenants
                </Button>
                <TenantUserManagement tenant={managingTenant} />
            </div>
        );
    }

    return (
        <RoleGuard permission="super_admin_access">
            <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
                                <ShieldCheck className="w-8 h-8 text-teal-400"/>
                                SuperAdmin Dashboard
                            </h1>
                            <p className="text-slate-400">Global oversight of all B2B clients and system settings.</p>
                        </div>
                        <Button onClick={fetchTenants} variant="outline" className="border-slate-600 text-slate-300 self-start md:self-auto" disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh Data
                        </Button>
                    </div>

                    <Tabs defaultValue="client-management" className="space-y-6">
                        <TabsList className="bg-slate-800 border-slate-700">
                            <TabsTrigger value="client-management">Client Management</TabsTrigger>
                            <TabsTrigger value="backup-recovery">Backup & Recovery</TabsTrigger>
                            <TabsTrigger value="subscription-management">Subscription Management</TabsTrigger>
                            <TabsTrigger value="legal-privacy">Legal & Privacy</TabsTrigger>
                        </TabsList>

                        <Suspense fallback={<LoadingSpinner />}>
                            <TabsContent value="client-management">
                                <Card className="bg-slate-800 border-slate-700">
                                    <CardHeader>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                                    <Building className="w-5 h-5 text-teal-400" />
                                                    B2B Client Management
                                                </CardTitle>
                                                <CardDescription className="text-slate-400 mt-1">
                                                    Create, edit, and manage all client environments.
                                                </CardDescription>
                                            </div>
                                            <Button onClick={handleAddNew} className="bg-teal-600 hover:bg-teal-700">
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add New Client
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {loading ? (
                                            <div className="flex justify-center items-center py-20">
                                                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                                            </div>
                                        ) : tenants.length === 0 ? (
                                            <div className="text-center py-8 text-slate-400">No B2B clients found. Create your first client to get started.</div>
                                        ) : (
                                            <div className="overflow-x-auto border border-slate-700 rounded-lg">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
                                                            <TableHead className="text-slate-300">Client Name</TableHead>
                                                            <TableHead className="text-slate-300">Status</TableHead>
                                                            <TableHead className="text-slate-300">Subscription</TableHead>
                                                            <TableHead className="text-slate-300">Users</TableHead>
                                                            <TableHead className="text-slate-300">Contract</TableHead>
                                                            <TableHead className="text-slate-300 text-right">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {tenants.map(tenant => (
                                                            <TableRow key={tenant.id} className="border-b-slate-800 hover:bg-slate-700/30">
                                                                <TableCell>
                                                                    <div className="font-bold text-white">{tenant.name}</div>
                                                                    <div className="text-sm text-slate-400">{tenant.domain}</div>
                                                                    {tenant.admin_email && <div className="text-xs text-teal-400/80 mt-1">{tenant.admin_email}</div>}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge className={tenant.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                                                                        {tenant.status}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>{getSubscriptionBadge(tenant.subscription_tier)}</TableCell>
                                                                <TableCell className="text-white">{tenant.user_count}</TableCell>
                                                                <TableCell>{getContractStatusBadge(tenant.contract_status)}</TableCell>
                                                                <TableCell className="text-right">
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                                                                {deletingTenantId === tenant.id || creatingSnapshot === tenant.id || cloningTenant === tenant.id ? (
                                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                                ) : (
                                                                                    <MoreVertical className="w-4 h-4" />
                                                                                )}
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
                                                                            <DropdownMenuItem onClick={() => handleLoginAsClient(tenant)} className="hover:bg-slate-700 cursor-pointer">
                                                                                <ShieldCheck className="w-4 h-4 mr-2" /> 
                                                                                Login as Client
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handleEdit(tenant)} className="hover:bg-slate-700 cursor-pointer">
                                                                                <Edit className="w-4 h-4 mr-2" /> 
                                                                                Edit Environment
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handleManage(tenant)} className="hover:bg-slate-700 cursor-pointer">
                                                                                <Users className="w-4 h-4 mr-2" /> 
                                                                                Manage Users
                                                                            </DropdownMenuItem>
                                                                            
                                                                            <DropdownMenuItem onClick={() => handleGetAdminInviteLink(tenant)} className="hover:bg-slate-700 cursor-pointer">
                                                                                <LinkIcon className="w-4 h-4 mr-2" /> 
                                                                                Create Admin Access Link
                                                                            </DropdownMenuItem>
                                                                            
                                                                            {/* Backup & Clone options */}
                                                                            <div className="border-t border-slate-600 my-1"></div>
                                                                            <DropdownMenuItem 
                                                                                onClick={() => handleCreateSnapshot(tenant)} 
                                                                                className="hover:bg-blue-900/50 cursor-pointer text-blue-300"
                                                                                disabled={creatingSnapshot === tenant.id}
                                                                            >
                                                                                {creatingSnapshot === tenant.id ? (
                                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                                ) : (
                                                                                    <Camera className="w-4 h-4 mr-2" />
                                                                                )}
                                                                                {creatingSnapshot === tenant.id ? 'Creating...' : 'Create Snapshot'}
                                                                            </DropdownMenuItem>
                                                                            
                                                                            <DropdownMenuItem 
                                                                                onClick={() => handleCloneTenant(tenant)} 
                                                                                className="hover:bg-green-900/50 cursor-pointer text-green-300"
                                                                                disabled={cloningTenant === tenant.id}
                                                                            >
                                                                                {cloningTenant === tenant.id ? (
                                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                                ) : (
                                                                                    <Copy className="w-4 h-4 mr-2" />
                                                                                )}
                                                                                {cloningTenant === tenant.id ? 'Cloning...' : 'Clone Environment'}
                                                                            </DropdownMenuItem>
                                                                            
                                                                            {/* Status and deletion */}
                                                                            <div className="border-t border-slate-600 my-1"></div>
                                                                            <DropdownMenuItem onClick={() => handleStatusChange(tenant, tenant.status === 'active' ? 'suspended' : 'active')} className="hover:bg-slate-700 cursor-pointer">
                                                                                <Settings className="w-4 h-4 mr-2" />
                                                                                {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                                                                            </DropdownMenuItem>
                                                                            
                                                                            <DropdownMenuItem 
                                                                                onClick={() => handleDeleteTenant(tenant)} 
                                                                                className="hover:bg-red-900/50 cursor-pointer text-red-400 hover:text-red-300"
                                                                                disabled={deletingTenantId === tenant.id}
                                                                            >
                                                                                <Trash2 className="w-4 h-4 mr-2" /> 
                                                                                {deletingTenantId === tenant.id ? 'Deleting...' : 'Delete Environment'}
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            
                            <TabsContent value="backup-recovery">
                                <iframe
                                    src="/BackupRecoveryDashboard"
                                    className="w-full h-screen border border-slate-700 rounded-lg"
                                    title="Backup & Recovery Dashboard"
                                />
                            </TabsContent>

                            <TabsContent value="subscription-management">
                                <SubscriptionManagement />
                            </TabsContent>

                            <TabsContent value="legal-privacy">
                                <div className="space-y-6">
                                    <LegalDocumentManager />
                                    <DataRequestInbox />
                                </div>
                            </TabsContent>
                        </Suspense>

                    </Tabs>

                    {isEditorOpen && (
                        <TenantEditor 
                            isOpen={isEditorOpen}
                            tenant={editingTenant}
                            onClose={() => setIsEditorOpen(false)}
                            onSave={handleSave}
                            loading={isSaving}
                        />
                    )}
                </div>
            </div>
        </RoleGuard>
    );
}
