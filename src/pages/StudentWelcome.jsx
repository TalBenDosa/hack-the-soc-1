import React, { useState, useEffect } from 'react';
import StudentWelcomeScreen from '../components/onboarding/StudentWelcomeScreen';
import { User, Tenant, TenantUser } from '@/entities/all';
import { Loader2 } from 'lucide-react';

export default function StudentWelcome() {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContext = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        const tenantContextString = localStorage.getItem('tenant_context');
        let tenantId = null;

        if (tenantContextString) {
          const tenantContext = JSON.parse(tenantContextString);
          tenantId = tenantContext.tenant_id;
        } else if (TenantUser && typeof TenantUser.filter === 'function') {
            const tenantUsers = await TenantUser.filter({ user_id: currentUser.id, status: 'active' });
            if (tenantUsers.length > 0) {
                tenantId = tenantUsers[0].tenant_id;
            }
        }
        
        if (tenantId) {
            const tenants = await Tenant.filter({ id: tenantId });
            if (tenants.length > 0) {
              setTenant(tenants[0]);
            }
        }
      } catch (error) {
        console.error("Failed to load user/tenant context for welcome screen", error);
      } finally {
        setLoading(false);
      }
    };
    loadContext();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-12 h-12 text-teal-400 animate-spin" />
      </div>
    );
  }

  return <StudentWelcomeScreen user={user} tenant={tenant} />;
}