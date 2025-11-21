import React, { useState, useEffect } from "react";
import { User, Tenant, TenantUser, Scenario, Lesson, Quiz } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, BarChart3, Activity, RefreshCw, Building, Link2, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TenantUserManagement from "../components/admin/TenantUserManagement";
import { RoleGuard } from "../components/auth/RoleBasedAccess";

export default function TenantAdminDashboard() {
    const [user, setUser] = useState(null);
    const [tenant, setTenant] = useState(null);
    const [tenantUsers, setTenantUsers] = useState([]);
    const [scenarios, setScenarios] = useState([]);
    const [lessons, setLessons] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteLink, setInviteLink] = useState('');

    useEffect(() => {
        loadTenantData();
    }, []);

    const loadTenantData = async () => {
        setLoading(true);
        try {
            // Get current user
            const currentUser = await User.me();
            setUser(currentUser);

            // Get user's tenant context
            const userTenantLinks = await TenantUser.filter({ 
                user_id: currentUser.id,
                status: 'active',
                role: 'tenant_admin'
            });

            if (userTenantLinks.length === 0) {
                throw new Error('No tenant admin access found');
            }

            const tenantLink = userTenantLinks[0];
            const tenantData = await Tenant.filter({ id: tenantLink.tenant_id });
            
            if (tenantData.length === 0) {
                throw new Error('Tenant not found');
            }

            const currentTenant = tenantData[0];
            setTenant(currentTenant);

            // Load tenant-specific data
            const [tenantUsersData, scenariosData, lessonsData, quizzesData] = await Promise.all([
                TenantUser.filter({ tenant_id: currentTenant.id }),
                Scenario.filter({ tenant_id: currentTenant.id }),
                Lesson.filter({ tenant_id: currentTenant.id }),
                Quiz.filter({ tenant_id: currentTenant.id })
            ]);

            setTenantUsers(tenantUsersData);
            setScenarios(scenariosData || []);
            setLessons(lessonsData || []);
            setQuizzes(quizzesData || []);

        } catch (error) {
            console.error("Failed to load tenant data:", error);
        } finally {
            setLoading(false);
        }
    };

    const generateInviteLink = () => {
        if (tenant?.unique_invite_code) {
            const baseUrl = window.location.origin;
            setInviteLink(`${baseUrl}/join/${tenant.unique_invite_code}`);
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

    const handleInviteStudents = () => {
        generateInviteLink();
        setShowInviteModal(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Activity className="w-12 h-12 text-teal-400 mx-auto mb-4 animate-spin" />
                    <h2 className="text-xl font-semibold text-white mb-2">Loading Environment</h2>
                    <p className="text-slate-400">Setting up your admin dashboard...</p>
                </div>
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Card className="bg-slate-800 border-slate-700 text-center p-8 max-w-md mx-auto">
                    <CardContent>
                        <Building className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">No Environment Access</h2>
                        <p className="text-slate-400 mb-6">
                            You don't have Environment Admin access to any organization.
                        </p>
                        <Button onClick={() => window.location.href = '/dashboard'} className="bg-teal-600 hover:bg-teal-700">
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const stats = {
        totalUsers: tenantUsers.length,
        activeUsers: tenantUsers.filter(u => u.status === 'active').length,
        totalScenarios: scenarios.length,
        totalLessons: lessons.length,
        totalQuizzes: quizzes.length
    };

    return (
        <RoleGuard permission="create_lessons">
            <div className="p-4 md:p-8 bg-slate-900 min-h-screen">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                                Environment Admin Panel
                            </h1>
                            <p className="text-slate-400">
                                Managing <span className="text-teal-400 font-semibold">{tenant.name}</span> training environment
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button onClick={handleInviteStudents} className="bg-teal-600 hover:bg-teal-700">
                                <Users className="w-4 h-4 mr-2" />
                                Invite Students
                            </Button>
                            <Button onClick={loadTenantData} variant="outline" className="border-slate-600 text-slate-300">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {/* Organization Info */}
                    <Card className="bg-slate-800 border-slate-700 mb-8">
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <h3 className="text-sm font-medium text-slate-400">Organization</h3>
                                    <p className="text-lg font-semibold text-white">{tenant.name}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-slate-400">Domain</h3>
                                    <p className="text-lg font-semibold text-white">{tenant.domain}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-slate-400">Subscription</h3>
                                    <p className="text-lg font-semibold text-teal-400 capitalize">{tenant.subscription_tier}</p>
                                </div>
                                <div>
                                    <h3 className="text-sm font-medium text-slate-400">Status</h3>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            tenant.status === 'active' ? 'bg-green-500' : 
                                            tenant.status === 'trial' ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}></div>
                                        <p className="text-lg font-semibold text-white capitalize">{tenant.status}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-300">Total Users</CardTitle>
                                <Users className="h-4 w-4 text-teal-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                                <p className="text-xs text-slate-400">
                                    {stats.activeUsers} active
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-300">Scenarios</CardTitle>
                                <Activity className="h-4 w-4 text-purple-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{stats.totalScenarios}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-300">Lessons</CardTitle>
                                <BookOpen className="h-4 w-4 text-blue-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{stats.totalLessons}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-300">Quizzes</CardTitle>
                                <BarChart3 className="h-4 w-4 text-orange-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{stats.totalQuizzes}</div>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-300">Max Users</CardTitle>
                                <Building className="h-4 w-4 text-green-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{tenant.max_users}</div>
                                <p className="text-xs text-slate-400">
                                    {tenant.max_users - stats.totalUsers} available
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content Tabs */}
                    <Tabs defaultValue="users" className="space-y-6">
                        <TabsList className="bg-slate-800 border-slate-700">
                            <TabsTrigger value="users">User Management</TabsTrigger>
                            <TabsTrigger value="content">Content Overview</TabsTrigger>
                            <TabsTrigger value="settings">Environment Settings</TabsTrigger>
                        </TabsList>

                        <TabsContent value="users">
                            <TenantUserManagement tenant={tenant} />
                        </TabsContent>

                        <TabsContent value="content">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-slate-800 border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="text-white">Scenarios</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold text-purple-400 mb-2">{stats.totalScenarios}</p>
                                        <p className="text-slate-400 text-sm">Attack/Defense simulations for hands-on training</p>
                                        <Button className="w-full mt-4 bg-purple-600 hover:bg-purple-700">
                                            Manage Scenarios
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-800 border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="text-white">Lessons</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold text-blue-400 mb-2">{stats.totalLessons}</p>
                                        <p className="text-slate-400 text-sm">Theoretical learning materials and guides</p>
                                        <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
                                            Manage Lessons
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="bg-slate-800 border-slate-700">
                                    <CardHeader>
                                        <CardTitle className="text-white">Quizzes</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-3xl font-bold text-orange-400 mb-2">{stats.totalQuizzes}</p>
                                        <p className="text-slate-400 text-sm">Interactive assessments and knowledge checks</p>
                                        <Button className="w-full mt-4 bg-orange-600 hover:bg-orange-700">
                                            Manage Quizzes
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="settings">
                            <Card className="bg-slate-800 border-slate-700">
                                <CardHeader>
                                    <CardTitle className="text-white">Environment Configuration</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-4">Limits</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-300">Max Users:</span>
                                                    <span className="text-white font-semibold">{tenant.max_users}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-300">Max Labs:</span>
                                                    <span className="text-white font-semibold">{tenant.max_labs}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-300">Current Users:</span>
                                                    <span className="text-teal-400 font-semibold">{stats.totalUsers}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-4">Features</h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-300">Custom Scenarios:</span>
                                                    <span className={`text-sm px-2 py-1 rounded ${tenant.settings?.enable_custom_scenarios ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                                                        {tenant.settings?.enable_custom_scenarios ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-300">API Access:</span>
                                                    <span className={`text-sm px-2 py-1 rounded ${tenant.settings?.enable_api_access ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                                                        {tenant.settings?.enable_api_access ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-300">MFA Required:</span>
                                                    <span className={`text-sm px-2 py-1 rounded ${tenant.settings?.mfa_required ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                                                        {tenant.settings?.mfa_required ? 'Yes' : 'No'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Student Invite Modal */}
                <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                    <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                                <Link2 className="w-5 h-5 text-teal-400" />
                                Invite Students to {tenant.name}
                            </DialogTitle>
                        </DialogHeader>
                        
                        <div className="py-4 space-y-4">
                            <p className="text-slate-300">
                                Share this unique link with students you want to invite to your training environment. When they sign up using this link, they will be automatically added to your organization.
                            </p>
                            <div>
                                <Label className="text-slate-300 font-medium">Student Invitation Link</Label>
                                <div className="flex gap-2 mt-2">
                                    <Input 
                                        value={inviteLink}
                                        readOnly
                                        className="bg-slate-700 border-slate-600 text-white"
                                    />
                                    <Button onClick={copyInviteLink} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy
                                    </Button>
                                </div>
                            </div>
                            <div className="bg-slate-700 p-4 rounded-lg">
                                <h4 className="font-semibold text-white mb-2">How it works:</h4>
                                <ul className="text-sm text-slate-300 space-y-1">
                                    <li>• Share this link with your students</li>
                                    <li>• Students click the link and log in/sign up</li>
                                    <li>• They're automatically added to your environment</li>
                                    <li>• You can manage their access from the User Management tab</li>
                                </ul>
                            </div>
                        </div>
                        
                        <DialogFooter>
                            <Button onClick={() => setShowInviteModal(false)} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </RoleGuard>
    );
}