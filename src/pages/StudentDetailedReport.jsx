
import React, { useState, useEffect } from 'react';
import { User, UserProgress, StudentActivityLog } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, ArrowLeft, User as UserIcon, TrendingUp, Award, Clock, FileText, CheckCircle, AlertCircle, ChevronDown, HelpCircle, X, Check } from 'lucide-react'; 
import { createPageUrl } from '@/utils';

export default function StudentDetailedReport() {
    const [user, setUser] = useState(null);
    const [progress, setProgress] = useState(null);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openActivityId, setOpenActivityId] = useState(null);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        const tenantId = urlParams.get('tenantId');

        if (!userId || !tenantId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const [userData, progressData, activityData] = await Promise.all([
                    User.filter({ id: userId }),
                    UserProgress.filter({ user_id: userId, tenant_id: tenantId }),
                    StudentActivityLog.filter({ user_id: userId, tenant_id: tenantId }, '-created_date', 500)
                ]);

                if (userData.length > 0) setUser(userData[0]);
                if (progressData.length > 0) setProgress(progressData[0]);
                setActivities(activityData || []);
                
            } catch (error) {
                console.error("Failed to load student detailed report:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getPerformanceColor = (score) => {
        if (score >= 90) return "text-green-400";
        if (score >= 70) return "text-yellow-400";
        return "text-red-400";
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-slate-900"><Loader2 className="w-12 h-12 text-teal-400 animate-spin" /></div>;
    }

    if (!user) {
        return (
            <div className="p-8 text-white bg-slate-900 min-h-screen">
                <h1 className="text-2xl text-red-400">Student Not Found</h1>
                <p>Could not load data for the requested student.</p>
                 <Button onClick={() => window.location.href = createPageUrl('Admin')} variant="outline" className="mt-4 border-slate-600 text-slate-300">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Admin Panel
                </Button>
            </div>
        );
    }
    
    return (
        <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white">
            <div className="max-w-7xl mx-auto">
                <Button onClick={() => window.history.back()} variant="outline" className="mb-6 border-slate-600 text-slate-300 hover:bg-slate-800">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Tracking
                </Button>

                {/* Student Profile Card */}
                <Card className="bg-slate-800 border-slate-700 mb-8">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                                    <UserIcon className="w-8 h-8 text-teal-400" />
                                    {user.full_name}
                                </CardTitle>
                                <p className="text-slate-400">{user.email}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-400">Level</p>
                                <p className="text-3xl font-bold text-teal-400">{progress?.level || 1}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-slate-700/50 p-4 rounded-lg">
                            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-400"/>
                            <p className="text-2xl font-bold text-white">{progress?.average_score || 0}%</p>
                            <p className="text-sm text-slate-400">Average Score</p>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg">
                            <Award className="w-6 h-6 mx-auto mb-2 text-yellow-400"/>
                            <p className="text-2xl font-bold text-white">{progress?.points || 0}</p>
                            <p className="text-sm text-slate-400">Total Points</p>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg">
                             <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400"/>
                            <p className="text-2xl font-bold text-white">{progress?.total_scenarios_completed || 0}</p>
                            <p className="text-sm text-slate-400">Activities Completed</p>
                        </div>
                         <div className="bg-slate-700/50 p-4 rounded-lg">
                            <Clock className="w-6 h-6 mx-auto mb-2 text-blue-400"/>
                            <p className="text-2xl font-bold text-white">~{progress?.total_time_spent || 0}m</p>
                            <p className="text-sm text-slate-400">Total Time Spent</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Activity Log Table */}
                <Card className="bg-slate-800 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-white">Full Activity Log</CardTitle>
                        <p className="text-slate-400">A complete history of all tracked activities for this student.</p>
                    </CardHeader>
                    <CardContent>
                         <div className="overflow-x-auto border border-slate-700 rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
                                        <TableHead className="text-slate-300">Activity & Task</TableHead>
                                        <TableHead className="text-slate-300">Performance</TableHead>
                                        <TableHead className="text-slate-300">Completed</TableHead>
                                        <TableHead className="text-slate-300 text-right">Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {activities.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-slate-400">No activities recorded for this student yet.</TableCell>
                                        </TableRow>
                                    ) : (
                                        activities.map(activity => (
                                            <Collapsible asChild key={activity.id} open={openActivityId === activity.id} onOpenChange={() => setOpenActivityId(openActivityId === activity.id ? null : activity.id)}>
                                                <>
                                                    <TableRow className="border-b-slate-800 hover:bg-slate-700/30 data-[state=open]:bg-slate-700/50">
                                                        <TableCell className="max-w-xs">
                                                            <Badge variant="outline" className="border-slate-600 text-slate-300 capitalize mb-2">
                                                                {activity.activity_type?.replace(/_/g, ' ')}
                                                            </Badge>
                                                            <div className="text-white font-medium truncate">{activity.task_title}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className={`text-lg font-bold ${getPerformanceColor(activity.performance_metrics?.score)}`}>
                                                                {activity.performance_metrics?.score || 0}%
                                                            </div>
                                                            <div className="text-xs text-slate-400">{activity.session_data?.duration_minutes || 'N/A'}m</div>
                                                        </TableCell>
                                                        <TableCell className="text-slate-400 text-xs">{formatDate(activity.created_date)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <CollapsibleTrigger asChild>
                                                                <Button variant="ghost" size="sm" className="hover:bg-slate-700 text-purple-400">
                                                                    View Details
                                                                    <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-300 ${openActivityId === activity.id ? 'rotate-180' : ''}`} />
                                                                </Button>
                                                            </CollapsibleTrigger>
                                                        </TableCell>
                                                    </TableRow>
                                                    <CollapsibleContent asChild>
                                                        <TableRow className="bg-slate-900/50">
                                                            <TableCell colSpan={4} className="p-0">
                                                                <div className="p-6 bg-slate-800/70 space-y-6">
                                                                    {activity.ai_feedback?.detailed_feedback && (
                                                                        <div>
                                                                            <h4 className="text-md font-semibold text-purple-400 mb-2 flex items-center gap-2"><FileText className="w-5 h-5"/>AI Performance Review</h4>
                                                                            <p className="text-slate-300 text-sm bg-slate-700/50 p-4 rounded-md border border-slate-700">
                                                                                {activity.ai_feedback.detailed_feedback}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {/* ✅ החלפת הרשימה בטבלה */}
                                                                    {(activity.performance_metrics?.weaknesses?.length > 0 || activity.performance_metrics?.errors_detected?.length > 0) && (
                                                                        <div>
                                                                            <h4 className="text-md font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                                                                                <AlertCircle className="w-5 h-5"/>Areas for Improvement
                                                                            </h4>
                                                                            <div className="overflow-hidden border border-slate-700 rounded-lg">
                                                                                <Table>
                                                                                    <TableHeader>
                                                                                        <TableRow className="bg-slate-700/50 hover:bg-slate-700/50">
                                                                                            <TableHead className="w-[5%] text-slate-300"></TableHead>
                                                                                            <TableHead className="text-slate-300">Issue / Question</TableHead>
                                                                                            <TableHead className="text-slate-300">Result</TableHead>
                                                                                        </TableRow>
                                                                                    </TableHeader>
                                                                                    <TableBody>
                                                                                        {activity.performance_metrics.weaknesses?.map((weakness, i) => (
                                                                                            <TableRow key={`w-${i}`} className="border-b-slate-700">
                                                                                                <TableCell className="text-center"><HelpCircle className="w-4 h-4 text-slate-400 mx-auto" /></TableCell>
                                                                                                <TableCell className="text-slate-300 text-sm">{weakness}</TableCell>
                                                                                                <TableCell className="text-yellow-400 text-sm">Needs Improvement</TableCell>
                                                                                            </TableRow>
                                                                                        ))}
                                                                                        {activity.performance_metrics.errors_detected?.map((error, i) => (
                                                                                            <TableRow key={`e-${i}`} className="border-b-slate-700 last:border-b-0">
                                                                                                <TableCell className="text-center"><X className="w-5 h-5 text-red-400 mx-auto" /></TableCell>
                                                                                                <TableCell className="text-slate-300 text-sm">{error.replace('Incorrect answer selected.', '').trim()}</TableCell>
                                                                                                <TableCell className="text-red-400 text-sm">Incorrect Answer</TableCell>
                                                                                            </TableRow>
                                                                                        ))}
                                                                                    </TableBody>
                                                                                </Table>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {activity.performance_metrics?.strengths?.length > 0 && (
                                                                        <div>
                                                                            <h4 className="text-md font-semibold text-green-400 mb-3 flex items-center gap-2">
                                                                                <CheckCircle className="w-5 h-5"/>Strengths
                                                                            </h4>
                                                                             <div className="overflow-hidden border border-slate-700 rounded-lg">
                                                                                <Table>
                                                                                    <TableHeader>
                                                                                         <TableRow className="bg-slate-700/50 hover:bg-slate-700/50">
                                                                                            <TableHead className="w-[5%] text-slate-300"></TableHead>
                                                                                            <TableHead className="text-slate-300">Skill / Area</TableHead>
                                                                                        </TableRow>
                                                                                    </TableHeader>
                                                                                     <TableBody>
                                                                                        {activity.performance_metrics.strengths.map((strength, i) => (
                                                                                            <TableRow key={`s-${i}`} className="border-b-slate-700 last:border-b-0">
                                                                                                <TableCell className="text-center"><Check className="w-5 h-5 text-green-400 mx-auto" /></TableCell>
                                                                                                <TableCell className="text-slate-300 text-sm">{strength}</TableCell>
                                                                                            </TableRow>
                                                                                        ))}
                                                                                    </TableBody>
                                                                                </Table>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    </CollapsibleContent>
                                                </>
                                            </Collapsible>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
