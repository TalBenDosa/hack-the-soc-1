
import React, { useState, useEffect, useCallback } from 'react';
import { User, TenantUser, UserProgress, Tenant } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Trophy, Target, Clock, RefreshCw, Loader2, TrendingUp, BookOpen, Plus, Link2, Copy, Eye, UserCheck, UserX, AlertTriangle, Trash2, Activity } from 'lucide-react';
import StudentTrackingDashboard from './StudentTrackingDashboard';

export default function UserManagement({ tenant, tenantContext }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteLink, setInviteLink] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [currentTenant, setCurrentTenant] = useState(null);
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        completedScenarios: 0,
        averageScore: 0
    });
    const [currentTenantContext, setCurrentTenantContext] = useState(null); // ✅ הוספת state חדש

    const loadUsersData = useCallback(async (tenantContext) => {
        try {
            console.log('[USER MANAGEMENT] Loading users for tenant:', tenantContext.tenant.name);
            
            // Get all TenantUser records for this tenant (excluding removed ones)
            const tenantUsers = await TenantUser.filter({ 
                tenant_id: tenantContext.tenant.id
            });
            const activeTenantUsers = tenantUsers.filter(tu => tu.status !== 'removed');
            
            console.log(`[USER MANAGEMENT] Found ${activeTenantUsers.length} non-removed users for tenant ${tenantContext.tenant.name}`);
            
            // **CRITICAL FIX**: Create a Set to track unique users by email to prevent duplicates
            const seenEmails = new Set();
            const uniqueUsersData = [];
            
            for (const tenantUser of activeTenantUsers) {
                let userData = null;
                
                // Handle pending invitations
                if (tenantUser.status === 'pending' && tenantUser.invited_email) {
                    // Check if we already processed this email
                    if (seenEmails.has(tenantUser.invited_email)) {
                        console.log(`[USER MANAGEMENT] Skipping duplicate email: ${tenantUser.invited_email}`);
                        continue;
                    }
                    seenEmails.add(tenantUser.invited_email);
                    
                    userData = {
                        id: tenantUser.id,
                        full_name: '(Pending Invitation)',
                        email: tenantUser.invited_email,
                        role: tenantUser.role,
                        status: tenantUser.status,
                        tenant_user_id: tenantUser.id,
                        join_date: tenantUser.join_date,
                        last_login: null,
                        progress: {
                            level: 1,
                            points: 0,
                            scenarios_completed: 0,
                            average_score: 0,
                            last_activity: null
                        }
                    };
                }
                // Handle active users with user_id
                else if (tenantUser.user_id) {
                    try {
                        const userDetails = await User.filter({ id: tenantUser.user_id });
                        if (userDetails && userDetails.length > 0) {
                            const user = userDetails[0];
                            
                            // Check if we already processed this email
                            if (seenEmails.has(user.email)) {
                                console.log(`[USER MANAGEMENT] Skipping duplicate email: ${user.email}`);
                                continue;
                            }
                            seenEmails.add(user.email);
                            
                            // Get user progress
                            let progressData = {
                                level: 1,
                                points: 0,
                                scenarios_completed: 0,
                                average_score: 0,
                                last_activity: null
                            };
                            
                            try {
                                const userProgress = await UserProgress.filter({ 
                                    user_id: user.id,
                                    tenant_id: tenantContext.tenant.id 
                                });
                                
                                if (userProgress.length > 0) {
                                    const progress = userProgress[0];
                                    progressData = {
                                        level: progress.level || 1,
                                        points: progress.points || 0,
                                        scenarios_completed: progress.total_scenarios_completed || 0,
                                        average_score: progress.average_score || 0,
                                        last_activity: progress.last_activity
                                    };
                                }
                            } catch (progressError) {
                                console.warn(`[USER MANAGEMENT] Could not load progress for user ${user.email}:`, progressError);
                            }
                            
                            userData = { 
                                ...user, 
                                role: tenantUser.role,
                                tenant_user_id: tenantUser.id,
                                status: tenantUser.status,
                                join_date: tenantUser.join_date,
                                last_login: tenantUser.last_login,
                                progress: progressData
                            };
                        }
                    } catch (userError) {
                        console.error(`[USER MANAGEMENT] Could not fetch details for user ${tenantUser.user_id}:`, userError);
                        
                        // Check if we already processed this email
                        const fallbackEmail = tenantUser.invited_email || 'error@loading.details';
                        if (seenEmails.has(fallbackEmail)) {
                            continue;
                        }
                        seenEmails.add(fallbackEmail);
                        
                        userData = {
                            id: tenantUser.id,
                            full_name: `User ID: ${tenantUser.user_id.slice(0,8)}...`,
                            email: fallbackEmail,
                            role: tenantUser.role,
                            status: tenantUser.status,
                            tenant_user_id: tenantUser.id,
                            join_date: tenantUser.join_date,
                            progress: {
                                level: 1,
                                points: 0,
                                scenarios_completed: 0,
                                average_score: 0,
                                last_activity: null
                            }
                        };
                    }
                }
                
                if (userData) {
                    uniqueUsersData.push(userData);
                }
            }
            
            console.log(`[USER MANAGEMENT] After deduplication: ${uniqueUsersData.length} unique users`);
            setUsers(uniqueUsersData);
            
            // Calculate stats
            const activeUsers = uniqueUsersData.filter(u => u.status === 'active');
            const totalScenarios = uniqueUsersData.reduce((sum, user) => sum + (user.progress?.scenarios_completed || 0), 0);
            const averageScore = activeUsers.length > 0 
                ? activeUsers.reduce((sum, user) => sum + (user.progress?.average_score || 0), 0) / activeUsers.length 
                : 0;
            
            setStats({
                totalUsers: uniqueUsersData.length,
                activeUsers: activeUsers.length,
                completedScenarios: totalScenarios,
                averageScore: Math.round(averageScore)
            });
            
        } catch (error) {
            console.error('[USER MANAGEMENT] Error loading users:', error);
        }
    }, []);

    const generateInviteLink = useCallback((tenant) => {
        if (tenant?.unique_invite_code) {
            const baseUrl = window.location.origin;
            const link = `${baseUrl}/JoinTenant?code=${tenant.unique_invite_code}`;
            setInviteLink(link);
        }
    }, []);

    const loadTenantContextAndUsers = useCallback(async () => {
        try {
            setLoading(true);
            console.log('[USER MANAGEMENT] Loading tenant context and users...');

            // Get current user to determine context
            const currentUser = await User.me();
            console.log('[USER MANAGEMENT] Current user:', currentUser.email, 'Role:', currentUser.role);

            let finalTenantContext = null;

            if (currentUser.role === 'admin') {
                // Super Admin - check for impersonation context
                const impersonationData = sessionStorage.getItem('superadmin_impersonation');
                if (impersonationData) {
                    try {
                        const impersonation = JSON.parse(impersonationData);
                        const targetTenantId = impersonation.target_tenant_id;
                        console.log('[USER MANAGEMENT] Super Admin impersonating tenant:', targetTenantId);
                        
                        const tenants = await Tenant.filter({ id: targetTenantId });
                        if (tenants.length > 0) {
                            const tenant = tenants[0];
                            setCurrentTenant(tenant);
                            finalTenantContext = {
                                tenant_id: targetTenantId,
                                tenant: tenant,
                                role: 'tenant_admin'
                            };
                            console.log('[USER MANAGEMENT] Using impersonation tenant context:', tenant.name);
                        }
                    } catch (error) {
                            console.error('[USER MANAGEMENT] Error parsing impersonation data:', error);
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
                            ...tenantUser,
                            tenant: tenant
                        };
                        console.log('[USER MANAGEMENT] Using regular user tenant context:', tenant.name);
                    }
                }
            }

            if (finalTenantContext) {
                setCurrentTenantContext(finalTenantContext); // ✅ עדכון ה-state החדש
                await loadUsersData(finalTenantContext);
                generateInviteLink(finalTenantContext.tenant);
            } else {
                console.warn('[USER MANAGEMENT] No tenant context found');
            }

        } catch (error) {
            console.error('[USER MANAGEMENT] Error loading context:', error);
        } finally {
            setLoading(false);
        }
    }, [loadUsersData, generateInviteLink]);

    useEffect(() => {
        loadTenantContextAndUsers();
    }, [loadTenantContextAndUsers]);

    const copyInviteLink = async () => {
        if (!inviteLink) return;
        try {
            await navigator.clipboard.writeText(inviteLink);
            alert('Invite link copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy link:', error);
            alert('Failed to copy link');
        }
    };

    const handleUserStatusChange = async (user, newStatus) => {
        try {
            console.log('[USER MANAGEMENT] Changing user status:', user.email, 'to', newStatus);
            
            await TenantUser.update(user.tenant_user_id, {
                status: newStatus
            });

            // Reload users to reflect changes
            if (currentTenant) {
                await loadUsersData({ tenant: currentTenant });
            }
        } catch (error) {
            console.error('[USER MANAGEMENT] Error updating user status:', error);
            alert('Failed to update user status');
        }
    };

    const handleRemoveUser = async (user) => {
        try {
            console.log('[USER MANAGEMENT] Removing user:', user.email);
            
            await TenantUser.delete(user.tenant_user_id);

            // Reload users to reflect changes
            if (currentTenant) {
                await loadUsersData({ tenant: currentTenant });
            }
        } catch (error) {
            console.error('[USER MANAGEMENT] Error removing user:', error);
            alert('Failed to remove user');
        }
    };

    const handleViewProgress = (user) => {
        setSelectedUser(user);
        setIsProgressModalOpen(true);
    };

    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'tenant_admin': return 'Environment Admin';
            case 'analyst': return 'Student/Analyst';
            case 'instructor': return 'Instructor';
            default: return role;
        }
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'tenant_admin': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case 'analyst': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'instructor': return 'bg-green-500/20 text-green-400 border-green-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'inactive': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'suspended': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
            default: return 'bg-slate-600 text-slate-300 border-slate-500';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="flex justify-center items-center p-10">
                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    if (!currentTenant) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="text-center p-10">
                    <AlertTriangle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl text-slate-400 mb-2">No Organization Context</h3>
                    <p className="text-slate-500">Unable to load organization context for user management.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                        <p className="text-xs text-slate-500">
                            {stats.activeUsers} active
                        </p>
                    </CardContent>
                </Card>
                
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Completed Scenarios</CardTitle>
                        <Target className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.completedScenarios}</div>
                        <p className="text-xs text-slate-500">
                            Total across all users
                        </p>
                    </CardContent>
                </Card>
                
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Average Score</CardTitle>
                        <Trophy className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.averageScore}%</div>
                        <p className="text-xs text-slate-500">
                            Organization average
                        </p>
                    </CardContent>
                </Card>
                
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Organization</CardTitle>
                        <BookOpen className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-white">{currentTenant.name}</div>
                        <p className="text-xs text-slate-500 capitalize">
                            {currentTenant.subscription_tier} tier
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for User Management and Student Tracking */}
            <Tabs defaultValue="user-list" className="space-y-6">
                <TabsList className="bg-slate-800 border-slate-700">
                    <TabsTrigger value="user-list"><Users className="w-4 h-4 mr-2" />User List</TabsTrigger>
                    <TabsTrigger value="student-tracking"><Activity className="w-4 h-4 mr-2" />Student Tracking</TabsTrigger>
                </TabsList>

                <TabsContent value="user-list">
                    {/* User Management Card */}
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                        <Users className="w-6 h-6 text-teal-400" />
                                        User Management for {currentTenant.name}
                                    </CardTitle>
                                    <p className="text-slate-400 mt-1">
                                        Invite users via a unique link and manage their roles and access.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={loadTenantContextAndUsers} variant="outline" size="sm" className="border-slate-600 text-slate-300">
                                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    </Button>
                                    <Button onClick={() => setIsInviteModalOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Invite User
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto border border-slate-700 rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
                                            <TableHead className="text-slate-300">User</TableHead>
                                            <TableHead className="text-slate-300">Role</TableHead>
                                            <TableHead className="text-slate-300">Status</TableHead>
                                            <TableHead className="text-slate-300">Level & Points</TableHead>
                                            <TableHead className="text-slate-300">Scenarios</TableHead>
                                            <TableHead className="text-slate-300">Score</TableHead>
                                            <TableHead className="text-slate-300">Last Activity</TableHead>
                                            <TableHead className="text-slate-300">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {users.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan="8" className="text-center py-8 text-slate-400">
                                                    No users in this organization yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            users.map(user => (
                                                <TableRow key={user.tenant_user_id || user.id} className="border-b-slate-800 hover:bg-slate-700/30">
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="font-medium text-white">{user.full_name}</div>
                                                            <div className="text-sm text-slate-400">{user.email}</div>
                                                            {user.join_date && (
                                                                <div className="text-xs text-slate-500">
                                                                    Joined: {formatDate(user.join_date)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`${getRoleBadgeColor(user.role)} border`} variant="outline">
                                                            {getRoleDisplayName(user.role)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge 
                                                            className={`${getStatusBadgeColor(user.status)} border`}
                                                            variant="outline"
                                                        >
                                                            {user.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-medium text-white">
                                                                Level {user.progress?.level || 1}
                                                            </div>
                                                            <div className="text-xs text-slate-400">
                                                                {user.progress?.points || 0} points
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm text-white">
                                                            {user.progress?.scenarios_completed || 0}
                                                        </div>
                                                        <div className="text-xs text-slate-400">completed</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-2">
                                                            <div className="text-sm text-white">
                                                                {user.progress?.average_score || 0}%
                                                            </div>
                                                            <Progress 
                                                                value={user.progress?.average_score || 0} 
                                                                className="w-16 h-1" 
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm text-slate-300">
                                                            {formatDate(user.progress?.last_activity)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => handleViewProgress(user)}
                                                                className="hover:bg-slate-600"
                                                                title="View Progress"
                                                            >
                                                                <Eye className="w-4 h-4 text-purple-400" />
                                                            </Button>
                                                            {user.status === 'active' ? (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    onClick={() => handleUserStatusChange(user, 'inactive')}
                                                                    className="hover:bg-slate-600"
                                                                    title="Deactivate User"
                                                                >
                                                                    <UserX className="w-4 h-4 text-orange-400" />
                                                                </Button>
                                                            ) : user.status === 'inactive' ? (
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    onClick={() => handleUserStatusChange(user, 'active')}
                                                                    className="hover:bg-slate-600"
                                                                    title="Activate User"
                                                                >
                                                                    <UserCheck className="w-4 h-4 text-green-400" />
                                                                </Button>
                                                            ) : null}
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                onClick={() => handleRemoveUser(user)}
                                                                className="hover:bg-slate-600"
                                                                title="Remove User"
                                                            >
                                                                <Trash2 className="w-4 h-4 text-red-400" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="student-tracking">
                    <StudentTrackingDashboard tenantContext={currentTenantContext} /> {/* ✅ העברת הקונטקסט המלא */}
                </TabsContent>
            </Tabs>

            {/* Invite Modal */}
            <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                           <Link2 className="w-5 h-5 text-teal-400" />
                           Invite New User to {currentTenant.name}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <p className="text-slate-300">
                           Share this unique link with anyone you want to invite. When they sign up using this link, they will be automatically added to your organization as a Student/Analyst.
                        </p>
                        <div>
                            <Label className="text-slate-300 font-medium">Unique Invite Link for {currentTenant.name}</Label>
                            <div className="flex gap-2 mt-2">
                                <Input 
                                    value={inviteLink}
                                    readOnly
                                    className="bg-slate-700 border-slate-600 text-white"
                                />
                                <Button 
                                    onClick={copyInviteLink}
                                    variant="outline"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Progress Modal */}
            {selectedUser && (
                <Dialog open={isProgressModalOpen} onOpenChange={setIsProgressModalOpen}>
                    <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                               <TrendingUp className="w-5 h-5 text-teal-400" />
                               Progress Report: {selectedUser.full_name}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <div className="py-4 space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-700/30 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-white">{selectedUser.progress?.level || 1}</div>
                                    <div className="text-sm text-slate-400">Current Level</div>
                                </div>
                                <div className="bg-slate-700/30 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-white">{selectedUser.progress?.points || 0}</div>
                                    <div className="text-sm text-slate-400">Total Points</div>
                                </div>
                                <div className="bg-slate-700/30 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-white">{selectedUser.progress?.scenarios_completed || 0}</div>
                                    <div className="text-sm text-slate-400">Scenarios Completed</div>
                                </div>
                                <div className="bg-slate-700/30 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-white">{selectedUser.progress?.average_score || 0}%</div>
                                    <div className="text-sm text-slate-400">Average Score</div>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="text-lg font-semibold text-white mb-2">User Information</h4>
                                <div className="bg-slate-700/30 p-4 rounded-lg space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Email:</span>
                                        <span className="text-white">{selectedUser.email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Role:</span>
                                        <span className="text-white">{getRoleDisplayName(selectedUser.role)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Status:</span>
                                        <Badge className={`${getStatusBadgeColor(selectedUser.status)} border`}>
                                            {selectedUser.status}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Join Date:</span>
                                        <span className="text-white">{formatDate(selectedUser.join_date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Last Activity:</span>
                                        <span className="text-white">{formatDate(selectedUser.progress?.last_activity)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsProgressModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
