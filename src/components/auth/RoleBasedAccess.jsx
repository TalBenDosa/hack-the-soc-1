import React, { useState, useEffect } from 'react';
import { User } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

// Simple permission matrix: admin vs regular user
const PERMISSIONS_MATRIX = {
  // Admin-only permissions
  'admin_panel': { admin: true },
  'create_content': { admin: true },
  'manage_users': { admin: true },
  
  // Public permissions - all authenticated users
  'view_dashboard': { default: true },
  'view_lessons': { default: true },
  'access_quizzes': { default: true },
  'access_scenarios': { default: true },
  'view_progress': { default: true },
};

export function hasPermission(user, permission) {
  const permissionConfig = PERMISSIONS_MATRIX[permission];
  
  if (!permissionConfig) {
    console.log(`[PERMISSIONS] Unknown permission ${permission}, denying`);
    return false;
  }

  // Check if permission has default: true (public access)
  if (permissionConfig.default === true) {
    return true;
  }

  // Check if user is admin
  if (user?.role === 'admin' && permissionConfig.admin === true) {
    return true;
  }

  return false;
}

export function RoleGuard({ children, permission, fallbackComponent = null }) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const currentUser = await User.me();
        if (!currentUser) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const access = hasPermission(currentUser, permission);
        setHasAccess(access);
      } catch (error) {
        console.error(`[ROLE GUARD] Error during access check:`, error);
        
        // For public permissions, allow access even on error
        if (PERMISSIONS_MATRIX[permission]?.default === true) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
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