import React, { useState, useEffect } from 'react';
import { User, TenantUser, Tenant } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

// **UPDATED**: Enhanced permission matrix with Super Admin context awareness
const PERMISSIONS_MATRIX = {
  // Super Admin-only permissions (Global Level) - ALWAYS TRUE for Super Admin
  'super_admin_access': { admin: true, tenant_admin: false, analyst: false },
  'global_content_management': { admin: true, tenant_admin: false, analyst: false },
  'tenant_management': { admin: true, tenant_admin: false, analyst: false },
  'system_impersonation': { admin: true, tenant_admin: false, analyst: false },
  
  // Environment Admin permissions (Tenant Level) - Super Admin gets these too when in context
  'create_lessons': { admin: true, tenant_admin: true, analyst: false },
  'create_quizzes': { admin: true, tenant_admin: true, analyst: false },
  'create_scenarios': { admin: true, tenant_admin: true, analyst: false },
  'create_live_logs': { admin: true, tenant_admin: true, analyst: false },
  'invite_students': { admin: true, tenant_admin: true, analyst: false },
  'manage_tenant_users': { admin: true, tenant_admin: true, analyst: false },
  'tenant_configuration': { admin: true, tenant_admin: true, analyst: false },
  
  // Feature-based permissions (depends on tenant's subscription tier) - Super Admin always gets access
  'view_dashboard_logs': { admin: true, tenant_admin: true, analyst: 'feature:dashboard_logs' },
  'view_theoretical_lessons': { admin: true, tenant_admin: true, analyst: 'feature:theoretical_lessons' },
  'access_quizzes': { admin: true, tenant_admin: 'feature:quizzes', analyst: 'feature:quizzes' },
  'access_scenarios': { admin: true, tenant_admin: 'feature:scenarios', analyst: 'feature:scenarios' },
  'access_progress_tracking': { admin: true, tenant_admin: true, analyst: 'feature:progress_tracking' },
  'access_certificates': { admin: true, tenant_admin: 'feature:certificates', analyst: 'feature:certificates' },
};

/**
 * **ENHANCED**: Role determination with Super Admin context preservation
 * @param {object} user - The global user object from User.me().
 * @param {object} tenantContext - The user's context within a tenant (from TenantUser).
 * @returns {string} The user's effective role: 'admin', 'tenant_admin', or 'analyst'.
 */
export function getUserRole(user, tenantContext) {
  // **CRITICAL**: Super Admin (Global) - ALWAYS keeps admin role even in tenant context
  if (user?.role === 'admin') {
    console.log('[PERMISSIONS] Super Admin detected - maintaining admin role regardless of tenant context');
    return 'admin'; // Super Admin never loses admin privileges
  }
  
  // **Level 2**: Check tenant context for specific role
  if (tenantContext?.role) {
    return tenantContext.role; // This will be 'tenant_admin' or 'analyst'
  }
  
  // **Level 3**: Check if user is the designated admin for this tenant
  if (tenantContext?.tenant?.admin_email && 
      user?.email?.toLowerCase() === tenantContext.tenant.admin_email.toLowerCase()) {
    return 'tenant_admin'; // They are the designated Environment Admin
  }
  
  // **Level 4**: Default (Student/Analyst)
  return 'analyst'; // Safest default for authenticated users
}

/**
 * **ENHANCED**: Permission checking with Super Admin context awareness
 * Super Admin ALWAYS gets permission, but data filtering happens at component level
 * @param {string} userRole - The user's effective role ('admin', 'tenant_admin', 'analyst').
 * @param {string} permission - The permission key to check (e.g., 'super_admin_access').
 * @param {object} tenantInfo - The tenant object, containing feature_access.
 * @returns {boolean} - True if the user has permission, false otherwise.
 */
export function hasPermission(userRole, permission, tenantInfo) {
  console.log(`[PERMISSIONS] Checking ${permission} for role ${userRole}:`, { tenantInfo: tenantInfo?.name });

  // **SUPER ADMIN OVERRIDE**: Super Admin always gets access to everything
  if (userRole === 'admin') {
    console.log(`[PERMISSIONS] Super Admin granted ${permission} (override)`);
    return true;
  }

  const rule = PERMISSIONS_MATRIX[permission]?.[userRole];

  // Rule is a direct boolean (true/false)
  if (typeof rule === 'boolean') {
    return rule;
  }

  // Rule is feature-based, check against the tenant's subscription
  if (typeof rule === 'string' && rule.startsWith('feature:')) {
    if (!tenantInfo?.feature_access) {
      console.log(`[PERMISSIONS] No feature access found for tenant, denying ${permission}`);
      return false;
    }
    
    const featureName = rule.replace('feature:', '');
    const hasFeature = tenantInfo.feature_access[featureName];
    console.log(`[PERMISSIONS] Feature ${featureName} for ${permission}: ${hasFeature}`);
    return hasFeature;
  }

  // If no rule is found, deny by default
  console.log(`[PERMISSIONS] Unknown rule type for ${permission}, denying access`);
  return false;
}

