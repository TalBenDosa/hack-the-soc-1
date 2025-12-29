import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there's a pending tenant invite after login
    const pendingInvite = sessionStorage.getItem('pending_tenant_invite');
    
    if (pendingInvite) {
      try {
        const { code, isAdmin, tenantName } = JSON.parse(pendingInvite);
        console.log('[HOME] Found pending tenant invite, redirecting to JoinTenant...', { code, isAdmin, tenantName });
        
        // Clear the pending invite
        sessionStorage.removeItem('pending_tenant_invite');
        
        // Redirect to JoinTenant with parameters
        let url = `JoinTenant?code=${code}`;
        if (isAdmin) url += `&admin=true`;
        if (tenantName) url += `&tenant_name=${encodeURIComponent(tenantName)}`;
        
        navigate(createPageUrl(url));
      } catch (error) {
        console.error('[HOME] Error processing pending invite:', error);
      }
    } else {
      // No pending invite, redirect to dashboard
      navigate(createPageUrl('Dashboard'));
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white text-lg">Loading...</div>
    </div>
  );
}