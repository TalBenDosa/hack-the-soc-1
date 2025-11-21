
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Tenant, TenantUser } from '@/entities/all';
import UserManagement from '../components/admin/UserManagement';
import ScenarioManagement from '../components/admin/ScenarioManagement';
import SystemOverview from '../components/admin/SystemOverview';
import LessonManagement from '../components/admin/LessonManagement';
import QuizManagement from '../components/admin/QuizManagement';
import StudentTrackingDashboard from '../components/admin/StudentTrackingDashboard'; // Import the new component
import { Shield, Users, BookOpen, Target, Settings, FileQuestion, Activity } from 'lucide-react'; // Remove Edit3 icon

export default function AdminPage() {
    const [user, setUser] = useState(null);
    const [tenant, setTenant] = useState(null);
    const [tenantContext, setTenantContext] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserAndTenant = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);

                // This page is for Tenant Admins, so find their tenant
                const tenantUsers = await TenantUser.filter({ user_id: currentUser.id, status: 'active' });
                if (tenantUsers.length > 0) {
                    const currentTenantContext = tenantUsers[0];
                    setTenantContext(currentTenantContext);
                    const tenants = await Tenant.filter({ id: currentTenantContext.tenant_id });
                    if (tenants.length > 0) {
                        setTenant(tenants[0]);
                    }
                }
            } catch (error) {
                console.error("Error fetching user/tenant data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserAndTenant();
    }, []);
    
    if (loading) {
        return <div className="p-8 text-white">Loading Admin Panel...</div>;
    }

    if (!tenant) {
        return (
            <div className="p-8 text-white">
                <h1 className="text-2xl text-red-400">Access Denied</h1>
                <p>You must be an administrator of an organization to access this page.</p>
            </div>
        );
    }
    
    return (
        <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-teal-400" />
                        Admin Panel
                    </h1>
                    <p className="text-slate-400">Manage your organization: {tenant.name}</p>
                </div>

                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="bg-slate-800 border-slate-700">
                        <TabsTrigger value="overview"><Settings className="w-4 h-4 mr-2" />Overview</TabsTrigger>
                        <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />User Management</TabsTrigger>
                        <TabsTrigger value="scenarios"><Target className="w-4 h-4 mr-2" />Scenario Management</TabsTrigger>
                        <TabsTrigger value="lessons"><BookOpen className="w-4 h-4 mr-2" />Lesson Management</TabsTrigger>
                        <TabsTrigger value="quizzes"><FileQuestion className="w-4 h-4 mr-2" />Quiz Management</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <SystemOverview tenant={tenant} />
                    </TabsContent>
                    <TabsContent value="users">
                        <UserManagement tenant={tenant} tenantContext={tenantContext} />
                    </TabsContent>
                    <TabsContent value="scenarios">
                        <ScenarioManagement tenant={tenant} />
                    </TabsContent>
                    <TabsContent value="lessons">
                        <LessonManagement tenant={tenant} />
                    </TabsContent>
                    <TabsContent value="quizzes">
                        <QuizManagement tenant={tenant} />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
