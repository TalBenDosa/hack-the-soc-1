import React, { useState, useEffect } from 'react';
import { User, SubscriptionPlan, TenantUser, Tenant } from '@/entities/all';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Star, Zap, Crown, Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Define tier hierarchy
const TIER_HIERARCHY = {
  basic: 1,
  intermediate: 2,
  full: 3
};

export function hasAccess(userTier, requiredTier) {
  if (!userTier || !requiredTier) {
    console.log('[SUBSCRIPTION] Missing tier info:', { userTier, requiredTier });
    return false;
  }
  
  const hasAccessResult = TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
  console.log('[SUBSCRIPTION] Access check:', userTier, '>=', requiredTier, '?', hasAccessResult);
  return hasAccessResult;
}

// Global state for upgrade popup
let globalUpgradePopup = null;

export function showUpgradePopup(requiredTier, currentTier) {
  console.log('[SUBSCRIPTION] Showing upgrade popup:', currentTier, '->', requiredTier);
  if (globalUpgradePopup) {
    globalUpgradePopup(requiredTier, currentTier);
  }
}

export function SubscriptionGuard({ children, requiredTier }) {
  const [user, setUser] = useState(null);
  const [tenantContext, setTenantContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState('basic');

  useEffect(() => {
    const fetchUser = async () => {
      console.log('[SUBSCRIPTION GUARD] Checking access for tier:', requiredTier);
      
      try {
        const currentUser = await User.me();
        setUser(currentUser);

        // Load tenant context to get the real subscription tier
        let finalTenantContext = null;
        let finalTier = 'basic';

        if (currentUser.role !== 'admin') {
          try {
            const tenantUsers = await TenantUser.filter({ 
              user_id: currentUser.id,
              status: 'active' 
            });
            
            if (tenantUsers.length > 0) {
              const tenantUser = tenantUsers[0];
              const tenants = await Tenant.filter({ id: tenantUser.tenant_id });
              
              if (tenants.length > 0) {
                finalTenantContext = { ...tenantUser, tenant: tenants[0] };
                finalTier = finalTenantContext.tenant.subscription_tier;
                console.log('[SUBSCRIPTION GUARD] Using tenant tier:', finalTier);
              }
            }
          } catch (error) {
            console.error('[SUBSCRIPTION GUARD] Failed to load tenant context:', error);
          }
        } else {
          // SuperAdmin gets full access
          finalTier = 'full';
          console.log('[SUBSCRIPTION GUARD] SuperAdmin - full access');
        }

        setTenantContext(finalTenantContext);
        setUserTier(finalTier);

      } catch (error) {
        console.error("[SUBSCRIPTION GUARD] Failed to fetch user:", error);
      }
      setLoading(false);
    };
    fetchUser();
  }, [requiredTier]);

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  if (!user || !hasAccess(userTier, requiredTier)) {
    console.log('[SUBSCRIPTION GUARD] Access denied - showing upgrade prompt');
    return <UpgradePrompt requiredTier={requiredTier} currentTier={userTier} />;
  }

  console.log('[SUBSCRIPTION GUARD] Access granted');
  return children;
}

function UpgradePrompt({ requiredTier, currentTier }) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="bg-slate-800 border-slate-700 max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-red-500/20">
              <Lock className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            Access Restricted
          </CardTitle>
          <p className="text-slate-400 mt-2">
            This feature requires a higher subscription tier
          </p>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-slate-300 mb-6">
            You're currently on the <Badge className="bg-blue-500/20 text-blue-400">{currentTier}</Badge> plan.
            To access this feature, please contact your administrator to upgrade to <Badge className="bg-teal-500/20 text-teal-400">{requiredTier}</Badge> or higher.
          </p>
          <Link to={createPageUrl("Dashboard")}>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <ArrowRight className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

// Global Upgrade Popup Component
export function GlobalUpgradePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [requiredTier, setRequiredTier] = useState('');
  const [currentTier, setCurrentTier] = useState('');

  useEffect(() => {
    // Register global popup function
    globalUpgradePopup = (required, current) => {
      setRequiredTier(required);
      setCurrentTier(current);
      setIsOpen(true);
    };

    return () => {
      globalUpgradePopup = null;
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Subscription Upgrade Required
          </DialogTitle>
          <p className="text-slate-400 text-center">
            You need <Badge className="bg-teal-500/20 text-teal-400">{requiredTier}</Badge> tier or higher to access this feature
          </p>
        </DialogHeader>

        <div className="py-6 text-center">
          <div className="mb-4">
            <Lock className="w-16 h-16 text-red-400 mx-auto mb-4" />
          </div>
          <p className="text-slate-300 mb-6">
            Your organization is currently on the <Badge className="bg-blue-500/20 text-blue-400">{currentTier}</Badge> plan.
            Please contact your administrator to upgrade your organization's subscription.
          </p>
          <Button onClick={() => setIsOpen(false)} className="bg-teal-600 hover:bg-teal-700">
            Understood
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}