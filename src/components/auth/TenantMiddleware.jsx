import React, { useEffect, useState } from 'react';
import { User, TenantUser, Tenant } from '@/entities/all';

const TenantMiddleware = ({ children }) => {
    const [contextReady, setContextReady] = useState(false);

    useEffect(() => {
        const setupTenantContext = async () => {
            try {
                console.log('[TENANT MIDDLEWARE] Setting up tenant context...');
                const user = await User.me();
                
                if (user.role === 'admin') {
                    // **ENHANCED**: Super Admin - check for impersonation
                    const impersonationData = sessionStorage.getItem('superadmin_impersonation');
                    
                    if (impersonationData) {
                        try {
                            const impersonation = JSON.parse(impersonationData);
                            console.log('[TENANT MIDDLEWARE] Super Admin impersonation detected:', impersonation);
                            
                            // Set tenant context for the impersonated tenant
                            if (impersonation.target_tenant_id) {
                                const tenantContext = {
                                    user_id: user.id,
                                    tenant_id: impersonation.target_tenant_id,
                                    role: 'admin', // Keep Super Admin role
                                    is_impersonating: true,
                                    impersonated_tenant_name: impersonation.target_tenant_name,
                                    original_role: 'admin'
                                };
                                
                                localStorage.setItem('tenant_context', JSON.stringify(tenantContext));
                                console.log('[TENANT MIDDLEWARE] Set impersonation tenant context:', tenantContext);
                            }
                        } catch (error) {
                            console.error('[TENANT MIDDLEWARE] Error parsing impersonation data:', error);
                        }
                    } else {
                        // Clear any existing tenant context for Super Admin when not impersonating
                        localStorage.removeItem('tenant_context');
                        console.log('[TENANT MIDDLEWARE] Super Admin - no impersonation, cleared tenant context');
                    }
                } else {
                    // Regular user - set up their tenant context
                    const tenantUsers = await TenantUser.filter({ user_id: user.id, status: 'active' });
                    
                    if (tenantUsers.length > 0) {
                        const tenantUser = tenantUsers[0];
                        const tenantContext = {
                            user_id: user.id,
                            tenant_id: tenantUser.tenant_id,
                            role: tenantUser.role,
                            is_impersonating: false
                        };
                        
                        localStorage.setItem('tenant_context', JSON.stringify(tenantContext));
                        console.log('[TENANT MIDDLEWARE] Set regular user tenant context:', tenantContext);
                    } else {
                        console.log('[TENANT MIDDLEWARE] User not assigned to any active tenant');
                        localStorage.removeItem('tenant_context');
                    }
                }
                
                setContextReady(true);
            } catch (error) {
                console.error('[TENANT MIDDLEWARE] Error setting up tenant context:', error);
                setContextReady(true);
            }
        };

        setupTenantContext();
    }, []);

    // Show loading until context is ready
    if (!contextReady) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return children;
};

export default TenantMiddleware;