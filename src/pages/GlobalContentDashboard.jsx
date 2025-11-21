import React from 'react';
import SuperAdminGuard from '../components/auth/SuperAdminGuard';
import GlobalContentManager from '../components/admin/GlobalContentManager';

export default function GlobalContentDashboard() {
    return (
        <SuperAdminGuard>
            <div className="min-h-screen bg-slate-900">
                <GlobalContentManager />
            </div>
        </SuperAdminGuard>
    );
}