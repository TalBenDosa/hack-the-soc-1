import React, { useState, useEffect } from 'react';
import { User, TenantUser, Tenant } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

// **UPDATED**: Enhanced permission matrix - all users get access except admin pages
const PERMISSIONS_MATRIX = {
  // Super Admin-only permissions (Global Level)
  'super_admin_access': { admin: true, tenant_admin: false, analyst: false, guest: false },
  'global_content_management': { admin: true, tenant_admin: false, analyst: false, guest: false },
  'tenant_management': { admin: true, tenant_admin: false, analyst: false, guest: false },
  'system_impersonation': { admin: true, tenant_admin: false, analyst: false, guest: false },
  
  // Environment Admin permissions (Tenant Level)
  'create_lessons': { admin: true, tenant_admin: true, analyst: false, guest: false },
  'create_quizzes': { admin: true, tenant_admin: true, analyst: false, guest: false },
  'create_scenarios': { admin: true, tenant_admin: true, analyst: false, guest: false },
  'create_live_logs': { admin: true, tenant_admin: true, analyst: false, guest: false },
  'invite_students': { admin: true, tenant_admin: true, analyst: false, guest: false },
  'manage_tenant_users': { admin: true, tenant_admin: true, analyst: false, guest: false },
  'tenant_configuration': { admin: true, tenant_admin: true, analyst: false, guest: false },
  
  // **ALL USERS GET ACCESS** - No restrictions for regular features
  'view_dashboard_logs': { admin: true, tenant_admin: true, analyst: true, guest: true },
  'view_theoretical_lessons': { admin: true, tenant_admin: true, analyst: true, guest: true },
  'access_quizzes': { admin: true, tenant_admin: true, analyst: true, guest: true },
  'access_scenarios': { admin: true, tenant_admin: true, analyst: true, guest: true },
  'access_progress_tracking': { admin: true, tenant_admin: true, analyst: true, guest: true },
  'access_certificates': { admin: true, tenant_admin: true, analyst: true, guest: true },
};

/**
 * **SIMPLIFIED**: Role determination - default to 'guest' for all users without tenant
 */
export function getUserRole(user, tenantContext) {
  // Super Admin (Global)
  if (user?.role === 'admin') {
    console.log('[PERMISSIONS] Super Admin detected');
    return 'admin';
  }
  
  // Check tenant context for specific role
  if (tenantContext?.role) {
    return tenantContext.role; // 'tenant_admin' or 'analyst'
  }
  
  // Check if user is the designated admin for this tenant
  if (tenantContext?.tenant?.admin_email && 
      user?.email?.toLowerCase() === tenantContext.tenant.admin_email.toLowerCase()) {
    return 'tenant_admin';
  }
  
  // **DEFAULT: All authenticated users are 'guest' with full feature access**
  return 'guest';
}

/**
 * **SIMPLIFIED**: Permission checking - guests get access to all non-admin features
 */
export function hasPermission(userRole, permission, tenantInfo) {
  console.log(`[PERMISSIONS] Checking ${permission} for role ${userRole}`);

  // Super Admin always gets access
  if (userRole === 'admin') {
    console.log(`[PERMISSIONS] Super Admin granted ${permission}`);
    return true;
  }

  const rule = PERMISSIONS_MATRIX[permission]?.[userRole];

  // Direct boolean rule
  if (typeof rule === 'boolean') {
    return rule;
  }

  // If no rule found, deny by default
  console.log(`[PERMISSIONS] No rule found for ${permission}, denying access`);
  return false;
}

/**
 * **SIMPLIFIED** Role guard - all authenticated users get access to non-admin features
 */
export function RoleGuard({ children, permission, fallbackComponent = null }) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessInfo, setAccessInfo] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        console.log(`[ROLE GUARD] Checking access for permission: ${permission}`);
        
        const currentUser = await User.me();
        let finalTenantContext = null;
        let finalTenantInfo = null;

        // Super Admin handling
        if (currentUser.role === 'admin') {
          console.log('[ROLE GUARD] Super Admin detected');
          
          const storedTenantContext = sessionStorage.getItem('current_tenant_context');
          if (storedTenantContext) {
            try {
              finalTenantInfo = JSON.parse(storedTenantContext);
            } catch (e) {
              console.error('[ROLE GUARD] Error parsing stored tenant context:', e);
            }
          }
          
          const impersonationData = sessionStorage.getItem('superadmin_impersonation');
          if (impersonationData && !finalTenantInfo) {
            try {
              const impersonation = JSON.parse(impersonationData);
              const tenants = await Tenant.filter({ id: impersonation.target_tenant_id });
              if (tenants.length > 0) {
                finalTenantInfo = tenants[0];
              }
            } catch (e) {
              console.error('[ROLE GUARD] Error parsing impersonation data:', e);
            }
          }

          if (finalTenantInfo) {
            finalTenantContext = {
              tenant_id: finalTenantInfo.id,
              role: 'tenant_admin',
              tenant: finalTenantInfo,
              is_super_admin_context: true
            };
          }
        } else {
          // **CHANGED**: For regular users, try to find tenant but don't require it
          const tenantUsers = await TenantUser.filter({ user_id: currentUser.id });
          const activeTenantUsers = tenantUsers.filter(tu => ['active', 'pending'].includes(tu.status));
          
          if (activeTenantUsers.length > 0) {
            const tenantUser = activeTenantUsers[0];
            const tenants = await Tenant.filter({ id: tenantUser.tenant_id });
            
            if (tenants.length > 0 && tenants[0].status === 'active') {
              finalTenantInfo = tenants[0];
              finalTenantContext = { ...tenantUser, tenant: finalTenantInfo };
            }
          }
          
          // **IMPORTANT**: No tenant is OK - user will be treated as 'guest' with full access
          console.log('[ROLE GUARD] User has no tenant context - treating as guest with full access');
        }
        
        const finalRole = getUserRole(currentUser, finalTenantContext);
        const access = hasPermission(finalRole, permission, finalTenantInfo);

        console.log(`[ROLE GUARD] Final decision - Role: ${finalRole}, Permission: ${permission}, Access: ${access}`);
        
        setHasAccess(access);
        setAccessInfo({ 
          role: finalRole, 
          tenant: finalTenantInfo?.name || 'No tenant',
          permission: permission,
          granted: access
        });

      } catch (error) {
        console.error(`[ROLE GUARD] Error during access check:`, error);
        setAccessInfo({ reason: 'system_error', message: 'System error during permission check' });
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [permission]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400"></div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallbackComponent) {
      return fallbackComponent;
    }
    
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-900 p-4">
        <Card className="bg-slate-800 border-slate-700 text-center p-8 max-w-md">
          <CardHeader>
            <Lock className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-white text-xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 mb-2">
              {accessInfo?.message || 'You do not have permission to access this feature.'}
            </p>
            {accessInfo?.reason && (
              <p className="text-slate-500 text-sm mb-4">
                Reason: {accessInfo.reason}
              </p>
            )}
            <Link to={createPageUrl('Dashboard')}>
              <Button className="bg-teal-600 hover:bg-teal-700 mt-4">
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}