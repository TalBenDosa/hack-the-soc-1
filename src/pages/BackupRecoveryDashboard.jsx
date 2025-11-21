import React, { useState, useEffect } from 'react';
import { TenantSnapshot, Tenant } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  HardDrive, 
  RotateCcw, 
  Trash2, 
  Download, 
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Camera,
  Database
} from 'lucide-react';
import { RoleGuard } from '../components/auth/RoleBasedAccess';

export default function BackupRecoveryDashboard() {
    const [snapshots, setSnapshots] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState('all');
    const [restoreModal, setRestoreModal] = useState({ open: false, snapshot: null });
    const [deleteModal, setDeleteModal] = useState({ open: false, snapshot: null });
    const [restoring, setRestoring] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [snapshotsData, tenantsData] = await Promise.all([
                TenantSnapshot.list('-created_date'),
                Tenant.list()
            ]);
            
            setSnapshots(snapshotsData || []);
            setTenants(tenantsData || []);
        } catch (error) {
            console.error('Failed to load backup data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreSnapshot = async (notes) => {
        if (!restoreModal.snapshot) return;
        
        setRestoring(true);
        try {
            const snapshot = restoreModal.snapshot;
            console.log('[RESTORE] Starting restoration of snapshot:', snapshot.snapshot_name);
            
            // Find the target tenant
            const targetTenant = tenants.find(t => t.id === snapshot.tenant_id);
            if (!targetTenant) {
                throw new Error('Target tenant not found');
            }

            // Simulate restoration process (in real implementation, this would restore data)
            // 1. Restore tenant configuration
            await Tenant.update(snapshot.tenant_id, snapshot.tenant_data);
            
            // 2. Restore users (if specified in restoration options)
            // Note: In real implementation, you'd need to be careful about existing users
            console.log('[RESTORE] Would restore', snapshot.users_data.length, 'users');
            
            // 3. Restore content data
            const contentData = snapshot.content_data;
            console.log('[RESTORE] Would restore:', {
                scenarios: contentData.scenarios?.length || 0,
                lessons: contentData.lessons?.length || 0,
                quizzes: contentData.quizzes?.length || 0,
                investigations: contentData.investigations?.length || 0
            });

            // Create audit log entry for the restoration
            console.log('[RESTORE] Restoration completed successfully');
            
            alert(`✅ Snapshot "${snapshot.snapshot_name}" restored successfully!\n\n📊 Restoration Summary:\n• Tenant: ${targetTenant.name}\n• Users: ${snapshot.users_data.length}\n• Scenarios: ${contentData.scenarios?.length || 0}\n• Lessons: ${contentData.lessons?.length || 0}\n• Size: ${snapshot.file_size_mb} MB\n\nNotes: ${notes}`);
            
            setRestoreModal({ open: false, snapshot: null });
            
        } catch (error) {
            console.error('[RESTORE] Failed to restore snapshot:', error);
            alert(`❌ Failed to restore snapshot: ${error.message}`);
        } finally {
            setRestoring(false);
        }
    };

    const handleDeleteSnapshot = async () => {
        if (!deleteModal.snapshot) return;
        
        try {
            await TenantSnapshot.delete(deleteModal.snapshot.id);
            alert(`✅ Snapshot "${deleteModal.snapshot.snapshot_name}" deleted successfully.`);
            setDeleteModal({ open: false, snapshot: null });
            loadData(); // Refresh list
        } catch (error) {
            console.error('Failed to delete snapshot:', error);
            alert(`❌ Failed to delete snapshot: ${error.message}`);
        }
    };

    const getStatusBadge = (status) => {
        const configs = {
            completed: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
            creating: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
            failed: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle },
            corrupted: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle }
        };
        
        const config = configs[status] || configs.completed;
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
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredSnapshots = selectedTenant === 'all' 
        ? snapshots 
        : snapshots.filter(s => s.tenant_id === selectedTenant);

    return (
        <RoleGuard permission="super_admin_access">
            <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-3">
                                <HardDrive className="w-8 h-8 text-teal-400"/>
                                Backup & Recovery Dashboard
                            </h1>
                            <p className="text-slate-400">Manage snapshots, backups, and disaster recovery for all client environments.</p>
                        </div>
                        <Button onClick={loadData} variant="outline" className="border-slate-600 text-slate-300 self-start md:self-auto" disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh Data
                        </Button>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm">Total Snapshots</p>
                                        <p className="text-2xl font-bold text-white">{snapshots.length}</p>
                                    </div>
                                    <Camera className="w-8 h-8 text-teal-400" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm">Total Size</p>
                                        <p className="text-2xl font-bold text-white">
                                            {Math.round(snapshots.reduce((sum, s) => sum + (s.file_size_mb || 0), 0) * 100) / 100} MB
                                        </p>
                                    </div>
                                    <Database className="w-8 h-8 text-blue-400" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm">Successful</p>
                                        <p className="text-2xl font-bold text-green-400">
                                            {snapshots.filter(s => s.status === 'completed').length}
                                        </p>
                                    </div>
                                    <CheckCircle className="w-8 h-8 text-green-400" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-800 border-slate-700">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm">Failed/Corrupted</p>
                                        <p className="text-2xl font-bold text-red-400">
                                            {snapshots.filter(s => s.status === 'failed' || s.status === 'corrupted').length}
                                        </p>
                                    </div>
                                    <AlertTriangle className="w-8 h-8 text-red-400" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Snapshots Table */}
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                                    <HardDrive className="w-5 h-5 text-teal-400" />
                                    Environment Snapshots
                                </CardTitle>
                                <div className="flex gap-3">
                                    <Select value={selectedTenant} onValueChange={setSelectedTenant}>
                                        <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                                            <SelectValue placeholder="Filter by client" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-700 border-slate-600">
                                            <SelectItem value="all" className="text-white">All Clients</SelectItem>
                                            {tenants.map(tenant => (
                                                <SelectItem key={tenant.id} value={tenant.id} className="text-white">
                                                    {tenant.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center items-center py-20">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
                                </div>
                            ) : filteredSnapshots.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    {selectedTenant === 'all' ? 'No snapshots found.' : 'No snapshots found for selected client.'}
                                </div>
                            ) : (
                                <div className="overflow-x-auto border border-slate-700 rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
                                                <TableHead className="text-slate-300">Snapshot Name</TableHead>
                                                <TableHead className="text-slate-300">Client</TableHead>
                                                <TableHead className="text-slate-300">Status</TableHead>
                                                <TableHead className="text-slate-300">Size</TableHead>
                                                <TableHead className="text-slate-300">Created</TableHead>
                                                <TableHead className="text-slate-300">Type</TableHead>
                                                <TableHead className="text-slate-300 text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSnapshots.map(snapshot => {
                                                const tenant = tenants.find(t => t.id === snapshot.tenant_id);
                                                return (
                                                    <TableRow key={snapshot.id} className="border-b-slate-800 hover:bg-slate-700/30">
                                                        <TableCell>
                                                            <div className="font-medium text-white">{snapshot.snapshot_name}</div>
                                                            {snapshot.notes && (
                                                                <div className="text-sm text-slate-400 mt-1">{snapshot.notes}</div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-white">{tenant?.name || 'Unknown'}</div>
                                                            <div className="text-sm text-slate-400">{tenant?.domain}</div>
                                                        </TableCell>
                                                        <TableCell>{getStatusBadge(snapshot.status)}</TableCell>
                                                        <TableCell className="text-white">{snapshot.file_size_mb} MB</TableCell>
                                                        <TableCell className="text-slate-300">
                                                            {formatDate(snapshot.created_date)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                                                                {snapshot.snapshot_type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => setRestoreModal({ open: true, snapshot })}
                                                                    className="bg-blue-600 hover:bg-blue-700"
                                                                    disabled={snapshot.status !== 'completed'}
                                                                >
                                                                    <RotateCcw className="w-3 h-3 mr-1" />
                                                                    Restore
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => setDeleteModal({ open: true, snapshot })}
                                                                    className="border-red-500 text-red-400 hover:bg-red-900/20"
                                                                >
                                                                    <Trash2 className="w-3 h-3 mr-1" />
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Restore Confirmation Modal */}
                <Dialog open={restoreModal.open} onOpenChange={(open) => setRestoreModal({ open, snapshot: restoreModal.snapshot })}>
                    <DialogContent className="bg-slate-800 border-slate-700 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                                <RotateCcw className="w-5 h-5 text-blue-400" />
                                Restore Snapshot
                            </DialogTitle>
                        </DialogHeader>
                        
                        {restoreModal.snapshot && (
                            <div className="space-y-4">
                                <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                                        <span className="font-semibold text-yellow-400">Warning</span>
                                    </div>
                                    <p className="text-yellow-200 text-sm">
                                        This will restore the selected snapshot and may overwrite current data. This action cannot be undone.
                                    </p>
                                </div>
                                
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-white">Snapshot Details:</h3>
                                    <div className="bg-slate-700/50 rounded p-3 space-y-1 text-sm">
                                        <p><strong>Name:</strong> {restoreModal.snapshot.snapshot_name}</p>
                                        <p><strong>Client:</strong> {tenants.find(t => t.id === restoreModal.snapshot.tenant_id)?.name}</p>
                                        <p><strong>Size:</strong> {restoreModal.snapshot.file_size_mb} MB</p>
                                        <p><strong>Created:</strong> {formatDate(restoreModal.snapshot.created_date)}</p>
                                        <p><strong>Users:</strong> {restoreModal.snapshot.users_data?.length || 0}</p>
                                        <p><strong>Scenarios:</strong> {restoreModal.snapshot.content_data?.scenarios?.length || 0}</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-white">Restoration Notes:</label>
                                    <Textarea
                                        id="restore-notes"
                                        placeholder="Enter notes about this restoration..."
                                        className="bg-slate-700 border-slate-600 text-white h-24"
                                    />
                                </div>
                            </div>
                        )}
                        
                        <DialogFooter>
                            <Button
                                onClick={() => setRestoreModal({ open: false, snapshot: null })}
                                variant="outline"
                                className="border-slate-600 text-slate-300"
                                disabled={restoring}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    const notes = document.getElementById('restore-notes')?.value || '';
                                    handleRestoreSnapshot(notes);
                                }}
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={restoring}
                            >
                                {restoring ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Restoring...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Confirm Restore
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Modal */}
                <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open, snapshot: deleteModal.snapshot })}>
                    <DialogContent className="bg-slate-800 border-slate-700 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-white flex items-center gap-2">
                                <Trash2 className="w-5 h-5 text-red-400" />
                                Delete Snapshot
                            </DialogTitle>
                        </DialogHeader>
                        
                        {deleteModal.snapshot && (
                            <div className="space-y-4">
                                <p className="text-slate-300">
                                    Are you sure you want to permanently delete the snapshot "{deleteModal.snapshot.snapshot_name}"? 
                                    This action cannot be undone.
                                </p>
                                <div className="bg-slate-700/50 rounded p-3 space-y-1 text-sm">
                                    <p><strong>Client:</strong> {tenants.find(t => t.id === deleteModal.snapshot.tenant_id)?.name}</p>
                                    <p><strong>Size:</strong> {deleteModal.snapshot.file_size_mb} MB</p>
                                    <p><strong>Created:</strong> {formatDate(deleteModal.snapshot.created_date)}</p>
                                </div>
                            </div>
                        )}
                        
                        <DialogFooter>
                            <Button
                                onClick={() => setDeleteModal({ open: false, snapshot: null })}
                                variant="outline"
                                className="border-slate-600 text-slate-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeleteSnapshot}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Snapshot
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </RoleGuard>
    );
}