import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Globe, Layers, RefreshCw, CheckCircle, AlertTriangle, Clock, Zap } from 'lucide-react';
import { GlobalContent, ContentPropagationLog, Tenant } from '@/entities/all';
import GlobalContentService from '../services/GlobalContentService';

export default function GlobalContentManager() {
    const [globalContents, setGlobalContents] = useState([]);
    const [propagationLogs, setPropagationLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [propagating, setPropagating] = useState(false);
    const [stats, setStats] = useState({
        total_content: 0,
        active_tenants: 0,
        pending_propagations: 0,
        recent_propagations: 0
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Load global content
            const contents = await GlobalContent.list('-created_date');
            setGlobalContents(contents);
            
            // Load propagation status
            const status = await GlobalContentService.getPropagationStatus();
            setPropagationLogs(status.recent_propagations);
            
            // Load stats
            const tenants = await Tenant.filter({ status: 'active' });
            setStats({
                total_content: contents.length,
                active_tenants: tenants.length,
                pending_propagations: status.pending_propagations.length,
                recent_propagations: status.recent_propagations.length
            });
            
        } catch (error) {
            console.error('[GLOBAL CONTENT MANAGER] Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePropagateAll = async () => {
        try {
            setPropagating(true);
            const pendingContent = globalContents.filter(gc => gc.propagation_status === 'pending');
            
            for (const content of pendingContent) {
                await GlobalContentService.propagateToAllTenants(content.id, 'update', 'super_admin');
            }
            
            await loadData();
        } catch (error) {
            console.error('[GLOBAL CONTENT MANAGER] Error propagating content:', error);
            alert('Error during propagation. Check console for details.');
        } finally {
            setPropagating(false);
        }
    };

    const getStatusBadge = (status) => {
        const configs = {
            'pending': { color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
            'propagating': { color: 'bg-blue-500/20 text-blue-400', icon: RefreshCw },
            'completed': { color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
            'failed': { color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
            'partial': { color: 'bg-orange-500/20 text-orange-400', icon: AlertTriangle }
        };
        
        const config = configs[status] || configs.pending;
        const Icon = config.icon;
        
        return (
            <Badge className={`${config.color} border flex items-center gap-1`}>
                <Icon className="w-3 h-3" />
                {status}
            </Badge>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="p-6 space-y-6">
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-white">
                        <Globe className="w-6 h-6 text-teal-400" />
                        Global Content Management
                        <Badge className="bg-purple-500/20 text-purple-400">Super Admin Only</Badge>
                    </CardTitle>
                    <p className="text-slate-400">
                        Manage global content that automatically propagates to all customer environments.
                        Changes made here will be inherited by all customers, with their local overlays preserved.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-700/50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Layers className="w-4 h-4 text-teal-400" />
                                <span className="text-sm text-slate-300">Global Content</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.total_content}</div>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Globe className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-slate-300">Active Customers</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.active_tenants}</div>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-yellow-400" />
                                <span className="text-sm text-slate-300">Pending</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.pending_propagations}</div>
                        </div>
                        <div className="bg-slate-700/50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-4 h-4 text-green-400" />
                                <span className="text-sm text-slate-300">Recent Syncs</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{stats.recent_propagations}</div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-white">Content Distribution Status</h3>
                        <div className="flex gap-2">
                            <Button 
                                onClick={loadData} 
                                variant="outline" 
                                size="sm"
                                className="border-slate-600 text-slate-300"
                                disabled={loading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            <Button 
                                onClick={handlePropagateAll}
                                className="bg-teal-600 hover:bg-teal-700"
                                disabled={propagating || stats.pending_propagations === 0}
                            >
                                {propagating ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Propagating...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4 mr-2" />
                                        Propagate All ({stats.pending_propagations})
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="content" className="space-y-4">
                <TabsList className="bg-slate-800 border-slate-700">
                    <TabsTrigger value="content">Global Content</TabsTrigger>
                    <TabsTrigger value="propagation">Propagation Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="content">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-700">
                                        <TableHead className="text-slate-300">Content Type</TableHead>
                                        <TableHead className="text-slate-300">Title/Name</TableHead>
                                        <TableHead className="text-slate-300">Version</TableHead>
                                        <TableHead className="text-slate-300">Status</TableHead>
                                        <TableHead className="text-slate-300">Last Propagated</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {globalContents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                                                No global content found. Create content in the Admin Panel to see it here.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        globalContents.map((content) => (
                                            <TableRow key={content.id} className="border-slate-700">
                                                <TableCell>
                                                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                                                        {content.content_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium text-white">
                                                    {content.content_data?.title || content.content_data?.name || 'Untitled'}
                                                </TableCell>
                                                <TableCell className="text-slate-300">{content.version}</TableCell>
                                                <TableCell>{getStatusBadge(content.propagation_status)}</TableCell>
                                                <TableCell className="text-slate-300">
                                                    {content.last_propagated ? formatDate(content.last_propagated) : 'Never'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="propagation">
                    <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-700">
                                        <TableHead className="text-slate-300">Timestamp</TableHead>
                                        <TableHead className="text-slate-300">Action</TableHead>
                                        <TableHead className="text-slate-300">Target Tenant</TableHead>
                                        <TableHead className="text-slate-300">Status</TableHead>
                                        <TableHead className="text-slate-300">Duration</TableHead>
                                        <TableHead className="text-slate-300">Conflicts</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {propagationLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                                                No propagation logs yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        propagationLogs.slice(0, 20).map((log) => (
                                            <TableRow key={log.id} className="border-slate-700">
                                                <TableCell className="text-slate-300">
                                                    {formatDate(log.created_date)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                                                        {log.propagation_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-300">
                                                    {log.target_tenant_id?.slice(-8)}...
                                                </TableCell>
                                                <TableCell>{getStatusBadge(log.status)}</TableCell>
                                                <TableCell className="text-slate-300">
                                                    {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                                                </TableCell>
                                                <TableCell className="text-slate-300">
                                                    {log.conflicts_detected?.length || 0}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}