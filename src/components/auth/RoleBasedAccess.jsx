import React, { useState, useEffect } from 'react';
import { User, TenantUser, Tenant } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

// **SIMPLIFIED**: All users get full access except admin-only features
const PERMISSIONS_MATRIX = {
  // Super Admin-only permissions
  'super_admin_access': { admin: true },
  'global_content_management': { admin: true },
  'tenant_management': { admin: true },
  'system_impersonation': { admin: true },
  
  // Environment Admin permissions
  'create_lessons': { admin: true, tenant_admin: true },
  'create_quizzes': { admin: true, tenant_admin: true },
  'create_scenarios': { admin: true, tenant_admin: true },
  'create_live_logs': { admin: true, tenant_admin: true },
  'invite_students': { admin: true, tenant_admin: true },
  'manage_tenant_users': { admin: true, tenant_admin: true },
  'tenant_configuration': { admin: true, tenant_admin: true },
  
  // **PUBLIC ACCESS** - All authenticated users get these
  'view_dashboard_logs': { default: true },
  'view_theoretical_lessons': { default: true },
  'access_quizzes': { default: true },
  'access_scenarios': { default: true },
  'access_progress_tracking': { default: true },
  'access_certificates': { default: true },
};

export function getUserRole(user, tenantContext) {
  if (user?.role === 'admin') {
    return 'admin';
  }
  
  if (tenantContext?.role) {
    return tenantContext.role;
  }
  
  if (tenantContext?.tenant?.admin_email && 
      user?.email?.toLowerCase() === tenantContext.tenant.admin_email.toLowerCase()) {
    return 'tenant_admin';
  }
  
  return 'user'; // Default authenticated user
}

export function hasPermission(userRole, permission, tenantInfo) {
  console.log(`[PERMISSIONS] Checking ${permission} for role ${userRole}`);

  const permissionConfig = PERMISSIONS_MATRIX[permission];
  
  if (!permissionConfig) {
    console.log(`[PERMISSIONS] Unknown permission ${permission}, denying`);
    return false;
  }

  // Check if permission has default: true (public access)
  if (permissionConfig.default === true) {
    console.log(`[PERMISSIONS] ${permission} is publicly accessible`);
    return true;
  }

  // Check role-specific permissions
  if (permissionConfig[userRole] === true) {
    console.log(`[PERMISSIONS] ${permission} granted for role ${userRole}`);
    return true;
  }

  console.log(`[PERMISSIONS] ${permission} denied for role ${userRole}`);
  return false;
}

export function RoleGuard({ children, permission, fallbackComponent = null }) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessInfo, setAccessInfo] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        console.log(`[ROLE GUARD] Checking access for permission: ${permission}`);
        
        const currentUser = await User.me();
        if (!currentUser) {
          console.log('[ROLE GUARD] No user found');
          setHasAccess(false);
          setLoading(false);
          return;
        }

        let finalTenantContext = null;
        let finalTenantInfo = null;

        // Try to find tenant context but don't require it
        if (currentUser.role === 'admin') {
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
          // Try to find tenant for regular users but don't fail if not found
          try {
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
          } catch (error) {
            console.log('[ROLE GUARD] No tenant found, continuing with user access');
          }
        }
        
        const finalRole = getUserRole(currentUser, finalTenantContext);
        const access = hasPermission(finalRole, permission, finalTenantInfo);

        console.log(`[ROLE GUARD] ✅ Final decision - Role: ${finalRole}, Permission: ${permission}, Access: ${access}`);
        
        setHasAccess(access);
        setAccessInfo({ 
          role: finalRole, 
          tenant: finalTenantInfo?.name || 'No tenant (public access)',
          permission: permission,
          granted: access
        });

      } catch (error) {
        console.error(`[ROLE GUARD] Error during access check:`, error);
        
        // For public permissions, allow access even on error
        if (PERMISSIONS_MATRIX[permission]?.default === true) {
          console.log('[ROLE GUARD] Error occurred but permission is public, granting access');
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
        
        setAccessInfo({ reason: 'system_error', message: 'System error during permission check' });
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
              This feature requires administrator privileges.
            </p>
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