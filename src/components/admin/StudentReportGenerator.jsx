
import React, { useState, useEffect, useCallback } from 'react';
import { User, TenantUser, Tenant } from '@/entities/all';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FileText, Loader2 } from 'lucide-react';

export default function StudentReportGenerator({ tenantContext, onClose }) {
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [currentTenant, setCurrentTenant] = useState(null);

    const loadTenantInfo = useCallback(async () => {
        try {
            if (!tenantContext) {
                console.warn("[STUDENT REPORT GENERATOR] No tenant context available.");
                return;
            }

            // Get current user to determine context
            const currentUser = await User.me();
            console.log('[STUDENT REPORT GENERATOR] Current user:', currentUser.email, 'Role:', currentUser.role);

            let finalTenantContext = null;

            if (currentUser.role === 'admin') {
                // Super Admin - check for impersonation context
                const impersonationData = sessionStorage.getItem('superadmin_impersonation');
                if (impersonationData) {
                    try {
                        const impersonation = JSON.parse(impersonationData);
                        const targetTenantId = impersonation.target_tenant_id;
                        console.log('[STUDENT REPORT GENERATOR] Super Admin impersonating tenant:', targetTenantId);
                        
                        const tenants = await Tenant.filter({ id: targetTenantId });
                        if (tenants.length > 0) {
                            const tenant = tenants[0];
                            setCurrentTenant(tenant);
                            finalTenantContext = {
                                tenant_id: targetTenantId,
                                tenant: tenant,
                                role: 'tenant_admin'
                            };
                            console.log('[STUDENT REPORT GENERATOR] Using impersonation tenant context:', tenant.name);
                        }
                    } catch (error) {
                        console.error('[STUDENT REPORT GENERATOR] Error parsing impersonation data:', error);
                    }
                }
            } else {
                // Regular user - get their tenant context
                const tenantUsers = await TenantUser.filter({ 
                    user_id: currentUser.id, 
                    status: 'active' 
                });
                
                if (tenantUsers.length > 0) {
                    const tenantUser = tenantUsers[0];
                    const tenants = await Tenant.filter({ id: tenantUser.tenant_id });
                    if (tenants.length > 0) {
                        const tenant = tenants[0];
                        setCurrentTenant(tenant);
                        finalTenantContext = {
                            tenant_id: tenantUser.tenant_id,
                            tenant: tenant,
                            role: tenantUser.role
                        };
                        console.log('[STUDENT REPORT GENERATOR] Using regular user tenant context:', tenant.name);
                    }
                }
            }

            return finalTenantContext;
        } catch (error) {
            console.error('[STUDENT REPORT GENERATOR] Error loading tenant info:', error);
            return null;
        }
    }, [tenantContext]);

    // Use the EXACT same filtering logic as UserManagement to ensure consistency
    const loadUsersData = useCallback(async (tenantContextData) => {
        try {
            if (!tenantContextData || !tenantContextData.tenant_id) {
                console.warn('[STUDENT REPORT GENERATOR] No valid tenant context for loading users.');
                return [];
            }

            console.log('[STUDENT REPORT GENERATOR] Loading users for tenant:', tenantContextData.tenant?.name || tenantContextData.tenant_id);
            
            // Get all TenantUser records for this tenant (excluding removed ones)
            const tenantUsers = await TenantUser.filter({ 
                tenant_id: tenantContextData.tenant_id
            });
            const activeTenantUsers = tenantUsers.filter(tu => tu.status !== 'removed');
            
            console.log(`[STUDENT REPORT GENERATOR] Found ${activeTenantUsers.length} non-removed users for tenant ${tenantContextData.tenant?.name || tenantContextData.tenant_id}`);
            
            // **CRITICAL SECURITY FIX**: Create a Set to track unique users by email to prevent duplicates
            const seenEmails = new Set();
            const uniqueUsersData = [];
            
            for (const tenantUser of activeTenantUsers) {
                // Handle active users with user_id (include ALL roles including admins)
                if (tenantUser.user_id && tenantUser.status === 'active') {
                    try {
                        const userDetails = await User.filter({ id: tenantUser.user_id });
                        if (userDetails && userDetails.length > 0) {
                            const user = userDetails[0];
                            
                            // Check if we already processed this email - CRITICAL security check
                            if (seenEmails.has(user.email)) {
                                console.log(`[STUDENT REPORT GENERATOR] Skipping duplicate email: ${user.email}`);
                                continue;
                            }
                            seenEmails.add(user.email);
                            
                            // Include ALL user roles (tenant_admin, instructor, analyst)
                            uniqueUsersData.push({
                                id: user.id,
                                full_name: user.full_name,
                                email: user.email,
                                role: tenantUser.role,
                                tenant_user_id: tenantUser.id
                            });
                        }
                    } catch (userError) {
                        console.error(`[STUDENT REPORT GENERATOR] Could not fetch details for user ${tenantUser.user_id}:`, userError);
                        // Skip users that can't be loaded rather than showing fallback data
                        continue;
                    }
                }
                // Note: We skip pending users since they haven't actually joined yet
            }
            
            console.log(`[STUDENT REPORT GENERATOR] After deduplication: ${uniqueUsersData.length} unique users (including admins)`);
            return uniqueUsersData;
            
        } catch (error) {
            console.error('[STUDENT REPORT GENERATOR] Error loading users:', error);
            return [];
        }
    }, []);

    const loadStudents = useCallback(async () => {
        setLoadingStudents(true);
        try {
            // First load tenant info
            const tenantContextData = await loadTenantInfo();
            if (!tenantContextData) {
                console.warn("[STUDENT REPORT GENERATOR] Could not load tenant context.");
                setStudents([]);
                return;
            }

            const usersData = await loadUsersData(tenantContextData);
            
            // Sort users alphabetically by full_name for better UX
            usersData.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
            
            setStudents(usersData);

        } catch (error) {
            console.error("[STUDENT REPORT GENERATOR] Error loading students:", error);
            setStudents([]);
        } finally {
            setLoadingStudents(false);
        }
    }, [loadTenantInfo, loadUsersData]);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    const handleGenerateReport = () => {
        if (selectedStudentId) {
            console.log("Navigating to detailed report for user:", selectedStudentId);
            // Navigate to the detailed report page with the selected student ID
            const reportUrl = `/StudentDetailedReport?studentId=${selectedStudentId}`;
            window.open(reportUrl, '_blank');
            onClose();
        } else {
            alert("Please select a user.");
        }
    };

    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'tenant_admin': return 'Admin';
            case 'analyst': return 'Student';
            case 'instructor': return 'Instructor';
            default: return role;
        }
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-teal-400" />
                        Detailed Student Report
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <Label htmlFor="select-student" className="text-white font-medium">Select Student:</Label>
                    <Select onValueChange={setSelectedStudentId} value={selectedStudentId}>
                        <SelectTrigger id="select-student" className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue placeholder="Choose student for detailed report" className="text-white" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600 text-white">
                            {loadingStudents ? (
                                <SelectItem value="loading" disabled className="text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading students...
                                    </div>
                                </SelectItem>
                            ) : students.length === 0 ? (
                                <SelectItem value="no-students" disabled className="text-slate-400">
                                    No active users found in this organization
                                </SelectItem>
                            ) : (
                                students.map(student => (
                                    <SelectItem 
                                        key={student.id} 
                                        value={student.id} 
                                        className="text-white hover:bg-slate-600 focus:bg-slate-600"
                                    >
                                        {student.full_name} ({getRoleDisplayName(student.role)}) - {student.email}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    
                    {/* Debug info for verification */}
                    <div className="text-xs text-slate-500">
                        Organization: {currentTenant?.name || 'TEST'} | Users found: {students.length}
                    </div>
                </div>

                <DialogFooter>
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onClose} 
                        className="border-slate-300 text-slate-800 bg-white hover:bg-slate-100 hover:text-slate-900 font-medium"
                    >
                        Close
                    </Button>
                    <Button 
                        type="button" 
                        onClick={handleGenerateReport} 
                        disabled={!selectedStudentId || loadingStudents} 
                        className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                        Generate Report
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
