import React, { useState, useEffect } from 'react';
import { User, TenantUser } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, RefreshCw, Loader2, Link2, Copy, Edit, UserX, UserCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TenantUserManagement({ tenant }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [inviteLink, setInviteLink] = useState('');

    useEffect(() => {
        fetchUsers();
    }, [tenant]);
    
    useEffect(() => {
        if(isInviteModalOpen) {
            generateInviteLink();
        }
    }, [isInviteModalOpen, tenant]);

    const generateInviteLink = () => {
        if (tenant?.unique_invite_code) {
            const baseUrl = window.location.origin;
            setInviteLink(`${baseUrl}/#/JoinTenant?code=${tenant.unique_invite_code}`);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const allTenantUsers = await TenantUser.filter({ tenant_id: tenant.id });
            // Filter out users who have been explicitly removed
            const tenantUsers = allTenantUsers.filter(tu => tu.status !== 'removed');
            
            console.log(`[USER MGMT] Found ${tenantUsers.length} non-removed users for tenant ${tenant.name}`);
            
            const userPromises = tenantUsers.map(async (tu) => {
                // Handle pending invitations
                if (tu.status === 'pending' && tu.invited_email) {
                    return {
                        id: tu.id,
                        full_name: '(Pending Invitation)',
                        email: tu.invited_email,
                        tenant_role: tu.role,
                        status: tu.status,
                        tenant_user_id: tu.id,
                        permissions: tu.permissions || []
                    };
                }
                
                // Handle active/suspended/inactive users
                if (tu.user_id) {
                    try {
                        const userDetails = await User.filter({ id: tu.user_id });
                        if (userDetails && userDetails.length > 0) {
                            return { 
                                ...userDetails[0], 
                                tenant_role: tu.role,
                                tenant_user_id: tu.id,
                                status: tu.status,
                                permissions: tu.permissions || []
                            };
                        }
                        return {
                            id: tu.id,
                            full_name: '(Orphaned Record)',
                            email: tu.invited_email || 'No email found',
                            tenant_role: tu.role,
                            status: tu.status,
                            tenant_user_id: tu.id,
                            permissions: tu.permissions || []
                        };
                    } catch (e) {
                        console.error(`Could not fetch details for user ${tu.user_id}`, e);
                        return {
                            id: tu.id,
                            full_name: `User ID: ${tu.user_id.slice(0,8)}...`,
                            email: tu.invited_email || 'Error loading details',
                            tenant_role: tu.role,
                            status: tu.status,
                            tenant_user_id: tu.id,
                            permissions: tu.permissions || []
                        };
                    }
                }
                return null;
            });
            
            const resolvedUsers = (await Promise.all(userPromises)).filter(Boolean);
            
            // **FIX FOR DUPLICATES**: Remove duplicate users by email
            const uniqueUsers = resolvedUsers.reduce((acc, current) => {
                const existingUser = acc.find(user => user.email === current.email);
                if (!existingUser) {
                    acc.push(current);
                } else {
                    // Keep the more recent or active record
                    if (current.status === 'active' && existingUser.status !== 'active') {
                        const index = acc.findIndex(user => user.email === current.email);
                        acc[index] = current;
                    }
                }
                return acc;
            }, []);
            
            setUsers(uniqueUsers);
            console.log(`[USER MGMT] After deduplication: ${uniqueUsers.length} unique users`);

        } catch (error) {
            console.error("Failed to fetch tenant users:", error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteUser = async (tenantUserId, userEmail) => {
        if(window.confirm(`Are you sure you want to remove ${userEmail} from ${tenant.name}? This will permanently revoke their access.`)) {
            try {
                // Instead of deleting, update the status to 'removed' to block re-entry
                await TenantUser.update(tenantUserId, { status: 'removed' });
                fetchUsers(); // Refresh list to remove the user from view
            } catch(error) {
                console.error("Failed to remove tenant user:", error);
                alert("Failed to remove user. Please try again.");
            }
        }
    };

    const handleStatusChange = async (user, newStatus) => {
        const statusMessages = {
            'active': 'activate',
            'inactive': 'deactivate',
            'suspended': 'suspend'
        };
        
        const action = statusMessages[newStatus];
        if(window.confirm(`Are you sure you want to ${action} ${user.email}?`)) {
            try {
                await TenantUser.update(user.tenant_user_id, { status: newStatus });
                fetchUsers(); // Refresh list
                
                const successMessages = {
                    'active': 'User activated successfully!',
                    'inactive': 'User deactivated successfully! They will be blocked from accessing the platform.',
                    'suspended': 'User suspended successfully!'
                };
                
                alert(successMessages[newStatus]);
            } catch(error) {
                console.error("Failed to update user status:", error);
                alert("Failed to update user status. Please try again.");
            }
        }
    };

    const handleEditUser = (user) => {
        setEditingUser({
            ...user,
            newRole: user.tenant_role
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        
        try {
            const permissions = editingUser.newRole === 'tenant_admin' ? 
                ['create_lessons', 'create_quizzes', 'create_scenarios', 'create_live_logs', 'invite_students'] : 
                [];
            
            await TenantUser.update(editingUser.tenant_user_id, {
                role: editingUser.newRole,
                permissions: permissions
            });
            
            setIsEditModalOpen(false);
            setEditingUser(null);
            fetchUsers();
            alert('User permissions updated successfully!');
        } catch (error) {
            console.error("Failed to update user:", error);
            alert("Failed to update user permissions. Please try again.");
        }
    };

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

    return (
        <>
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-xl font-bold text-white">User Management for {tenant.name}</CardTitle>
                            <p className="text-slate-400 mt-1">
                                Invite users via a unique link and manage their roles and access.
                            </p>
                        </div>
                        <div className="flex gap-2">
                             <Button onClick={fetchUsers} variant="outline" size="sm" className="border-slate-600 text-slate-300">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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
                                    <TableHead className="text-slate-300">Full Name</TableHead>
                                    <TableHead className="text-slate-300">Email</TableHead>
                                    <TableHead className="text-slate-300">Role</TableHead>
                                    <TableHead className="text-slate-300">Status</TableHead>
                                    <TableHead className="text-slate-300">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan="5" className="text-center py-8"><Loader2 className="mx-auto w-8 h-8 animate-spin text-slate-400" /></TableCell></TableRow>
                                ) : users.length === 0 ? (
                                    <TableRow><TableCell colSpan="5" className="text-center py-8 text-slate-400">No users in this organization yet.</TableCell></TableRow>
                                ) : (
                                    users.map(user => (
                                        <TableRow key={user.tenant_user_id || user.id} className="border-b-slate-800 hover:bg-slate-700/30">
                                            <TableCell className="font-medium text-white">{user.full_name}</TableCell>
                                            <TableCell className="text-slate-300">{user.email}</TableCell>
                                            <TableCell>
                                                <Badge className={`${getRoleBadgeColor(user.tenant_role)} border`} variant="outline">
                                                    {getRoleDisplayName(user.tenant_role)}
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
                                                <div className="flex gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleEditUser(user)}
                                                        className="text-blue-400 hover:text-blue-300"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    
                                                    {user.status === 'active' ? (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => handleStatusChange(user, 'inactive')}
                                                            className="text-orange-400 hover:text-orange-300"
                                                            title="Deactivate User"
                                                        >
                                                            <UserX className="w-4 h-4" />
                                                        </Button>
                                                    ) : user.status === 'inactive' ? (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => handleStatusChange(user, 'active')}
                                                            className="text-green-400 hover:text-green-300"
                                                            title="Activate User"
                                                        >
                                                            <UserCheck className="w-4 h-4" />
                                                        </Button>
                                                    ) : null}
                                                    
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleDeleteUser(user.tenant_user_id, user.email)}
                                                        className="text-red-400 hover:text-red-300"
                                                        title="Remove User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
            
            {/* Invite Modal */}
            <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                           <Link2 className="w-5 h-5 text-teal-400" />
                           Invite New User to {tenant.name}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="py-4 space-y-4">
                        <p className="text-slate-300">
                           Share this unique link with anyone you want to invite. When they sign up using this link, they will be automatically added to your organization as a Student/Analyst.
                        </p>
                        <div>
                            <Label className="text-slate-300 font-medium">Unique Invite Link for {tenant.name}</Label>
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

            {/* Edit User Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                           <Edit className="w-5 h-5 text-teal-400" />
                           Edit User Permissions
                        </DialogTitle>
                    </DialogHeader>
                    
                    {editingUser && (
                        <div className="py-4 space-y-4">
                            <div>
                                <Label className="text-slate-300 font-medium">User</Label>
                                <p className="text-white">{editingUser.full_name} ({editingUser.email})</p>
                            </div>
                            
                            <div>
                                <Label className="text-slate-300 font-medium">Role</Label>
                                <Select 
                                    value={editingUser.newRole} 
                                    onValueChange={(value) => setEditingUser({...editingUser, newRole: value})}
                                >
                                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-700 border-slate-600">
                                        <SelectItem value="analyst" className="text-white">Student/Analyst</SelectItem>
                                        <SelectItem value="tenant_admin" className="text-white">Environment Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="bg-slate-700/30 p-3 rounded-lg">
                                <p className="text-xs text-slate-400">
                                    <strong>Student/Analyst:</strong> Can access lessons, quizzes, and scenarios based on subscription tier.<br/>
                                    <strong>Environment Admin:</strong> Full access to admin panel, can create content and manage users.
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <DialogFooter>
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsEditModalOpen(false)} 
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleUpdateUser}
                            className="bg-teal-600 hover:bg-teal-700"
                        >
                            Update Permissions
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}