/**
 * **ENHANCED** Role guard with Super Admin context preservation
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

        // **ENHANCED**: Super Admin Detection with Context Preservation
        if (currentUser.role === 'admin') {
          console.log('[ROLE GUARD] Super Admin detected - maintaining full permissions');
          
          // Check if there's a stored tenant context from AdminEnvironmentAccess
          const storedTenantContext = sessionStorage.getItem('current_tenant_context');
          if (storedTenantContext) {
            try {
              finalTenantInfo = JSON.parse(storedTenantContext);
              console.log(`[ROLE GUARD] Using stored tenant context: ${finalTenantInfo.name}`);
            } catch (e) {
              console.error('[ROLE GUARD] Error parsing stored tenant context:', e);
            }
          }
          
          // Also check for impersonation data (from Super Admin Dashboard)
          const impersonationData = sessionStorage.getItem('superadmin_impersonation');
          if (impersonationData && !finalTenantInfo) {
            try {
              const impersonation = JSON.parse(impersonationData);
              const tenants = await Tenant.filter({ id: impersonation.target_tenant_id });
              if (tenants.length > 0) {
                finalTenantInfo = tenants[0];
                console.log(`[ROLE GUARD] Using impersonation tenant context: ${finalTenantInfo.name}`);
              }
            } catch (e) {
              console.error('[ROLE GUARD] Error parsing impersonation data:', e);
            }
          }

          // **CRITICAL**: For Super Admin, we create a pseudo tenant context for data filtering
          // but they maintain admin role for permissions
          if (finalTenantInfo) {
            finalTenantContext = {
              tenant_id: finalTenantInfo.id,
              role: 'tenant_admin', // This is for data context, not permission reduction
              tenant: finalTenantInfo,
              is_super_admin_context: true // Flag to indicate this is Super Admin in context
            };
          }
        } else {
          // For regular users, find their tenant context
          const tenantUsers = await TenantUser.filter({ user_id: currentUser.id });
          const activeTenantUsers = tenantUsers.filter(tu => ['active', 'pending'].includes(tu.status));
          
          console.log(`[ROLE GUARD] Found ${activeTenantUsers.length} active tenant associations`);
          
          if (activeTenantUsers.length === 0) {
            console.log('[ROLE GUARD] No active tenant associations found');
            setAccessInfo({ reason: 'not_authorized', message: 'No active environment access' });
            setHasAccess(false);
            setLoading(false);
            return;
          }
          
          // Use the first active tenant user for context
          const tenantUser = activeTenantUsers[0];

          if (['removed', 'suspended', 'inactive'].includes(tenantUser.status)) {
            console.log(`[ROLE GUARD] User status is ${tenantUser.status}`);
            setAccessInfo({ reason: tenantUser.status, message: `Account is ${tenantUser.status}` });
            setHasAccess(false);
            setLoading(false);
            return;
          }
          
          const tenants = await Tenant.filter({ id: tenantUser.tenant_id });
          if (tenants.length === 0 || tenants[0].status !== 'active') {
            console.log('[ROLE GUARD] Tenant not found or inactive');
            setAccessInfo({ reason: 'environment_inactive', message: 'Environment is not active' });
            setHasAccess(false);
            setLoading(false);
            return;
          }
          
          finalTenantInfo = tenants[0];
          finalTenantContext = { ...tenantUser, tenant: finalTenantInfo };
        }
        
        // **IMPORTANT**: getUserRole now preserves Super Admin role even with tenant context
        const finalRole = getUserRole(currentUser, finalTenantContext);
        const access = hasPermission(finalRole, permission, finalTenantInfo);

        console.log(`[ROLE GUARD] Final decision - Role: ${finalRole}, Permission: ${permission}, Access: ${access}, Context: ${finalTenantInfo?.name || 'Global'}`);
        
        setHasAccess(access);
        setAccessInfo({ 
          role: finalRole, 
          tenant: finalTenantInfo?.name,
          permission: permission,
          granted: access,
          is_super_admin_context: finalTenantContext?.is_super_admin_context || false
        });

      } catch (error) {
        console.error(`[ROLE GUARD] Error during access check for permission "${permission}":`, error);
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
    
    // Show clear access denied message instead of blank screen
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