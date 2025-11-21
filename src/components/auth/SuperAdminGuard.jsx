import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Shield, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperAdminGuard({ children }) {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSuperAdminAccess = async () => {
            try {
                const currentUser = await User.me();
                
                // Check if user is the designated Super Admin
                const isSuperAdmin = currentUser?.role === 'admin' && 
                                   currentUser?.email === 'Tal14997@gmail.com';
                
                setIsAuthorized(isSuperAdmin);
                
                if (isSuperAdmin) {
                    console.log('[SUPER ADMIN GUARD] Access granted to Super Admin:', currentUser.email);
                } else {
                    console.log('[SUPER ADMIN GUARD] Access denied. User:', currentUser?.email, 'Role:', currentUser?.role);
                }
                
            } catch (error) {
                console.error('[SUPER ADMIN GUARD] Error checking authorization:', error);
                setIsAuthorized(false);
            } finally {
                setLoading(false);
            }
        };

        checkSuperAdminAccess();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400"></div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <Card className="bg-slate-800 border-slate-700 max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-red-400">
                            <Lock className="w-6 h-6" />
                            Super Admin Access Required
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center space-y-4">
                            <Shield className="w-16 h-16 text-slate-600 mx-auto" />
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-white">Access Denied</h3>
                                <p className="text-slate-400">
                                    This area is restricted to the designated Super Admin only.
                                </p>
                                <p className="text-xs text-slate-500">
                                    Only Tal14997@gmail.com has access to global content management.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}