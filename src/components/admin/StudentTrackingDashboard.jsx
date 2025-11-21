
import React, { useState, useEffect, useCallback } from 'react';
import { StudentActivityLog, User, TenantUser, Tenant } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Users,
    TrendingUp,
    AlertTriangle,
    Award,
    Search,
    Eye,
    FileText,
    RefreshCw,
    Loader2
} from 'lucide-react';
import StudentReportGenerator from './StudentReportGenerator';
import { createPageUrl } from '@/utils'; // ✅ Import createPageUrl

export default function StudentTrackingDashboard({ tenantContext }) {
    const [activities, setActivities] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showReportGenerator, setShowReportGenerator] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [filters, setFilters] = useState({
        searchTerm: '',
    });

    const loadStudentActivities = useCallback(async () => {
        setLoading(true);
        try {
            if (!tenantContext || !tenantContext.tenant_id) {
                console.warn("[PROFESSIONAL TRACKING DASHBOARD] No tenant context available.");
                setActivities([]);
                setUsers([]);
                setLoading(false);
                return;
            }

            const tenantId = tenantContext.tenant_id;
            console.log('[PROFESSIONAL TRACKING DASHBOARD] Loading activities for tenant:', tenantId);
            
            // Load ALL activities - no sample data, only real professional tracking data
            const activitiesData = await StudentActivityLog.filter({
                tenant_id: tenantId
            }, '-created_date', 200); // Increased limit for comprehensive tracking

            console.log(`[PROFESSIONAL TRACKING DASHBOARD] Found ${activitiesData.length} professional activities.`);
            
            if (activitiesData.length > 0) {
                console.log('[PROFESSIONAL TRACKING DASHBOARD] Latest activity sample:', activitiesData[0]);
            }
            
            setActivities(activitiesData);

            // ✅ שינוי לוגיקת טעינת המשתמשים: טעינת כל המשתמשים בסביבה (כולל אלה שבהמתנה)
            const tenantUsers = await TenantUser.filter({ tenant_id: tenantId });
            const usersData = [];
            const userIdsInTenant = new Set(); 
            const processedUserEntities = new Set(); // Tracks actual user IDs or synthetic pending IDs

            // 1. Collect all actual user_ids from tenantUsers
            for (const tu of tenantUsers) {
                if (tu.user_id) {
                    userIdsInTenant.add(tu.user_id);
                }
            }

            // 2. Fetch User objects for all collected unique user_ids
            for (const userId of Array.from(userIdsInTenant)) {
                try {
                    const userData = await User.filter({ id: userId });
                    if (userData.length > 0) {
                        usersData.push(userData[0]);
                        processedUserEntities.add(userId); // Mark this actual user ID as processed
                    }
                } catch (error) {
                    console.warn(`Could not load user ${userId}:`, error);
                }
            }
            
            // 3. Add pending tenant users who don't have an associated actual User record yet
            tenantUsers.forEach(tu => {
                // If it's a pending invitation AND it's not associated with an already loaded actual user_id
                if (tu.status === 'pending' && tu.invited_email && !processedUserEntities.has(tu.user_id) && !processedUserEntities.has(`pending-${tu.id}`)) {
                    // Create a synthetic user object for display
                    usersData.push({
                        id: `pending-${tu.id}`, // Use tenantUser ID with a prefix for uniqueness
                        full_name: `(Pending) ${tu.invited_email}`,
                        email: tu.invited_email
                    });
                    processedUserEntities.add(`pending-${tu.id}`); // Mark this synthetic ID as processed
                }
            });

            console.log(`[PROFESSIONAL TRACKING DASHBOARD] Monitoring ${usersData.length} users (including pending) in tenant.`);
            setUsers(usersData);
        } catch (error) {
            console.error('[PROFESSIONAL TRACKING DASHBOARD] Error loading professional activities or tenant users:', error);
            setActivities([]);
            setUsers([]);
        } finally {
            setLoading(false);
            setLastUpdated(new Date());
        }
    }, [tenantContext]);

    useEffect(() => {
        if (tenantContext) {
            loadStudentActivities();
            
            // Set up periodic refresh to ensure real-time professional tracking
            const interval = setInterval(() => {
                console.log('[PROFESSIONAL TRACKING DASHBOARD] Periodic refresh for real-time tracking...');
                loadStudentActivities();
            }, 60000); // Every minute for professional monitoring

            return () => clearInterval(interval);
        }
    }, [loadStudentActivities, tenantContext]);

    const getUserName = (userId) => {
        const user = users.find(u => u.id === userId);
        return user ? user.full_name : `Professional ${userId ? userId.slice(0, 8) : 'Unknown'}`;
    };

    const getPerformanceColor = (score) => {
        if (score >= 90) return "text-green-400";
        if (score >= 70) return "text-yellow-400";
        return "text-red-400";
    };

    const getStatsOverview = () => {
        const totalActivities = activities.length;
        const avgScore = totalActivities > 0 ? Math.round(activities.reduce((sum, act) => sum + (act.performance_metrics?.score || 0), 0) / totalActivities) : 0;
        const highPerformers = new Set(activities.filter(act => (act.performance_metrics?.score || 0) >= 90).map(act => act.user_id)).size;
        const usersNeedingSupport = new Set(activities.filter(act => (act.performance_metrics?.score || 0) < 70).map(act => act.user_id)).size;
        
        return { 
            totalActivities, 
            uniqueUsers: users.length, // ✅ שינוי: ספירת כלל המשתמשים בסביבה (כולל אלה שבהמתנה)
            avgScore, 
            highPerformers,
            usersNeedingSupport 
        };
    };

    // ✅ משנה את הפונקציה לנווט לעמוד החדש במקום לפתוח מודאל
    const handleViewDetails = (activity) => {
        if (activity && activity.user_id && tenantContext?.tenant_id) {
            const url = createPageUrl('StudentDetailedReport', { 
                userId: activity.user_id, 
                tenantId: tenantContext.tenant_id 
            });
            window.location.href = url;
        } else {
            console.error("Missing data to navigate to student report", { activity, tenantContext });
            alert("Could not open student report: missing required information.");
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const filteredActivities = activities.filter(activity => {
        const userName = getUserName(activity.user_id) || '';
        // ✅ לוגיקת חיפוש פשוטה יותר - רק לפי שם
        const matchesSearchTerm = filters.searchTerm === '' ||
            userName.toLowerCase().includes(filters.searchTerm.toLowerCase());
        
        return matchesSearchTerm;
    });

    const stats = getStatsOverview();

    if (loading && !lastUpdated) {
        return (
            <Card className="bg-slate-800 border-slate-700">
                <CardContent className="flex justify-center items-center p-10">
                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                    <span className="ml-3 text-white">Loading Professional Activity Data...</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Professional KPI Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Total Activities</CardTitle>
                        <FileText className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.totalActivities}</div>
                        <p className="text-xs text-slate-500">Professional tasks tracked</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Team Performance</CardTitle>
                        <TrendingUp className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.avgScore}%</div>
                        <p className="text-xs text-slate-500">Average team score</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">High Performers</CardTitle>
                        <Award className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.highPerformers}</div>
                        <p className="text-xs text-slate-500">Professionals scoring 90%+</p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300">Need Support</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{stats.usersNeedingSupport}</div>
                        <p className="text-xs text-slate-500">Require attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Professional Activity Tracking Table */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <div className="flex justify-between items-center flex-wrap gap-4">
                        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-teal-400" />
                            Professional Activity Tracking System
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setShowReportGenerator(true)}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Generate Professional Report
                            </Button>
                            <Button onClick={loadStudentActivities} variant="outline" size="sm" className="border-slate-600 text-slate-300">
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {/* ✅ שינוי הפילטרים */}
                    <div className="flex gap-4 mt-4 flex-wrap">
                        <div className="relative flex-1 min-w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search by professional name..."
                                value={filters.searchTerm}
                                onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-10"
                            />
                        </div>
                    </div>

                    {lastUpdated && (
                        <div className="text-xs text-slate-500 mt-2">
                            Last updated: {formatDate(lastUpdated)}
                        </div>
                    )}
                </CardHeader>

                <CardContent>
                    <div className="overflow-x-auto border border-slate-700 rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
                                    <TableHead className="text-slate-300">Professional</TableHead>
                                    <TableHead className="text-slate-300">Activity</TableHead>
                                    <TableHead className="text-slate-300">Task</TableHead>
                                    <TableHead className="text-slate-300">Score</TableHead>
                                    <TableHead className="text-slate-300">Duration</TableHead>
                                    <TableHead className="text-slate-300">Completed</TableHead>
                                    <TableHead className="text-slate-300">Status</TableHead>
                                    <TableHead className="text-slate-300">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredActivities.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                                            <div className="space-y-2">
                                                <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                                                <p>No professional activities tracked yet.</p>
                                                <p className="text-xs">System is ready to track all professional activities automatically.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredActivities.map((activity) => {
                                        const score = activity.performance_metrics?.score || 0;
                                        const passed = score >= 70;

                                        return (
                                            <TableRow key={activity.id} className="border-b-slate-800 hover:bg-slate-700/30">
                                                <TableCell className="font-medium text-white">
                                                    {getUserName(activity.user_id)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="border-slate-600 text-slate-300 capitalize">
                                                        {activity.activity_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-300 max-w-48 truncate">
                                                    {activity.task_title}
                                                </TableCell>
                                                <TableCell className={`font-medium ${getPerformanceColor(score)}`}>
                                                    {score}%
                                                </TableCell>
                                                <TableCell className="text-slate-300">
                                                    {activity.session_data?.duration_minutes || 'N/A'}m
                                                </TableCell>
                                                <TableCell className="text-slate-400 text-xs">
                                                    {formatDate(activity.created_date)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={`border ${
                                                            passed
                                                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                                                        }`}
                                                    >
                                                        {passed ? 'Successful' : 'Needs Review'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewDetails(activity)}
                                                        className="hover:bg-slate-600"
                                                        title="View Full Professional Report"
                                                    >
                                                        <Eye className="w-4 h-4 text-purple-400" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {activities.length > 0 && ( // ✅ שינוי תנאי
                        <div className="mt-4 text-sm text-slate-400 flex justify-between items-center">
                            <span>
                                Tracking {filteredActivities.length} of {activities.length} professional activities
                            </span>
                            <span>
                                {stats.uniqueUsers} professionals monitored
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {showReportGenerator && (
                <StudentReportGenerator
                    tenantContext={tenantContext}
                    onClose={() => setShowReportGenerator(false)}
                />
            )}
        </div>
    );
}
